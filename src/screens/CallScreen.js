/**
 * CallScreen — LEONA Guardian Pro
 *
 * Currently a UI placeholder for audio / video calls.
 * When ready to add live calls:
 *   1. npm install react-native-agora
 *   2. Replace YOUR_AGORA_APP_ID below with your App ID from console.agora.io
 *   3. Uncomment the Agora blocks marked  // [AGORA]
 *
 * const AGORA_APP_ID = 'YOUR_AGORA_APP_ID';   // [AGORA]
 * const AGORA_TOKEN  = null;                   // [AGORA] null = testing mode
 */

import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { colors, spacing } from '../theme';
import * as WebBrowser from 'expo-web-browser';
import {
  endTavusConversation,
  getTavusConversation,
  startTavusConversation,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { AppContext } from '../../App';
import { getProductConfig } from '../lib/products';

const { width: SCREEN_W } = Dimensions.get('window');

function findConversationUrl(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const directKeys = [
    'conversation_url',
    'conversationUrl',
    'url',
    'join_url',
    'joinUrl',
    'web_url',
    'webUrl',
    'iframe_url',
    'iframeUrl',
  ];

  for (const key of directKeys) {
    const value = payload[key];
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return value;
    }
  }

  const nestedKeys = ['conversation', 'data', 'session', 'result'];
  for (const key of nestedKeys) {
    const nested = payload[key];
    const nestedUrl = findConversationUrl(nested);
    if (nestedUrl) return nestedUrl;
  }

  return null;
}

