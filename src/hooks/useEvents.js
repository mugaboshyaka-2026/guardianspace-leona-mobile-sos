/**
 * LEONA Mobile — Shared event hooks
 * Centralizes API calls + caching so Map, Alerts, Briefs screens
 * all share the same data without redundant fetches.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchMyEvents,
  fetchWorldEvents,
  fetchAlerts,
  fetchMyAOIs,
  fetchDataSources,
  fetchUserProfile,
  fetchMyFavorites,
  sendLeonaMessage,
  getLeonaBrief,
  getRelatedNews,
} from '../lib/api';
import { onEventUpdate, subscribeToAOI } from '../lib/realtime';

// Simple in-memory cache
const cache = {
  myEvents: null,
  worldEvents: null,
  alerts: null,
  aois: null,
  dataSources: null,
  profile: null,
  favorites: null,
  lastFetch: {},
};

const STALE_MS = 60_000; // 1 min
const REALTIME_REFRESH_DEBOUNCE_MS = 1500;
const subscribedAoiIds = new Set();
const initialLeonaMessages = [
  {
    id: 'msg0',
    type: 'agent',
    text: "I'm monitoring active events globally. How can I help you today?",
  },
];
const leonaChatStore = {
  messages: initialLeonaMessages,
  sending: false,
  listeners: new Set(),
  queuedRequest: null,
};

function emitLeonaChat() {
  leonaChatStore.listeners.forEach((listener) =>
    listener({
      messages: leonaChatStore.messages,
      sending: leonaChatStore.sending,
      hasQueuedRequest: !!leonaChatStore.queuedRequest,
    })
  );
}

function updateLeonaChat(partial) {
  Object.assign(leonaChatStore, partial);
  emitLeonaChat();
}

async function executeLeonaChatSend(userText, options = {}) {
  const pendingId = options.pendingMessageId || `pending-${Date.now()}`;
  const startedAt = Date.now();
  console.log('[useLeonaChat] send:start', {
    requestKind: options.requestKind || 'generic',
    hasPendingText: !!options.pendingText,
    promptLength: userText.length,
  });

  const nextMessages = options.skipLocalEcho
    ? leonaChatStore.messages
    : [...leonaChatStore.messages, { id: Date.now().toString(), type: 'user', text: userText }];
  if (options.pendingText && !options.skipLocalEcho) {
    nextMessages.push({
      id: pendingId,
      type: 'agent',
      text: options.pendingText,
      pending: true,
    });
  }
  updateLeonaChat({ messages: nextMessages, sending: true });

  try {
    const apiMessages = nextMessages
      .filter((m) => !m.pending)
      .map((m) => ({
        role: m.type === 'agent' ? 'assistant' : 'user',
        content: m.text,
      }));
    const contextMessage = buildLeonaContextMessage(options.context);
    const requestMessages = contextMessage
      ? apiMessages.map((message, index) => {
          if (index !== apiMessages.length - 1 || message.role !== 'user') {
            return message;
          }
          return {
            ...message,
            content: `${contextMessage}\n\nUser request: ${message.content}`,
          };
        })
      : apiMessages;

    const data = await sendLeonaMessage(requestMessages);
    const reply = data.message || data.reply || data.content || 'Processing your request...';
    console.log('[useLeonaChat] send:success', {
      requestKind: options.requestKind || 'generic',
      elapsedMs: Date.now() - startedAt,
      replyLength: reply.length,
    });
    const agentMsg = { id: (Date.now() + 1).toString(), type: 'agent', text: reply };
    updateLeonaChat({
      messages: [...leonaChatStore.messages.filter((msg) => msg.id !== pendingId), agentMsg],
    });
  } catch (err) {
    console.warn('[useLeonaChat] send:failed', {
      requestKind: options.requestKind || 'generic',
      elapsedMs: Date.now() - startedAt,
      error: err.message,
    });
    const agentMsg = {
      id: (Date.now() + 1).toString(),
      type: 'agent',
      text: options.failureText || 'I\'m having trouble connecting to the server. Please try again shortly.',
    };
    updateLeonaChat({
      messages: [...leonaChatStore.messages.filter((msg) => msg.id !== pendingId), agentMsg],
    });
  } finally {
    console.log('[useLeonaChat] send:complete', {
      requestKind: options.requestKind || 'generic',
      elapsedMs: Date.now() - startedAt,
    });
    updateLeonaChat({ sending: false });
    if (leonaChatStore.queuedRequest) {
      const nextRequest = leonaChatStore.queuedRequest;
      leonaChatStore.queuedRequest = null;
      if (nextRequest.queuedPendingId || nextRequest.queuedUserMsgId) {
        updateLeonaChat({
          messages: leonaChatStore.messages.filter((message) => (
            message.id !== nextRequest.queuedPendingId && message.id !== nextRequest.queuedUserMsgId
          )),
        });
      }
      executeLeonaChatSend(nextRequest.userText, nextRequest.options);
    }
  }
}

function buildLeonaContextMessage(context) {
  if (!context) {
    return null;
  }

  const serialized = JSON.stringify(context);
  if (!serialized || serialized === '{}') {
    return null;
  }

  return `Current user context: ${serialized}`;
}

export function resetEventCache() {
  cache.myEvents = null;
  cache.worldEvents = null;
  cache.alerts = null;
  cache.aois = null;
  cache.dataSources = null;
  cache.profile = null;
  cache.favorites = null;
  cache.lastFetch = {};
  subscribedAoiIds.clear();
  if (myEventsStore.refreshTimeout) {
    clearTimeout(myEventsStore.refreshTimeout);
    myEventsStore.refreshTimeout = null;
  }
  if (worldEventsStore.refreshTimeout) {
    clearTimeout(worldEventsStore.refreshTimeout);
    worldEventsStore.refreshTimeout = null;
  }
  myEventsStore.refreshInFlight = false;
  myEventsStore.pendingRefresh = false;
  myEventsStore.state = { events: [], loading: false, error: null };
  worldEventsStore.refreshInFlight = false;
  worldEventsStore.pendingRefresh = false;
  worldEventsStore.state = { events: [], loading: false, error: null };
  emitSharedEventStore(myEventsStore);
  emitSharedEventStore(worldEventsStore);
  leonaChatStore.messages = initialLeonaMessages;
  leonaChatStore.sending = false;
  emitLeonaChat();
}

function isStale(key) {
  const t = cache.lastFetch[key];
  return !t || Date.now() - t > STALE_MS;
}

export function getRefreshIntervalMs(value) {
  switch (value) {
    case '30s':
      return 30_000;
    case '1m':
      return 60_000;
    case '5m':
      return 300_000;
    case '15m':
      return 900_000;
    default:
      return 60_000;
  }
}

export function isAccessDeniedError(error) {
  return error?.status === 401 || error?.status === 403;
}

function mergeEventToFront(existing = [], incoming) {
  if (!incoming?.id && !incoming?.event_id) {
    return existing;
  }

  const incomingId = incoming.id || incoming.event_id;
  const normalizedIncoming = {
    ...incoming,
    id: incomingId,
    created_at: incoming.created_at || incoming.event_time || new Date().toISOString(),
  };

  const next = [normalizedIncoming, ...existing.filter((event) => event.id !== incomingId)];
  next.sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });
  return next;
}

function createSharedEventStore(cacheKey) {
  return {
    state: {
      events: cache[cacheKey] || [],
      loading: false,
      error: null,
    },
    listeners: new Set(),
    refreshTimeout: null,
    refreshInFlight: false,
    pendingRefresh: false,
    realtimeUnsub: null,
    subscriberCount: 0,
  };
}

const myEventsStore = createSharedEventStore('myEvents');
const worldEventsStore = createSharedEventStore('worldEvents');

function emitSharedEventStore(store) {
  store.listeners.forEach((listener) => listener(store.state));
}

function updateSharedEventStore(store, patch) {
  store.state = {
    ...store.state,
    ...patch,
  };
  emitSharedEventStore(store);
}

function subscribeSharedEventStore(store, listener) {
  store.listeners.add(listener);
  listener(store.state);
  return () => {
    store.listeners.delete(listener);
  };
}

async function refreshMyEventsStore() {
  if (myEventsStore.refreshInFlight) {
    myEventsStore.pendingRefresh = true;
    return;
  }

  myEventsStore.refreshInFlight = true;
  updateSharedEventStore(myEventsStore, { loading: true, error: null });

  try {
    const data = await fetchMyEvents('all');
    cache.myEvents = data;
    cache.lastFetch.myEvents = Date.now();
    updateSharedEventStore(myEventsStore, { events: data, loading: false, error: null });
  } catch (err) {
    console.warn('[useMyEvents] API failed:', err.message);
    updateSharedEventStore(myEventsStore, { events: [], loading: false, error: err });
  } finally {
    myEventsStore.refreshInFlight = false;
    if (myEventsStore.pendingRefresh) {
      myEventsStore.pendingRefresh = false;
      myEventsStore.refreshTimeout = setTimeout(() => {
        myEventsStore.refreshTimeout = null;
        refreshMyEventsStore();
      }, 0);
    }
  }
}

function scheduleMyEventsRefresh() {
  myEventsStore.pendingRefresh = true;
  if (myEventsStore.refreshTimeout) {
    return;
  }

  myEventsStore.refreshTimeout = setTimeout(() => {
    myEventsStore.refreshTimeout = null;
    myEventsStore.pendingRefresh = false;
    refreshMyEventsStore();
  }, REALTIME_REFRESH_DEBOUNCE_MS);
}

function ensureMyEventsRealtimeSubscription() {
  if (myEventsStore.realtimeUnsub) {
    return;
  }

  myEventsStore.realtimeUnsub = onEventUpdate((msg) => {
    if (!msg?.event) {
      return;
    }

    if (msg.type === 'aoi_alert' || msg.type === 'new' || msg.type === 'update') {
      const next = mergeEventToFront(cache.myEvents || myEventsStore.state.events, msg.event);
      cache.myEvents = next;
      cache.lastFetch.myEvents = Date.now();
      updateSharedEventStore(myEventsStore, { events: next });
      scheduleMyEventsRefresh();
    }
  });
}

function cleanupMyEventsRealtimeSubscription() {
  if (myEventsStore.subscriberCount > 0) {
    return;
  }

  if (myEventsStore.refreshTimeout) {
    clearTimeout(myEventsStore.refreshTimeout);
    myEventsStore.refreshTimeout = null;
  }

  if (myEventsStore.realtimeUnsub) {
    myEventsStore.realtimeUnsub();
    myEventsStore.realtimeUnsub = null;
  }
}

async function refreshWorldEventsStore() {
  if (worldEventsStore.refreshInFlight) {
    worldEventsStore.pendingRefresh = true;
    return;
  }

  worldEventsStore.refreshInFlight = true;
  updateSharedEventStore(worldEventsStore, { loading: true, error: null });

  try {
    const data = await fetchWorldEvents();
    cache.worldEvents = data;
    cache.lastFetch.worldEvents = Date.now();
    updateSharedEventStore(worldEventsStore, { events: data, loading: false, error: null });
  } catch (err) {
    console.warn('[useWorldEvents] API failed:', err.message);
    updateSharedEventStore(worldEventsStore, { events: [], loading: false, error: err });
  } finally {
    worldEventsStore.refreshInFlight = false;
    if (worldEventsStore.pendingRefresh) {
      worldEventsStore.pendingRefresh = false;
      worldEventsStore.refreshTimeout = setTimeout(() => {
        worldEventsStore.refreshTimeout = null;
        refreshWorldEventsStore();
      }, 0);
    }
  }
}

function scheduleWorldEventsRefresh() {
  worldEventsStore.pendingRefresh = true;
  if (worldEventsStore.refreshTimeout) {
    return;
  }

  worldEventsStore.refreshTimeout = setTimeout(() => {
    worldEventsStore.refreshTimeout = null;
    worldEventsStore.pendingRefresh = false;
    refreshWorldEventsStore();
  }, REALTIME_REFRESH_DEBOUNCE_MS);
}

function ensureWorldEventsRealtimeSubscription() {
  if (worldEventsStore.realtimeUnsub) {
    return;
  }

  worldEventsStore.realtimeUnsub = onEventUpdate((msg) => {
    if ((msg.type !== 'new' && msg.type !== 'update') || !msg.event) {
      return;
    }

    const next = mergeEventToFront(cache.worldEvents || worldEventsStore.state.events, msg.event);
    cache.worldEvents = next;
    cache.lastFetch.worldEvents = Date.now();
    updateSharedEventStore(worldEventsStore, { events: next });
    scheduleWorldEventsRefresh();
  });
}

function cleanupWorldEventsRealtimeSubscription() {
  if (worldEventsStore.subscriberCount > 0) {
    return;
  }

  if (worldEventsStore.refreshTimeout) {
    clearTimeout(worldEventsStore.refreshTimeout);
    worldEventsStore.refreshTimeout = null;
  }

  if (worldEventsStore.realtimeUnsub) {
    worldEventsStore.realtimeUnsub();
    worldEventsStore.realtimeUnsub = null;
  }
}

/**
 * useMyEvents — returns the user's AOI events.
 */
