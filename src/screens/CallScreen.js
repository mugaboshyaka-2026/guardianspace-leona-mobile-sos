import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing } from '../theme';
import {
  endTavusConversation,
  getTavusBrief,
  startTavusConversation,
  syncTavusPersona,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { AppContext } from '../../App';
import { getProductConfig } from '../lib/products';

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
    callType = 'video',
    threadName = 'Team Call',
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

  const [connected, setConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(isVideo);
  const [sessionError, setSessionError] = useState('');
  const [conversationUrl, setConversationUrl] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [duration, setDuration] = useState(0);

  const timerRef = useRef(null);
  const hasStartedRef = useRef(false);

  const formatDuration = (seconds) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const statusText = !connected ? 'Connecting...' : formatDuration(duration);

  const markConnected = useCallback(() => {
    setConnected(true);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDuration((value) => value + 1), 1000);
  }, []);

  const openConversation = useCallback(async (url) => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch (err) {
      console.warn('[Tavus] Browser open failed:', err.message);
    }
  }, []);

  const hydrateConversation = useCallback(async (payload, { autoOpen = false } = {}) => {
    console.log('[Tavus] Hydrating conversation payload', summarizePayload(payload));
    const nextUrl = findConversationUrl(payload);
    const nextId = findConversationId(payload);

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

    try {
      await syncTavusPersona().catch((err) => {
        console.warn('[Tavus] Persona sync failed:', err.message);
      });

      const active = await getTavusBrief().catch((err) => {
        console.warn('[Tavus] Get active conversation failed:', err.message);
        return null;
      });

      const resumed = await hydrateConversation(active, { autoOpen: true });
      if (!resumed) {
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

        const started = await hydrateConversation(created, { autoOpen: true });
        if (!started) {
          throw new Error('Conversation started but no usable session details were returned.');
        }
      }
    } catch (err) {
      console.warn('[Tavus] Bootstrap failed:', err.message);
      setSessionError(err.message || 'Unable to start Tavus conversation.');
    } finally {
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
    if (isVideo) {
      endTavusConversation().catch((err) => {
        console.warn('[Tavus] End conversation failed:', err.message);
      });
    }
    navigation.goBack();
  }, [isVideo, navigation]);

  const participantLabel = participants.length > 0 ? participants.join(', ') : threadName;
  const callStatusLabel = sessionError
    ? 'Session error'
    : isStarting
      ? 'Starting LEONA video session...'
      : conversationUrl
        ? 'Live video ready'
        : statusText;
  const connectionBadgeLabel = isVideo ? 'SESSION READY' : 'CALL UI PREVIEW';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {isVideo ? (
        <View style={styles.videoBg}>
          <View style={styles.remoteVideoPlaceholder}>
            <Text style={styles.remoteAvatarGlyph}>
              {participantLabel.slice(0, 2).toUpperCase()}
            </Text>
            {!connected && <Text style={styles.connectingText}>Connecting...</Text>}
          </View>
          <View style={styles.localPip}>
            <Text style={styles.localPipTitle}>Tavus Session</Text>
            <Text style={styles.localPipCaption}>
              Mic and camera permissions happen after you join LEONA.
            </Text>
          </View>
        </View>
      ) : (
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

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topCloseBtn} onPress={endCall}>
            <Text style={styles.topCloseBtnText}>X</Text>
          </TouchableOpacity>
          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>
              {isVideo ? 'VIDEO CALL' : 'AUDIO CALL'}
            </Text>
          </View>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.callInfo}>
          <Text style={styles.callTitle}>{threadName}</Text>
          <Text style={styles.callStatus}>{callStatusLabel}</Text>
          {!!conversationId && <Text style={styles.sessionMeta}>Session {conversationId}</Text>}
          {!!sessionError && <Text style={styles.sessionErrorText}>{sessionError}</Text>}
          {isVideo && !!conversationUrl && (
            <TouchableOpacity style={styles.sessionActionBtn} onPress={() => openConversation(conversationUrl)}>
              <Text style={styles.sessionActionText}>Join LEONA Video</Text>
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
          {isVideo && (
            <View style={styles.micInfoCard}>
              <Text style={styles.micInfoTitle}>Video session handoff</Text>
              <Text style={styles.micInfoBody}>
                This screen launches the external Tavus session. Security and media handling depend on that live session, not this placeholder UI.
              </Text>
            </View>
          )}
          {connected && (
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>{connectionBadgeLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.controlsOuter}>
          <View style={styles.controlsSimple}>
            {isVideo && !!conversationUrl && (
              <TouchableOpacity style={styles.primaryActionBtn} onPress={() => openConversation(conversationUrl)}>
                <Text style={styles.primaryActionText}>Open Session</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.endBtn} onPress={endCall}>
              <Text style={styles.endBtnIcon}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
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
    width: 180,
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(7,10,22,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  localPipTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  localPipCaption: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
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
  topCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
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
  topSpacer: {
    width: 40,
  },
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
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  micInfoCard: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  micInfoTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  micInfoBody: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
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
  controlsOuter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 14 : 24,
  },
  controlsSimple: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(8,10,24,0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  primaryActionBtn: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#03111D',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  endBtn: {
    minWidth: 88,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    shadowColor: '#FF3B30',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  endBtnIcon: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CallScreen;
