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
import { getRelatedNews, addFavorite, removeFavorite, checkFavorite } from '../lib/api';

const mapsModule = Platform.OS === 'web' ? null : require('react-native-maps');
const MapView = mapsModule?.default;
const Marker = mapsModule?.Marker;

const { width } = Dimensions.get('window');
const severityRank = { critical: 4, high: 3, elevated: 2, monitoring: 1 };

function formatDisplayDate(value, fallback = 'Live now') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function toTitle(value) {
  if (!value) return 'Unknown';
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

const EventDetailScreen = ({ route, navigation }) => {
  const { event } = route.params || {};
  const [activeTab, setActiveTab] = useState('DETAILS');
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if event is favorited
  useEffect(() => {
    if (event?.id) {
      checkFavorite(event.id)
        .then((data) => setIsFavorite(data?.is_favorite || false))
        .catch(() => {});
    }
  }, [event?.id]);

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavorite(event.id);
        setIsFavorite(false);
      } else {
        await addFavorite(event.id, event);
        setIsFavorite(true);
      }
    } catch (err) {
      console.warn('[EventDetail] Favorite toggle failed:', err.message);
      // Optimistic toggle even on failure
      setIsFavorite(!isFavorite);
    }
  };
  const [is3D, setIs3D] = useState(true);
  const [relatedNews, setRelatedNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFailed, setNewsFailed] = useState(false);

  // Fetch related news when FEED tab is selected
  useEffect(() => {
    if (activeTab === 'FEED' && event?.id && relatedNews.length === 0 && !newsFailed) {
      setNewsLoading(true);
      getRelatedNews(event.id)
        .then((data) => {
          setRelatedNews(data?.articles || []);
          setNewsFailed(false);
        })
        .catch((err) => {
          setNewsFailed(true);
          console.warn('[EventDetail] Related news failed:', err.message);
        })
        .finally(() => setNewsLoading(false));
    }
  }, [activeTab, event?.id, newsFailed, relatedNews.length]);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const tabs = ['DETAILS', 'IMAGERY', 'FEED', 'ECOSYSTEM'];
  const eventLat = event.lat || -33.8688;
  const eventLng = event.lng || 151.2093;
  const impactSignals = [
    { label: 'Population exposure', value: event.population || event.affected || 'Assessing', tone: event.population || event.affected ? 'high' : event.severity },
    { label: 'Infrastructure stress', value: event.area || event.wind || event.surge || 'Monitoring network strain', tone: event.severity },
    { label: 'Displacement risk', value: event.displaced || (event.severity === 'critical' ? 'Elevated' : 'Limited'), tone: event.displaced ? 'critical' : event.severity },
    { label: 'Response posture', value: event.containment || (event.severity === 'critical' ? 'Full mobilization' : event.severity === 'high' ? 'Staging' : 'Watch mode'), tone: event.severity },
  ];
  const imageryLayers = [
    {
      label: 'Satellite',
      detail: event.type === 'wildfire'
        ? 'Thermal hotspots and burn perimeter prioritised'
        : event.type === 'flood'
        ? 'Surface water expansion and inundation edges tracked'
        : event.type === 'hurricane'
        ? 'Cloud bands and landfall corridor monitored'
        : 'Overhead scene review synced to event coordinates',
    },
    {
      label: 'Terrain',
      detail: event.area || event.location
        ? `${event.area || 'Local terrain'} near ${event.location || 'impact area'}`
        : 'Terrain context aligned to the affected zone',
    },
    {
      label: 'Exposure Grid',
      detail: event.population || event.affected
        ? `${event.population || event.affected} potentially exposed`
        : 'Population and asset exposure still being estimated',
    },
  ];
  const sceneNotes = [
    event.description || 'Primary scene assessment remains in progress.',
    event.wind ? `Wind conditions reported at ${event.wind}.` : null,
    event.aftershocks ? `Secondary activity detected: ${event.aftershocks}.` : null,
    event.surge ? `Water surge model indicates ${event.surge}.` : null,
    event.landfall ? `Landfall risk posture: ${event.landfall}.` : null,
  ].filter(Boolean);
  const eventFeedItems = [
    {
      id: 'confirm',
      title: 'Event confirmed by LEONA',
      timestamp: formatDisplayDate(event.updated_at || event.created_at),
      detail: `${toTitle(event.type)} activity classified as ${event.severity}.`,
      tone: event.severity,
    },
    {
      id: 'correlate',
      title: 'Cross-source correlation complete',
      timestamp: formatDisplayDate(event.created_at, 'Initial detection'),
      detail: event.source
        ? `Primary source: ${event.source}. Additional feed correlation active.`
        : 'Operational feeds and local signals have been cross-referenced.',
      tone: 'high',
    },
    {
      id: 'impact',
      title: 'Impact model refreshed',
      timestamp: event.expires_at ? `Valid until ${formatDisplayDate(event.expires_at)}` : 'Rolling updates',
      detail: event.population || event.affected || event.displaced
        ? `Exposure indicators: ${[event.population, event.affected, event.displaced].filter(Boolean).join(' · ')}`
        : 'Exposure indicators are still being computed from incoming telemetry.',
      tone: 'monitoring',
    },
  ];
  const relatedCoverage = relatedNews.map((article, idx) => ({
    id: `news-${article.id || idx}`,
    title: article.title || 'Related coverage',
    sourceLine: [article.source, article.location].filter(Boolean).join(' · ') || 'External source',
    summary: article.summary || article.snippet || article.description || 'Open the source feed for the full article context.',
    time: article.published_at || article.publishedAt || article.date || null,
  }));
  const ecosystemCards = [
    {
      label: 'Population',
      value: event.population || event.affected || 'Unknown',
      note: event.displaced ? `${event.displaced} displaced or at risk` : 'No displacement figure confirmed yet',
      tone: event.population || event.affected ? 'high' : 'monitoring',
    },
    {
      label: 'Critical Infrastructure',
      value: event.area || event.category || toTitle(event.type),
      note: event.wind || event.surge || event.containment || 'Infrastructure pressure inferred from event profile',
      tone: event.severity,
    },
    {
      label: 'Environmental Load',
      value: event.magnitude || event.aftershocks || event.landfall || 'Monitoring',
      note: event.description || 'Environmental impact model is using baseline telemetry.',
      tone: event.severity,
    },
    {
      label: 'Operational Access',
      value: event.location || 'Area under review',
      note: event.country_code || event.country || 'Jurisdiction not specified',
      tone: severityRank[event.severity] >= 3 ? 'high' : 'monitoring',
    },
  ];
  const operationalActions = [
    event.severity === 'critical' ? 'Mobilize response leads and confirm escalation chain.' : null,
    event.severity === 'high' ? 'Stage response resources and validate fallback comms.' : null,
    event.population || event.affected ? 'Verify exposed population estimate against field reports.' : 'Continue validating exposure estimate.',
    event.wind || event.surge || event.landfall ? 'Review weather and mobility constraints before field deployment.' : 'Review road, weather, and access constraints.',
    'Push the latest incident summary to LEONA chat for coordinated next actions.',
  ].filter(Boolean);
  const sourceTags = toArray(event.source || event.sources);

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

  const renderImageryTab = () => (
    <View style={styles.richTab}>
      {renderInlineMap()}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>OBSERVATION LAYERS</Text>
        <Text style={styles.sectionMetaText}>Derived from current event telemetry</Text>
      </View>

      <View style={styles.layerGrid}>
        {imageryLayers.map((layer) => (
          <View key={layer.label} style={styles.layerCard}>
            <Text style={styles.layerTitle}>{layer.label}</Text>
            <Text style={styles.layerDetail}>{layer.detail}</Text>
          </View>
        ))}
      </View>

      <View style={styles.dualRow}>
        <View style={styles.snapshotCard}>
          <Text style={styles.snapshotLabel}>CURRENT VIEW</Text>
          <Text style={styles.snapshotValue}>{is3D ? '3D tactical' : '2D satellite'}</Text>
          <Text style={styles.snapshotHint}>Focus locked to {event.location || 'event coordinates'}</Text>
        </View>
        <View style={styles.snapshotCard}>
          <Text style={styles.snapshotLabel}>LAST REFRESH</Text>
          <Text style={styles.snapshotValue}>{formatDisplayDate(event.updated_at || event.created_at)}</Text>
          <Text style={styles.snapshotHint}>Severity overlay synced to LEONA classification</Text>
        </View>
      </View>

      <View style={styles.narrativePanel}>
        <Text style={styles.sectionLabel}>SCENE NOTES</Text>
        {sceneNotes.map((note, idx) => (
          <View key={`${note}-${idx}`} style={styles.signalRow}>
            <View style={[styles.signalDot, { backgroundColor: sevColors[event.severity] || colors.blue }]} />
            <Text style={styles.signalText}>{note}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderFeedTab = () => (
    <View style={styles.richTab}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>LIVE SIGNALS</Text>
        <Text style={styles.sectionMetaText}>{newsLoading ? 'Refreshing' : 'Operational feed'}</Text>
      </View>

      <View style={styles.feedPanel}>
        {eventFeedItems.map((item, idx) => (
          <View key={item.id} style={styles.feedTimelineRow}>
            <View style={styles.feedTimelineRail}>
              <View style={[styles.feedTimelineDot, { backgroundColor: sevColors[item.tone] || colors.blue }]} />
              {idx < eventFeedItems.length - 1 && <View style={styles.feedTimelineLine} />}
            </View>
            <View style={styles.feedTimelineBody}>
              <Text style={styles.feedItemTitle}>{item.title}</Text>
              <Text style={styles.feedItemTime}>{item.timestamp}</Text>
              <Text style={styles.feedItemDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>RELATED COVERAGE</Text>
        <Text style={styles.sectionMetaText}>{relatedCoverage.length} items</Text>
      </View>

      {newsLoading ? (
        <ActivityIndicator color={colors.blue} style={{ paddingVertical: 40 }} />
      ) : relatedCoverage.length > 0 ? (
        relatedCoverage.map((article) => (
          <View key={article.id} style={styles.coverageCard}>
            <Text style={styles.coverageTitle}>{article.title}</Text>
            <Text style={styles.coverageMeta}>
              {article.sourceLine}
              {article.time ? ` · ${formatDisplayDate(article.time, '')}` : ''}
            </Text>
            <Text style={styles.coverageSummary}>{article.summary}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No external coverage yet</Text>
          <Text style={styles.placeholderText}>
            LEONA is still tracking internal signals for this event. External article matching has not returned any linked coverage.
          </Text>
        </View>
      )}
    </View>
  );

  const renderEcosystemTab = () => (
    <View style={styles.richTab}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>ECOSYSTEM OVERVIEW</Text>
        <Text style={styles.sectionMetaText}>Operational dependencies and exposure</Text>
      </View>

      <View style={styles.ecosystemGrid}>
        {ecosystemCards.map((card) => (
          <View key={card.label} style={styles.ecosystemCard}>
            <Text style={styles.ecosystemLabel}>{card.label}</Text>
            <Text style={[styles.ecosystemValue, { color: sevColors[card.tone] || colors.blueLight }]}>{card.value}</Text>
            <Text style={styles.ecosystemNote} numberOfLines={3}>{card.note}</Text>
          </View>
        ))}
      </View>

      <View style={styles.narrativePanel}>
        <Text style={styles.sectionLabel}>IMPACT SIGNALS</Text>
        {impactSignals.map((signal) => (
          <View key={signal.label} style={styles.impactRow}>
            <View>
              <Text style={styles.impactLabel}>{signal.label}</Text>
              <Text style={styles.impactValue}>{signal.value}</Text>
            </View>
            <View style={[styles.impactPill, { backgroundColor: sevBg[signal.tone] || colors.blueDim, borderColor: sevColors[signal.tone] || colors.blue }]}>
              <Text style={[styles.impactPillText, { color: sevColors[signal.tone] || colors.blueLight }]}>{toTitle(signal.tone)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.narrativePanel}>
        <Text style={styles.sectionLabel}>OPERATING CONTEXT</Text>
        <Text style={styles.ecosystemNarrative}>
          {event.description || 'LEONA is maintaining a rolling ecosystem assessment for this incident.'}
        </Text>
        <View style={styles.tagRow}>
          <View style={styles.contextTag}>
            <Text style={styles.contextTagText}>{toTitle(event.type)}</Text>
          </View>
          <View style={styles.contextTag}>
            <Text style={styles.contextTagText}>{toTitle(event.severity)}</Text>
          </View>
          {(sourceTags.length > 0 ? sourceTags : [event.country_code || event.country || 'Global']).slice(0, 3).map((tag) => (
            <View key={tag} style={styles.contextTag}>
              <Text style={styles.contextTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.narrativePanel}>
        <Text style={styles.sectionLabel}>RECOMMENDED ACTIONS</Text>
        {operationalActions.map((item, idx) => (
          <View key={`${item}-${idx}`} style={styles.actionRow}>
            <Text style={styles.actionIndex}>{idx + 1}</Text>
            <Text style={styles.actionText}>{item}</Text>
          </View>
        ))}
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
          <Text style={styles.heroTitle}>{event.title}</Text>
          <Text style={styles.heroLocation}>{event.location}</Text>
        </View>
        <View style={styles.heroRight}>
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
          <TouchableOpacity onPress={toggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={isFavorite ? styles.favStarActive : styles.favStarInactive}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
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

              {/* Event Metadata */}
              <View style={styles.metadataSection}>
                <Text style={styles.sectionLabel}>EVENT INFO</Text>
                <View style={styles.metaGrid}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Start Time</Text>
                    <Text style={styles.metaValue}>
                      {event.created_at || event.event_time
                        ? new Date(event.created_at || event.event_time).toLocaleString()
                        : 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Last Observed</Text>
                    <Text style={styles.metaValue}>
                      {event.updated_at
                        ? new Date(event.updated_at).toLocaleString()
                        : event.expires_at
                        ? 'Expires: ' + new Date(event.expires_at).toLocaleDateString()
                        : 'Active'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Coordinates</Text>
                    <Text style={styles.metaValueMono}>
                      {eventLat.toFixed(4)}° {eventLat >= 0 ? 'N' : 'S'}, {eventLng.toFixed(4)}° {eventLng >= 0 ? 'E' : 'W'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Location</Text>
                    <Text style={styles.metaValue}>{event.location || event.location_name || 'Unknown'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Country</Text>
                    <Text style={styles.metaValue}>{event.country_code || event.country || '—'}</Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                <Text style={styles.descriptionText}>{event.description}</Text>
              </View>

            </View>
          )}

            {activeTab === 'IMAGERY' && renderImageryTab()}

            {activeTab === 'FEED' && renderFeedTab()}

            {false && activeTab === 'FEED' && (
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

            {activeTab === 'ECOSYSTEM' && renderEcosystemTab()}

            {false && activeTab === 'ECOSYSTEM' && (
              <View style={styles.placeholderTab}>
                <Text style={styles.placeholderText}>
                  Ecosystem data for this event
                </Text>
              </View>
            )}
          </View>

          {/* LEONA Initial Assessment Card */}
          <View style={styles.leonaCard}>
            <View style={styles.leonaHeader}>
              <Text style={styles.leonaLabel}>◆ LEONA INITIAL ASSESSMENT</Text>
            </View>
            <View style={styles.leonaContent}>
              {/* Paragraph summary */}
              <Text style={styles.assessmentSummary}>
                This event has been classified as{' '}
                <Text style={{ color: sevColors[event.severity], fontWeight: '700' }}>
                  {event.severity.toUpperCase()}
                </Text>
                . {event.description || 'LEONA is actively coordinating intelligence across all relevant domain agents and the local Country Agent.'}{' '}
                {event.severity === 'critical'
                  ? 'Recommend immediate action and response coordination.'
                  : event.severity === 'high'
                  ? 'Alert and preparation measures are advised for affected areas.'
                  : 'Continued monitoring is recommended.'}
              </Text>

              {/* Key metrics */}
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
              <View style={styles.assessmentRow}>
                <Text style={styles.assessmentLabel}>Agents Active</Text>
                <Text style={[styles.assessmentValue, { color: colors.blue }]}>
                  {event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) + ' Specialist' : 'LEONA'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.leonaButton}
              onPress={() => navigation.navigate('LeonaTab', {
                screen: 'LeonaChat',
                params: {
                  initialSection: 'CHAT',
                  requestKey: `event-${event.id || event.event_id || Date.now()}`,
                  contextEvent: event,
                  initialPrompt: `Analyze this event and give next actions.\nTitle: ${event.title || 'Untitled event'}\nLocation: ${event.location || 'unknown location'}\nSeverity: ${event.severity || 'unknown'}\nType: ${event.type || event.category || 'unknown'}\nDescription: ${event.description || 'No description provided.'}`,
                },
              })}
            >
              <Text style={styles.leonaButtonText}>CHAT WITH AGENT →</Text>
            </TouchableOpacity>
          </View>

          {/* Event Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.timelineTitle}>EVENT TIMELINE</Text>

            <View style={styles.timelineEntry}>
              <View style={styles.timelineLineWrap}>
                <View style={[styles.timelineDot, { backgroundColor: sevColors[event.severity] || '#FF7A00' }]} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTime, { color: sevColors[event.severity] || '#FF7A00' }]}>
                  {event.created_at ? new Date(event.created_at).toLocaleString() : '2h ago'}
                </Text>
                <Text style={styles.timelineDesc}>Event confirmed and catalogued by LEONA Intelligence. Risk assessment generated.</Text>
              </View>
            </View>

            <View style={styles.timelineEntry}>
              <View style={styles.timelineLineWrap}>
                <View style={[styles.timelineDot, { backgroundColor: '#FF7A00' }]} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTime, { color: '#FF7A00' }]}>Earlier</Text>
                <Text style={styles.timelineDesc}>First data signals detected across monitored feed network. LEONA began cross-referencing sources.</Text>
              </View>
            </View>

            <View style={styles.timelineEntry}>
              <View style={styles.timelineLineWrap}>
                <View style={[styles.timelineDot, { backgroundColor: colors.textDim }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTime, { color: colors.textDim }]}>Background</Text>
                <Text style={styles.timelineDesc}>Background monitoring active. No escalation at that time.</Text>
              </View>
            </View>
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
  heroRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  favStarActive: {
    fontSize: 22,
    color: '#FFD700',
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowRadius: 6,
  },
  favStarInactive: {
    fontSize: 22,
    color: '#333',
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
  // Event metadata
  metadataSection: {
    gap: spacing.md,
  },
  metaGrid: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  metaLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metaValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  metaValueMono: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
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
  assessmentSummary: {
    color: colors.textSec,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.sm,
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
  // Event Timeline
  timelineSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  timelineTitle: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  timelineEntry: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  timelineLineWrap: {
    alignItems: 'center',
    width: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: colors.border,
    marginTop: 3,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 11,
    color: colors.textSec,
    lineHeight: 16,
  },
  richTab: {
    gap: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionMetaText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
  },
  layerGrid: {
    gap: spacing.md,
  },
  layerCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  layerTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  layerDetail: {
    color: colors.textSec,
    fontSize: 12,
    lineHeight: 18,
  },
  dualRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  snapshotLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  snapshotValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  snapshotHint: {
    color: colors.textSec,
    fontSize: 11,
    lineHeight: 16,
  },
  narrativePanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.md,
  },
  signalRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  signalText: {
    flex: 1,
    color: colors.textSec,
    fontSize: 12,
    lineHeight: 18,
  },
  feedPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.md,
  },
  feedTimelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  feedTimelineRail: {
    width: 12,
    alignItems: 'center',
  },
  feedTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  feedTimelineLine: {
    width: 2,
    flex: 1,
    minHeight: 26,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  feedTimelineBody: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  feedItemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  feedItemTime: {
    color: colors.blueLight,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  feedItemDetail: {
    color: colors.textSec,
    fontSize: 12,
    lineHeight: 18,
  },
  coverageCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  coverageTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  coverageMeta: {
    color: colors.textDim,
    fontSize: 11,
  },
  coverageSummary: {
    color: colors.textSec,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyStateCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  ecosystemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  ecosystemCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ecosystemLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  ecosystemValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  ecosystemNote: {
    color: colors.textSec,
    fontSize: 11,
    lineHeight: 16,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  impactLabel: {
    color: colors.textSec,
    fontSize: 11,
    marginBottom: 2,
  },
  impactValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  impactPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  impactPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ecosystemNarrative: {
    color: colors.textSec,
    fontSize: 12,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contextTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  contextTagText: {
    color: colors.blueLight,
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  actionIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
    color: colors.black,
    backgroundColor: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    paddingTop: 3,
  },
  actionText: {
    flex: 1,
    color: colors.textSec,
    fontSize: 12,
    lineHeight: 18,
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
