/**
 * LEONA Mobile - Ably Real-Time Client
 * Subscribes to event channels for live push updates.
 */
import { AppState } from 'react-native';
import { getAblyToken } from './api';

let _client = null;
let _channel = null;
let _listeners = [];
let _statusListeners = [];
let _lastInitPromise = null;
let _retryTimer = null;
let _reconnectAttempt = 0;
let _realtimeStatus = {
  state: 'idle',
  message: '',
  recoverable: false,
  updatedAt: Date.now(),
};

function emitRealtimeStatus() {
  _statusListeners.forEach((listener) => listener(_realtimeStatus));
}

function setRealtimeStatus(nextPatch) {
  _realtimeStatus = {
    ..._realtimeStatus,
    ...nextPatch,
    updatedAt: Date.now(),
  };
  emitRealtimeStatus();
}

function normalizeAblyAuthPayload(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (payload.token || payload.tokenRequest || payload.capability || payload.expires || payload.issued) {
    return payload;
  }
  if (payload.tokenDetails) return payload.tokenDetails;
  if (payload.tokenRequestData) return payload.tokenRequestData;
  if (payload.data) return normalizeAblyAuthPayload(payload.data);
  return null;
}

function scheduleRealtimeRetry() {
  if (_retryTimer) {
    return;
  }

  const retryDelayMs = Math.min(30000, 5000 * Math.max(1, _reconnectAttempt || 1));
  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    retryRealtime().catch(() => {});
  }, retryDelayMs);
}

function handleRealtimeFailure(message, { recoverable = true } = {}) {
  _reconnectAttempt += 1;
  setRealtimeStatus({
    state: 'offline',
    message: message || 'Realtime offline. Pull to refresh or retry.',
    recoverable,
  });
  scheduleRealtimeRetry();
}

/**
 * Initialize Ably connection using token auth via our API.
 * Call once after user is authenticated.
 */
export async function initRealtime() {
  if (_client) return;
  if (_lastInitPromise) {
    return _lastInitPromise;
  }

  _lastInitPromise = (async () => {
    try {
      setRealtimeStatus({
        state: 'connecting',
        message: 'Connecting to realtime updates...',
        recoverable: true,
      });

      const Ably = require('ably');
      _client = new Ably.Realtime({
        authCallback: async (_tokenParams, callback) => {
          try {
            const tokenData = await getAblyToken();
            const authPayload = normalizeAblyAuthPayload(tokenData);
            if (!authPayload) {
              handleRealtimeFailure('Realtime offline. Check your session and retry.', { recoverable: true });
              callback(new Error('Unexpected Ably auth payload shape'), null);
              return;
            }
            callback(null, authPayload);
          } catch (err) {
            handleRealtimeFailure('Realtime offline. Unable to verify your session.', { recoverable: true });
            callback(err, null);
          }
        },
        autoConnect: true,
        disconnectedRetryTimeout: 5000,
        suspendedRetryTimeout: 15000,
      });

      _client.connection.on('connected', () => {
        _reconnectAttempt = 0;
        if (_retryTimer) {
          clearTimeout(_retryTimer);
          _retryTimer = null;
        }
        setRealtimeStatus({
          state: 'connected',
          message: '',
          recoverable: false,
        });
        console.log('[LEONA Realtime] Connected');
      });

      _client.connection.on('disconnected', () => {
        console.log('[LEONA Realtime] Disconnected - will retry');
        handleRealtimeFailure('Realtime offline. Reconnecting...', { recoverable: true });
      });

      _client.connection.on('suspended', () => {
        console.warn('[LEONA Realtime] Suspended');
        handleRealtimeFailure('Realtime offline. Connection suspended, retrying...', { recoverable: true });
      });

      _client.connection.on('failed', (stateChange) => {
        console.warn('[LEONA Realtime] Failed:', stateChange?.reason?.message || 'unknown');
        handleRealtimeFailure('Realtime offline. Check your connection or sign in again.', { recoverable: true });
      });

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
      handleRealtimeFailure('Realtime offline. Unable to start live updates.', { recoverable: true });
    } finally {
      _lastInitPromise = null;
    }
  })();

  return _lastInitPromise;
}

/** Register a listener for real-time event updates. Returns unsubscribe fn. */
export function onEventUpdate(listener) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== listener);
  };
}

export function getRealtimeStatus() {
  return _realtimeStatus;
}

export function onRealtimeStatusChange(listener) {
  _statusListeners.push(listener);
  listener(_realtimeStatus);
  return () => {
    _statusListeners = _statusListeners.filter((fn) => fn !== listener);
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
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
  if (_client) {
    _client.close();
    _client = null;
    _channel = null;
  }
  _reconnectAttempt = 0;
  setRealtimeStatus({
    state: 'idle',
    message: '',
    recoverable: false,
  });
}

export async function retryRealtime() {
  disconnectRealtime();
  if (AppState.currentState === 'background') {
    return;
  }
  return initRealtime();
}
