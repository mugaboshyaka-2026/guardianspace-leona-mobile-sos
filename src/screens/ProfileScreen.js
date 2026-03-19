import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors, spacing } from '../theme';
import { useAuth } from '../lib/auth';
import { useProfile } from '../hooks/useEvents';

const ProfileScreen = ({ navigation }) => {
  const [copied, setCopied] = useState(false);
  const { user: clerkUser, signOut } = useAuth();
  const { profile: apiProfile } = useProfile();

  // Merge Clerk user + API profile, fallback to hardcoded
  const displayName = apiProfile?.name || clerkUser?.firstName
    ? `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim()
    : 'Kian Mirshahi';
  const displayEmail = apiProfile?.email
    || clerkUser?.emailAddresses?.[0]?.emailAddress
    || 'kian@guardianspace.com';
  const displayOrg = apiProfile?.org_name || 'Guardian Space Inc.';
  const displayInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  const copyToClipboard = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{displayInitials}</Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <Text style={styles.userRole}>Admin · {displayOrg}</Text>
        </View>

        {/* ORGANISATION Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ORGANISATION</Text>
          <InfoRow label="Organisation Name" value={displayOrg} />
          <InfoRow label="Team" value="Operations" />
          <InfoRow label="Members" value="12" />
          <InfoRow label="Plan" value="Enterprise" />
        </View>

        {/* API ACCESS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>API ACCESS</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Text style={styles.infoText}>API Key</Text>
            </View>
            <TouchableOpacity
              style={styles.apiKeyContainer}
              onPress={copyToClipboard}
            >
              <Text style={styles.apiKeyValue}>
                gs_live_••••••••7x4f
              </Text>
              <Text style={styles.copyButton}>
                {copied ? '✓' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
          <InfoRow
            label="Webhook URL"
            value="https://api.guardian..."
            isUrl={true}
          />
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Text style={styles.infoText}>Requests Today</Text>
            </View>
            <View style={styles.usageContainer}>
              <Text style={styles.usageText}>2,847 / 10,000</Text>
              <View style={styles.usageBar}>
                <View
                  style={[
                    styles.usageBarFill,
                    { width: '28.47%' },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ACCOUNT Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <ChevronRow label="Change Password" />
          <ToggleRow label="Two-Factor Auth" initialValue={true} />
          <InfoRow label="Active Sessions" value="3 devices" />
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
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
  const [value, setValue] = React.useState(initialValue);
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
