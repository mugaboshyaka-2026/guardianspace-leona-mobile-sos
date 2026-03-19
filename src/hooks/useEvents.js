/**
 * LEONA Mobile — Shared event hooks
 * Centralizes API calls + caching so Map, Alerts, Briefs screens
 * all share the same data without redundant fetches.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
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
import { onEventUpdate } from '../lib/realtime';
import { EVENTS, GRI_COUNTRIES, USER_AOIS, COMMUNITY_POSTS, INBOX_THREADS } from '../data/events';

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

function isStale(key) {
  const t = cache.lastFetch[key];
  return !t || Date.now() - t > STALE_MS;
}

/**
 * useMyEvents — returns the user's AOI events.
 * Falls back to mock EVENTS on failure.
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
      console.warn('[useMyEvents] API failed, using mock data:', err.message);
      setError(err);
      // Fallback to mock data
      const fallback = EVENTS.filter((e) => ['ev1', 'ev3', 'ev4', 'ev5'].includes(e.id));
      setEvents(fallback);
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
      if (msg.type === 'new' || msg.type === 'update') {
        // Re-fetch when we get a push update
        refresh();
      }
    });
    return unsub;
  }, [refresh]);

  return { events, loading, error, refresh };
}

/**
 * useWorldEvents — returns top global events.
 * Falls back to mock EVENTS on failure.
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
      console.warn('[useWorldEvents] API failed, using mock data:', err.message);
      setError(err);
      setEvents(EVENTS.filter((e) => e.severity === 'critical' || e.severity === 'high'));
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
 * Falls back to mock USER_AOIS.
 */
export function useAOIs() {
  const [aois, setAois] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyAOIs();
      setAois(data.aois || []);
    } catch (err) {
      console.warn('[useAOIs] API failed, using mock data:', err.message);
      setAois(USER_AOIS.map((name, i) => ({ id: `aoi_${i}`, name })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { aois, loading, refresh };
}

/**
 * useDataSources — returns data source feeds.
 */
export function useDataSources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDataSources();
      setSources(data);
    } catch (err) {
      console.warn('[useDataSources] API failed:', err.message);
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { sources, loading, refresh };
}

/**
 * useProfile — returns user profile data.
 */
export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
    } catch (err) {
      console.warn('[useProfile] API failed:', err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, loading, refresh };
}

/**
 * useLeonaChat — manages chat state with LEONA AI.
 */
export function useLeonaChat() {
  const [messages, setMessages] = useState([
    {
      id: 'msg0',
      type: 'agent',
      text: "I'm monitoring active events globally. How can I help you today?",
    },
  ]);
  const [sending, setSending] = useState(false);

  const send = useCallback(async (userText) => {
    const userMsg = { id: Date.now().toString(), type: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      // Build messages array for API
      const apiMessages = [
        ...messages.map((m) => ({
          role: m.type === 'agent' ? 'assistant' : 'user',
          content: m.text,
        })),
        { role: 'user', content: userText },
      ];

      const data = await sendLeonaMessage(apiMessages);
      const reply = data.message || data.reply || data.content || 'Processing your request...';
      const agentMsg = { id: (Date.now() + 1).toString(), type: 'agent', text: reply };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      console.warn('[useLeonaChat] API failed:', err.message);
      // Fallback response
      const agentMsg = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        text: 'I\'m having trouble connecting to the server. Please try again shortly.',
      };
      setMessages((prev) => [...prev, agentMsg]);
    } finally {
      setSending(false);
    }
  }, [messages]);

  return { messages, sending, send, setMessages };
}

/**
 * useLeonaBrief — fetches LEONA AI brief.
 */
export function useLeonaBrief(context) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
  }, [context]);

  useEffect(() => { refresh(); }, [refresh]);

  return { brief, loading, refresh };
}
