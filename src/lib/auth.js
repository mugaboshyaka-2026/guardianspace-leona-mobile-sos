import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setAuthToken } from './api';
import { initRealtime, disconnectRealtime } from './realtime';

const AuthContext = createContext({
  isSignedIn: false,
  isLoaded: true,
  authReady: false,
  user: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
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

  return <MockAuthProvider>{children}</MockAuthProvider>;
}

function MockAuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const signIn = useCallback(async ({ email }) => {
    if (!email?.trim()) {
      throw new Error('Email is required.');
    }

    setUser({
      id: 'dev_user',
      firstName: email.trim().split('@')[0],
      lastName: '',
      emailAddresses: [{ emailAddress: email.trim().toLowerCase() }],
      imageUrl: null,
    });
  }, []);

  const signUp = useCallback(async ({ fullName, email }) => {
    if (!fullName?.trim() || !email?.trim()) {
      throw new Error('Name and email are required.');
    }

    const parts = fullName.trim().split(/\s+/);
    setUser({
      id: 'dev_user',
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
      emailAddresses: [{ emailAddress: email.trim().toLowerCase() }],
      imageUrl: null,
    });
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    disconnectRealtime();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!user,
        isLoaded: true,
        authReady: !!user,
        user,
        signIn,
        signUp,
        signOut,
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
  const {
    useAuth: useClerkAuth,
    useUser: useClerkUser,
    useSignIn,
    useSignUp,
  } = require('@clerk/clerk-expo');

  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const { user } = useClerkUser();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (isSignedIn && getToken) {
      setAuthToken(getToken);
      setAuthReady(true);
      console.log('[Auth] token bridge ready');
      initRealtime().catch(() => {});
      return;
    }

    setAuthToken(null);
    setAuthReady(false);
    disconnectRealtime();
  }, [isSignedIn, getToken]);

  const performSignIn = useCallback(async ({ email, password }) => {
    if (!signInLoaded) {
      throw new Error('Authentication is still loading.');
    }

    const result = await signIn.create({
      identifier: email.trim(),
      password,
    });

    if (result.status !== 'complete') {
      throw new Error('Sign-in requires additional verification.');
    }

    await setActiveSignIn({ session: result.createdSessionId });
  }, [signIn, signInLoaded, setActiveSignIn]);

  const performSignUp = useCallback(async ({ fullName, email, password }) => {
    if (!signUpLoaded) {
      throw new Error('Authentication is still loading.');
    }

    const nameParts = (fullName || '').trim().split(/\s+/);
    const result = await signUp.create({
      emailAddress: email.trim(),
      password,
      firstName: nameParts[0] || undefined,
      lastName: nameParts.slice(1).join(' ') || undefined,
    });

    if (result.status !== 'complete') {
      throw new Error('Account created, but Clerk still requires verification before sign-in completes.');
    }

    await setActiveSignUp({ session: result.createdSessionId });
  }, [setActiveSignUp, signUp, signUpLoaded]);

  const performSignOut = useCallback(async () => {
    setAuthToken(null);
    disconnectRealtime();
    await signOut();
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        isLoaded: !!isLoaded,
        authReady,
        user: user || null,
        signIn: performSignIn,
        signUp: performSignUp,
        signOut: performSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
