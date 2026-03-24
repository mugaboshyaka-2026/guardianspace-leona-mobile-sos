let SecureStore = null;

try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const STORAGE_KEY = 'leona_settings_preferences_v1';
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
    console.warn('[SettingsPreferences] Read failed:', err.message);
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
    console.warn('[SettingsPreferences] Write failed:', err.message);
  }
}

export async function getStoredSettingsPreferences() {
  return await readStore();
}

export async function mergeStoredSettingsPreferences(patch = {}) {
  const current = await readStore();
  const next = {
    ...current,
    ...patch,
  };
  await writeStore(next);
  return next;
}

export async function removeStoredSettingsPreferences(keys = []) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return await readStore();
  }

  const current = await readStore();
  const next = { ...current };
  keys.forEach((key) => {
    delete next[key];
  });
  await writeStore(next);
  return next;
}
