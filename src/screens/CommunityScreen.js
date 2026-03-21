import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing } from '../theme';
import LeonaHeader from '../components/LeonaHeader';

// ─── INITIAL DATA ──────────────────────────────────────────────────────────────
const INITIAL_POSTS = [];
const INITIAL_THREADS = [];

const SUGGESTED_TAGS = [
  { label: '#wildfire', color: '#FF6B35' },
  { label: '#flood', color: '#4FC3F7' },
  { label: '#earthquake', color: '#FFB74D' },
  { label: '#hurricane', color: '#CE93D8' },
  { label: '#critical', color: '#FF3B3B' },
];

const SUGGESTED_CONTACTS = [
  '# ops-critical',
  'Ana S.',
  'Tom J.',
  '# intel-reports',
  'LEONA System',
];

// ─── COMMUNITY SCREEN ─────────────────────────────────────────────────────────
const CommunityScreen = ({ navigation }) => {
  // ── Top-level section
  const [section, setSection] = useState('FEED'); // 'FEED' | 'INBOX'

  // ── FEED state
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [showNewPost, setShowNewPost] = useState(false);
  const [postText, setPostText] = useState('');
  const [postSelectedTags, setPostSelectedTags] = useState([]);

  // ── INBOX state
  const [inboxTab, setInboxTab] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeMessage, setComposeMessage] = useState('');

  // Unread count for badge
  const unreadCount = threads.filter((t) => t.unread).length;

  // ── FEED helpers ─────────────────────────────────────────────────────────────
  const togglePostTag = (tag) => {
    setPostSelectedTags((prev) =>
      prev.find((t) => t.label === tag.label)
        ? prev.filter((t) => t.label !== tag.label)
        : [...prev, tag]
    );
  };

  const handlePublishPost = () => {
    if (!postText.trim()) return;
    const newPost = {
      id: Date.now().toString(),
      author: 'You',
      avatar: 'YO',
      role: 'Guardian Pro Member',
      badge: null,
      time: 'just now',
      text: postText,
      tags: postSelectedTags,
      votes: 0,
      comments: 0,
    };
    setPosts([newPost, ...posts]);
    setPostText('');
    setPostSelectedTags([]);
    setShowNewPost(false);
  };

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>
          <Text style={styles.avatarInitials}>{item.avatar}</Text>
        </View>
        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName}>{item.author}</Text>
            {item.badge && (
              <View style={[styles.badge, { backgroundColor: item.badgeColor || colors.panel }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </View>
          <Text style={styles.authorRole}>{item.role}</Text>
        </View>
        <Text style={styles.postTime}>{item.time}</Text>
      </View>

      <Text style={styles.postText}>{item.text}</Text>

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag, idx) => (
            <View key={idx} style={[styles.tag, tag.color && { borderColor: tag.color }]}>
              <Text style={[styles.tagText, tag.color && { color: tag.color }]}>
                {tag.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.engagementRow}>
        <TouchableOpacity style={styles.engagementItem}>
          <Text style={styles.engagementText}>▲ {item.votes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.engagementItem}>
          <Text style={styles.engagementText}>💬 {item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.engagementItem}>
          <Text style={styles.engagementText}>↗ Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleUpload = (type) => {
    // TODO: wire to expo-image-picker / expo-document-picker
    console.log(`[LEONA Community] Upload ${type} pressed`);
  };

  const renderFeed = () => (
    <>
      {/* Compose prompt */}
      <TouchableOpacity style={styles.composePrompt} onPress={() => setShowNewPost(true)}>
        <View style={styles.composePromptAvatar}>
          <Text style={styles.avatarInitials}>YO</Text>
        </View>
        <Text style={styles.composePromptText}>Share an update or intelligence note...</Text>
        <View style={styles.composePromptBtn}>
          <Text style={styles.composePromptBtnText}>POST</Text>
        </View>
      </TouchableOpacity>

      {/* Upload buttons */}
      <View style={styles.uploadBar}>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('photo')}>
          <Text style={styles.uploadIcon}>🖼</Text>
          <Text style={styles.uploadText}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('video')}>
          <Text style={styles.uploadIcon}>🎥</Text>
          <Text style={styles.uploadText}>Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('pdf')}>
          <Text style={styles.uploadIcon}>📄</Text>
          <Text style={styles.uploadText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('file')}>
          <Text style={styles.uploadIcon}>📎</Text>
          <Text style={styles.uploadText}>File</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        scrollEnabled={false}
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListFooterComponent={() => <View style={{ height: spacing.xl }} />}
      />
    </>
  );

  // ── INBOX helpers ─────────────────────────────────────────────────────────────
  const inboxTabs = ['ALL', 'DMs', 'CHANNELS', 'SYSTEM'];

  const filteredThreads = threads.filter((thread) => {
    const matchesTab =
      inboxTab === 'ALL' ||
      (inboxTab === 'DMs' && thread.type === 'dm') ||
      (inboxTab === 'CHANNELS' && thread.type === 'channel') ||
      (inboxTab === 'SYSTEM' && thread.type === 'system');

    const matchesSearch =
      thread.name.toLowerCase().includes(searchText.toLowerCase()) ||
      thread.preview.toLowerCase().includes(searchText.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const pinnedThreads = filteredThreads.filter((t) => t.pinned);
  const recentThreads = filteredThreads.filter((t) => !t.pinned);

  const handleSendMessage = () => {
    if (!composeRecipient.trim() || !composeMessage.trim()) return;
    const newThread = {
      id: Date.now().toString(),
      name: composeRecipient,
      preview: composeMessage,
      time: 'now',
      type: composeRecipient.startsWith('#') ? 'channel' : 'dm',
      avatar: composeRecipient[0].toUpperCase(),
      pinned: false,
      unread: true,
    };
    setThreads([newThread, ...threads]);
    setShowCompose(false);
    setComposeRecipient('');
    setComposeMessage('');
  };

  const renderThreadRow = ({ item }) => (
    <TouchableOpacity
      style={styles.threadRow}
      onPress={() => navigation.navigate('Thread', { thread: item })}
    >
      <View style={styles.threadAvatar}>
        {item.icon ? (
          <Text style={styles.threadAvatarIcon}>{item.icon}</Text>
        ) : (
          <Text style={styles.threadAvatarText}>{item.avatar}</Text>
        )}
      </View>
      <View style={styles.threadInfo}>
        <Text style={styles.threadName}>{item.name}</Text>
        <Text style={styles.threadPreview} numberOfLines={1}>{item.preview}</Text>
      </View>
      <View style={styles.threadMeta}>
        <Text style={styles.threadTime}>{item.time}</Text>
        {item.unread && (
          <View style={[styles.unreadBadge, typeof item.unread === 'number' && styles.unreadBadgeCount]}>
            {typeof item.unread === 'number' ? (
              <Text style={styles.unreadBadgeText}>{item.unread}</Text>
            ) : (
              <View style={styles.unreadDot} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderInbox = () => (
    <>
      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor={colors.textDim}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub-tabs */}
      <View style={styles.inboxTabBar}>
        {inboxTabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.inboxTab, inboxTab === tab && styles.inboxTabActive]}
            onPress={() => setInboxTab(tab)}
          >
            <Text style={[styles.inboxTabText, inboxTab === tab && styles.inboxTabTextActive]}>
              {tab}
            </Text>
            {inboxTab === tab && <View style={styles.inboxTabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Thread list */}
      {pinnedThreads.length > 0 && (
        <>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>📌  PINNED</Text>
          </View>
          <FlatList
            scrollEnabled={false}
            data={pinnedThreads}
            renderItem={renderThreadRow}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.threadSeparator} />}
          />
        </>
      )}

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
            ItemSeparatorComponent={() => <View style={styles.threadSeparator} />}
          />
        </>
      )}

      {filteredThreads.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✉</Text>
          <Text style={styles.emptyText}>No messages here</Text>
        </View>
      )}

      <View style={{ height: 80 }} />
    </>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────────
  const actionButton = section === 'FEED' ? (
    <TouchableOpacity style={styles.actionBtn} onPress={() => setShowNewPost(true)}>
      <Text style={styles.actionBtnText}>✎</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity style={styles.actionBtn} onPress={() => setShowCompose(true)}>
      <Text style={styles.actionBtnText}>✎</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LeonaHeader title="COMMUNITY" right={actionButton} />

      {/* Section toggle: FEED / INBOX */}
      <View style={styles.sectionToggleRow}>
        <TouchableOpacity
          style={[styles.sectionToggleBtn, section === 'FEED' && styles.sectionToggleBtnActive]}
          onPress={() => setSection('FEED')}
        >
          {/* Feed icon: three horizontal lines */}
          <Text style={[styles.sectionToggleIcon, section === 'FEED' && styles.sectionToggleIconActive]}>
            ≡
          </Text>
          <Text style={[styles.sectionToggleLabel, section === 'FEED' && styles.sectionToggleLabelActive]}>
            FEED
          </Text>
          {section === 'FEED' && <View style={styles.sectionToggleLine} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionToggleBtn, section === 'INBOX' && styles.sectionToggleBtnActive]}
          onPress={() => setSection('INBOX')}
        >
          {/* Message icon: envelope */}
          <View style={styles.inboxIconWrap}>
            <Text style={[styles.sectionToggleIcon, section === 'INBOX' && styles.sectionToggleIconActive]}>
              ✉
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadPip}>
                <Text style={styles.unreadPipText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.sectionToggleLabel, section === 'INBOX' && styles.sectionToggleLabelActive]}>
            INBOX
          </Text>
          {section === 'INBOX' && <View style={styles.sectionToggleLine} />}
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {section === 'FEED' && renderFeed()}
        {section === 'INBOX' && renderInbox()}
      </ScrollView>

      {/* ── NEW POST MODAL ── */}
      <Modal
        visible={showNewPost}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewPost(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.composeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NEW POST</Text>
              <TouchableOpacity onPress={() => setShowNewPost(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Author row */}
            <View style={styles.modalAuthorRow}>
              <View style={styles.modalAvatar}>
                <Text style={styles.avatarInitials}>YO</Text>
              </View>
              <View>
                <Text style={styles.modalAuthorName}>You</Text>
                <Text style={styles.modalAuthorRole}>Guardian Pro Member</Text>
              </View>
            </View>

            {/* Post text */}
            <TextInput
              style={styles.postInput}
              placeholder="Share an update, intelligence note, or observation..."
              placeholderTextColor={colors.textDim}
              value={postText}
              onChangeText={setPostText}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            {/* Tag selector */}
            <Text style={styles.modalSectionLabel}>ADD TAGS</Text>
            <View style={styles.tagChips}>
              {SUGGESTED_TAGS.map((tag) => {
                const selected = postSelectedTags.find((t) => t.label === tag.label);
                return (
                  <TouchableOpacity
                    key={tag.label}
                    style={[
                      styles.tagChip,
                      { borderColor: tag.color },
                      selected && { backgroundColor: tag.color + '22' },
                    ]}
                    onPress={() => togglePostTag(tag)}
                  >
                    <Text style={[styles.tagChipText, { color: tag.color }]}>{tag.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.publishBtn, !postText.trim() && styles.publishBtnDisabled]}
              onPress={handlePublishPost}
              disabled={!postText.trim()}
            >
              <Text style={styles.publishBtnText}>PUBLISH TO FEED</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── NEW MESSAGE MODAL ── */}
      <Modal
        visible={showCompose}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompose(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.composeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NEW MESSAGE</Text>
              <TouchableOpacity onPress={() => setShowCompose(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* To field */}
            <Text style={styles.modalSectionLabel}>TO</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Name or # channel..."
              placeholderTextColor={colors.textDim}
              value={composeRecipient}
              onChangeText={setComposeRecipient}
            />

            {/* Suggested contacts */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.contactChipsScroll}
              contentContainerStyle={styles.contactChipsContent}
            >
              {SUGGESTED_CONTACTS.map((contact) => (
                <TouchableOpacity
                  key={contact}
                  style={[
                    styles.contactChip,
                    composeRecipient === contact && styles.contactChipSelected,
                  ]}
                  onPress={() => setComposeRecipient(contact)}
                >
                  <Text
                    style={[
                      styles.contactChipText,
                      composeRecipient === contact && styles.contactChipTextSelected,
                    ]}
                  >
                    {contact}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Layer info */}
            {composeRecipient.startsWith('#') && (
              <View style={styles.layerHint}>
                <Text style={styles.layerHintIcon}>⬡</Text>
                <Text style={styles.layerHintText}>
                  Sending to channel {composeRecipient} · visible to all members
                </Text>
              </View>
            )}
            {composeRecipient.length > 0 && !composeRecipient.startsWith('#') && (
              <View style={styles.layerHint}>
                <Text style={styles.layerHintIcon}>🔒</Text>
                <Text style={styles.layerHintText}>
                  Direct message to {composeRecipient} · end-to-end encrypted
                </Text>
              </View>
            )}

            {/* Message body */}
            <Text style={[styles.modalSectionLabel, { marginTop: spacing.lg }]}>MESSAGE</Text>
            <TextInput
              style={[styles.fieldInput, styles.messageBodyInput]}
              placeholder="Type your message..."
              placeholderTextColor={colors.textDim}
              value={composeMessage}
              onChangeText={setComposeMessage}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.publishBtn,
                (!composeRecipient.trim() || !composeMessage.trim()) && styles.publishBtnDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!composeRecipient.trim() || !composeMessage.trim()}
            >
              <Text style={styles.publishBtnText}>SEND →</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.blue,
    borderWidth: 1,
  },
  actionBtnText: {
    color: colors.blue,
    fontSize: 18,
    fontWeight: '600',
  },

  // ── Section toggle ──────────────────────────────────────────
  sectionToggleRow: {
    flexDirection: 'row',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  sectionToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 7,
    position: 'relative',
  },
  sectionToggleBtnActive: {},
  sectionToggleIcon: {
    fontSize: 17,
    color: colors.textDim,
  },
  sectionToggleIconActive: {
    color: colors.blue,
  },
  sectionToggleLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sectionToggleLabelActive: {
    color: colors.blue,
  },
  sectionToggleLine: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.blue,
  },
  inboxIconWrap: {
    position: 'relative',
  },
  unreadPip: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: colors.critical,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  unreadPipText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '700',
  },

  // ── Scrollable content ──────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // ── FEED ────────────────────────────────────────────────────
  composePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  composePromptAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.panelLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composePromptText: {
    flex: 1,
    color: colors.textDim,
    fontSize: 13,
  },
  composePromptBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  composePromptBtnText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Upload buttons bar
  uploadBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  uploadIcon: { fontSize: 14 },
  uploadText: { color: colors.textSec, fontSize: 11, fontWeight: '500' },

  postCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panelLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  authorInfo: { flex: 1 },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  authorName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: { fontSize: 9, fontWeight: '700' },
  authorRole: { color: colors.textSec, fontSize: 11 },
  postTime: { color: colors.textDim, fontSize: 11 },
  postText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tagText: { color: colors.text, fontSize: 11, fontWeight: '500' },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  engagementItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  engagementText: { color: colors.textSec, fontSize: 12, fontWeight: '500' },

  // ── INBOX ────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchIcon: {
    color: colors.textDim,
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: spacing.md,
  },
  searchClear: { color: colors.textDim, fontSize: 14, paddingLeft: spacing.sm },

  inboxTabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  inboxTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  inboxTabActive: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(74,144,255,0.08)',
  },
  inboxTabText: {
    color: colors.textSec,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inboxTabTextActive: { color: colors.blue },
  inboxTabLine: {
    // No longer needed with pill style, but keep to avoid crash
    height: 0,
  },

  sectionLabel: {
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionLabelText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  threadAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threadAvatarIcon: { fontSize: 22 },
  threadAvatarText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  threadInfo: { flex: 1 },
  threadName: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  threadPreview: { color: colors.textSec, fontSize: 12 },
  threadMeta: { alignItems: 'flex-end', gap: spacing.sm },
  threadTime: { color: colors.textDim, fontSize: 11 },
  unreadBadge: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue,
  },
  unreadBadgeCount: {
    width: 'auto', paddingHorizontal: spacing.sm, borderRadius: 10,
    backgroundColor: colors.critical, justifyContent: 'center', alignItems: 'center',
    height: 'auto',
  },
  unreadBadgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blue },
  threadSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 44 + spacing.md,
  },

  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 32, color: colors.textDim },
  emptyText: { color: colors.textDim, fontSize: 14 },

  // ── Modals (shared) ─────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  composeModal: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalClose: { color: colors.textSec, fontSize: 18, fontWeight: '600' },

  // New Post modal specific
  modalAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modalAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.panelLight,
    borderWidth: 1, borderColor: colors.borderLight,
    justifyContent: 'center', alignItems: 'center',
  },
  modalAuthorName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  modalAuthorRole: { color: colors.textSec, fontSize: 11 },
  postInput: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
    paddingTop: 0,
  },
  modalSectionLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagChipText: { fontSize: 11, fontWeight: '600' },

  // New Message modal specific
  fieldInput: {
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
  contactChipsScroll: { marginBottom: spacing.sm },
  contactChipsContent: { gap: spacing.sm },
  contactChip: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 16,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  contactChipSelected: { backgroundColor: colors.blueDim },
  contactChipText: { color: colors.blue, fontSize: 12, fontWeight: '600' },
  contactChipTextSelected: { color: colors.blueLight },
  layerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  layerHintIcon: { fontSize: 13 },
  layerHintText: { color: colors.textSec, fontSize: 12, flex: 1 },
  messageBodyInput: { minHeight: 100, textAlignVertical: 'top' },

  // Publish / Send button
  publishBtn: {
    backgroundColor: colors.blue,
    paddingVertical: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  publishBtnDisabled: { backgroundColor: colors.textDim },
  publishBtnText: { color: colors.white, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});

export default CommunityScreen;
