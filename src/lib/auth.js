/**
 * LEONA Mobile — Auth Context
 * Wraps Clerk auth and exposes user/session to the entire app.
 * Falls back gracefully when Clerk SDK is not installed yet.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setAuthToken } from './api';
import { initRealtime, disconnectRealtime } from './realtime';

// ── Context ──
const AuthContext = createContext({
  isSignedIn: false,
  isLoaded: false,
  user: null,
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider — wraps Clerk's ClerkProvider + hooks.
 *
 * When @clerk/clerk-expo is installed:
 *   import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
 *
 * Until then, this shim auto-signs-in so existing screens keep working.
 */
export function AuthProvider({ children }) {
  const [clerkAvailable, setClerkAvailable] = useState(false);

  useEffect(() => {
    // Check if Clerk SDK is installed
    try {
      require('@clerk/clerk-expo');
      setClerkAvailable(true);
    } catch {
      console.log('[LEONA Auth] Clerk SDK not found — running in dev/mock mode');
      setClerkAvailable(false);
    }
  }, []);

  if (clerkAvailable) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }

  // Dev fallback — pretend signed in, no real token
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

/**
 * Real Clerk-based auth provider.
 * Only instantiated when @clerk/clerk-expo is available.
 */
function ClerkAuthProvider({ children }) {
  // These imports are deferred so the module doesn't crash if Clerk isn't installed
  const { ClerkProvider, useAuth: useClerkAuth, useUser: useClerkUser } = require('@clerk/clerk-expo');
  const { CLERK_PUBLISHABLE_KEY } = require('../config/env');

  // expo-secure-store token cache for Clerk
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
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}

/**
 * Bridge component that sits inside ClerkProvider and wires
 * Clerk's getToken to our API client + starts Ably realtime.
 */
function ClerkAuthBridge({ children }) {
  const { useAuth: useClerkAuth, useUser: useClerkUser } = require('@clerk/clerk-expo');
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const { user } = useClerkUser();

  useEffect(() => {
    if (isSignedIn && getToken) {
      // Wire Clerk's getToken into our fetch wrapper
      setAuthToken(getToken);
      // Start Ably connection
      initRealtime().catch(() => {});
    } else {
      setAuthToken(null);
      disconnectRealtime();
    }
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
