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
};

function emitLeonaChat() {
  leonaChatStore.listeners.forEach((listener) =>
    listener({
      messages: leonaChatStore.messages,
      sending: leonaChatStore.sending,
    })
  );
}

function updateLeonaChat(partial) {
  Object.assign(leonaChatStore, partial);
  emitLeonaChat();
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
  leonaChatStore.messages = initialLeonaMessages;
  leonaChatStore.sending = false;
  emitLeonaChat();
}

function isStale(key) {
  const t = cache.lastFetch[key];
  return !t || Date.now() - t > STALE_MS;
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

/**
 * useMyEvents — returns the user's AOI events.
 */
export function useMyEvents() {
  const [events, setEvents] = useState(cache.myEvents || []);
  const [loading, setLoading] = useState(!cache.myEvents);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyEvents('all');
      cache.myEvents = data;
      cache.lastFetch.myEvents = Date.now();
      setEvents(data);
    } catch (err) {
      console.warn('[useMyEvents] API failed:', err.message);
      setError(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStale('myEvents')) refresh();
  }, [refresh]);

  // Listen for real-time updates
  useEffect(() => {
    const unsub = onEventUpdate((msg) => {
      if (msg.type === 'aoi_alert' && msg.event) {
        setEvents((prev) => {
          const next = mergeEventToFront(prev, msg.event);
          cache.myEvents = next;
          cache.lastFetch.myEvents = Date.now();
          return next;
        });
        refresh();
      }

      if ((msg.type === 'new' || msg.type === 'update') && msg.event) {
        setEvents((prev) => {
          const next = mergeEventToFront(prev, msg.event);
          cache.myEvents = next;
          cache.lastFetch.myEvents = Date.now();
          return next;
        });
        refresh();
      }
    });
    return unsub;
  }, [refresh]);

  return { events, loading, error, refresh };
}

/**
 * useWorldEvents — returns top global events.
 */
export function useWorldEvents() {
  const [events, setEvents] = useState(cache.worldEvents || []);
  const [loading, setLoading] = useState(!cache.worldEvents);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorldEvents();
      cache.worldEvents = data;
      cache.lastFetch.worldEvents = Date.now();
      setEvents(data);
    } catch (err) {
      console.warn('[useWorldEvents] API failed:', err.message);
      setError(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStale('worldEvents')) refresh();
  }, [refresh]);

  useEffect(() => {
    const unsub = onEventUpdate((msg) => {
      if (msg.type === 'new' || msg.type === 'update') refresh();
    });
    return unsub;
  }, [refresh]);

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

  useEffect(() => {
    const listener = (next) => {
      setMessages(next.messages);
      setSending(next.sending);
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
      console.log('[useLeonaChat] send:ignored while request in flight', {
        requestKind: options.requestKind || 'generic',
      });
      return;
    }

    const pendingId = `pending-${Date.now()}`;
    const startedAt = Date.now();
    console.log('[useLeonaChat] send:start', {
      requestKind: options.requestKind || 'generic',
      hasPendingText: !!options.pendingText,
      promptLength: userText.length,
    });
    const userMsg = { id: Date.now().toString(), type: 'user', text: userText };
    const nextMessages = [...leonaChatStore.messages, userMsg];
    if (options.pendingText) {
      nextMessages.push(
        {
          id: pendingId,
          type: 'agent',
          text: options.pendingText,
          pending: true,
        }
      );
    }
    updateLeonaChat({ messages: nextMessages, sending: true });

    try {
      // Build messages array for API
      const apiMessages = nextMessages
        .filter((m) => !m.pending)
        .map((m) => ({
          role: m.type === 'agent' ? 'assistant' : 'user',
          content: m.text,
        }));

      const data = await sendLeonaMessage(apiMessages);
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
      // Fallback response
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
    }
  }, []);

  return { messages, sending, send, setMessages: setSharedMessages };
}

/**
 * useLeonaBrief — fetches LEONA AI brief.
 */
export function useLeonaBrief(context, enabled = true) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const contextKey = JSON.stringify(context ?? null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getLeonaBrief(context);
      setBrief(data);
    } catch (err) {
      console.warn('[useLeonaBrief] API failed:', err.message);
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, [contextKey, enabled]);

  useEffect(() => { refresh(); }, [refresh]);

  return { brief, loading, refresh };
}
