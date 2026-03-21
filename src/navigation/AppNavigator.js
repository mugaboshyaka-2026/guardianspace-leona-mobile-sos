import React, { useEffect, useRef, useMemo, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

import MapHomeScreen from '../screens/MapHomeScreen';
import AlertsScreen from '../screens/AlertsScreen';
import LeonaChatScreen from '../screens/LeonaChatScreen';
import BriefsScreen from '../screens/BriefsScreen';
import MoreScreen from '../screens/MoreScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import ThreadScreen from '../screens/ThreadScreen';
import InboxScreen from '../screens/InboxScreen';
import CommunityScreen from '../screens/CommunityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DataSourcesScreen from '../screens/DataSourcesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import CallScreen from '../screens/CallScreen';
import { useMyEvents } from '../hooks/useEvents';
import { useWorldEvents } from '../hooks/useEvents';
import { AppContext } from '../../App';
import { deriveLocalEvents } from '../lib/locality';

// LEONA avatar image
const leonaAvatar = require('../assets/leona-avatar.png');

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOpts = { headerShown: false, contentStyle: { backgroundColor: colors.bg } };

const MapStack = () => (
  <Stack.Navigator screenOptions={screenOpts}>
    <Stack.Screen name="MapHome" component={MapHomeScreen} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
  </Stack.Navigator>
);

const AlertsStack = () => (
  <Stack.Navigator screenOptions={screenOpts}>
    <Stack.Screen name="AlertsList" component={AlertsScreen} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
  </Stack.Navigator>
);

const LeonaStack = () => (
  <Stack.Navigator screenOptions={screenOpts}>
    <Stack.Screen name="LeonaChat" component={LeonaChatScreen} />
    <Stack.Screen name="Call" component={CallScreen} />
  </Stack.Navigator>
);

const CommunityStack = () => (
  <Stack.Navigator screenOptions={screenOpts}>
    <Stack.Screen name="CommunityFeed" component={CommunityScreen} />
    <Stack.Screen name="Thread" component={ThreadScreen} />
    <Stack.Screen name="Call" component={CallScreen} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
  </Stack.Navigator>
);

const MoreStack = () => (
  <Stack.Navigator screenOptions={screenOpts}>
    <Stack.Screen name="MoreMenu" component={MoreScreen} />
    <Stack.Screen name="GlobalRisk" component={BriefsScreen} />
    <Stack.Screen name="Inbox" component={InboxScreen} />
    <Stack.Screen name="Thread" component={ThreadScreen} />
    <Stack.Screen name="Call" component={CallScreen} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    <Stack.Screen name="LeonaChat" component={LeonaChatScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="DataSources" component={DataSourcesScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} />
  </Stack.Navigator>
);

// ── Globe icon for MAP tab ──
const GlobeIcon = ({ color }) => (
  <View style={[styles.globeIcon, { borderColor: color }]}>
    {/* Horizontal equator line */}
    <View style={[styles.globeEquator, { backgroundColor: color }]} />
    {/* Vertical meridian (ellipse via border) */}
    <View style={[styles.globeMeridian, { borderColor: color }]} />
  </View>
);

// ── Animated sonar icon for FEED tab ──
const SonarIcon = ({ color, focused }) => {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      const createPulse = (anim, delay) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
      const a1 = createPulse(pulse1, 0);
      const a2 = createPulse(pulse2, 500);
      a1.start();
      a2.start();
      return () => { a1.stop(); a2.stop(); };
    } else {
      pulse1.setValue(0);
      pulse2.setValue(0);
    }
  }, [focused]);

  const ringStyle = (anim) => ({
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: color,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) }],
  });

  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      {/* Center dot */}
      <View style={[styles.sonarDot, { backgroundColor: color }]} />
      {/* Pulse rings (only animate when focused) */}
      {focused && <Animated.View style={ringStyle(pulse1)} />}
      {focused && <Animated.View style={ringStyle(pulse2)} />}
      {/* Static rings when not focused */}
      {!focused && (
        <>
          <View style={[styles.sonarRingStatic, { borderColor: color, width: 14, height: 14, borderRadius: 7, opacity: 0.4 }]} />
          <View style={[styles.sonarRingStatic, { borderColor: color, width: 22, height: 22, borderRadius: 11, opacity: 0.2 }]} />
        </>
      )}
    </View>
  );
};

// ── Standard tab icons (Alerts, More) ──
const TabIcon = ({ label, color, focused }) => {
  const icons = {
    ALERTS: '⚠',
    MORE: '···',
  };
  return (
    <Text style={{
      fontSize: label === 'MORE' ? 14 : 18,
      color,
      marginTop: -2,
      fontWeight: focused ? '700' : '400',
    }}>
      {icons[label] || '•'}
    </Text>
  );
};

const LeonaTabButton = ({ onPress, accessibilityState }) => {
  const focused = accessibilityState?.selected;
  return (
    <TouchableOpacity style={styles.leonaBtnWrap} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.leonaBtn, focused && styles.leonaBtnFocused]}>
        <Image
          source={leonaAvatar}
          style={styles.leonaImage}
        />
      </View>
      <Text style={[styles.leonaLabel, focused && styles.leonaLabelFocused]}>LEONA</Text>
    </TouchableOpacity>
  );
};

export const AppNavigator = () => {
  const { userConfig } = useContext(AppContext);
  const { events: myEvents } = useMyEvents();
  const { events: worldEvents } = useWorldEvents();
  const localEvents = useMemo(
    () => deriveLocalEvents(myEvents, worldEvents, userConfig?.location),
    [myEvents, userConfig?.location, worldEvents]
  );
  const alertsBadge = localEvents.length > 0 ? localEvents.length : undefined;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="MapTab"
        component={MapStack}
        options={{
          title: 'MAP',
          tabBarIcon: ({ color, focused }) => <GlobeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={AlertsStack}
        options={{
          title: 'ALERTS',
          tabBarBadge: alertsBadge,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color, focused }) => <TabIcon label="ALERTS" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LeonaTab"
        component={LeonaStack}
        options={{
          title: '',
          tabBarButton: (props) => <LeonaTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={CommunityStack}
        options={{
          title: 'FEED',
          tabBarIcon: ({ color, focused }) => <SonarIcon color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{
          title: 'MORE',
          tabBarIcon: ({ color, focused }) => <TabIcon label="MORE" color={color} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#06091C',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 6,
    height: 75,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.critical,
    fontWeight: '700',
    fontSize: 9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
  },
  feedBadge: {
    backgroundColor: colors.blue,
    fontWeight: '700',
    fontSize: 9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
  },

  // Globe icon (MAP)
  globeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeEquator: {
    position: 'absolute',
    width: '100%',
    height: 1,
  },
  globeMeridian: {
    width: 10,
    height: 16,
    borderRadius: 5,
    borderWidth: 1,
  },

  // Sonar icon (FEED)
  sonarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 2,
  },
  sonarRingStatic: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  leonaBtnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  leonaBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(107,72,255,0.15)',
    borderWidth: 2,
    borderColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    marginTop: -4,
    shadowColor: colors.purple,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    overflow: 'hidden',
  },
  leonaBtnFocused: {
    borderColor: colors.purpleLight,
    shadowOpacity: 0.6,
  },
  leonaImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  leonaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.5,
  },
  leonaLabelFocused: {
    color: colors.purpleLight,
  },
});
