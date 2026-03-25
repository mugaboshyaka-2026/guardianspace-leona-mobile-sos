import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing } from '../theme';
import { AppContext } from '../../App';
import { getProductConfig } from '../lib/products';

const { width } = Dimensions.get('window');

// ── Test user seed data keyed by thread type ──────────────────────────────────
const THREAD_MESSAGES = {
  default: [
    {
      id: 'msg0',
      type: 'leona',
      text: 'LEONA INTELLIGENCE: Sentinel-1 SAR update shows active fire progression in zone 4. Real-time wind data confirms sustained Santa Ana winds at 62 km/h. Evacuation zone expansion likely within 2 hours. Recommend pre-positioning medical resources now.',
      timestamp: '14:28',
    },
    {
      id: 'msg1',
      author: 'Tom J.',
      avatar: 'TJ',
      role: 'Field Operations Lead',
      avatarColor: '#667eea',
      text: "Field team is reporting heavy smoke in approaching areas. Visibility dropping fast — maybe 200m. We're pulling back to the staging point.",
      timestamp: '14:30',
      type: 'user',
    },
    {
      id: 'msg2',
      author: 'Ana S.',
      avatar: 'AS',
      role: 'Logistics Coordinator',
      avatarColor: '#0F9B8E',
      text: "Copy that Tom. I'm coordinating with local PD on secondary evacuation routes — if Route 7 gets blocked we can push traffic via the 118. Stand by.",
      timestamp: '14:33',
      type: 'user',
    },
    {
      id: 'msg3',
      author: 'Mike S.',
      avatar: 'MS',
      role: 'Incident Commander',
      avatarColor: '#FF5722',
      text: 'Second response team is mobilizing to sector 4. ETA 45 minutes. Medical unit will stage at the Chatsworth Recreation Center.',
      timestamp: '14:36',
      type: 'user',
    },
    {
      id: 'msg4',
      type: 'leona',
      text: 'LEONA UPDATE: Wind gusts now peaking at 74 km/h at Chatsworth RAWS station. Spot fire reported 1.2 km NE of sector 4 boundary. Air tanker retardant drop scheduled 14:55 local — maintain clearance in drop zone.',
      timestamp: '14:40',
    },
    {
      id: 'msg5',
      author: 'Sarah K.',
      avatar: 'SK',
      role: 'Public Affairs Officer',
      avatarColor: '#9C27B0',
      text: "I've issued a media advisory for the expanded evacuation. Shelter-in-place order is live on the county emergency app. Expecting a press briefing request — who's available to speak at 16:00?",
      timestamp: '14:44',
      type: 'user',
    },
    {
      id: 'msg6',
      author: 'Mike S.',
      avatar: 'MS',
      role: 'Incident Commander',
      avatarColor: '#FF5722',
      text: "I'll cover the 16:00 briefing. Ana — can you send me the updated resource deployment map before then?",
      timestamp: '14:47',
      type: 'user',
    },
    {
      id: 'msg7',
      author: 'Ana S.',
      avatar: 'AS',
      role: 'Logistics Coordinator',
      avatarColor: '#0F9B8E',
      text: "Sending now. Also — mutual aid request from LA County OES has been approved. 3 additional engines arriving 15:30. I'll slot them into sector 3.",
      timestamp: '14:49',
      type: 'user',
    },
  ],
};

