import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { colors, spacing } from '../theme';
import { useAuth } from '../lib/auth';
import { useProfile } from '../hooks/useEvents';
import { AppContext } from '../../App';

const MASKED_API_KEY = 'gs_live_••••••••7x4f';

const ProfileScreen = ({ navigation }) => {
  const [copyState, setCopyState] = useState('idle');
  const [copyMessage, setCopyMessage] = useState('');
  const { user: clerkUser, signOut } = useAuth();
  const { profile: apiProfile } = useProfile();
  const { userConfig, handleLogout } = useContext(AppContext);

  const clerkName = `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim();
  const displayName = clerkName || apiProfile?.name || userConfig?.fullName || 'Profile';
  const displayEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    apiProfile?.email ||
    userConfig?.email ||
    '';
  const displayOrg = apiProfile?.org_name || userConfig?.organization || 'Guardian Space Inc.';
  const displayInitials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }, [displayName]);
  const apiKeyValue = apiProfile?.api_key || apiProfile?.apiKey || userConfig?.apiKey || '';
  const maskedApiKey = apiKeyValue || MASKED_API_KEY;

  const copyToClipboard = async () => {
    if (!apiKeyValue) {
      setCopyState('error');
      setCopyMessage('Full API key is not available in this build, so there is nothing to copy.');
      return;
    }

    try {
      let copied = false;

      try {
        const Clipboard = require('expo-clipboard');
        if (Clipboard?.setStringAsync) {
          await Clipboard.setStringAsync(apiKeyValue);
          copied = true;
        }
      } catch {
        copied = false;
      }

      if (!copied && Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(apiKeyValue);
        copied = true;
      }

      if (!copied) {
        setCopyState('error');
        setCopyMessage('Clipboard copy is unavailable on this device/build.');
        return;
      }

      setCopyState('success');
      setCopyMessage('API key copied to clipboard.');
      setTimeout(() => {
        setCopyState('idle');
        setCopyMessage('');
      }, 2000);
    } catch (err) {
      setCopyState('error');
      setCopyMessage(err?.message || 'Clipboard copy failed.');
    }
  };

  const handleSignOut = async () => {
    try {
      if (signOut) {
        await signOut();
      }
    } finally {
      handleLogout();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{displayInitials}</Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <Text style={styles.userRole}>Admin · {displayOrg}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ORGANISATION</Text>
          <InfoRow label="Organisation Name" value={displayOrg} />
          <InfoRow label="Team" value="Operations" />
          <InfoRow label="Members" value="12" />
          <InfoRow label="Plan" value="Enterprise" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>API ACCESS</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Text style={styles.infoText}>API Key</Text>
            </View>
            <TouchableOpacity style={styles.apiKeyContainer} onPress={copyToClipboard}>
              <Text style={styles.apiKeyValue}>{maskedApiKey}</Text>
              <Text style={[styles.copyButton, copyState === 'error' && styles.copyButtonError]}>
                {copyState === 'success' ? '✓' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
          {!!copyMessage && (
            <Text style={[styles.copyStatusText, copyState === 'error' && styles.copyStatusTextError]}>
              {copyMessage}
            </Text>
          )}
          <InfoRow label="Webhook URL" value="https://api.guardian..." isUrl />
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Text style={styles.infoText}>Requests Today</Text>
            </View>
            <View style={styles.usageContainer}>
              <Text style={styles.usageText}>2,847 / 10,000</Text>
              <View style={styles.usageBar}>
                <View style={[styles.usageBarFill, { width: '28.47%' }]} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <ChevronRow label="Change Password" />
          <ToggleRow label="Two-Factor Auth" initialValue />
          <InfoRow label="Active Sessions" value="3 devices" />
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value, isUrl = false }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLabel}>
      <Text style={styles.infoText}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, isUrl && styles.urlValue]}>
      {value}
    </Text>
  </View>
);

const ChevronRow = ({ label }) => (
  <TouchableOpacity style={styles.infoRow}>
    <Text style={styles.infoText}>{label}</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const ToggleRow = ({ label, initialValue }) => {
  const [value] = React.useState(initialValue);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoText}>{label}</Text>
      <View style={styles.toggleContainer}>
        <Text style={[
          styles.toggleText,
          value && styles.toggleTextActive,
        ]}>
          {value ? 'On' : 'Off'}
        </Text>
      </View>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 24,
    color: colors.blue,
    fontWeight: '600',
    width: 30,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.purpleLight,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSec,
    marginBottom: spacing.md,
  },
  userRole: {
    fontSize: 13,
    color: colors.textDim,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSec,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    flex: 1,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.textSec,
    marginLeft: spacing.md,
  },
  urlValue: {
    fontSize: 12,
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  apiKeyValue: {
    fontSize: 13,
    color: colors.textSec,
    fontFamily: 'monospace',
  },
  copyButton: {
    fontSize: 13,
    color: colors.blue,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  copyButtonError: {
    color: colors.critical,
  },
  copyStatusText: {
    fontSize: 12,
    color: colors.safe,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  copyStatusTextError: {
    color: colors.critical,
  },
  usageContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  usageText: {
    fontSize: 13,
    color: colors.textSec,
    fontWeight: '500',
  },
  usageBar: {
    width: 100,
    height: 4,
    backgroundColor: colors.panel,
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: colors.blue,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSec,
    marginLeft: spacing.md,
  },
  toggleContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: colors.panel,
    marginLeft: spacing.md,
  },
  toggleText: {
    fontSize: 13,
    color: colors.textDim,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.safe,
  },
  signOutButton: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  signOutText: {
    fontSize: 16,
    color: colors.critical,
    fontWeight: '600',
  },
});

export default ProfileScreen;
