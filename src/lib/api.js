/**
 * LEONA Mobile API Client
 * Mirrors leona-web/lib/api.ts — same endpoints, same contract.
 * Points at FastAPI backend (same REST contract as Express).
 */
import { API_URL } from '../config/env';

// ── Token Management ──
let _getToken = null;

/** Call once with Clerk's getToken function after sign-in. */
export function setAuthToken(getTokenFn) {
  _getToken = getTokenFn;
}

export function isTimeoutError(error) {
  return error?.message === 'Request timed out';
}

export function normalizeAlertToEvent(alert = {}) {
  const lat = parseFloat(alert.event_lat ?? alert.lat ?? alert.latitude ?? '');
  const lng = parseFloat(alert.event_lng ?? alert.lng ?? alert.longitude ?? '');
  const normalizedType = normalizeType(alert.event_category || alert.category || alert.type || '');
  const baseId = alert.event_id || alert.id || `${normalizedType}:${alert.created_at || Date.now()}`;

  return {
    ...alert,
    id: String(baseId),
    alert_id: alert.id ? String(alert.id) : null,
    event_id: alert.event_id ? String(alert.event_id) : null,
    type: normalizedType,
    category: alert.event_category || alert.category || normalizedType,
    title: alert.event_title || alert.title || 'Alert',
    body: alert.body || '',
    description: alert.body || alert.description || '',
    location: alert.matched_aoi_name || alert.location_name || alert.location || '',
    lat: Number.isNaN(lat) ? 0 : lat,
    lng: Number.isNaN(lng) ? 0 : lng,
    severity: normalizeSeverity(alert.event_severity || alert.severity || 'high'),
    created_at: alert.created_at || alert.sent_at || new Date().toISOString(),
    updated_at: alert.sent_at || alert.updated_at || alert.created_at || new Date().toISOString(),
    source: alert.channel || alert.type || 'alert',
  };
}

/** Base fetch wrapper with auth, timeout, and error handling. */
async function request(path, options = {}) {
  const { method = 'GET', body, params, timeout = 30000, headers: customHeaders } = options;

  // Build URL with query params
  let url = `${API_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }

  // Build headers
  const headers = { ...(customHeaders || {}) };
  if (body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  let hasAuthHeader = false;
  let token = null;
  if (_getToken) {
    try {
      token = await _getToken();
    } catch (e) {
      console.warn('[LEONA API] Token fetch failed:', e.message);
    }
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    hasAuthHeader = true;
  }

  console.log('[LEONA API] Request', {
    method,
    url,
    hasAuthHeader,
    hasBody: !!body,
    params: params || null,
  });

  // Fetch with timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined
        ? headers['Content-Type'] === 'application/json'
          ? JSON.stringify(body)
          : body
        : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);

    console.log('[LEONA API] Response', {
      method,
      url,
      status: res.status,
      ok: res.ok,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      console.warn('[LEONA API] Error body', {
        method,
        url,
        status: res.status,
        body: errorBody,
      });
      const err = new Error(`API ${res.status}: ${errorBody}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) {
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }

    const text = await res.text();
    return text ? { raw: text } : null;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw e;
  }
}

// ── Normalize helpers (match web client exactly) ──

const normalizeSeverity = (s) => {
  if (!s) return 'monitoring';
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'medium') return 'elevated';
  if (s === 'low') return 'monitoring';
  return s;
};

