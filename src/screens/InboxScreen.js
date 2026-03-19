import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { colors, spacing } from '../theme';
import { INBOX_THREADS } from '../data/events';

const InboxScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [threads, setThreads] = useState(INBOX_THREADS);

  const suggestedContacts = [
    '# ops-critical',
    'Ana S.',
    'Tom J.',
    '# intel-reports',
    'LEONA System',
  ];

  const handleSendMessage = () => {
    if (!composeRecipient.trim() || !composeMessage.trim()) {
      return;
    }

    const newMessage = {
      id: Date.now().toString(),
      name: composeRecipient,
      preview: composeMessage,
      time: 'now',
      type: composeRecipient.startsWith('#') ? 'channel' : 'dm',
      avatar: composeRecipient[0],
      pinned: false,
      unread: false,
    };

    setThreads([newMessage, ...threads]);
    setShowCompose(false);
    setComposeRecipient('');
    setComposeMessage('');
  };

  const tabs = ['ALL', 'DMs', 'CHANNELS', 'SYSTEM'];

  const filteredThreads = threads.filter((thread) => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'DMs' && thread.type === 'dm') ||
      (activeTab === 'CHANNELS' && thread.type === 'channel') ||
      (activeTab === 'SYSTEM' && thread.type === 'system');

    const matchesSearch =
      thread.name.toLowerCase().includes(searchText.toLowerCase()) ||
      thread.preview.toLowerCase().includes(searchText.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const pinnedThreads = filteredThreads.filter((t) => t.pinned);
  const recentThreads = filteredThreads.filter((t) => !t.pinned);

  const renderThreadRow = ({ item }) => (
    <TouchableOpacity
      style={styles.threadRow}
      onPress={() => navigation.navigate('Thread', { thread: item })}
    >
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          {
            backgroundImage: item.avatarGrad
              ? `linear-gradient(135deg, ${item.avatarGrad[0]}, ${item.avatarGrad[1]})`
              : undefined,
            backgroundColor: item.avatarGrad ? undefined : colors.panel,
          },
        ]}
      >
        {item.icon ? (
          <Text style={styles.avatarIcon}>{item.icon}</Text>
        ) : (
          <Text style={styles.avatarInitials}>{item.avatar}</Text>
        )}
      </View>

      {/* Thread Info */}
      <View style={styles.threadInfo}>
        <Text style={styles.threadName}>{item.name}</Text>
        <Text style={styles.threadPreview} numberOfLines={1}>
          {item.preview}
        </Text>
      </View>

      {/* Time & Badge */}
      <View style={styles.threadMeta}>
        <Text style={styles.threadTime}>{item.time}</Text>
        {item.unread && (
          <View
            style={[
              styles.badge,
              typeof item.unread === 'number' && styles.badgeWithCount,
            ]}
          >
            {typeof item.unread === 'number' ? (
              <Text style={styles.badgeText}>{item.unread}</Text>
            ) : (
              <View style={styles.unreadDot} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>INBOX</Text>
        <TouchableOpacity style={styles.composeButton} onPress={() => setShowCompose(true)}>
          <Text style={styles.composeIcon}>✎</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search threads..."
          placeholderTextColor={colors.textDim}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Threads List */}
      <ScrollView style={styles.threadsList} showsVerticalScrollIndicator={false}>
        {/* Pinned Section */}
        {pinnedThreads.length > 0 && (
          <>
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>📌 PINNED</Text>
            </View>
            <FlatList
              scrollEnabled={false}
              data={pinnedThreads}
              renderItem={renderThreadRow}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => (
                <View style={styles.threadSeparator} />
              )}
            />
          </>
        )}

        {/* Recent Section */}
        {recentThreads.length > 0 && (
          <>
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>RECENT</Text>
            </View>
            <FlatList
              scrollEnabled={false}
              data={recentThreads}
              renderItem={renderThreadRow}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => (
                <View style={styles.threadSeparator} />
              )}
            />
          </>
        )}

        {filteredThreads.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No threads found</Text>
          </View>
        )}
      </ScrollView>

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompose(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.composeModal}>
            {/* Header */}
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>NEW MESSAGE</Text>
              <TouchableOpacity onPress={() => setShowCompose(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* To Field */}
            <View style={styles.composeSection}>
              <Text style={styles.composeLabelText}>TO</Text>
              <TextInput
                style={styles.composeInput}
                placeholder="Select recipient..."
                placeholderTextColor={colors.textDim}
                value={composeRecipient}
                onChangeText={setComposeRecipient}
              />
              {/* Suggested Contacts */}
              <View style={styles.suggestedChips}>
                {suggestedContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact}
                    style={styles.contactChip}
                    onPress={() => setComposeRecipient(contact)}
                  >
                    <Text style={styles.contactChipText}>{contact}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message Field */}
            <View style={[styles.composeSection, { flex: 1 }]}>
              <Text style={styles.composeLabelText}>MESSAGE</Text>
              <TextInput
                style={[styles.composeInput, styles.messageInput]}
                placeholder="Type your message..."
                placeholderTextColor={colors.textDim}
                value={composeMessage}
                onChangeText={setComposeMessage}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
            >
              <Text style={styles.sendButtonText}>SEND</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  composeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.blue,
    borderWidth: 1,
  },
  composeIcon: {
    color: colors.blue,
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.panel,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabLabel: {
    color: colors.textSec,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.blue,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.blue,
  },
  threadsList: {
    flex: 1,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionLabelText: {
    color: colors.textSec,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarIcon: {
    fontSize: 24,
  },
  avatarInitials: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  threadInfo: {
    flex: 1,
  },
  threadName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  threadPreview: {
    color: colors.textSec,
    fontSize: 12,
  },
  threadMeta: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  threadTime: {
    color: colors.textSec,
    fontSize: 11,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  badgeWithCount: {
    width: 'auto',
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.critical,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  threadSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    color: colors.textSec,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  composeModal: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'column',
  },
  composeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  composeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  closeButton: {
    color: colors.textSec,
    fontSize: 18,
    fontWeight: '600',
  },
  composeSection: {
    marginBottom: spacing.lg,
  },
  composeLabelText: {
    color: colors.textSec,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  composeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  messageInput: {
    flex: 1,
    minHeight: 120,
  },
  suggestedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contactChip: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 16,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  contactChipText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: colors.blue,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  sendButtonText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default InboxScreen;
