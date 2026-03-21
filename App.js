import React, { useState, createContext, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors } from './src/theme';
import { useAOIs, resetEventCache } from './src/hooks/useEvents';

// App context for onboarding completion
export const AppContext = createContext();

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

  if (!isLoaded || (isSignedIn && aoisLoading)) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  const hasConfiguredAois = aois.length > 0;
  const showApp = onboardingComplete || (isSignedIn && hasConfiguredAois);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={colors.bg} />
        {showApp ? <AppNavigator /> : <OnboardingScreen />}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
