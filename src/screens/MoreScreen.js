import React, { useContext, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { colors, spacing } from '../theme';
import LeonaHeader from '../components/LeonaHeader';
import { useAuth } from '../lib/auth';
import { useProfile } from '../hooks/useEvents';
import { AppContext } from '../../App';
import { getProductConfig } from '../lib/products';

const leonaAvatar = require('../assets/leona-avatar.png');

const MoreScreen = ({ navigation }) => {
  const { user: clerkUser } = useAuth();
  const { profile: apiProfile } = useProfile();
  const { userConfig } = useContext(AppContext);
  const productConfig = getProductConfig(userConfig?.product);
  const clerkName = `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim();
  const displayName = clerkName || apiProfile?.name || userConfig?.fullName || 'Profile';
  const displayOrg = apiProfile?.org_name || userConfig?.organization || 'Guardian Space Inc.';
  const displayInitials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }, [displayName]);

  return (
    <SafeAreaView style={styles.container}>
      <LeonaHeader />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.75}
        >
          <View style={styles.profileLeft}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>{displayInitials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileRole}>Admin · {displayOrg}</Text>
            </View>
          </View>
          <Text style={styles.profileChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.planRow}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={styles.planDot} />
          <Text style={styles.planLabel}>{productConfig.label}</Text>
          <Text style={styles.planSep}>·</Text>
          <Text style={styles.planDetail}>{displayOrg}</Text>
          <Text style={styles.planChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.capabilityCard}>
          <Text style={styles.capabilityTitle}>PLAN ACCESS</Text>
          <Text style={styles.capabilityBody}>{productConfig.description}</Text>
          <Text style={styles.capabilityItem}>Community Feed: {productConfig.canUseCommunity ? 'Enabled' : 'Locked'}</Text>
          <Text style={styles.capabilityItem}>Agent Video: {productConfig.canUseVideoAgent ? 'Enabled' : 'Locked'}</Text>
          <Text style={styles.capabilityItem}>
            Visible Event Limit: {productConfig.maxVisibleEvents ? String(productConfig.maxVisibleEvents) : 'Unlimited'}
          </Text>
          <Text style={styles.capabilityItem}>Map Layers: {productConfig.enabledMapLayers.length}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Image source={leonaAvatar} style={styles.footerAvatar} />
        <Text style={styles.footerText}>LEONA v1.3.0</Text>
        <Text style={styles.footerSubtext}>OBSERVA · DIRIGE · PROTEGE</Text>
      </View>

      <TouchableOpacity
        style={styles.settingsCornerBtn}
        onPress={() => navigation.navigate('Settings')}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsCornerIcon}>⚙</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  profileRole: {
    color: colors.textSec,
    fontSize: 13,
  },
  profileChevron: {
    color: colors.textDim,
    fontSize: 22,
    fontWeight: '300',
    paddingLeft: spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    marginBottom: spacing.sm,
  },
  planDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.safe,
  },
  planLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  planSep: {
    color: colors.textDim,
    fontSize: 12,
  },
  planDetail: {
    color: colors.textSec,
    fontSize: 12,
    flex: 1,
  },
  planChevron: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '300',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  capabilityCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
  },
  capabilityTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  capabilityBody: {
    color: colors.textSec,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  capabilityItem: {
    color: colors.text,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 80,
    paddingTop: spacing.md,
  },
  footerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: spacing.sm,
    opacity: 0.6,
  },
  footerText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  footerSubtext: {
    color: colors.textDim,
    fontSize: 9,
    letterSpacing: 2,
    opacity: 0.5,
  },
  settingsCornerBtn: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  settingsCornerIcon: {
    fontSize: 22,
    color: colors.textSec,
  },
});

export default MoreScreen;