const TYPE_MAP = {
  wildfire: 'wildfire', wf: 'wildfire', wildfires: 'wildfire',
  earthquake: 'earthquake', eq: 'earthquake',
  flood: 'flood', fl: 'flood', floods: 'flood', flooding: 'flood',
  disaster: 'disaster',
  cyclone: 'hurricane', tc: 'hurricane', hurricane: 'hurricane',
  tropical_cyclone: 'hurricane', typhoon: 'hurricane',
  volcano: 'volcano', vo: 'volcano', eruption: 'volcano',
  drought: 'drought',
  tsunami: 'tsunami',
  cyber: 'cyber', cyberattack: 'cyber', ransomware: 'cyber',
  geopolitical: 'conflict', conflict: 'conflict', defense: 'conflict',
  war: 'conflict', military: 'conflict',
  industrial: 'industrial', explosion: 'industrial',
  civil: 'civil', protest: 'civil', riot: 'civil',
  terror: 'terror', terrorism: 'terror',
  chemical: 'chemical', cbrn: 'chemical',
  vessel: 'vessel', maritime: 'vessel',
  aircraft: 'aircraft', aviation: 'aircraft',
  power: 'power', blackout: 'power',
  market: 'market', energy: 'market', financial: 'market',
  weather: 'weather', storm: 'weather',
  health: 'health', disease: 'health', pandemic: 'health',
  news: 'news',
};

const normalizeType = (c) => {
  if (!c) return 'unknown';
  return TYPE_MAP[c.toLowerCase()] || c;
};

const hasStableIdValue = (value) => value !== undefined && value !== null && value !== '';

const buildStableEventId = (event, normalizedType, lat, lng) => {
  const identityParts = [
    normalizedType || 'unknown',
    event.title || event.headline || event.name || '',
    event.location_name || event.location || event.country_code || '',
    event.source || '',
    event.url || '',
    event.created_at || event.event_time || '',
    Number.isNaN(lat) ? '' : String(lat),
    Number.isNaN(lng) ? '' : String(lng),
    event.severity || '',
  ];

  return `evt-${identityParts.join('|').toLowerCase()}`;
};

const normalizeEvent = (e) => {
  const lat = parseFloat(e.lat ?? e.latitude ?? e.location_lat ?? '');
  const lng = parseFloat(e.lng ?? e.lon ?? e.longitude ?? e.location_lng ?? e.location_lon ?? '');
  const normalizedType = normalizeType(e.category || e.type || '');
  const normalizedId = hasStableIdValue(e.id)
    ? String(e.id)
    : hasStableIdValue(e.event_id)
      ? String(e.event_id)
      : buildStableEventId(e, normalizedType, lat, lng);
  return {
    ...e,
    id: normalizedId,
    type: normalizedType,
    title: e.title || e.headline || e.name || 'Unknown Event',
    lat: isNaN(lat) ? 0 : lat,
    lng: isNaN(lng) ? 0 : lng,
    severity: normalizeSeverity(e.severity),
    created_at: e.created_at || e.event_time || new Date().toISOString(),
    location: e.location_name || e.location || e.country_code || '',
    description: e.description || '',
    url: e.url || '',
    source: e.source || '',
  };
};


// ══════════════════════════════════════════════════════
// PUBLIC API — matches web client function signatures
// ══════════════════════════════════════════════════════

// ── Events ──

export async function fetchMyEvents(scope = 'all') {
  const data = await request('/api/events', { params: { view: 'my_events', scope } });
  return (data.events || []).map(normalizeEvent);
}

export async function fetchWorldEvents() {
  const data = await request('/api/events', { params: { view: 'world_events' } });
  return (data.events || []).map(normalizeEvent);
}

export async function fetchEvents(params = {}) {
  const data = await request('/api/events', { params });
  return (data.events || []).map(normalizeEvent).filter((e) => e.lat !== 0 && e.lng !== 0);
}

// ── LEONA AI ──

export async function sendLeonaMessage(messages) {
  const data = await request('/api/leona/chat', {
    method: 'POST',
    body: { messages },
    timeout: 90000,
  });
  return data;
}

export async function getLeonaBrief(context) {
  const body = typeof context === 'string'
    ? { topic: context }
    : (context && typeof context === 'object' ? context : {});
  const data = await request('/api/leona/brief', { method: 'POST', body });
  return data;
}

// ── Alerts ──

export async function fetchAlerts(params = {}) {
  return await request('/api/alerts', { params });
}