export function useMyEvents(enabled = true, refreshIntervalMs = null) {
  const [events, setEvents] = useState(enabled ? myEventsStore.state.events : []);
  const [loading, setLoading] = useState(enabled ? (myEventsStore.state.loading || !cache.myEvents) : false);
  const [error, setError] = useState(enabled ? myEventsStore.state.error : null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }
    await refreshMyEventsStore();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    myEventsStore.subscriberCount += 1;
    ensureMyEventsRealtimeSubscription();
    const unsub = subscribeSharedEventStore(myEventsStore, (nextState) => {
      setEvents(nextState.events);
      setLoading(nextState.loading);
      setError(nextState.error);
    });

    if (isStale('myEvents')) {
      refreshMyEventsStore();
    }

    return () => {
      unsub();
      myEventsStore.subscriberCount = Math.max(0, myEventsStore.subscriberCount - 1);
      cleanupMyEventsRealtimeSubscription();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !refreshIntervalMs) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      refreshMyEventsStore();
    }, refreshIntervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, refreshIntervalMs]);

  return { events, loading, error, refresh };
}

/**
 * useWorldEvents — returns top global events.
 */
export function useWorldEvents(refreshIntervalMs = null) {
  const [events, setEvents] = useState(worldEventsStore.state.events);
  const [loading, setLoading] = useState(worldEventsStore.state.loading || !cache.worldEvents);
  const [error, setError] = useState(worldEventsStore.state.error);

  const refresh = useCallback(async () => {
    await refreshWorldEventsStore();
  }, []);

  useEffect(() => {
    worldEventsStore.subscriberCount += 1;
    ensureWorldEventsRealtimeSubscription();
    const unsub = subscribeSharedEventStore(worldEventsStore, (nextState) => {
      setEvents(nextState.events);
      setLoading(nextState.loading);
      setError(nextState.error);
    });

    if (isStale('worldEvents')) {
      refreshWorldEventsStore();
    }

    return () => {
      unsub();
      worldEventsStore.subscriberCount = Math.max(0, worldEventsStore.subscriberCount - 1);
      cleanupWorldEventsRealtimeSubscription();
    };
  }, []);

  useEffect(() => {
    if (!refreshIntervalMs) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      refreshWorldEventsStore();
    }, refreshIntervalMs);

    return () => clearInterval(intervalId);
  }, [refreshIntervalMs]);

  return { events, loading, error, refresh };
}