const ThreadScreen = ({ route, navigation }) => {
  const { userConfig } = useContext(AppContext);
  const productConfig = getProductConfig(userConfig?.product);
  const { thread } = route.params || {};
  const [messages, setMessages] = useState(THREAD_MESSAGES.default);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);
  const pendingReplyTimeoutsRef = useRef(new Set());
  const isScreenActiveRef = useRef(true);
  const nextMessageIdRef = useRef(THREAD_MESSAGES.default.length);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    isScreenActiveRef.current = true;

    return () => {
      isScreenActiveRef.current = false;
      pendingReplyTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingReplyTimeoutsRef.current.clear();
    };
  }, []);

  const createMessageId = () => {
    const nextId = nextMessageIdRef.current;
    nextMessageIdRef.current += 1;
    return `msg-${nextId}`;
  };

  const handleSend = () => {
    if (inputText.trim()) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMsg = {
        id: createMessageId(),
        author: 'Kian M.',
        avatar: 'KM',
        role: 'Admin · Guardian Space',
        avatarColor: '#6B48FF',
        text: inputText,
        timestamp: now,
        type: 'user',
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');

      // Simulate a reply from a team member after a short delay
      const RESPONDERS = [
        { author: 'Mike S.', avatar: 'MS', role: 'Incident Commander', avatarColor: '#FF5722' },
        { author: 'Ana S.', avatar: 'AS', role: 'Logistics Coordinator', avatarColor: '#0F9B8E' },
        { author: 'Tom J.', avatar: 'TJ', role: 'Field Operations Lead', avatarColor: '#667eea' },
      ];
      const responder = RESPONDERS[Math.floor(Math.random() * RESPONDERS.length)];
      const AUTO_REPLIES = [
        "Copy that — updating the ops log now.",
        "Understood. I'll coordinate on my end.",
        "Roger. Will relay to the field team.",
        "Got it — standing by for further updates.",
        "Confirmed. Looping in LEONA for situational awareness.",
      ];
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      const timeoutId = setTimeout(() => {
        pendingReplyTimeoutsRef.current.delete(timeoutId);
        if (!isScreenActiveRef.current) {
          return;
        }
        const replyMsg = {
          id: createMessageId(),
          ...responder,
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'user',
        };
        setMessages((prev) => [...prev, replyMsg]);
      }, 1200);
      pendingReplyTimeoutsRef.current.add(timeoutId);
    }
  };

  const renderMessage = ({ item }) => {
    const isLeona = item.type === 'leona';

    if (isLeona) {
      return (
        <View style={styles.leonaMessageContainer}>
          <View style={styles.leonaBadge}>
            <Text style={styles.leonaBadgeText}>◆ LEONA</Text>
          </View>
          <View style={styles.leonaMessage}>
            <Text style={styles.leonaText}>{item.text}</Text>
            <Text style={styles.leonaTime}>{item.timestamp}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageBubbleContainer}>
        <View style={[styles.messageAvatar, item.avatarColor && { backgroundColor: item.avatarColor + '33' }]}>
          <Text style={styles.avatarInitials}>{item.avatar}</Text>
        </View>
        <View style={styles.messageBubbleContent}>
          <View style={styles.authorRow}>
            <Text style={styles.messageAuthor}>{item.author}</Text>
            {item.role && <Text style={styles.messageRole}>· {item.role}</Text>}
          </View>
          <View style={[styles.messageBubble, item.avatarColor && { borderLeftColor: item.avatarColor, borderLeftWidth: 2 }]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
          <Text style={styles.messageTime}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  const memberCount = thread?.memberCount || 5; // Simulated member count

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{thread?.name || 'Thread'}</Text>
          <Text style={styles.headerMeta}>{memberCount} members</Text>
        </View>
        {/* Audio + Video call buttons */}
        <View style={styles.headerCallBtns}>
          <TouchableOpacity
            style={styles.callIconBtn}
            onPress={() =>
              navigation.navigate('Call', {
                channelName: (thread?.id || 'leona').replace(/[^a-zA-Z0-9]/g, '-'),
                callType: 'audio',
                threadName: thread?.name || 'Team Call',
                participants: thread?.members || [],
              })
            }
          >
            <Text style={styles.callIconBtnText}>🎙</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.callIconBtn, !productConfig.canUseVideoAgent && styles.callIconBtnDisabled]}
            disabled={!productConfig.canUseVideoAgent}
            onPress={() =>
              navigation.navigate('Call', {
                channelName: (thread?.id || 'leona').replace(/[^a-zA-Z0-9]/g, '-'),
                callType: 'video',
                threadName: thread?.name || 'Team Call',
                participants: thread?.members || [],
              })
            }
          >
            <Text style={styles.callIconBtnText}>🎥</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Reply in thread..."
            placeholderTextColor={colors.textDim}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.blue,
    fontSize: 24,
    fontWeight: '300',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerMeta: {
    color: colors.textSec,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  headerCallBtns: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIconBtnDisabled: {
    opacity: 0.45,
  },
  callIconBtnText: {
    fontSize: 16,
  },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarInitials: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  messageBubbleContent: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  messageAuthor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  messageRole: {
    color: colors.textSec,
    fontSize: 11,
  },
  messageBubble: {
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderColor: colors.border,
    borderWidth: 1,
    maxWidth: width * 0.75,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  leonaMessageContainer: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  leonaBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.purpleDim,
    borderColor: colors.purple,
    borderWidth: 1,
    borderRadius: 6,
  },
  leonaBadgeText: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: '700',
  },
  leonaMessage: {
    backgroundColor: colors.purpleDim,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderLeftColor: colors.purple,
    borderLeftWidth: 3,
    borderRadius: 8,
    maxWidth: width * 0.85,
  },
  leonaText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  leonaTime: {
    color: colors.textDim,
    fontSize: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.panel,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textDim,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
});

export default ThreadScreen;
