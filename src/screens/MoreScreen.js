import React from 'react';
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

const leonaAvatar = require('../assets/leona-avatar.png');

const MoreScreen = ({ navigation }) => {

  return (
    <SafeAreaView style={styles.container}>
      <LeonaHeader />

      {/* ── Profile Card ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.75}
        >
          <View style={styles.profileLeft}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>KM</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Kian Mirshahi</Text>
              <Text style={styles.profileRole}>Admin · Guardian Space Inc.</Text>
            </View>
          </View>
          <Text style={styles.profileChevron}>›</Text>
        </TouchableOpacity>

        {/* Profile & Plan row — directly under profile card */}
        <TouchableOpacity
          style={styles.planRow}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={styles.planDot} />
          <Text style={styles.planLabel}>Enterprise Plan</Text>
          <Text style={styles.planSep}>·</Text>
          <Text style={styles.planDetail}>Guardian Space Inc.</Text>
          <Text style={styles.planChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable area — empty for now, room for future items */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      />

      {/* LEONA footer — pinned to bottom above settings btn */}
      <View style={styles.footer}>
        <Image source={leonaAvatar} style={styles.footerAvatar} />
        <Text style={styles.footerText}>LEONA v1.3.0</Text>
        <Text style={styles.footerSubtext}>OBSERVA · DIRIGE · PROTEGE</Text>
      </View>

      {/* ── Settings icon — fixed bottom-right ── */}
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

  // Header + Profile Card
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

  // Profile & Plan row under profile card
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

  // Scroll Area
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Footer — pinned at bottom, above settings corner button
  footer: {
    alignItems: 'center',
    paddingBottom: 80,   // clears the settings corner button
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

  // Settings icon — fixed bottom-right corner
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
