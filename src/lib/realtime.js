/**
 * LEONA Mobile — Ably Real-Time Client
 * Subscribes to event channels for live push updates.
 */
import { getAblyToken } from './api';

let _client = null;
let _channel = null;
let _listeners = [];

/**
 * Initialize Ably connection using token auth via our API.
 * Call once after user is authenticated.
 */
export async function initRealtime() {
  if (_client) return; // already connected

  try {
    // Dynamic import — only loads Ably SDK when needed
    const Ably = require('ably');
    _client = new Ably.Realtime({
      authCallback: async (tokenParams, callback) => {
        try {
          const tokenData = await getAblyToken();
          callback(null, tokenData);
        } catch (err) {
          callback(err, null);
        }
      },
      autoConnect: true,
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 15000,
    });

    _client.connection.on('connected', () => {
      console.log('[LEONA Realtime] Connected');
    });

    _client.connection.on('disconnected', () => {
      console.log('[LEONA Realtime] Disconnected — will retry');
    });

    // Subscribe to global events channel
    _channel = _client.channels.get('leona:events');
    _channel.subscribe('event.new', (msg) => {
      _listeners.forEach((fn) => fn({ type: 'new', event: msg.data }));
    });
    _channel.subscribe('event.update', (msg) => {
      _listeners.forEach((fn) => fn({ type: 'update', event: msg.data }));
    });
    _channel.subscribe('event.alert', (msg) => {
      _listeners.forEach((fn) => fn({ type: 'alert', event: msg.data }));
    });
  } catch (err) {
    console.warn('[LEONA Realtime] Init failed:', err.message);
  }
}

/** Register a listener for real-time event updates. Returns unsubscribe fn. */
export function onEventUpdate(listener) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== listener);
  };
}

/** Subscribe to a specific AOI channel for local alerts. */
export function subscribeToAOI(aoiId) {
  if (!_client) return;
  const ch = _client.channels.get(`leona:aoi:${aoiId}`);
  ch.subscribe('alert', (msg) => {
    _listeners.forEach((fn) => fn({ type: 'aoi_alert', aoiId, event: msg.data }));
  });
}

/** Disconnect cleanly. */
export function disconnectRealtime() {
  if (_client) {
    _client.close();
    _client = null;
    _channel = null;
  }
}
