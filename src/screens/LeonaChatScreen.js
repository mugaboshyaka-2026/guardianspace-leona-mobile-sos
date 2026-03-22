import React, { useState, useRef, useEffect, useMemo, useContext, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, sevColors, typeIcons, spacing } from '../theme';
import { useMyEvents, useWorldEvents, useAOIs, useLeonaChat, useLeonaBrief } from '../hooks/useEvents';
import LeonaHeader from '../components/LeonaHeader';
import { AppContext } from '../../App';
import { getProductConfig, limitEventsForProduct } from '../lib/products';

const leonaAvatar = require('../assets/leona-avatar.png');
const { width } = Dimensions.get('window');

function extractBriefText(brief) {
  if (!brief) return '';
  return brief.brief || brief.summary || brief.text || brief.content || '';
}

function parseInlineSegments(text = '') {
  const segments = [];
  const boldRegex = /(\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'bold', text: match[0].slice(2, -2) });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', text }];
}

function renderInlineText(text, baseStyle, boldStyle) {
  return parseInlineSegments(text).map((segment, idx) => (
    <Text key={`${segment.type}-${idx}`} style={segment.type === 'bold' ? [baseStyle, boldStyle] : baseStyle}>
      {segment.text}
    </Text>
  ));
}

function isMarkdownDivider(line) {
  const trimmed = line.trim();
  return /^[-*_]{3,}$/.test(trimmed);
}

function isMarkdownTableLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isMarkdownTableSeparator(line) {
  return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim());
}

