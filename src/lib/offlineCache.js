let SecureStore = null;

try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const STORAGE_KEY = 'leona_offline_dataset_cache_v1';
const EMPTY_CACHE = {};
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
    console.warn('[OfflineCache] Read failed:', err.message);
  }

  memoryCache = { ...EMPTY_CACHE };
  return memoryCache;
}

async function writeStore(nextValue) {
  memoryCache = nextValue;

  try {
    if (SecureStore?.setItemAsync) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(nextValue));
    }
  } catch (err) {
    console.warn('[OfflineCache] Write failed:', err.message);
  }
}

export async function getOfflineDataset(cacheKey) {
  const store = await readStore();
  return store?.[cacheKey] || null;
}

export async function setOfflineDataset(cacheKey, data) {
  const store = await readStore();
  const nextValue = {
    ...store,
    [cacheKey]: {
      data,
      updatedAt: Date.now(),
    },
  };
  await writeStore(nextValue);
  return nextValue[cacheKey];
}

export async function clearOfflineDataset(cacheKey) {
  const store = await readStore();
  if (!store?.[cacheKey]) {
    return;
  }

  const nextValue = { ...store };
  delete nextValue[cacheKey];
  await writeStore(nextValue);
}
