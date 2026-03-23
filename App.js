import React, { useState, createContext, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors } from './src/theme';
import { useAOIs, useProfile, resetEventCache } from './src/hooks/useEvents';
import BrandedLoader from './src/components/BrandedLoader';
import { onEventUpdate } from './src/lib/realtime';
import { addNotificationResponseListener, consumeLastNotificationResponse, getExpoPushToken, initNotifications, notifyRealtimeUpdate } from './src/lib/notifications';
import { syncPushToken } from './src/lib/pushRegistration';
import { markAlertViewed } from './src/lib/viewedAlerts';

// App context for onboarding completion
export const AppContext = createContext();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userConfig, setUserConfig] = useState(null);

  const handleOnboardingComplete = (config) => {
    setUserConfig(config);
    setOnboardingComplete(true);
  };

  const handleLogout = () => {
    resetEventCache();
    setUserConfig(null);
    setOnboardingComplete(false);
  };

  return (
    <AuthProvider>
      <AppContext.Provider value={{ userConfig, setUserConfig, handleOnboardingComplete, handleLogout }}>
        <AppShell
          onboardingComplete={onboardingComplete}
          setOnboardingComplete={setOnboardingComplete}
          userConfig={userConfig}
          setUserConfig={setUserConfig}
        />
      </AppContext.Provider>
    </AuthProvider>
  );
}

function AppShell({ onboardingComplete, setOnboardingComplete, userConfig, setUserConfig }) {
  const { isLoaded, isSignedIn, authReady } = useAuth();
  const { aois, loading: aoisLoading } = useAOIs(isSignedIn && authReady);
  const { profile, loading: profileLoading } = useProfile(isSignedIn && authReady);

  useEffect(() => {
    if (isSignedIn) {
      setOnboardingComplete(false);
    }
  }, [isSignedIn, setOnboardingComplete]);

  const handleNotificationOpen = React.useCallback(async (response) => {
    const event = response?.notification?.request?.content?.data?.event;
    if (!event || !navigationRef.isReady()) {
      console.log('[App] Notification tap ignored', {
        hasEvent: !!event,
        navReady: navigationRef.isReady(),
      });
      return;
    }

    await markAlertViewed(event).catch((err) => {
      console.warn('[App] Failed to mark alert viewed from notification:', err.message);
    });

    console.log('[App] Navigating from notification tap', {
      eventId: event.id || event.event_id || null,
      title: event.title || null,
    });
    navigationRef.navigate('AlertsTab', {
      screen: 'AlertsList',
      params: {
        activeTab: 'MY',
        viewedEventId: event.id || event.event_id || null,
        notificationOpenedAt: Date.now(),
      },
    });
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    if (!authReady) {
      console.log('[App] userConfig hydrate waiting for authReady');
      return;
    }

    if (profileLoading || aoisLoading) {
      return;
    }

    const persistedEventTypes = Array.isArray(profile?.preferences?.event_types)
      ? profile.preferences.event_types
      : Array.isArray(profile?.preferences?.eventTypes)
        ? profile.preferences.eventTypes
        : [];
    const persistedRadius = profile?.preferences?.radius_km
      ?? profile?.preferences?.radiusKm
      ?? aois.find((aoi) => Number(aoi?.radius_km))?.radius_km
      ?? userConfig?.radius
      ?? 0;
    const persistedCriticalOnly = profile?.preferences?.critical_only
      ?? profile?.preferences?.criticalOnly
      ?? userConfig?.criticalOnly
      ?? false;
    const persistedAois = aois.map((aoi) => aoi?.name || aoi?.location_name || aoi?.location).filter(Boolean);

    if (!persistedAois.length) {
      console.log('[App] userConfig hydrate skipped: no AOIs available');
      return;
    }

    console.log('[App] userConfig hydrate source', {
      persistedEventTypes,
      persistedRadius,
      persistedAois,
      profilePreferences: profile?.preferences || null,
    });

    setUserConfig((prev) => ({
      ...(prev || {}),
      location: prev?.location || persistedAois[0],
      aois: persistedAois,
      radius: Number(persistedRadius) || 0,
      eventTypes: persistedEventTypes.length > 0 ? persistedEventTypes : (prev?.eventTypes || []),
      criticalOnly: Boolean(persistedCriticalOnly),
      preferences: {
        ...(prev?.preferences || {}),
        ...(profile?.preferences || {}),
        critical_only: Boolean(persistedCriticalOnly),
      },
    }));
    console.log('[App] userConfig hydrated', {
      location: persistedAois[0],
      aois: persistedAois,
      radius: Number(persistedRadius) || 0,
      eventTypes: persistedEventTypes.length > 0 ? persistedEventTypes : (userConfig?.eventTypes || []),
      criticalOnly: Boolean(persistedCriticalOnly),
    });
  }, [aois, aoisLoading, authReady, isSignedIn, profile, profileLoading, setOnboardingComplete, setUserConfig, userConfig?.radius]);

  useEffect(() => {
    // no-op effect keeps auth state reactive for restored Clerk sessions
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    console.log('[App] Initializing notifications/realtime bridge');
    initNotifications().catch((err) => {
      console.warn('[LEONA Notifications] Init failed:', err.message);
    });
    getExpoPushToken()
      .then((token) => {
        if (!token) {
          return null;
        }
        return syncPushToken(token);
      })
      .then((result) => {
        if (result) {
          console.log('[App] Push token sync result', result);
        }
      })
      .catch((err) => {
        console.warn('[App] Push token sync failed:', err.message);
      });
    consumeLastNotificationResponse()
      .then((response) => {
        if (response) {
          return handleNotificationOpen(response);
        }
        return null;
      })
      .catch((err) => {
        console.warn('[App] Last notification response check failed:', err.message);
      });

    const unsubRealtime = onEventUpdate((update) => {
      console.log('[App] Realtime event received for notification', {
        type: update?.type,
        eventId: update?.event?.id || update?.event?.event_id || null,
        severity: update?.event?.severity || null,
      });
      notifyRealtimeUpdate(update).catch((err) => {
        console.warn('[LEONA Notifications] Schedule failed:', err.message);
      });
    });

    const unsubNotifications = addNotificationResponseListener((response) => {
      console.log('[App] Notification response received', {
        data: response?.notification?.request?.content?.data || null,
      });
      handleNotificationOpen(response).catch((err) => {
        console.warn('[App] Notification open handling failed:', err.message);
      });
    });

    return () => {
      unsubRealtime?.();
      unsubNotifications?.();
    };
  }, [handleNotificationOpen, isSignedIn]);

  if (!isLoaded || (isSignedIn && authReady && (aoisLoading || profileLoading))) {
    return <BrandedLoader />;
  }

  const showApp = onboardingComplete;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" backgroundColor={colors.bg} />
        {showApp ? <AppNavigator /> : <OnboardingScreen />}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