/**
 * useAlerts — returns active alerts.
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      console.warn('[useAlerts] API failed:', err.message);
      setError(err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { alerts, loading, error, refresh };
}

/**
 * useAOIs — returns user's Areas of Interest.
 */
export function useAOIs(enabled = true) {
  const [aois, setAois] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setAois([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyAOIs();
      setAois(data.aois || []);
    } catch (err) {
      console.warn('[useAOIs] API failed:', err.message);
      setError(err);
      setAois([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    aois.forEach((aoi) => {
      const aoiId = aoi?.id;
      if (aoiId && !subscribedAoiIds.has(aoiId)) {
        subscribeToAOI(aoiId);
        subscribedAoiIds.add(aoiId);
      }
    });
  }, [aois]);

  return { aois, loading, error, refresh };
}

/**
 * useDataSources — returns data source feeds.
 */
export function useDataSources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDataSources();
      setSources(data);
    } catch (err) {
      console.warn('[useDataSources] API failed:', err.message);
      setError(err);
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { sources, loading, error, refresh };
}

/**
 * useProfile — returns user profile data.
 */
export function useProfile(enabled = true) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
    } catch (err) {
      console.warn('[useProfile] API failed:', err.message);
      setError(err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, loading, error, refresh };
}

/**
 * useLeonaChat — manages chat state with LEONA AI.
 */
