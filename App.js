import React, { useState, createContext, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors } from './src/theme';
import { useAOIs, resetEventCache } from './src/hooks/useEvents';
import { onEventUpdate } from './src/lib/realtime';
import { addNotificationResponseListener, initNotifications, notifyRealtimeUpdate } from './src/lib/notifications';

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
      <AppContext.Provider value={{ userConfig, handleOnboardingComplete, handleLogout }}>
        <AppShell onboardingComplete={onboardingComplete} />
      </AppContext.Provider>
    </AuthProvider>
  );
}

function AppShell({ onboardingComplete }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { aois, loading: aoisLoading } = useAOIs(isSignedIn);

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
      const event = response?.notification?.request?.content?.data?.event;
      if (!event || !navigationRef.isReady()) {
        console.log('[App] Notification tap ignored', {
          hasEvent: !!event,
          navReady: navigationRef.isReady(),
        });
        return;
      }

      console.log('[App] Navigating from notification tap', {
        eventId: event.id || event.event_id || null,
        title: event.title || null,
      });
      navigationRef.navigate('AlertsTab', {
        screen: 'EventDetail',
        params: { event },
      });
    });

    return () => {
      unsubRealtime?.();
      unsubNotifications?.();
    };
  }, [isSignedIn]);

  if (!isLoaded || (isSignedIn && aoisLoading)) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  const hasConfiguredAois = aois.length > 0;
  const showApp = onboardingComplete || (isSignedIn && hasConfiguredAois);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" backgroundColor={colors.bg} />
        {showApp ? <AppNavigator /> : <OnboardingScreen />}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
