import React, { useState, createContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { AuthProvider } from './src/lib/auth';
import { colors } from './src/theme';

// App context for onboarding completion
export const AppContext = createContext();

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userConfig, setUserConfig] = useState(null);

  const handleOnboardingComplete = (config) => {
    setUserConfig(config);
    setOnboardingComplete(true);
  };

  return (
    <AuthProvider>
      <AppContext.Provider value={{ userConfig, handleOnboardingComplete }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor={colors.bg} />
            {!onboardingComplete ? (
              <OnboardingScreen />
            ) : (
              <AppNavigator />
            )}
          </NavigationContainer>
        </GestureHandlerRootView>
      </AppContext.Provider>
    </AuthProvider>
  );
}
