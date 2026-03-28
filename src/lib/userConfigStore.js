let SecureStore = null;

try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const STORAGE_KEY = 'leona_user_config_v1';
let memoryCache = null;

async function readStore() {
  if (memoryCache) {
    return memoryCache;
  }

  try {
    if (SecureStore?.getItemAsync) {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      memoryCache = raw ? JSON.parse(raw) : {};
      return memoryCache;
    }
  } catch (err) {
    console.warn('[UserConfigStore] Read failed:', err.message);
  }

  memoryCache = {};
  return memoryCache;
}

async function writeStore(nextValue) {
  memoryCache = nextValue;

  try {
    if (SecureStore?.setItemAsync) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(nextValue));
    }
  } catch (err) {
    console.warn('[UserConfigStore] Write failed:', err.message);
  }
}

export async function getStoredUserConfig() {
  return await readStore();
}

export async function mergeStoredUserConfig(patch = {}) {
  const current = await readStore();
  const next = {
    ...current,
    ...patch,
  };
  await writeStore(next);
  return next;
}

export async function clearStoredUserConfig() {
  memoryCache = {};

  try {
    if (SecureStore?.deleteItemAsync) {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[UserConfigStore] Clear failed:', err.message);
  }
}
