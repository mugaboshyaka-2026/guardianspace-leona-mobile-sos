import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, sevColors, typeIcons, spacing } from '../theme';
import { isAccessDeniedError, useAlerts } from '../hooks/useEvents';
import { fetchMyFavorites, markAlertRead, markAllAlertsRead, normalizeAlertToEvent } from '../lib/api';
import LeonaHeader from '../components/LeonaHeader';
import { useAuth } from '../lib/auth';

function getTimeSince(dateStr, now = Date.now()) {
  try {
    const eventTime = new Date(dateStr).getTime();
    if (!Number.isFinite(eventTime)) {
      return '';
    }
    const diff = Math.max(0, now - eventTime);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  } catch {
    return '';
  }
}

function sortNewestFirst(items = []) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.created_at || a.sent_at || 0).getTime();
    const bTime = new Date(b.created_at || b.sent_at || 0).getTime();
    return bTime - aTime;
  });
}

const AlertsScreen = ({ navigation, route }) => {
  const { isLoaded: authLoaded, isSignedIn, authReady } = useAuth();
  const [activeTab, setActiveTab] = useState('MY');
  const [favorites, setFavorites] = useState([]);
  const [favLoading, setFavLoading] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const {
    alerts,
    meta,
    loading,
    error,
    refresh,
  } = useAlerts(myDataAuthEnabled);

  const myDataAuthEnabled = isSignedIn && authReady;
  const myDataRequiresAuth = authLoaded && !myDataAuthEnabled;
  const alertsUnavailable = myDataRequiresAuth || isAccessDeniedError(error);

  const normalizedAlerts = useMemo(
    () => sortNewestFirst((alerts || []).map(normalizeAlertToEvent)),
    [alerts]
  );
  const unreadAlerts = useMemo(
    () => normalizedAlerts.filter((alert) => !alert.is_read),
    [normalizedAlerts]
  );
  const readAlerts = useMemo(
    () => normalizedAlerts.filter((alert) => alert.is_read),
    [normalizedAlerts]
  );
  const activeAlerts = activeTab === 'MY' ? unreadAlerts : readAlerts;

  const groupedAlerts = useMemo(() => {
    const groups = [
      { key: 'critical', title: 'CRITICAL', color: sevColors.critical, data: [] },
      { key: 'high', title: 'HIGH', color: sevColors.high, data: [] },
      { key: 'elevated', title: 'ELEVATED', color: sevColors.elevated, data: [] },
      { key: 'monitoring', title: 'MONITORING', color: sevColors.monitoring, data: [] },
    ];
    activeAlerts.forEach((alert) => {
      const target = groups.find((group) => group.key === alert.severity);
      if (target) {
        target.data.push(alert);
      }
    });
    return groups.filter((group) => group.data.length > 0);
  }, [activeAlerts]);

  const loadFavorites = useCallback(async () => {
    setFavLoading(true);
    try {
      const data = await fetchMyFavorites();
      setFavorites(data.favorites || []);
    } catch (err) {
      console.warn('[Alerts] Favorites fetch failed:', err.message);
      setFavorites([]);
    } finally {
      setFavLoading(false);
    }
  }, []);

  useEffect(() => {
    const nextTab = route?.params?.activeTab;
    if (nextTab === 'MY' || nextTab === 'ARCHIVE' || nextTab === 'FAVORITES') {
      setActiveTab(nextTab);
    } else if (nextTab === 'GLOBAL') {
      setActiveTab('ARCHIVE');
    }
  }, [route?.params?.activeTab]);

  useFocusEffect(useCallback(() => {
    if (myDataAuthEnabled) {
      refresh().catch(() => {});
    }
    if (activeTab === 'FAVORITES') {
      loadFavorites().catch(() => {});
    }
  }, [activeTab, loadFavorites, myDataAuthEnabled, refresh]));

  useEffect(() => {
    if (activeTab === 'FAVORITES') {
      loadFavorites().catch(() => {});
    }
  }, [activeTab, loadFavorites]);

  useEffect(() => {
    const intervalId = setInterval(() => setNowTs(Date.now()), 60000);
    return () => clearInterval(intervalId);
  }, []);

  const handleAlertPress = async (alert) => {
    if (alert?.alert_id && !alert?.is_read) {
      await markAlertRead(alert.alert_id).catch((err) => {
        console.warn('[Alerts] Mark read failed:', err.message);
      });
      await refresh().catch(() => {});
    }

    navigation.navigate('EventDetail', { event: alert });
  };

  const renderAlertRow = (alert, viewed = false) => (
    <TouchableOpacity
      key={alert.alert_id || alert.id}
      onPress={() => handleAlertPress(alert)}
      activeOpacity={0.6}
      style={[styles.alertRow, viewed && styles.alertRowViewed]}
    >
      <View style={[styles.iconContainer, viewed && styles.iconContainerViewed, { borderColor: sevColors[alert.severity] || colors.border }]}>
        <Text style={styles.iconEmoji}>{typeIcons[alert.type] || '!'}</Text>
      </View>

      <View style={styles.alertContent}>
        <Text style={[styles.alertTitle, viewed && styles.alertTitleViewed]} numberOfLines={2}>{alert.title}</Text>
        <Text style={[styles.alertLocation, viewed && styles.alertLocationViewed]} numberOfLines={2}>
          {alert.body || alert.location || 'Notification'}
        </Text>
      </View>

      <View style={styles.alertRight}>
        <View style={[styles.severityPill, viewed && styles.severityPillViewed, { backgroundColor: `${sevColors[alert.severity]}20`, borderColor: sevColors[alert.severity] }]}>
          <Text style={[styles.severityPillText, viewed ? styles.severityPillTextViewed : { color: sevColors[alert.severity] }]}>
            {alert.severity.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.alertTime}>{getTimeSince(alert.created_at || alert.sent_at, nowTs)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFavorites = () => {
    if (favLoading) {
      return <ActivityIndicator color={colors.blue} style={styles.loadingIndicator} />;
    }

    if (favorites.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>Tap the star on any event to save it here.</Text>
        </View>
      );
    }

    return favorites.map((fav) => {
      const event = fav.event_data || fav;
      return (
        <TouchableOpacity
          key={fav.id || fav.event_id}
          onPress={() => navigation.navigate('EventDetail', { event })}
          activeOpacity={0.6}
          style={styles.alertRow}
        >
          <View style={[styles.iconContainer, { borderColor: sevColors[event.severity] || colors.border }]}>
            <Text style={styles.iconEmoji}>{typeIcons[event.type] || '!'}</Text>
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle} numberOfLines={2}>{event.title}</Text>
            <Text style={styles.alertLocation} numberOfLines={1}>{event.location || 'Saved event'}</Text>
          </View>
          <View style={styles.alertRight}>
            <Text style={styles.alertTime}>{getTimeSince(fav.created_at, nowTs)}</Text>
          </View>
        </TouchableOpacity>
      );
    });
  };

  const totalBadgeCount = activeTab === 'MY'
    ? Number(meta?.unread || 0)
    : activeTab === 'ARCHIVE'
      ? readAlerts.length
      : favorites.length;

  const showLoading = activeTab !== 'FAVORITES' && (!authLoaded || (isSignedIn && !authReady) || loading);
  const showEmptyAlerts = !showLoading && !alertsUnavailable && !error && activeTab !== 'FAVORITES' && groupedAlerts.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <LeonaHeader
        title="ALERTS"
        right={(
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{totalBadgeCount}</Text>
          </View>
        )}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'MY' && styles.tabButtonActive]} onPress={() => setActiveTab('MY')}>
          <Text style={[styles.tabLabel, activeTab === 'MY' && styles.tabLabelActive]}>MY ALERTS</Text>
          {activeTab === 'MY' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'ARCHIVE' && styles.tabButtonActive]} onPress={() => setActiveTab('ARCHIVE')}>
          <Text style={[styles.tabLabel, activeTab === 'ARCHIVE' && styles.tabLabelActive]}>ARCHIVE</Text>
          {activeTab === 'ARCHIVE' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'FAVORITES' && styles.tabButtonActive]} onPress={() => setActiveTab('FAVORITES')}>
          <Text style={[styles.tabLabel, activeTab === 'FAVORITES' && styles.tabLabelActive]}>FAVORITES</Text>
          {activeTab === 'FAVORITES' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'MY' && Number(meta?.unread || 0) > 0 && (
          <View style={styles.markAllRow}>
            <Text style={styles.markAllCopy}>{meta.unread} unread notifications</Text>
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={async () => {
                await markAllAlertsRead().catch((err) => {
                  console.warn('[Alerts] Mark all read failed:', err.message);
                });
                await refresh().catch(() => {});
              }}
            >
              <Text style={styles.markAllButtonText}>Mark all read</Text>
            </TouchableOpacity>
          </View>
        )}

        {showLoading && <ActivityIndicator color={colors.blue} style={styles.loadingIndicator} />}

        {!showLoading && alertsUnavailable && activeTab !== 'FAVORITES' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sign in required</Text>
            <Text style={styles.emptyText}>Alerts are only available for authenticated users.</Text>
          </View>
        )}

        {!showLoading && error && !alertsUnavailable && activeTab !== 'FAVORITES' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Unable to load alerts</Text>
            <Text style={styles.emptyText}>{error?.message || 'Please try again shortly.'}</Text>
          </View>
        )}

        {activeTab !== 'FAVORITES' && groupedAlerts.map((section) => (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
                <Text style={[styles.sectionTitle, { color: section.color }]}>{section.title}</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: `${section.color}20` }]}>
                <Text style={[styles.countBadgeText, { color: section.color }]}>{section.data.length}</Text>
              </View>
            </View>
            <View style={styles.alertsList}>
              {section.data.map((alert) => renderAlertRow(alert, activeTab === 'ARCHIVE'))}
            </View>
          </View>
        ))}

        {showEmptyAlerts && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{activeTab === 'MY' ? 'No unread alerts' : 'No archived alerts'}</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'MY'
                ? 'New notifications will appear here after the backend creates alerts for your account.'
                : 'Read notifications will move here once opened.'}
            </Text>
          </View>
        )}

        {activeTab === 'FAVORITES' && renderFavorites()}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  totalBadge: { backgroundColor: colors.blue, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 12 },
  totalBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
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
  tabLabel: { color: colors.textSec, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  tabLabelActive: { color: colors.blue },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.blue,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  markAllRow: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  markAllCopy: { color: colors.textSec, fontSize: 12, fontWeight: '600' },
  markAllButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.blue,
  },
  markAllButtonText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  loadingIndicator: { paddingVertical: 40 },
  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  emptyText: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
  section: { marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.panel,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  countBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 12 },
  countBadgeText: { fontSize: 12, fontWeight: '700' },
  alertsList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.panelLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    gap: spacing.md,
  },
  alertRowViewed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.72,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconContainerViewed: { backgroundColor: 'rgba(255,255,255,0.03)' },
  iconEmoji: { fontSize: 18 },
  alertContent: { flex: 1, gap: 2 },
  alertTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  alertTitleViewed: { color: colors.textSec },
  alertLocation: { color: colors.textSec, fontSize: 11 },
  alertLocationViewed: { color: colors.textDim },
  alertRight: { alignItems: 'flex-end', gap: spacing.xs, flexShrink: 0 },
  severityPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  severityPillViewed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  severityPillText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  severityPillTextViewed: { color: colors.textDim },
  alertTime: { color: colors.textDim, fontSize: 10, fontWeight: '500' },
  bottomSpacer: { height: spacing.xl },
});

export default AlertsScreen;
