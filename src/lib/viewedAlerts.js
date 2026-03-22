let SecureStore = null;

try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const STORAGE_KEY = 'leona_viewed_alert_ids_v1';
let memoryCache = null;

function normalizeId(value) {
  if (!value && value !== 0) return '';
  return String(value).trim();
}

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
    console.warn('[ViewedAlerts] Read failed:', err.message);
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
    console.warn('[ViewedAlerts] Write failed:', err.message);
  }
}

export async function getViewedAlertsMap() {
  return await readStore();
}

export async function markAlertViewed(eventOrId) {
  const rawId = typeof eventOrId === 'object'
    ? eventOrId?.id || eventOrId?.event_id
    : eventOrId;
  const id = normalizeId(rawId);

  if (!id) {
    return null;
  }

  const current = await readStore();
  const next = {
    ...current,
    [id]: new Date().toISOString(),
  };
  await writeStore(next);
  return next[id];
}
