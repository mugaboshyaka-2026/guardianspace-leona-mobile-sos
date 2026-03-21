import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors, sevColors, typeIcons, spacing, fonts, sevBg } from '../theme';
import { getRelatedNews } from '../lib/api';

const mapsModule = Platform.OS === 'web' ? null : require('react-native-maps');
const MapView = mapsModule?.default;
const Marker = mapsModule?.Marker;

const { width } = Dimensions.get('window');

const EventDetailScreen = ({ route, navigation }) => {
  const { event } = route.params || {};
  const [activeTab, setActiveTab] = useState('DETAILS');
  const [is3D, setIs3D] = useState(true);
  const [relatedNews, setRelatedNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Fetch related news when MEDIA tab is selected
  useEffect(() => {
    if (activeTab === 'MEDIA' && event?.id && relatedNews.length === 0) {
      setNewsLoading(true);
      getRelatedNews(event.id)
        .then((data) => setRelatedNews(data?.articles || []))
        .catch((err) => console.warn('[EventDetail] Related news failed:', err.message))
        .finally(() => setNewsLoading(false));
    }
  }, [activeTab, event?.id]);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const tabs = ['DETAILS', 'IMAGERY', 'MEDIA', 'ECOSYSTEM'];
  const eventLat = event.lat || -33.8688;
  const eventLng = event.lng || 151.2093;

  const renderStatItem = (label, value) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value || '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const getStatsForEvent = () => {
    const stats = [];

    if (event.area) {
      stats.push({ label: 'AREA', value: event.area });
    }
    if (event.population) {
      stats.push({ label: 'POPULATION', value: event.population });
    }
    if (event.containment) {
      stats.push({ label: 'CONTAINMENT', value: event.containment });
    }
    if (event.wind) {
      stats.push({ label: 'WIND SPEED', value: event.wind });
    }
    if (event.magnitude) {
      stats.push({ label: 'MAGNITUDE', value: event.magnitude });
    }
    if (event.displaced) {
      stats.push({ label: 'DISPLACED', value: event.displaced });
    }
    if (event.affected) {
      stats.push({ label: 'AFFECTED', value: event.affected });
    }
    if (event.category) {
      stats.push({ label: 'CATEGORY', value: event.category });
    }
    if (event.aftershocks) {
      stats.push({ label: 'AFTERSHOCKS', value: event.aftershocks });
    }
    if (event.surge) {
      stats.push({ label: 'SURGE', value: event.surge });
    }
    if (event.landfall) {
      stats.push({ label: 'LANDFALL RISK', value: event.landfall });
    }

    while (stats.length < 4) {
      stats.push(null);
    }

    return stats.slice(0, 4);
  };

  const stats = getStatsForEvent();

  const renderInlineMap = () => (
    <View style={styles.inlineMapContainer}>
      {Platform.OS === 'web' ? (
        <View style={styles.inlineMapFallback}>
          <Text style={styles.inlineMapFallbackTitle}>Map unavailable on web</Text>
          <Text style={styles.inlineMapFallbackCoords}>
            {eventLat.toFixed(4)}, {eventLng.toFixed(4)}
          </Text>
        </View>
      ) : (
      <MapView
        style={styles.inlineMapView}
        mapType={is3D ? 'hybridFlyover' : 'satellite'}
        initialRegion={{
          latitude: eventLat,
          longitude: eventLng,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation={false}
        showsCompass={false}
        showsScale={false}
        pitchEnabled={is3D}
        rotateEnabled={is3D}
      >
        <Marker coordinate={{ latitude: eventLat, longitude: eventLng }}>
          <View style={[styles.mapMarker, { borderColor: sevColors[event.severity] }]}>
            <Text style={styles.mapMarkerText}>{typeIcons[event.type] || '📍'}</Text>
          </View>
        </Marker>
      </MapView>
      )}

      {/* 2D / 3D toggle — top-right corner */}
      <View style={styles.mapDimToggle}>
        <TouchableOpacity
          style={[styles.mapDimBtn, !is3D && styles.mapDimBtnActive]}
          onPress={() => setIs3D(false)}
        >
          <Text style={[styles.mapDimText, !is3D && styles.mapDimTextActive]}>2D</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mapDimBtn, is3D && styles.mapDimBtnActive]}
          onPress={() => setIs3D(true)}
        >
          <Text style={[styles.mapDimText, is3D && styles.mapDimTextActive]}>3D</Text>
        </TouchableOpacity>
      </View>

      {/* Coord strip along bottom of map */}
      <View style={styles.mapCoordBar}>
        <Text style={styles.mapCoordText}>
          {eventLat.toFixed(4)}°  {eventLng.toFixed(4)}°
        </Text>
        <View style={[styles.mapSevBadge, { backgroundColor: sevColors[event.severity] }]}>
          <Text style={styles.mapSevBadgeText}>{event.severity.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );

  const sharedHeader = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EVENT DETAIL</Text>
        <TouchableOpacity style={styles.closeButton}>
          <Text style={styles.closeButtonText}>⊕</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>
            {typeIcons[event.type] || '📍'}
          </Text>
        </View>
        <View style={styles.heroContent}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: sevColors[event.severity] },
              ]}
            >
              <Text style={styles.severityBadgeText}>
                {event.severity.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.heroLocation}>{event.location}</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {sharedHeader}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'DETAILS' && (
            <View style={styles.detailsTab}>
              {/* Inline map — sits above stat pills */}
              {renderInlineMap()}

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                {stats.map((stat, idx) =>
                  stat ? (
                    <View key={idx} style={styles.statContainer}>
                      {renderStatItem(stat.label, stat.value)}
                    </View>
                  ) : (
                    <View key={idx} style={styles.statContainer} />
                  )
                )}
              </View>

              {/* Description */}
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                <Text style={styles.descriptionText}>{event.description}</Text>
              </View>

            </View>
          )}

            {activeTab === 'IMAGERY' && (
              <View style={styles.placeholderTab}>
                <Text style={styles.placeholderText}>
                  Satellite and drone imagery not available in this demo
                </Text>
              </View>
            )}

            {activeTab === 'MEDIA' && (
              <View style={styles.mediaTab}>
                {newsLoading ? (
                  <ActivityIndicator color={colors.blue} style={{ paddingVertical: 40 }} />
                ) : relatedNews.length > 0 ? (
                  relatedNews.map((article, idx) => (
                    <View key={article.id || idx} style={styles.newsRow}>
                      <Text style={styles.newsTitle} numberOfLines={2}>{article.title}</Text>
                      <Text style={styles.newsSource}>{article.source} · {article.location}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.placeholderTab}>
                    <Text style={styles.placeholderText}>
                      No related news articles found
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'ECOSYSTEM' && (
              <View style={styles.placeholderTab}>
                <Text style={styles.placeholderText}>
                  Ecosystem data for this event
                </Text>
              </View>
            )}
          </View>

          {/* LEONA Assessment Card */}
          <View style={styles.leonaCard}>
            <View style={styles.leonaHeader}>
              <Text style={styles.leonaLabel}>◆ LEONA ASSESSMENT</Text>
            </View>
            <View style={styles.leonaContent}>
              <View style={styles.assessmentRow}>
                <Text style={styles.assessmentLabel}>Risk Level</Text>
                <Text style={[styles.assessmentValue, { color: sevColors[event.severity] }]}>
                  {event.severity.toUpperCase()}
                </Text>
              </View>
              <View style={styles.assessmentRow}>
                <Text style={styles.assessmentLabel}>Recommended Action</Text>
                <Text style={styles.assessmentValue}>
                  {event.severity === 'critical'
                    ? 'IMMEDIATE RESPONSE'
                    : event.severity === 'high'
                    ? 'ALERT & PREPARE'
                    : 'MONITOR'}
                </Text>
              </View>
              <View style={styles.assessmentRow}>
                <Text style={styles.assessmentLabel}>Confidence</Text>
                <Text style={styles.assessmentValue}>87%</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.leonaButton}>
              <Text style={styles.leonaButtonText}>VIEW FULL ASSESSMENT →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.blue,
    fontSize: 24,
    fontWeight: '300',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.textDim,
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  heroSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.borderLight,
    borderWidth: 1,
  },
  heroIconText: {
    fontSize: 36,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  heroTitleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  severityBadgeText: {
    color: colors.black,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroLocation: {
    color: colors.textSec,
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabActive: {
    borderBottomColor: colors.blue,
  },
  tabText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.blue,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  detailsTab: {
    gap: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  statContainer: {
    width: (width - spacing.lg * 2 - spacing.lg) / 2,
  },
  statItem: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  descriptionSection: {
    gap: spacing.md,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  descriptionText: {
    color: colors.textSec,
    fontSize: 13,
    lineHeight: 20,
  },
  infoSection: {
    gap: spacing.md,
  },
  infoText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  placeholderTab: {
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textDim,
    fontSize: 13,
  },
  mediaTab: {
    gap: spacing.sm,
  },
  newsRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  newsTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  newsSource: {
    color: colors.textDim,
    fontSize: 11,
  },
  leonaCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.purpleDim,
    borderColor: colors.purple,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  leonaHeader: {
    backgroundColor: 'rgba(107,72,255,0.1)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.purple,
    borderBottomWidth: 1,
  },
  leonaLabel: {
    color: colors.purpleLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  leonaContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  assessmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assessmentLabel: {
    color: colors.textSec,
    fontSize: 12,
  },
  assessmentValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  leonaButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.purple,
    borderRadius: 8,
    alignItems: 'center',
  },
  leonaButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },

  // ── INLINE MAP (inside DETAILS tab) ──────────────────────
  inlineMapContainer: {
    height: 210,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineMapView: {
    flex: 1,
  },
  inlineMapFallback: {
    flex: 1,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  inlineMapFallbackTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  inlineMapFallbackCoords: {
    color: colors.textSec,
    fontSize: 12,
  },
  mapMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(6,8,15,0.85)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarkerText: {
    fontSize: 22,
  },
  mapDimToggle: {
    position: 'absolute',
    bottom: 34,
    left: 10,
    flexDirection: 'column',
    backgroundColor: 'rgba(6,8,15,0.82)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  mapDimBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  mapDimBtnActive: {
    backgroundColor: colors.blue,
  },
  mapDimText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mapDimTextActive: {
    color: colors.white,
  },
  mapCoordBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(6,8,15,0.75)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  mapCoordText: {
    color: colors.textSec,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  mapSevBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mapSevBadgeText: {
    color: colors.black,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default EventDetailScreen;