export function useLeonaChat() {
  const [messages, setMessages] = useState(leonaChatStore.messages);
  const [sending, setSending] = useState(leonaChatStore.sending);
  const [hasQueuedRequest, setHasQueuedRequest] = useState(!!leonaChatStore.queuedRequest);

  useEffect(() => {
    const listener = (next) => {
      setMessages(next.messages);
      setSending(next.sending);
      setHasQueuedRequest(!!next.hasQueuedRequest);
    };

    leonaChatStore.listeners.add(listener);
    return () => {
      leonaChatStore.listeners.delete(listener);
    };
  }, []);

  const setSharedMessages = useCallback((next) => {
    const resolvedMessages = typeof next === 'function' ? next(leonaChatStore.messages) : next;
    updateLeonaChat({ messages: resolvedMessages });
  }, []);

  const send = useCallback(async (userText, options = {}) => {
    if (leonaChatStore.sending) {
      console.log('[useLeonaChat] send:queued while request in flight', {
        requestKind: options.requestKind || 'generic',
      });
      const queuedUserMsg = { id: Date.now().toString(), type: 'user', text: userText };
      const queuedPendingId = `pending-queued-${Date.now()}`;
      const queuedMessages = [...leonaChatStore.messages, queuedUserMsg];
      if (options.pendingText) {
        queuedMessages.push({
          id: queuedPendingId,
          type: 'agent',
          text: options.pendingText,
          pending: true,
        });
      }
      updateLeonaChat({ messages: queuedMessages });
      leonaChatStore.queuedRequest = {
        userText,
        options,
        queuedPendingId,
        queuedUserMsgId: queuedUserMsg.id,
      };
      console.log('[useLeonaChat] send:queued:stored', {
        userText,
        queuedPendingId,
        queuedUserMsgId: queuedUserMsg.id,
      });
      return;
    }
    await executeLeonaChatSend(userText, options);
  }, []);

  return { messages, sending, hasQueuedRequest, send, setMessages: setSharedMessages };
}

/**
 * useLeonaBrief — fetches LEONA AI brief.
 */
export function useLeonaBrief(context, enabled = true) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const contextKey = JSON.stringify(context ?? null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getLeonaBrief(context);
      setBrief(data);
    } catch (err) {
      console.warn('[useLeonaBrief] API failed:', err.message);
      setBrief(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [contextKey, enabled]);

  useEffect(() => { refresh(); }, [refresh]);

  return { brief, loading, error, refresh };
}
