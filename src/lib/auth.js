import React, { createContext, useContext, useEffect } from 'react';
import { setAuthToken } from './api';
import { initRealtime, disconnectRealtime } from './realtime';

const AuthContext = createContext({
  isSignedIn: false,
  isLoaded: false,
  user: null,
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

function hasClerkExpo() {
  try {
    require('@clerk/clerk-expo');
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  if (hasClerkExpo()) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }

  console.log('[LEONA Auth] Clerk SDK not found - running in dev/mock mode');

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: true,
        isLoaded: true,
        user: {
          id: 'dev_user',
          firstName: 'Kian',
          lastName: 'Mirshahi',
          emailAddresses: [{ emailAddress: 'kian@guardianspace.com' }],
          imageUrl: null,
        },
        signOut: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function ClerkAuthProvider({ children }) {
  const { ClerkProvider } = require('@clerk/clerk-expo');
  const { CLERK_PUBLISHABLE_KEY } = require('../config/env');

  let tokenCache;
  try {
    const SecureStore = require('expo-secure-store');
    tokenCache = {
      async getToken(key) {
        return SecureStore.getItemAsync(key);
      },
      async saveToken(key, value) {
        return SecureStore.setItemAsync(key, value);
      },
    };
  } catch {
    tokenCache = undefined;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}

function ClerkAuthBridge({ children }) {
  const { useAuth: useClerkAuth, useUser: useClerkUser } = require('@clerk/clerk-expo');
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const { user } = useClerkUser();

  useEffect(() => {
    if (isSignedIn && getToken) {
      setAuthToken(getToken);
      initRealtime().catch(() => {});
      return;
    }

    setAuthToken(null);
    disconnectRealtime();
  }, [isSignedIn, getToken]);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        isLoaded: !!isLoaded,
        user: user || null,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
