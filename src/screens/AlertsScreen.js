import React, { useState, useMemo, useEffect, useCallback, useContext } from 'react';
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
import { isAccessDeniedError, useAOIs, useMyEvents, useWorldEvents } from '../hooks/useEvents';
import { fetchMyFavorites } from '../lib/api';
import LeonaHeader from '../components/LeonaHeader';
import { AppContext } from '../../App';
import { filterEventsForConfig } from '../lib/locality';
import { limitEventsForProduct } from '../lib/products';
import { getViewedAlertsMap, markAlertViewed } from '../lib/viewedAlerts';
import { useAuth } from '../lib/auth';

// Helper: "2d ago", "1w ago", etc.
function getTimeSince(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  } catch {
    return '';
  }
}

function sortEventsNewestFirst(events = []) {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

const AlertsScreen = ({ navigation, route }) => {
  const { userConfig } = useContext(AppContext);
  const { isLoaded: authLoaded, isSignedIn, authReady } = useAuth();
  const [activeTab, setActiveTab] = useState('MY');
  const [viewedAlerts, setViewedAlerts] = useState({});
  const criticalOnlyEnabled = useMemo(
    () => Boolean(userConfig?.criticalOnly ?? userConfig?.preferences?.critical_only ?? userConfig?.preferences?.criticalOnly),
    [userConfig?.criticalOnly, userConfig?.preferences?.critical_only, userConfig?.preferences?.criticalOnly]
  );
  const myDataAuthEnabled = isSignedIn && authReady;
  const myDataRequiresAuth = authLoaded && !myDataAuthEnabled;

  // ── Live API data ──
  const { events: myAlerts, loading: myLoading, error: myError } = useMyEvents(myDataAuthEnabled);
  const { error: aoisError } = useAOIs(activeTab === 'MY' && myDataAuthEnabled);
  const { events: worldEvents, loading: worldLoading, error: worldError } = useWorldEvents();
  const myAlertsUnavailable = myDataRequiresAuth || isAccessDeniedError(myError) || isAccessDeniedError(aoisError);
  const filteredMyAlerts = useMemo(
    () => limitEventsForProduct(
      filterEventsForConfig(myAlerts, userConfig, 'local'),
      userConfig?.product
    ),
    [myAlerts, userConfig]
  );
  const globalEvents = useMemo(() => {
    const myIds = new Set(filteredMyAlerts.map((e) => e.id));
    return limitEventsForProduct(
      filterEventsForConfig(worldEvents, userConfig, 'global').filter((e) => !myIds.has(e.id)),
      userConfig?.product
    );
  }, [filteredMyAlerts, userConfig, worldEvents]);

  // ── Favorites ──
  const [favorites, setFavorites] = useState([]);
  const [favLoading, setFavLoading] = useState(false);

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

  const loadViewedAlerts = useCallback(async () => {
    const data = await getViewedAlertsMap().catch((err) => {
      console.warn('[Alerts] Viewed alerts fetch failed:', err.message);
      return {};
    });
    setViewedAlerts(data || {});
  }, []);

  // Fetch favorites when the tab is selected
  useEffect(() => {
    if (activeTab === 'FAVORITES') loadFavorites();
  }, [activeTab, loadFavorites]);

  useFocusEffect(useCallback(() => {
    loadViewedAlerts();
  }, [loadViewedAlerts]));

  useEffect(() => {
    const nextTab = route?.params?.activeTab;
    if (nextTab === 'MY' || nextTab === 'GLOBAL' || nextTab === 'FAVORITES') {
      setActiveTab(nextTab);
    }
  }, [route?.params?.activeTab]);

  const isLoading = activeTab === 'MY'
    ? myLoading
    : activeTab === 'GLOBAL'
      ? worldLoading
      : favLoading;
  const activeError = activeTab === 'MY'
    ? myAlertsUnavailable ? null : myError
    : activeTab === 'GLOBAL'
      ? worldError
      : null;

  const currentEvents = activeTab === 'MY' ? filteredMyAlerts
    : activeTab === 'GLOBAL' ? globalEvents
    : []; // FAVORITES uses its own list
  const severityFilteredEvents = useMemo(() => (
    criticalOnlyEnabled
      ? currentEvents.filter((event) => event?.severity === 'critical')
      : currentEvents
  ), [criticalOnlyEnabled, currentEvents]);
  const filteredFavorites = useMemo(() => (
    criticalOnlyEnabled
      ? favorites.filter((favorite) => (favorite?.event_data?.severity || favorite?.severity) === 'critical')
      : favorites
  ), [criticalOnlyEnabled, favorites]);
  const orderedEvents = useMemo(() => sortEventsNewestFirst(severityFilteredEvents), [severityFilteredEvents]);
  const viewedIds = useMemo(() => new Set(Object.keys(viewedAlerts || {})), [viewedAlerts]);
  const activeEvents = useMemo(() => {
    if (activeTab !== 'MY') {
      return orderedEvents;
    }
    return orderedEvents.filter((event) => !viewedIds.has(String(event.id)));
  }, [activeTab, orderedEvents, viewedIds]);
  const viewedEvents = useMemo(() => {
    if (activeTab !== 'MY') {
      return [];
    }
    return orderedEvents.filter((event) => viewedIds.has(String(event.id)));
  }, [activeTab, orderedEvents, viewedIds]);

  // Group by severity
  const grouped = useMemo(() => {
    const groups = [
      { key: 'critical', title: 'CRITICAL', color: sevColors.critical, data: [] },
      { key: 'high', title: 'HIGH', color: sevColors.high, data: [] },
      { key: 'elevated', title: 'ELEVATED', color: sevColors.elevated, data: [] },
      { key: 'monitoring', title: 'MONITORING', color: sevColors.monitoring, data: [] },
    ];
    activeEvents.forEach((e) => {
      const g = groups.find((g) => g.key === e.severity);
      if (g) g.data.push(e);
    });
    return groups.filter((g) => g.data.length > 0);
  }, [activeEvents]);

  useEffect(() => {
    console.log('[Alerts] filter state', {
      activeTab,
      configuredEventTypes: userConfig?.eventTypes || [],
      configuredRadius: userConfig?.radius || null,
      configuredAois: userConfig?.aois || [],
      criticalOnly: criticalOnlyEnabled,
      sourceMyAlertsCount: myAlerts.length,
      sourceWorldEventsCount: worldEvents.length,
      filteredMyAlertsCount: filteredMyAlerts.length,
      globalEventsCount: globalEvents.length,
    });
  }, [activeTab, criticalOnlyEnabled, filteredMyAlerts.length, globalEvents.length, myAlerts.length, userConfig, worldEvents.length]);

  const handleAlertPress = async (event) => {
    await markAlertViewed(event).catch((err) => {
      console.warn('[Alerts] Mark viewed failed:', err.message);
    });
    await loadViewedAlerts();
    navigation.navigate('EventDetail', { event });
  };

  const getTimeAgo = (severity) => {
    const times = { critical: '2m', high: '14m', elevated: '1h', monitoring: '3h' };
    return times[severity] || '5m';
  };

  const renderAlertRow = (event, { viewed = false } = {}) => (
    <TouchableOpacity
      key={event.id}
      onPress={() => handleAlertPress(event)}
      activeOpacity={0.6}
      style={[styles.alertRow, viewed && styles.alertRowViewed]}
    >
      <View style={[styles.iconContainer, viewed && styles.iconContainerViewed, { borderColor: sevColors[event.severity] || colors.border }]}>
        <Text style={styles.iconEmoji}>{typeIcons[event.type] || '📍'}</Text>
      </View>

      <View style={styles.alertContent}>
        <Text style={[styles.alertTitle, viewed && styles.alertTitleViewed]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.alertLocation, viewed && styles.alertLocationViewed]} numberOfLines={1}>{event.location}</Text>
      </View>

      <View style={styles.alertRight}>
        <View style={[styles.severityPill, viewed && styles.severityPillViewed, { backgroundColor: `${sevColors[event.severity]}20`, borderColor: sevColors[event.severity] }]}>
          <Text style={[styles.severityPillText, viewed ? styles.severityPillTextViewed : { color: sevColors[event.severity] }]}>
            {event.severity.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.alertTime}>{getTimeAgo(event.severity)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LeonaHeader
        title="ALERTS"
        right={
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              {activeTab === 'FAVORITES' ? filteredFavorites.length : severityFilteredEvents.length}
            </Text>
          </View>
        }
      />

      {/* Tab Bar: MY ALERTS / GLOBAL / ★ FAVORITES — equal thirds */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'MY' && styles.tabButtonActive]}
          onPress={() => setActiveTab('MY')}
        >
          <Text style={[styles.tabLabel, activeTab === 'MY' && styles.tabLabelActive]}>MY ALERTS</Text>
          {activeTab === 'MY' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'GLOBAL' && styles.tabButtonActive]}
          onPress={() => setActiveTab('GLOBAL')}
        >
          <Text style={[styles.tabLabel, activeTab === 'GLOBAL' && styles.tabLabelActive]}>GLOBAL</Text>
          {activeTab === 'GLOBAL' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'FAVORITES' && styles.tabButtonActive]}
          onPress={() => setActiveTab('FAVORITES')}
        >
          <View style={styles.favTabInner}>
            <Text style={[styles.favStar, activeTab === 'FAVORITES' && styles.favStarActive]}>★</Text>
            <Text style={[styles.tabLabel, activeTab === 'FAVORITES' && styles.tabLabelActive]}>FAVORITES</Text>
          </View>
          {activeTab === 'FAVORITES' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {/* Alerts List (MY / GLOBAL) */}
      {activeTab !== 'FAVORITES' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && (
            <ActivityIndicator color={colors.blue} style={styles.loadingIndicator} />
          )}

          {!isLoading && activeTab === 'MY' && myAlertsUnavailable && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Sign in required</Text>
              <Text style={styles.emptyText}>
                My alerts are unavailable until you sign in with a valid account.
              </Text>
            </View>
          )}

          {!isLoading && activeError && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Unable to load alerts right now</Text>
            </View>
          )}

          {!isLoading && !activeError && !myAlertsUnavailable && grouped.map((section) => (
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
                {section.data.map((event) => renderAlertRow(event))}
              </View>
            </View>
          ))}

          {!isLoading && !activeError && !myAlertsUnavailable && activeTab === 'MY' && viewedEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionDot, styles.viewedSectionDot]} />
                  <Text style={[styles.sectionTitle, styles.viewedSectionTitle]}>VIEWED</Text>
                </View>
                <View style={[styles.countBadge, styles.viewedCountBadge]}>
                  <Text style={[styles.countBadgeText, styles.viewedCountBadgeText]}>{viewedEvents.length}</Text>
                </View>
              </View>
              <View style={styles.alertsList}>
                {viewedEvents.map((event) => renderAlertRow(event, { viewed: true }))}
              </View>
            </View>
          )}

          {!isLoading && !activeError && !myAlertsUnavailable && grouped.length === 0 && viewedEvents.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No alerts in this category</Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Favorites List */}
      {activeTab === 'FAVORITES' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {favLoading && (
            <ActivityIndicator color={colors.blue} style={{ paddingVertical: 40 }} />
          )}

          {!favLoading && filteredFavorites.length > 0 && filteredFavorites.map((fav) => {
            const event = fav.event_data || fav;
            const savedDate = fav.created_at ? getTimeSince(fav.created_at) : '';
            return (
              <TouchableOpacity
                key={fav.id || fav.event_id}
                onPress={() => handleAlertPress(event)}
                activeOpacity={0.6}
                style={styles.favRow}
              >
                <View style={[styles.iconContainer, { borderColor: sevColors[event.severity] || colors.border }]}>
                  <Text style={styles.iconEmoji}>{typeIcons[event.type] || '📍'}</Text>
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle} numberOfLines={2}>{event.title}</Text>
                  <Text style={styles.favMeta}>{event.location}{savedDate ? ` · Saved ${savedDate}` : ''}</Text>
                </View>
                <View style={[styles.favSevDot, { backgroundColor: sevColors[event.severity] || colors.textDim }]} />
              </TouchableOpacity>
            );
          })}

          {!favLoading && filteredFavorites.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.favEmptyIcon}>★</Text>
              <Text style={styles.emptyText}>{criticalOnlyEnabled ? 'No critical favorites yet' : 'No favorites yet'}</Text>
              <Text style={styles.favHint}>{criticalOnlyEnabled ? 'Critical Alerts Only is enabled.' : 'Tap ★ on any event to save it here'}</Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  totalBadge: { backgroundColor: colors.blue, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 12 },
  totalBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  // Tab Bar
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
  iconContainerViewed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
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
  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  emptyText: { color: colors.textDim, fontSize: 13 },
  loadingIndicator: { paddingVertical: 40 },
  bottomSpacer: { height: spacing.xl },
  viewedSectionDot: { backgroundColor: colors.textDim },
  viewedSectionTitle: { color: colors.textDim },
  viewedCountBadge: { backgroundColor: 'rgba(255,255,255,0.08)' },
  viewedCountBadgeText: { color: colors.textDim },

  // Favorites tab inner (star + label)
  favTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favStar: {
    color: colors.textDim,
    fontSize: 14,
  },
  favStarActive: {
    color: '#FFD700',
  },

  // Favorites row
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  favMeta: {
    color: colors.textSec,
    fontSize: 11,
  },
  favSevDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  favEmptyIcon: {
    fontSize: 36,
    color: colors.textDim,
    opacity: 0.3,
  },
  favHint: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 4,
  },
});

export default AlertsScreen;
