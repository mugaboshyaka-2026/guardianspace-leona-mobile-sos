export const DEFAULT_DATA_PREFERENCES = {
  offline_cache: true,
  data_saver_mode: false,
};

let currentPreferences = { ...DEFAULT_DATA_PREFERENCES };
const listeners = new Set();

export function normalizeDataPreferences(source = {}) {
  return {
    offline_cache: source?.offline_cache ?? source?.offlineCache ?? DEFAULT_DATA_PREFERENCES.offline_cache,
    data_saver_mode: source?.data_saver_mode ?? source?.dataSaverMode ?? DEFAULT_DATA_PREFERENCES.data_saver_mode,
  };
}

export function getCurrentDataPreferences() {
  return currentPreferences;
}

export function setCurrentDataPreferences(nextSource = {}) {
  currentPreferences = normalizeDataPreferences(nextSource);
  listeners.forEach((listener) => listener(currentPreferences));
  return currentPreferences;
}

export function subscribeToDataPreferences(listener) {
  listeners.add(listener);
  listener(currentPreferences);
  return () => {
    listeners.delete(listener);
  };
}