export async function markAlertRead(alertId) {
  return await request(`/api/alerts/${alertId}/read`, {
    method: 'PATCH',
  });
}

export async function markAllAlertsRead() {
  return await request('/api/alerts/read-all', {
    method: 'PATCH',
  });
}

export async function registerDevicePushToken(payload) {
  return await request('/api/users/me/devices', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchNotificationPreferences() {
  return await request('/api/users/me/notifications/preferences');
}

export async function updateNotificationPreferences(patch) {
  return await request('/api/users/me/notifications/preferences', {
    method: 'PATCH',
    body: patch,
  });
}

export async function fetchRegisteredDevices() {
  const data = await request('/api/users/me/devices');
  return data?.devices || [];
}

export async function unregisterDevice(deviceId) {
  return await request(`/api/users/me/devices/${deviceId}`, {
    method: 'DELETE',
  });
}

// ── Data Sources ──

export async function fetchDataSources() {
  const data = await request('/api/datasources');
  return data.sources || [];
}

// ── Related News ──
// Python FastAPI returns related_news inside GET /api/events/:id
// so we fetch the event detail and extract the related_news array.

export async function getRelatedNews(eventId) {
  const data = await request(`/api/events/${eventId}/related-news`);
  return { articles: data?.articles || [] };
}

// ── AOIs ──

export async function fetchMyAOIs() {
  return await request('/api/users/me/aois');
}

export async function addAOI(aoi) {
  return await request('/api/users/me/aois', { method: 'POST', body: aoi });
}

export async function updateAOI(id, patch) {
  return await request(`/api/users/me/aois/${id}`, { method: 'PATCH', body: patch });
}

export async function deleteAOI(id) {
  return await request(`/api/users/me/aois/${id}`, { method: 'DELETE' });
}

export async function setPrimaryAOI(id) {
  return await request(`/api/users/me/aois/${id}/primary`, { method: 'POST' });
}

// ── Favorites ──
// Python FastAPI mounts favorites at /api/favorites (not /api/users/me/favorites)

export async function fetchMyFavorites() {
  return await request('/api/favorites');
}

export async function addFavorite(eventId, eventData) {
  return await request('/api/favorites', {
    method: 'POST', body: { event_id: eventId, event_data: eventData },
  });
}

export async function removeFavorite(eventId) {
  return await request(`/api/favorites/event/${eventId}`, { method: 'DELETE' });
}

export async function checkFavorite(eventId) {
  return await request(`/api/favorites/check/${eventId}`);
}

// ── Layers ──

export async function fetchLayerSummary() {
  return await request('/api/layers/summary');
}

export async function fetchNewsRegional() {
  return await request('/api/layers/news');
}

// ── Ably Token ──

export async function getAblyToken() {
  return await request('/api/realtime/token');
}

// ── Tavus CVI ──

export async function startTavusConversation(context) {
  return await request('/api/tavus/conversation', {
    method: 'POST', body: context || {},
  });
}

export async function getTavusConversation() {
  return await request('/api/tavus/conversation');
}

export async function endTavusConversation() {
  return await request('/api/tavus/conversation', { method: 'DELETE' });
}

export async function syncTavusPersona(body = {}) {
  return await request('/api/tavus/sync-persona', { method: 'POST', body });
}

export async function getTavusBrief(body = {}) {
  return await request('/api/tavus/brief', { method: 'POST', body });
}

export async function sendTavusUtterance(body = {}) {
  return await request('/api/tavus/utterance', { method: 'POST', body });
}

export async function tavusChatCompletions(body = {}) {
  return await request('/api/tavus/llm/chat/completions', { method: 'POST', body });
}

export async function tavusLlmProxy(body = {}) {
  return await request('/api/tavus/llm', { method: 'POST', body });
}

// ── User Profile ──

export async function fetchUserProfile() {
  return await request('/api/users/me');
}

export async function updateUserProfile(patch) {
  return await request('/api/users/me', { method: 'PATCH', body: patch });
}