function parseMarkdownBlocks(text = '') {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (isMarkdownDivider(trimmed)) {
      blocks.push({ type: 'divider' });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: trimmed.slice(3).trim() });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, text: trimmed.slice(2).trim() });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (isMarkdownTableLine(trimmed)) {
      const tableLines = [];
      while (i < lines.length && isMarkdownTableLine(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i += 1;
      }

      const rows = tableLines.map((tableLine) =>
        tableLine
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
      );
      const contentRows = rows.filter((row) => !isMarkdownTableSeparator(`|${row.join('|')}|`));

      if (contentRows.length > 0) {
        blocks.push({
          type: 'table',
          headers: contentRows[0],
          rows: contentRows.slice(1),
        });
      }
      continue;
    }

    const paragraphLines = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (
        !current ||
        isMarkdownDivider(current) ||
        current.startsWith('#') ||
        /^[-*]\s+/.test(current) ||
        isMarkdownTableLine(current)
      ) {
        break;
      }
      paragraphLines.push(current);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function MarkdownMessage({ text, isAgent }) {
  const baseTextStyle = isAgent ? styles.agentText : styles.userText;
  const blocks = parseMarkdownBlocks(text);

  return (
    <View style={styles.markdownContainer}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <Text
              key={`heading-${idx}`}
              style={[
                styles.markdownHeading,
                block.level === 1 ? styles.markdownHeadingPrimary : styles.markdownHeadingSecondary,
                isAgent ? styles.agentHeading : styles.userHeading,
              ]}
            >
              {block.text}
            </Text>
          );
        }

        if (block.type === 'divider') {
          return <View key={`divider-${idx}`} style={[styles.markdownDivider, isAgent ? styles.agentDivider : styles.userDivider]} />;
        }

        if (block.type === 'list') {
          return (
            <View key={`list-${idx}`} style={styles.markdownList}>
              {block.items.map((item, itemIdx) => (
                <View key={`item-${itemIdx}`} style={styles.markdownListRow}>
                  <Text style={[styles.markdownBullet, baseTextStyle]}>•</Text>
                  <Text style={[styles.messageText, baseTextStyle]}>
                    {renderInlineText(item, [styles.messageText, baseTextStyle], styles.messageTextBold)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'table') {
          return (
            <View key={`table-${idx}`} style={[styles.markdownTable, isAgent ? styles.agentTable : styles.userTable]}>
              <View style={[styles.markdownTableRow, styles.markdownTableHeaderRow]}>
                {block.headers.map((header, headerIdx) => (
                  <Text key={`header-${headerIdx}`} style={[styles.markdownTableHeaderText, baseTextStyle]}>
                    {header}
                  </Text>
                ))}
              </View>
              {block.rows.map((row, rowIdx) => (
                <View key={`row-${rowIdx}`} style={styles.markdownTableRow}>
                  {row.map((cell, cellIdx) => (
                    <Text key={`cell-${cellIdx}`} style={[styles.markdownTableCellText, baseTextStyle]}>
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={`paragraph-${idx}`} style={[styles.messageText, baseTextStyle, styles.markdownParagraph]}>
            {renderInlineText(block.text, [styles.messageText, baseTextStyle], styles.messageTextBold)}
          </Text>
        );
      })}
    </View>
  );
}

const LeonaChatScreen = ({ navigation, route }) => {
  const { userConfig } = useContext(AppContext);
  const productConfig = getProductConfig(userConfig?.product);
  const [activeSection, setActiveSection] = useState('CHAT');
  const [activeBriefTab, setActiveBriefTab] = useState('MY');   // 'MY' | 'WORLD'
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);
  const [pinnedEventIds, setPinnedEventIds] = useState(new Set());
  const lastHandledRequestRef = useRef(null);

  const togglePin = (eventId) => {
    setPinnedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  // ── Live API data ──
  const { messages, sending, send: sendChat } = useLeonaChat();
  const { events: myEvents } = useMyEvents();
  const { events: worldEvents } = useWorldEvents();
  const { aois } = useAOIs();
  const EVENTS = useMemo(
    () => limitEventsForProduct(
      [...new Map([...myEvents, ...worldEvents].map((event) => [event.id, event])).values()],
      userConfig?.product
    ),
    [myEvents, userConfig?.product, worldEvents]
  );
  const USER_AOIS = useMemo(() => aois.map((a) => a.name || a), [aois]);

  // Top-level tabs: CHAT (left) · BRIEFS (right) — equal width
  const sections = [
    { label: 'CHAT', value: 'CHAT' },
    { label: 'BRIEFS', value: 'BRIEF' },
  ];

  // Briefs count for badge
  const briefsCount = myEvents.length + worldEvents.length;

  // Brief sub-tabs
  const briefSubTabs = [
    { label: 'My Brief', value: 'MY' },
    { label: 'World Brief', value: 'WORLD' },
  ];

  // Severity counts
  const severityCounts = {
    critical: EVENTS.filter((e) => e.severity === 'critical').length,
    high: EVENTS.filter((e) => e.severity === 'high').length,
    elevated: EVENTS.filter((e) => e.severity === 'elevated').length,
    monitoring: EVENTS.filter((e) => e.severity === 'monitoring').length,
  };
  const mySeverityCounts = {
    critical: myEvents.filter((e) => e.severity === 'critical').length,
    high: myEvents.filter((e) => e.severity === 'high').length,
    elevated: myEvents.filter((e) => e.severity === 'elevated').length,
    monitoring: myEvents.filter((e) => e.severity === 'monitoring').length,
  };

  const severityOrder = { critical: 0, high: 1, elevated: 2, monitoring: 3 };
  const topEvents = useMemo(
    () => [...EVENTS].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 5),
    [EVENTS]
  );
  const myTopEvents = useMemo(
    () => [...myEvents].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 5),
    [myEvents]
  );
  const worldThreatScore = Math.min(100, (
    severityCounts.critical * 20 +
    severityCounts.high * 10 +
    severityCounts.elevated * 5 +
    severityCounts.monitoring * 2
  ));
  const worldBriefContext = useMemo(() => ({
    scope: 'world',
    event_count: EVENTS.length,
    severity_counts: severityCounts,
    events: topEvents.map((event) => ({
      id: event.id,
      title: event.title,
      severity: event.severity,
      location: event.location,
    })),
  }), [EVENTS.length, severityCounts, topEvents]);
  const myBriefContext = useMemo(() => ({
    scope: 'my',
    aois: USER_AOIS,
    event_count: myEvents.length,
    severity_counts: mySeverityCounts,
    events: myTopEvents.map((event) => ({
      id: event.id,
      title: event.title,
      severity: event.severity,
      location: event.location,
    })),
  }), [USER_AOIS, myEvents.length, mySeverityCounts, myTopEvents]);
  const { brief: worldBrief } = useLeonaBrief(worldBriefContext);
  const { brief: myBrief } = useLeonaBrief(myBriefContext);
  const worldNarrative = extractBriefText(worldBrief)
    || `${EVENTS.length} active events globally. ${severityCounts.critical} critical situations currently require immediate attention.`;
  const myNarrative = extractBriefText(myBrief)
    || `Active monitoring across ${USER_AOIS.length} Areas of Interest with ${myEvents.length} live events currently matched to your scope.`;

  const quickChips = [
    'Critical events',
    'Wildfire update',
    'Hurricane Elara',
    'Flood alerts',
    'My brief',
    'Last 24h',
  ];

  const scrollToBottom = () => {
    if (flatListRef.current) flatListRef.current.scrollToEnd({ animated: true });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleChipPress = (chipText) => {
    sendChat(chipText);
  };

  const handleSend = () => {
    if (inputText.trim()) {
      sendChat(inputText.trim());
      setInputText('');
    }
  };

  useFocusEffect(
    useCallback(() => {
      const requestKey = route?.params?.requestKey;
      const initialSection = route?.params?.initialSection;
      const initialBriefTab = route?.params?.initialBriefTab;
      const initialPrompt = route?.params?.initialPrompt;

      if (initialSection) {
        setActiveSection(initialSection);
      }

      if (initialBriefTab) {
        setActiveBriefTab(initialBriefTab);
      }

      if (!requestKey || !initialPrompt || lastHandledRequestRef.current === requestKey) {
        return undefined;
      }

      console.log('[LeonaChatScreen] event-analysis:queued', {
        requestKey,
        initialSection: initialSection || null,
        initialBriefTab: initialBriefTab || null,
        promptLength: initialPrompt.length,
      });

      const timer = setTimeout(() => {
        lastHandledRequestRef.current = requestKey;
        setInputText('');
        console.log('[LeonaChatScreen] event-analysis:dispatch', {
          requestKey,
        });
        sendChat(initialPrompt, {
          requestKind: 'event-analysis',
          pendingText: 'LEONA is analyzing this event. Pulling current signals, impact context, and recommended actions...',
          failureText: 'LEONA could not finish the event analysis in time. Please retry from the event or ask a shorter follow-up question.',
        });
        navigation.setParams({
          requestKey: undefined,
          initialPrompt: undefined,
          initialSection,
          initialBriefTab,
        });
      }, 150);

      return () => clearTimeout(timer);
    }, [
      navigation,
      route?.params?.initialBriefTab,
      route?.params?.initialPrompt,
      route?.params?.initialSection,
      route?.params?.requestKey,
      sendChat,
    ])
  );

  // ===== WORLD BRIEF =====
  const renderWorldBrief = () => (
    <ScrollView style={styles.briefContent} showsVerticalScrollIndicator={false}>
      {/* Severity Overview */}
      <View style={styles.severityGrid}>
        {Object.entries(severityCounts).map(([sev, count]) => (
          <View key={sev} style={[styles.severityChip, { borderColor: sevColors[sev] }]}>
            <Text style={[styles.severityCount, { color: sevColors[sev] }]}>{count}</Text>
            <Text style={[styles.severityLabel, { color: sevColors[sev] }]}>{sev.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {/* Global Threat Index */}
      <View style={styles.gtiCard}>
        <View style={styles.gtiHeader}>
          <Text style={styles.gtiTitle}>GLOBAL THREAT INDEX</Text>
          <View style={styles.gtiLive}>
            <View style={styles.gtiDot} />
            <Text style={styles.gtiLiveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.gtiRow}>
          <Text style={styles.gtiScore}>{worldThreatScore}</Text>
          <Text style={styles.gtiMax}>/100</Text>
          <View style={styles.gtiTrend}>
            <Text style={styles.gtiTrendText}>{severityCounts.critical} critical</Text>
          </View>
        </View>
        <View style={styles.gtiBar}>
          <View style={[styles.gtiBarFill, { width: `${worldThreatScore}%` }]} />
        </View>
      </View>

      {/* Top Events */}
      <View style={styles.briefSection}>
        <Text style={styles.briefSectionTitle}>TOP EVENTS</Text>
        {topEvents.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.briefEventRow}
            onPress={() => navigation?.navigate?.('EventDetail', { event })}
          >
            <View style={[styles.briefEventIcon, { borderColor: sevColors[event.severity] }]}>
              <Text style={{ fontSize: 16 }}>{typeIcons[event.type] || '📍'}</Text>
            </View>
            <View style={styles.briefEventInfo}>
              <Text style={styles.briefEventTitle} numberOfLines={1}>{event.title}</Text>
              <Text style={styles.briefEventLocation}>{event.location}</Text>
            </View>
            <View style={[styles.briefSevDot, { backgroundColor: sevColors[event.severity] }]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Narrative */}
      <View style={styles.narrativeCard}>
        <Text style={styles.narrativeText}>
          {worldNarrative}
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // ===== MY BRIEF =====
  const renderMyBrief = () => (
    <ScrollView style={styles.briefContent} showsVerticalScrollIndicator={false}>
      {/* AOI Header */}
      <View style={styles.myBriefHeader}>
        <View style={styles.blueLine} />
        <Text style={styles.myBriefTitle}>YOUR AREAS OF INTEREST</Text>
      </View>

      <View style={styles.aoiTagsRow}>
        {USER_AOIS.map((aoi, idx) => (
          <View key={idx} style={styles.aoiTag}>
            <Text style={styles.aoiText}>📍 {aoi}</Text>
          </View>
        ))}
      </View>

      {/* Quick Stats */}
      <View style={styles.myBriefStats}>
        <View style={styles.myBriefStat}>
          <Text style={[styles.myBriefStatNum, { color: colors.critical }]}>{mySeverityCounts.critical}</Text>
          <Text style={styles.myBriefStatLabel}>Critical</Text>
        </View>
        <View style={styles.myBriefStatDivider} />
        <View style={styles.myBriefStat}>
          <Text style={[styles.myBriefStatNum, { color: colors.high }]}>{mySeverityCounts.high}</Text>
          <Text style={styles.myBriefStatLabel}>High</Text>
        </View>
        <View style={styles.myBriefStatDivider} />
        <View style={styles.myBriefStat}>
          <Text style={[styles.myBriefStatNum, { color: colors.blue }]}>{USER_AOIS.length}</Text>
          <Text style={styles.myBriefStatLabel}>AOIs</Text>
        </View>
      </View>

      {/* Situation Narrative */}
      <View style={styles.narrativeCard}>
        <Text style={styles.narrativeSectionTitle}>SITUATION SUMMARY</Text>
        <Text style={styles.narrativeText}>
          {myNarrative}
        </Text>
      </View>

      {/* Pinned Events */}
      {myEvents.filter(e => pinnedEventIds.has(e.id)).length > 0 && (
        <View style={styles.briefSection}>
          <View style={styles.pinnedHeader}>
            <Text style={styles.pinnedIcon}>📌</Text>
            <Text style={styles.pinnedTitle}>PINNED</Text>
            <View style={styles.pinnedCountBadge}>
              <Text style={styles.pinnedCountText}>{myEvents.filter(e => pinnedEventIds.has(e.id)).length}</Text>
            </View>
          </View>
          {myEvents.filter(e => pinnedEventIds.has(e.id)).map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.briefEventRow}
              onPress={() => navigation?.navigate?.('EventDetail', { event })}
            >
              <View style={[styles.briefEventIcon, { borderColor: sevColors[event.severity] }]}>
                <Text style={{ fontSize: 16 }}>{typeIcons[event.type] || '📍'}</Text>
              </View>
              <View style={styles.briefEventInfo}>
                <Text style={styles.briefEventTitle} numberOfLines={1}>{event.title}</Text>
                <Text style={styles.briefEventLocation}>{event.location}</Text>
              </View>
              <View style={[styles.briefSevDot, { backgroundColor: sevColors[event.severity] }]} />
              <TouchableOpacity onPress={() => togglePin(event.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.pinIconActive}>📌</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Your Events */}
      <View style={styles.briefSection}>
        <Text style={styles.briefSectionTitle}>YOUR EVENTS</Text>
        {myTopEvents.filter((event) => !pinnedEventIds.has(event.id)).map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.briefEventRow}
            onPress={() => navigation?.navigate?.('EventDetail', { event })}
          >
            <View style={[styles.briefEventIcon, { borderColor: sevColors[event.severity] }]}>
              <Text style={{ fontSize: 16 }}>{typeIcons[event.type] || '📍'}</Text>
            </View>
            <View style={styles.briefEventInfo}>
              <Text style={styles.briefEventTitle} numberOfLines={1}>{event.title}</Text>
              <Text style={styles.briefEventLocation}>{event.location}</Text>
            </View>
            <View style={[styles.briefSevDot, { backgroundColor: sevColors[event.severity] }]} />
            <TouchableOpacity onPress={() => togglePin(event.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.pinIconDim}>📌</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.askLeonaBtn}
        onPress={() => setActiveSection('CHAT')}
      >
        <Text style={styles.askLeonaBtnText}>Ask LEONA for a detailed brief →</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // ===== CHAT =====
  const renderMessage = ({ item }) => {
    const isAgent = item.type === 'agent';
    return (
      <View style={[styles.messageBubbleContainer, isAgent ? styles.agentContainer : styles.userContainer]}>
        {isAgent && <Image source={leonaAvatar} style={styles.chatAvatarImage} />}
        <View style={[styles.messageBubble, isAgent ? styles.agentBubble : styles.userBubble]}>
          <MarkdownMessage text={item.text} isAgent={isAgent} />
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={[styles.messageBubbleContainer, styles.agentContainer]}>
      <Image source={leonaAvatar} style={styles.chatAvatarImage} />
      <View style={[styles.messageBubble, styles.agentBubble, styles.typingBubble]}>
        <ActivityIndicator size="small" color={colors.blueLight} />
        <Text style={styles.typingText}>LEONA is responding...</Text>
      </View>
    </View>
  );

  const handleAttachPress = () => {
    // TODO: implement file picker (expo-document-picker or expo-image-picker)
    console.log('[LEONA] Attach file pressed');
  };

  const renderChat = () => (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Quick Chips — compact pills above chat, all 6 visible */}
      <View style={styles.chipsSection}>
        {quickChips.map((chip, idx) => (
          <TouchableOpacity key={idx} style={styles.chip} onPress={() => handleChipPress(chip)}>
            <Text style={styles.chipText}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListFooterComponent={sending ? renderTypingIndicator : null}
        onContentSizeChange={scrollToBottom}
        keyboardShouldPersistTaps="handled"
      />

      {/* Input — attach button + text + send */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={handleAttachPress}>
          <Text style={styles.attachButtonText}>+</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Ask LEONA"
          placeholderTextColor={colors.textDim}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.sendButtonText}>→</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LeonaHeader
        right={
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.videoCallBtn, !productConfig.canUseVideoAgent && styles.videoCallBtnDisabled]}
              disabled={!productConfig.canUseVideoAgent}
              onPress={() => navigation.navigate('Call', {
                channelName: 'leona-direct',
                callType: 'video',
                threadName: 'LEONA',
                participants: ['LEONA'],
              })}
            >
              <Text style={styles.videoCallBtnIcon}>⬛</Text>
              <Text style={styles.videoCallBtnText}>{productConfig.canUseVideoAgent ? 'VIDEO' : 'VIDEO LOCKED'}</Text>
            </TouchableOpacity>
            <View style={styles.monitoringRow}>
              <View style={styles.greenDot} />
              <Text style={styles.monitoringText}>Monitoring {EVENTS.length} events</Text>
            </View>
          </View>
        }
      />

      {/* Video Call Modal */}
      <Modal
        visible={isVideoCall}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setIsVideoCall(false)}
      >
        <View style={styles.videoCallScreen}>
          {/* Fake remote video background */}
          <View style={styles.videoRemoteBg}>
            <Image source={leonaAvatar} style={styles.videoRemoteAvatar} />
            <View style={styles.videoPulseRing} />
          </View>

          {/* LEONA info */}
          <View style={styles.videoCallerInfo}>
            <Text style={styles.videoCallerName}>LEONA</Text>
            <Text style={styles.videoCallerStatus}>Secure video · End-to-end encrypted</Text>
          </View>

          {/* Self-view (picture-in-picture) */}
          <View style={styles.videoSelfView}>
            <Text style={styles.videoSelfText}>You</Text>
          </View>

          {/* Controls bar */}
          <View style={styles.videoControls}>
            <TouchableOpacity style={styles.videoCtrlBtn}>
              <Text style={styles.videoCtrlIcon}>🎤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoCtrlBtn}>
              <Text style={styles.videoCtrlIcon}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.videoCtrlBtn, styles.videoEndBtn]}
              onPress={() => setIsVideoCall(false)}
            >
              <Text style={styles.videoEndIcon}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoCtrlBtn}>
              <Text style={styles.videoCtrlIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoCtrlBtn}>
              <Text style={styles.videoCtrlIcon}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Top-level tabs: CHAT | BRIEFS — equal 50/50 width */}
      <View style={styles.sectionTabs}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.value}
            style={[styles.sectionTab, activeSection === section.value && styles.sectionTabActive]}
            onPress={() => setActiveSection(section.value)}
          >
            <View style={styles.sectionTabInner}>
              <Text style={[styles.sectionTabText, activeSection === section.value && styles.sectionTabTextActive]}>
                {section.label}
              </Text>
              {section.value === 'BRIEF' && briefsCount > 0 && (
                <View style={styles.briefsBadge}>
                  <Text style={styles.briefsBadgeText}>{briefsCount}</Text>
                </View>
              )}
            </View>
            {activeSection === section.value && <View style={styles.sectionTabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Brief sub-tabs (only when BRIEF is active) */}
      {activeSection === 'BRIEF' && (
        <View style={styles.briefSubTabs}>
          {briefSubTabs.map((sub) => (
            <TouchableOpacity
              key={sub.value}
              style={[styles.briefSubTab, activeBriefTab === sub.value && styles.briefSubTabActive]}
              onPress={() => setActiveBriefTab(sub.value)}
            >
              <Text style={[styles.briefSubTabText, activeBriefTab === sub.value && styles.briefSubTabTextActive]}>
                {sub.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {activeSection === 'BRIEF' && activeBriefTab === 'WORLD' && renderWorldBrief()}
      {activeSection === 'BRIEF' && activeBriefTab === 'MY' && renderMyBrief()}
      {activeSection === 'CHAT' && renderChat()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header right cluster — VIDEO on top, monitoring below
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 5,
  },
  videoCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(107,72,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(107,72,255,0.35)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  videoCallBtnDisabled: {
    opacity: 0.45,
  },
  videoCallBtnIcon: {
    fontSize: 9,
    color: colors.purpleLight,
  },
  videoCallBtnText: {
    color: colors.purpleLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Monitoring indicator (below VIDEO pill)
  monitoringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.safe,
  },
  monitoringText: {
    color: colors.textSec,
    fontSize: 10,
    fontWeight: '500',
  },

  // Section Tabs — equal 50/50 width
  sectionTabs: {
    flexDirection: 'row',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  sectionTabActive: {},
  sectionTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTabText: {
    color: colors.textSec,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTabTextActive: {
    color: colors.blue,
  },
  sectionTabLine: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.blue,
  },
  briefsBadge: {
    backgroundColor: colors.blue,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  briefsBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  // Brief sub-tabs (My Brief / World Brief) — equal 50/50 width
  briefSubTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  briefSubTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  briefSubTabActive: {
    borderColor: colors.blue,
    backgroundColor: `${colors.blue}18`,
  },
  briefSubTabText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  briefSubTabTextActive: {
    color: colors.blue,
  },

  // ===== BRIEF CONTENT =====
  briefContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Severity Grid
  severityGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: colors.panel,
  },
  severityCount: { fontSize: 14, fontWeight: '700', marginBottom: 1 },
  severityLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 0.4 },

  // Pinned section
  pinnedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  pinnedIcon: { fontSize: 14 },
  pinnedTitle: { color: '#FFD700', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  pinnedCountBadge: { backgroundColor: 'rgba(255,215,0,0.12)', paddingHorizontal: 8, paddingVertical: 1, borderRadius: 10 },
  pinnedCountText: { color: '#FFD700', fontSize: 10, fontWeight: '700' },
  pinIconActive: { fontSize: 16, opacity: 0.9 },
  pinIconDim: { fontSize: 16, opacity: 0.25 },

  // GTI Card
  gtiCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  gtiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gtiTitle: { color: colors.textSec, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  gtiLive: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gtiDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.safe },
  gtiLiveText: { color: colors.safe, fontSize: 9, fontWeight: '700' },
  gtiRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md },
  gtiScore: { color: colors.high, fontSize: 36, fontWeight: '700' },
  gtiMax: { color: colors.textDim, fontSize: 16, fontWeight: '500', marginLeft: 2 },
  gtiTrend: { marginLeft: spacing.md, backgroundColor: `${colors.critical}20`, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  gtiTrendText: { color: colors.critical, fontSize: 11, fontWeight: '700' },
  gtiBar: { height: 4, backgroundColor: colors.bg, borderRadius: 2 },
  gtiBarFill: { height: 4, backgroundColor: colors.high, borderRadius: 2 },

  // Brief Sections
  briefSection: { marginBottom: spacing.lg },
  briefSectionTitle: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  briefEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  briefEventIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.panel, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  briefEventInfo: { flex: 1 },
  briefEventTitle: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  briefEventLocation: { color: colors.textSec, fontSize: 11 },
  briefSevDot: { width: 8, height: 8, borderRadius: 4 },

  // Narrative Card
  narrativeCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  narrativeSectionTitle: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  narrativeText: { color: colors.textSec, fontSize: 13, lineHeight: 20 },

  // My Brief
  myBriefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  blueLine: { width: 4, height: 20, backgroundColor: colors.blue, borderRadius: 2 },
  myBriefTitle: { color: colors.text, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  aoiTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  aoiTag: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.panel, borderColor: colors.blue, borderWidth: 1, borderRadius: 16,
  },
  aoiText: { color: colors.blue, fontSize: 11, fontWeight: '500' },

  myBriefStats: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  myBriefStat: { flex: 1, alignItems: 'center' },
  myBriefStatNum: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  myBriefStatLabel: { color: colors.textDim, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  myBriefStatDivider: { width: 1, backgroundColor: colors.border },

  askLeonaBtn: {
    paddingVertical: spacing.lg,
    backgroundColor: colors.purpleDim,
    borderColor: colors.purple,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  askLeonaBtnText: { color: colors.purpleLight, fontSize: 13, fontWeight: '600' },

  // ===== CHAT =====
  chatContainer: { flex: 1 },
  messagesList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  messageBubbleContainer: { flexDirection: 'row', marginBottom: spacing.lg, alignItems: 'flex-end' },
  agentContainer: { justifyContent: 'flex-start' },
  userContainer: { justifyContent: 'flex-end' },
  chatAvatarImage: { width: 28, height: 28, borderRadius: 14, marginRight: spacing.sm },
  messageBubble: { maxWidth: width * 0.72, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: 12 },
  agentBubble: { backgroundColor: colors.purpleDim, borderLeftColor: colors.purple, borderLeftWidth: 2 },
  userBubble: { backgroundColor: colors.blueDim, borderRightColor: colors.blue, borderRightWidth: 2 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  messageText: { fontSize: 14, lineHeight: 20 },
  agentText: { color: colors.text },
  userText: { color: colors.blueLight },
  typingText: { color: colors.textSec, fontSize: 13, fontWeight: '500' },
  messageTextBold: { fontWeight: '700' },
  markdownContainer: { gap: spacing.sm },
  markdownParagraph: { marginBottom: 0 },
  markdownHeading: { fontWeight: '700', letterSpacing: 0.4 },
  markdownHeadingPrimary: { fontSize: 16, lineHeight: 22 },
  markdownHeadingSecondary: { fontSize: 13, lineHeight: 18, textTransform: 'uppercase' },
  agentHeading: { color: colors.text },
  userHeading: { color: colors.white },
  markdownDivider: { height: 1, marginVertical: spacing.xs },
  agentDivider: { backgroundColor: 'rgba(255,255,255,0.12)' },
  userDivider: { backgroundColor: 'rgba(255,255,255,0.2)' },
  markdownList: { gap: spacing.sm },
  markdownListRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  markdownBullet: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  markdownTable: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  agentTable: { borderColor: 'rgba(255,255,255,0.12)' },
  userTable: { borderColor: 'rgba(255,255,255,0.2)' },
  markdownTableHeaderRow: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  markdownTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  markdownTableHeaderText: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 11,
    fontWeight: '700',
  },
  markdownTableCellText: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
  },

  // Quick chips — compact pills above chat, wrapping to show all 6
  chipsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: colors.panel, borderColor: colors.purpleLight, borderWidth: 1, borderRadius: 20,
  },
  chipText: { color: colors.purpleLight, fontSize: 12, fontWeight: '600' },

  // Input bar — attach + text + send
  inputContainer: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.sm, alignItems: 'flex-end',
  },
  attachButton: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  attachButtonText: { color: colors.textSec, fontSize: 22, fontWeight: '300' },
  textInput: {
    flex: 1, backgroundColor: colors.panel, borderColor: colors.borderLight, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    color: colors.text, fontSize: 14, maxHeight: 100,
  },
  sendButton: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.purple, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: colors.textDim },
  sendButtonText: { color: colors.white, fontSize: 18, fontWeight: '600' },

  // ── VIDEO CALL SCREEN ─────────────────────────────────────
  videoCallScreen: {
    flex: 1,
    backgroundColor: '#06080F',
    justifyContent: 'space-between',
  },
  videoRemoteBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0F1E',
  },
  videoRemoteAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: colors.purple,
  },
  videoPulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(107,72,255,0.3)',
  },
  videoCallerInfo: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  videoCallerName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  videoCallerStatus: {
    color: colors.textSec,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  videoSelfView: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#1A1C2E',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoSelfText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '500',
  },
  videoControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingBottom: 48,
    paddingTop: 20,
    backgroundColor: 'rgba(6,8,15,0.9)',
  },
  videoCtrlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoEndBtn: {
    backgroundColor: colors.critical,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  videoCtrlIcon: {
    fontSize: 22,
  },
  videoEndIcon: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '600',
  },
});

export default LeonaChatScreen;
