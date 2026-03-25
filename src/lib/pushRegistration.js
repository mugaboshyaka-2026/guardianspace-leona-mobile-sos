import { Platform } from 'react-native';
import { registerDevicePushToken } from './api';

let SecureStore = null;

try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const TOKEN_KEY = 'leona_last_registered_expo_push_token_v1';

async function getStoredToken() {
  try {
    if (SecureStore?.getItemAsync) {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
  } catch (err) {
    console.warn('[PushRegistration] Stored token read failed:', err.message);
  }
  return null;
}

async function setStoredToken(token) {
  try {
    if (SecureStore?.setItemAsync) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (err) {
    console.warn('[PushRegistration] Stored token write failed:', err.message);
  }
}

export async function syncPushToken(pushToken) {
  if (!pushToken) {
    return { synced: false, reason: 'missing_token' };
  }

  const currentToken = String(pushToken).trim();
  const previousToken = await getStoredToken();

  if (previousToken && previousToken === currentToken) {
    return { synced: false, reason: 'already_registered' };
  }

  try {
    await registerDevicePushToken({
      token: currentToken,
      platform: Platform.OS,
      device_name: `${Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web'} device`,
    });
  } catch (err) {
    if (err?.status === 404) {
      console.warn('[PushRegistration] Backend push registration endpoint not available');
      return { synced: false, reason: 'endpoint_missing' };
    }
    throw err;
  }

  await setStoredToken(currentToken);
  return { synced: true };
}