function findConversationId(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const directKeys = ['conversation_id', 'conversationId', 'id'];
  for (const key of directKeys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  const nestedKeys = ['conversation', 'data', 'session', 'result'];
  for (const key of nestedKeys) {
    const nested = payload[key];
    const nestedId = findConversationId(nested);
    if (nestedId) return nestedId;
  }

  return null;
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const summary = {};
  Object.keys(payload).slice(0, 20).forEach((key) => {
    const value = payload[key];
    summary[key] = typeof value === 'object' && value !== null
      ? Array.isArray(value) ? `array(${value.length})` : 'object'
      : value;
  });
  return summary;
}

const CallScreen = ({ navigation, route }) => {
  const {
    channelName = 'leona-default',
    callType    = 'video',       // 'audio' | 'video'
    threadName  = 'Team Call',
    participants = [],
  } = route.params || {};
  const { user } = useAuth();
  const { userConfig } = useContext(AppContext);
  const productConfig = getProductConfig(userConfig?.product);

  const isVideo = callType === 'video';
  const currentUserIdentity = useMemo(() => {
    const clerkFullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    const configFullName = userConfig?.fullName?.trim?.() || '';
    const email =
      user?.primaryEmailAddress?.emailAddress
      || user?.emailAddresses?.[0]?.emailAddress
      || userConfig?.email
      || '';

    const displayName =
      clerkFullName
      || configFullName
      || (email ? email.split('@')[0] : '')
      || 'Guardian Space User';

    return {
      id: user?.id || userConfig?.userId || '',
      name: displayName,
      email,
      first_name: user?.firstName || displayName.split(' ')[0] || '',
      last_name: user?.lastName || displayName.split(' ').slice(1).join(' ') || '',
    };
  }, [user, userConfig]);

  // ── Controls ────────────────────────────────────────────────────────────────
  const [micMuted,  setMicMuted]  = useState(false);
  const [camOff,    setCamOff]    = useState(!isVideo);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(isVideo);
  const [sessionError, setSessionError] = useState('');
  const [conversationUrl, setConversationUrl] = useState('');
  const [conversationId, setConversationId] = useState('');

  // ── Timer ───────────────────────────────────────────────────────────────────
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);
  const hasStartedRef = useRef(false);

  const formatDuration = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const statusText = !connected
    ? 'Connecting…'
    : formatDuration(duration);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const toggleMic     = useCallback(() => setMicMuted((v) => !v),  []);
  const toggleCamera  = useCallback(() => setCamOff((v) => !v),    []);
  const toggleSpeaker = useCallback(() => setSpeakerOn((v) => !v), []);

  const markConnected = useCallback(() => {
    setConnected(true);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  const openConversation = useCallback(async (url) => {
    if (!url) return;
    try {
      console.log('[Tavus] Opening browser session', { url });
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
      console.log('[Tavus] Browser session closed by user/app');
    } catch (err) {
      console.warn('[Tavus] Browser open failed:', err.message);
    }
  }, []);

  const hydrateConversation = useCallback(async (payload, { autoOpen = false } = {}) => {
    console.log('[Tavus] Hydrating conversation payload', summarizePayload(payload));
    const nextUrl = findConversationUrl(payload);
    const nextId = findConversationId(payload);
    console.log('[Tavus] Extracted session details', {
      conversationUrl: nextUrl || null,
      conversationId: nextId || null,
      autoOpen,
    });

    if (nextUrl) setConversationUrl(nextUrl);
    if (nextId) setConversationId(nextId);

    if (nextUrl || nextId) {
      markConnected();
      if (nextUrl && autoOpen) {
        await openConversation(nextUrl);
      }
      return true;
    }

    return false;
  }, [markConnected, openConversation]);

  const bootstrapConversation = useCallback(async () => {
    if (!isVideo || hasStartedRef.current) return;

    hasStartedRef.current = true;
    setIsStarting(true);
    setSessionError('');
    console.log('[Tavus] Bootstrapping conversation', {
      channelName,
      threadName,
      callType,
      participantsCount: participants.length,
      currentUserIdentity,
    });

    try {
      const active = await getTavusConversation().catch((err) => {
        console.warn('[Tavus] Get active conversation failed:', err.message);
        return null;
      });
      const resumed = await hydrateConversation(active, { autoOpen: false });
      console.log('[Tavus] Existing conversation resume result', { resumed });

      if (!resumed) {
        console.log('[Tavus] Starting new conversation request');
        const created = await startTavusConversation({
          channel_name: channelName,
          thread_name: threadName,
          participants,
          call_type: callType,
          user: currentUserIdentity,
          participant: currentUserIdentity,
          viewer: currentUserIdentity,
          display_name: currentUserIdentity.name,
          participant_name: currentUserIdentity.name,
          participant_email: currentUserIdentity.email,
          user_name: currentUserIdentity.name,
          user_email: currentUserIdentity.email,
        });
        console.log('[Tavus] Start conversation response', summarizePayload(created));
        const started = await hydrateConversation(created, { autoOpen: true });
        console.log('[Tavus] New conversation start result', { started });
        if (!started) {
          throw new Error('Conversation started but no usable session details were returned.');
        }
      }
    } catch (err) {
      console.warn('[Tavus] Bootstrap failed:', err.message);
      setSessionError(err.message || 'Unable to start Tavus conversation.');
    } finally {
      console.log('[Tavus] Bootstrap finished');
      setIsStarting(false);
    }
  }, [callType, channelName, currentUserIdentity, hydrateConversation, isVideo, participants, threadName]);

  useEffect(() => {
    if (isVideo && !productConfig.canUseVideoAgent) {
      Alert.alert('Plan upgrade required', 'Video agent access is not available on your current plan.');
      navigation.goBack();
      return undefined;
    }

    if (isVideo) {
      bootstrapConversation();
    } else {
      markConnected();
    }

    return () => {
      clearInterval(timerRef.current);
    };
  }, [bootstrapConversation, isVideo, markConnected, navigation, productConfig.canUseVideoAgent]);

  const endCall = useCallback(() => {
    clearInterval(timerRef.current);
    console.log('[Tavus] Ending call screen', {
      isVideo,
      conversationId: conversationId || null,
      conversationUrl: conversationUrl || null,
    });
    if (isVideo) {
      endTavusConversation().catch((err) => {
        console.warn('[Tavus] End conversation failed:', err.message);
      });
    }
    navigation.goBack();
  }, [conversationId, conversationUrl, isVideo, navigation]);

  const participantLabel =
    participants.length > 0 ? participants.join(', ') : threadName;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── BACKGROUND (video placeholder or audio bg) ── */}
      {isVideo ? (
        <View style={styles.videoBg}>
          {/* Remote feed placeholder */}
          <View style={styles.remoteVideoPlaceholder}>
            <Text style={styles.remoteAvatarGlyph}>
              {participantLabel.slice(0, 2).toUpperCase()}
            </Text>
            {!connected && (
              <Text style={styles.connectingText}>Connecting…</Text>
            )}
          </View>

          {/* Local preview pip */}
          {!camOff ? (
            <View style={styles.localPip}>
              <View style={styles.localPipInner}>
                <Text style={styles.localPipText}>KM</Text>
              </View>
              <TouchableOpacity style={styles.flipBtn}>
                <Text style={styles.flipBtnText}>↺</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.localPip, styles.localPipOff]}>
              <Text style={{ fontSize: 20 }}>🎥</Text>
              <Text style={styles.camOffLabel}>Off</Text>
            </View>
          )}
        </View>
      ) : (
        /* ── AUDIO BG ── */
        <View style={styles.audioBg}>
          <View style={styles.audioRingOuter}>
            <View style={[styles.audioRingInner, connected && styles.audioRingConnected]}>
              <View style={styles.audioAvatar}>
                <Text style={styles.audioAvatarText}>
                  {participantLabel.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── OVERLAY ── */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topCloseBtn} onPress={endCall}>
            <Text style={styles.topCloseBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>
              {isVideo ? '📹 VIDEO CALL' : '🎙 AUDIO CALL'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Centre info */}
        <View style={styles.callInfo}>
          <Text style={styles.callTitle}>{threadName}</Text>
          <Text style={styles.callStatus}>
            {sessionError ? 'Session error' : isStarting ? 'Starting Tavus session...' : statusText}
          </Text>
          {!!conversationId && (
            <Text style={styles.sessionMeta}>Session {conversationId}</Text>
          )}
          {!!sessionError && (
            <Text style={styles.sessionErrorText}>{sessionError}</Text>
          )}
          {isVideo && !!conversationUrl && (
            <TouchableOpacity style={styles.sessionActionBtn} onPress={() => openConversation(conversationUrl)}>
              <Text style={styles.sessionActionText}>Open Tavus Video</Text>
            </TouchableOpacity>
          )}
          {isVideo && !conversationUrl && !!sessionError && (
            <TouchableOpacity
              style={styles.sessionActionBtn}
              onPress={() => {
                hasStartedRef.current = false;
                bootstrapConversation();
              }}
            >
              <Text style={styles.sessionActionText}>Retry Session</Text>
            </TouchableOpacity>
          )}
          {connected && (
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>ENCRYPTED</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsOuter}>
          <View style={styles.controls}>

            {/* Speaker */}
            <TouchableOpacity
              style={[styles.ctrlBtn, speakerOn && styles.ctrlBtnOn]}
              onPress={toggleSpeaker}
            >
              <Text style={styles.ctrlIcon}>{speakerOn ? '🔊' : '🔇'}</Text>
              <Text style={styles.ctrlLabel}>{speakerOn ? 'Speaker' : 'Earpiece'}</Text>
            </TouchableOpacity>

            {/* Mic */}
            <TouchableOpacity
              style={[styles.ctrlBtn, micMuted && styles.ctrlBtnDanger]}
              onPress={toggleMic}
            >
              <Text style={styles.ctrlIcon}>{micMuted ? '🚫' : '🎙'}</Text>
              <Text style={styles.ctrlLabel}>{micMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity style={styles.endBtn} onPress={endCall}>
              <Text style={styles.endBtnIcon}>📵</Text>
            </TouchableOpacity>

            {/* Camera (video only) */}
            {isVideo ? (
              <TouchableOpacity
                style={[styles.ctrlBtn, camOff && styles.ctrlBtnDanger]}
                onPress={toggleCamera}
              >
                <Text style={styles.ctrlIcon}>{camOff ? '📷' : '🎥'}</Text>
                <Text style={styles.ctrlLabel}>{camOff ? 'Start Cam' : 'Stop Cam'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.ctrlSpacer} />
            )}

            {/* Participants */}
            <TouchableOpacity style={styles.ctrlBtn}>
              <Text style={styles.ctrlIcon}>👥</Text>
              <Text style={styles.ctrlLabel}>Team</Text>
            </TouchableOpacity>

          </View>
        </View>

      </SafeAreaView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Video bg ────────────────────────────────────────────────────────────────
  videoBg: {
    flex: 1,
    backgroundColor: '#0A0D1A',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C1020',
  },
  remoteAvatarGlyph: {
    fontSize: 80,
    fontWeight: '700',
    color: 'rgba(107,72,255,0.35)',
    letterSpacing: 4,
    marginBottom: 16,
  },
  connectingText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  localPip: {
    position: 'absolute',
    right: 16,
    bottom: 190,
    width: 100,
    height: 142,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localPipInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localPipText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  localPipOff: {
    gap: 6,
  },
  camOffLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  flipBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipBtnText: {
    color: '#fff',
    fontSize: 15,
  },

  // ── Audio bg ─────────────────────────────────────────────────────────────────
  audioBg: {
    flex: 1,
    backgroundColor: '#06091C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioRingOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(107,72,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioRingInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(107,72,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(107,72,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioRingConnected: {
    borderColor: 'rgba(107,72,255,0.55)',
    backgroundColor: 'rgba(107,72,255,0.15)',
  },
  audioAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.purple,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  audioAvatarText: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 3,
  },

  // ── Overlay ───────────────────────────────────────────────────────────────
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  topCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  topBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  topBadgeText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // ── Call info ──────────────────────────────────────────────────────────────
  callInfo: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  callTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
  callStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
  sessionMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginBottom: 6,
  },
  sessionErrorText: {
    color: '#FFB3AE',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  sessionActionBtn: {
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,168,255,0.35)',
    backgroundColor: 'rgba(0,168,255,0.14)',
  },
  sessionActionText: {
    color: colors.blueLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.25)',
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  connectedText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // ── Controls ───────────────────────────────────────────────────────────────
  controlsOuter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 14 : 24,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(8,10,24,0.9)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  ctrlBtn: {
    alignItems: 'center',
    gap: 5,
    width: 54,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ctrlBtnOn: {
    backgroundColor: 'rgba(0,122,255,0.18)',
  },
  ctrlBtnDanger: {
    backgroundColor: 'rgba(255,59,48,0.18)',
  },
  ctrlSpacer: { width: 54 },
  ctrlIcon: { fontSize: 26 },
  ctrlLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // End call
  endBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  endBtnIcon: { fontSize: 30 },
});

export default CallScreen;
