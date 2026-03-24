import React, { useRef, useState, useMemo, useCallback, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { colors, sevColors, typeIcons, spacing } from '../theme';
import { getRefreshIntervalMs, isAccessDeniedError, useAOIs, useMyEvents, useWorldEvents } from '../hooks/useEvents';
import { AppContext } from '../../App';
import { fetchNewsRegional, isTimeoutError } from '../lib/api';
import { deriveLocalRegion, filterEventsForConfig } from '../lib/locality';
import { getProductConfig, limitEventsForProduct } from '../lib/products';
import { getRealtimeStatus, onRealtimeStatusChange, retryRealtime } from '../lib/realtime';
import { useAuth } from '../lib/auth';

const mapsModule = Platform.OS === 'web'
  ? {
      default: React.forwardRef(({ children, style }, _ref) => <View style={style}>{children}</View>),
      Marker: ({ children }) => <View>{children}</View>,
    }
  : require('react-native-maps');

const MapView = mapsModule.default;
const Marker = mapsModule.Marker;

const LOCAL_REGION = { latitude: -33.8688, longitude: 151.2093, latitudeDelta: 8, longitudeDelta: 8 };
const GLOBAL_REGION = { latitude: 25, longitude: 10, latitudeDelta: 80, longitudeDelta: 80 };
const MAP_MODE_OPTIONS = ['2D', '3D', 'Satellite'];

const layers = [
  { key: 'wildfire', label: 'Wildfires', icon: 'F' },
  { key: 'flood', label: 'Floods', icon: 'W' },
  { key: 'earthquake', label: 'Earthquakes', icon: 'Q' },
  { key: 'hurricane', label: 'Storms & Cyclones', icon: 'S' },
  { key: 'conflict', label: 'Conflict Zones', icon: 'C' },
  { key: 'drought', label: 'Drought & Heat', icon: 'D' },
  { key: 'volcano', label: 'Volcanic Activity', icon: 'V' },
  { key: 'health', label: 'Health & Disease', icon: 'H' },
];

const MapHomeScreen = ({ navigation }) => {
  const { userConfig } = useContext(AppContext);
  const { isLoaded: authLoaded, isSignedIn, authReady } = useAuth();
  const productConfig = getProductConfig(userConfig?.product);
  const mapRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const [mapScope, setMapScope] = useState('LOCAL');
  const [activeTab, setActiveTab] = useState('MY_ALERTS');
  const [layersVisible, setLayersVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState(getRealtimeStatus());
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);
  const [layerStates, setLayerStates] = useState({
    wildfire: true,
    flood: true,
    earthquake: true,
    hurricane: true,
    conflict: true,
    drought: false,
    volcano: false,
    health: false,
  });
  const snapPoints = useMemo(() => [100, 300, 520], []);
  const myDataAuthEnabled = isSignedIn && authReady;
  const myDataRequiresAuth = authLoaded && !myDataAuthEnabled;
  const defaultMapMode = useMemo(() => {
    const configuredMapMode = userConfig?.defaultMapType ?? userConfig?.preferences?.default_map_type ?? '2D';
    return MAP_MODE_OPTIONS.includes(configuredMapMode) ? configuredMapMode : '2D';
  }, [userConfig?.defaultMapType, userConfig?.preferences?.default_map_type]);
  const refreshIntervalMs = useMemo(
    () => getRefreshIntervalMs(userConfig?.refreshInterval ?? userConfig?.preferences?.refresh_interval ?? '1m'),
    [userConfig?.preferences?.refresh_interval, userConfig?.refreshInterval]
  );
  const [mapMode, setMapMode] = useState(defaultMapMode);

  const {
    events: myEvents,
    error: myEventsError,
    refresh: refreshMyEvents,
    status: myEventsStatus,
  } = useMyEvents(myDataAuthEnabled, refreshIntervalMs);
  const { error: aoisError } = useAOIs((mapScope === 'LOCAL' || activeTab === 'MY_ALERTS') && myDataAuthEnabled);
  const {
    events: worldEvents,
    error: worldEventsError,
    refresh: refreshWorldEvents,
    status: worldEventsStatus,
  } = useWorldEvents(refreshIntervalMs);
  const myDataUnavailable = myDataRequiresAuth || isAccessDeniedError(myEventsError) || isAccessDeniedError(aoisError);
  const timedOutMapRequest = (mapScope === 'LOCAL' || activeTab === 'MY_ALERTS')
    ? isTimeoutError(myEventsError) || isTimeoutError(aoisError)
    : isTimeoutError(worldEventsError);
  const showEventMarkers = userConfig?.showEventMarkers ?? userConfig?.preferences?.show_event_markers ?? true;
  const showRiskZones = userConfig?.showRiskZones ?? userConfig?.preferences?.show_risk_zones ?? true;
  const availableLayers = useMemo(
    () => layers.filter((layer) => productConfig.enabledMapLayers.includes(layer.key)),
    [productConfig.enabledMapLayers]
  );
  const bottomSheetTabs = useMemo(
    () => (productConfig.canUseCommunity ? ['MY_ALERTS', 'EVENTS', 'NEWS', 'COMMUNITY'] : ['MY_ALERTS', 'EVENTS', 'NEWS']),
    [productConfig.canUseCommunity]
  );
  const localEvents = useMemo(
    () => limitEventsForProduct(filterEventsForConfig(myEvents, userConfig, 'local'), userConfig?.product),
    [myEvents, userConfig]
  );
  const globalEvents = useMemo(
    () => limitEventsForProduct(filterEventsForConfig(worldEvents, userConfig, 'global'), userConfig?.product),
    [userConfig, worldEvents]
  );
  const localRegion = useMemo(
    () => deriveLocalRegion(userConfig?.location, localEvents) || LOCAL_REGION,
    [localEvents, userConfig?.location]
  );

  const scopedEvents = useMemo(
    () => (mapScope === 'LOCAL' ? localEvents : globalEvents),
    [globalEvents, localEvents, mapScope]
  );
  const normalizedSearchText = searchText.trim().toLowerCase();

  const visibleEvents = useMemo(
    () => scopedEvents.filter((event) => productConfig.enabledMapLayers.includes(event.type) && layerStates[event.type] !== false),
    [productConfig.enabledMapLayers, scopedEvents, layerStates]
  );
  const searchedEvents = useMemo(() => {
    if (!normalizedSearchText) {
      return visibleEvents;
    }

    const searchTerms = normalizedSearchText.split(/\s+/).filter(Boolean);
    return visibleEvents.filter((event) => {
      const haystack = [
        event.title,
        event.location,
        event.type,
        event.category,
        event.source,
        event.country,
        event.country_code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchTerms.every((term) => haystack.includes(term));
    });
  }, [normalizedSearchText, visibleEvents]);
  const mapMarkerEvents = useMemo(
    () => (showEventMarkers ? searchedEvents : []),
    [searchedEvents, showEventMarkers]
  );
  const searchRegion = useMemo(() => {
    if (!normalizedSearchText) {
      return null;
    }

    return deriveLocalRegion(searchText, searchedEvents) || null;
  }, [normalizedSearchText, searchText, searchedEvents]);

  const filteredEvents = useMemo(() => {
    if (activeTab === 'NEWS' || activeTab === 'COMMUNITY') return [];
    return searchedEvents;
  }, [activeTab, productConfig.canUseCommunity, searchedEvents]);
  const showMyDataUnavailableState = myDataUnavailable && (mapScope === 'LOCAL' || activeTab === 'MY_ALERTS');
  const showBottomSheetMyDataUnavailable = activeTab === 'MY_ALERTS' && showMyDataUnavailableState;
  const activeEventStatus = mapScope === 'LOCAL' || activeTab === 'MY_ALERTS' ? myEventsStatus : worldEventsStatus;
  const showDataModeBanner = !showMyDataUnavailableState && activeEventStatus?.source === 'cache' && !!activeEventStatus?.message;

  useEffect(() => {
    setLayerStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = productConfig.enabledMapLayers.includes(key) ? next[key] : false;
      });
      return next;
    });
  }, [productConfig.enabledMapLayers]);

  useEffect(() => {
    if (!productConfig.canUseCommunity && activeTab === 'COMMUNITY') {
      setActiveTab('MY_ALERTS');
    }
  }, [activeTab, productConfig.canUseCommunity]);

  useEffect(() => {
    if (!showRiskZones && layersVisible) {
      setLayersVisible(false);
    }
  }, [layersVisible, showRiskZones]);

  useEffect(() => {
    setMapMode(defaultMapMode);
  }, [defaultMapMode]);

  useEffect(() => onRealtimeStatusChange(setRealtimeStatus), []);

  useEffect(() => {
    const region = searchRegion || (mapScope === 'LOCAL' ? localRegion : GLOBAL_REGION);
    mapRef.current?.animateToRegion?.(region, 600);
  }, [localRegion, mapScope, searchRegion]);

  useEffect(() => {
    if (activeTab !== 'NEWS') {
      return;
    }

    let cancelled = false;
    setNewsLoading(true);
    setNewsError(null);

    fetchNewsRegional()
      .then((data) => {
        if (cancelled) {
          return;
        }
        const nextArticles = Array.isArray(data?.articles)
          ? data.articles
          : Array.isArray(data?.news)
            ? data.news
            : Array.isArray(data)
              ? data
              : [];
        setNewsItems(nextArticles);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setNewsItems([]);
        setNewsError(err);
      })
      .finally(() => {
        if (!cancelled) {
          setNewsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleMarkerPress = (event) => navigation.navigate('EventDetail', { event });
  const handleCardPress = (event) => navigation.navigate('EventDetail', { event });
  const toggleLayer = (key) => setLayerStates((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleZoomIn = useCallback(() => {
    mapRef.current?.getCamera?.().then((cam) => {
      mapRef.current?.animateCamera?.(
        {
          ...cam,
          altitude: cam.altitude ? cam.altitude * 0.5 : undefined,
          zoom: cam.zoom ? cam.zoom + 1 : undefined,
        },
        { duration: 300 }
      );
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.getCamera?.().then((cam) => {
      mapRef.current?.animateCamera?.(
        {
          ...cam,
          altitude: cam.altitude ? cam.altitude * 2 : undefined,
          zoom: cam.zoom ? cam.zoom - 1 : undefined,
        },
        { duration: 300 }
      );
    });
  }, []);

  const handleResetNorth = useCallback(() => {
    mapRef.current?.getCamera?.().then((cam) => {
      mapRef.current?.animateCamera?.(
        {
          ...cam,
          heading: 0,
          pitch: 0,
        },
        { duration: 400 }
      );
    });
  }, []);

  const handleMyLocation = useCallback(() => {
    mapRef.current?.animateToRegion?.(localRegion, 500);
  }, [localRegion]);

  const handleFitAll = useCallback(() => {
    mapRef.current?.animateToRegion?.(GLOBAL_REGION, 500);
  }, []);
  const handleSearchSubmit = useCallback(() => {
    if (!searchRegion) {
      return;
    }
    mapRef.current?.animateToRegion?.(searchRegion, 600);
  }, [searchRegion]);
  const handleClearSearch = useCallback(() => {
    setSearchText('');
    const region = mapScope === 'LOCAL' ? localRegion : GLOBAL_REGION;
    mapRef.current?.animateToRegion?.(region, 600);
  }, [localRegion, mapScope]);
  const handleRetryMapData = useCallback(() => {
    if (mapScope === 'LOCAL' || activeTab === 'MY_ALERTS') {
      refreshMyEvents().catch(() => {});
      return;
    }
    refreshWorldEvents().catch(() => {});
  }, [activeTab, mapScope, refreshMyEvents, refreshWorldEvents]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={Platform.OS === 'web' ? undefined : mapMode === '3D' ? 'hybridFlyover' : mapMode === 'Satellite' ? 'satellite' : 'mutedStandard'}
        userInterfaceStyle={Platform.OS === 'web' ? undefined : 'dark'}
        initialRegion={LOCAL_REGION}
        pitchEnabled={Platform.OS !== 'web' && mapMode === '3D'}
        rotateEnabled={Platform.OS !== 'web' && mapMode === '3D'}
        showsCompass={false}
        showsScale={false}
        showsUserLocation={false}
      >
        {mapMarkerEvents.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.lat, longitude: event.lng }}
            onPress={() => handleMarkerPress(event)}
          >
            <View style={[styles.marker, { borderColor: sevColors[event.severity] || '#888' }]}>
              <Text style={styles.markerEmoji}>{typeIcons[event.type] || 'o'}</Text>
            </View>
          </Marker>
        ))}
        {Platform.OS === 'web' ? (
          <View style={styles.webMapOverlay}>
            <Text style={styles.webMapTitle}>Web fallback</Text>
            <Text style={styles.webMapSubtitle}>Mobile keeps native maps.</Text>
          </View>
        ) : null}
      </MapView>

      <View style={styles.topBar}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Text style={styles.searchIcon}>O</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Find address or place"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchText.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Text style={styles.clearBtn}>X</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.topBarRow2}>
          <View style={styles.livePill}>
            <View style={styles.liveDotSmall} />
            <Text style={styles.livePillText}>{mapMarkerEvents.length} LIVE</Text>
          </View>
          <View style={styles.scopeToggle}>
            <TouchableOpacity
              style={[styles.scopeBtn, mapScope === 'LOCAL' && styles.scopeBtnActive]}
              onPress={() => setMapScope('LOCAL')}
            >
              <Text style={[styles.scopeBtnText, mapScope === 'LOCAL' && styles.scopeBtnTextActive]}>LOCAL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeBtn, mapScope === 'GLOBAL' && styles.scopeBtnActive]}
              onPress={() => setMapScope('GLOBAL')}
            >
              <Text style={[styles.scopeBtnText, mapScope === 'GLOBAL' && styles.scopeBtnTextActive]}>GLOBAL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showMyDataUnavailableState ? (
        <View style={styles.unavailableBanner}>
          <Text style={styles.unavailableBannerTitle}>Sign in required</Text>
          <Text style={styles.unavailableBannerText}>
            My monitoring is unavailable until you sign in with a valid account.
          </Text>
        </View>
      ) : null}

      {timedOutMapRequest ? (
        <View style={styles.timeoutBanner}>
          <View style={styles.timeoutBannerCopy}>
            <Text style={styles.timeoutBannerTitle}>Request timed out</Text>
            <Text style={styles.timeoutBannerText}>
              Map events could not be loaded. Check your connection and retry.
            </Text>
          </View>
          <TouchableOpacity style={styles.timeoutBannerButton} onPress={handleRetryMapData}>
            <Text style={styles.timeoutBannerButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showDataModeBanner ? (
        <View style={styles.cacheBanner}>
          <Text style={styles.cacheBannerTitle}>
            {activeEventStatus.dataSaverMode ? 'Data Saver active' : 'Offline cache active'}
          </Text>
          <Text style={styles.cacheBannerText}>{activeEventStatus.message}</Text>
        </View>
      ) : null}

      {realtimeStatus.state === 'offline' ? (
        <View style={styles.realtimeBanner}>
          <View style={styles.realtimeBannerCopy}>
            <Text style={styles.realtimeBannerTitle}>Realtime offline</Text>
            <Text style={styles.realtimeBannerText}>
              {realtimeStatus.message || 'Live updates are unavailable right now.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.realtimeBannerButton} onPress={() => retryRealtime().catch(() => {})}>
            <Text style={styles.realtimeBannerButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.mapToolCol}>
        <TouchableOpacity style={styles.mapToolBtn} onPress={handleZoomIn}>
          <Text style={styles.mapToolBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapToolBtn} onPress={handleZoomOut}>
          <Text style={styles.mapToolBtnText}>-</Text>
        </TouchableOpacity>

        <View style={styles.mapToolDivider} />

        <TouchableOpacity style={styles.mapToolBtn} onPress={handleFitAll}>
          <View style={styles.extentIcon}>
            <View style={styles.extentCornerTL} />
            <View style={styles.extentCornerTR} />
            <View style={styles.extentCornerBL} />
            <View style={styles.extentCornerBR} />
          </View>
        </TouchableOpacity>

        <View style={styles.mapToolDivider} />

        <TouchableOpacity
          style={[styles.mapToolBtn, layersVisible && styles.mapToolBtnActive, !showRiskZones && styles.mapToolBtnDisabled]}
          onPress={() => {
            if (!showRiskZones) {
              return;
            }
            setLayersVisible((prev) => !prev);
          }}
        >
          <View style={styles.layerIconStack}>
            <View style={[styles.layerLine, layersVisible && showRiskZones && { backgroundColor: colors.blue }, !showRiskZones && styles.layerLineDisabled]} />
            <View style={[styles.layerLine, { width: 14 }, layersVisible && showRiskZones && { backgroundColor: colors.blue }, !showRiskZones && styles.layerLineDisabled]} />
            <View style={[styles.layerLine, { width: 10 }, layersVisible && showRiskZones && { backgroundColor: colors.blue }, !showRiskZones && styles.layerLineDisabled]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mapToolBtn} onPress={handleMyLocation}>
          <Text style={styles.mapToolIcon}>H</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mapToolBtn} onPress={handleResetNorth}>
          <Text style={styles.mapToolIconLg}>G</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewButton, mapMode === '2D' && styles.viewButtonActive]}
          onPress={() => setMapMode('2D')}
        >
          <Text style={[styles.viewButtonText, mapMode === '2D' && styles.viewBtnTextActive]}>2D</Text>
        </TouchableOpacity>
        <View style={styles.viewToggleDivider} />
        <TouchableOpacity
          style={[styles.viewButton, mapMode === 'Satellite' && styles.viewButtonActive]}
          onPress={() => setMapMode('Satellite')}
        >
          <Text style={[styles.viewButtonText, mapMode === 'Satellite' && styles.viewBtnTextActive]}>SAT</Text>
        </TouchableOpacity>
        <View style={styles.viewToggleDivider} />
        <TouchableOpacity
          style={[styles.viewButton, mapMode === '3D' && styles.viewButtonActive]}
          onPress={() => setMapMode('3D')}
        >
          <Text style={[styles.viewButtonText, mapMode === '3D' && styles.viewBtnTextActive]}>3D</Text>
        </TouchableOpacity>
      </View>

      {layersVisible && showRiskZones ? (
        <View style={styles.layersPanel}>
          <View style={styles.layersPanelHeader}>
            <Text style={styles.layersPanelTitle}>MAP LAYERS</Text>
            <TouchableOpacity onPress={() => setLayersVisible(false)}>
              <Text style={styles.layersPanelClose}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.layersPanelSubtitle}>
            {Object.values(layerStates).filter(Boolean).length} active · {layers.length} available
          </Text>

          <ScrollView style={styles.layersScroll} showsVerticalScrollIndicator={false}>
            {availableLayers.map((layer) => (
              <View key={layer.key} style={styles.layerRow}>
                <Text style={styles.layerIcon}>{layer.icon}</Text>
                <Text style={[styles.layerLabel, layerStates[layer.key] && styles.layerLabelActive]}>
                  {layer.label}
                </Text>
                <Switch
                  value={layerStates[layer.key]}
                  onValueChange={() => toggleLayer(layer.key)}
                  trackColor={{ false: colors.panel, true: `${colors.blue}60` }}
                  thumbColor={layerStates[layer.key] ? colors.blue : colors.textDim}
                  ios_backgroundColor={colors.panel}
                  style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <View style={styles.bottomSheetContent}>
          <View style={styles.tabBar}>
            {bottomSheetTabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cardsContainer}>
            {showBottomSheetMyDataUnavailable ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>Sign in required</Text>
                <Text style={styles.emptyStateText}>
                  This screen is not showing fallback My Alert data while you are signed out.
                </Text>
              </View>
            ) : activeTab === 'NEWS' ? (
              newsLoading ? (
                <ActivityIndicator color={colors.blue} style={styles.bottomSheetLoader} />
              ) : newsError ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>{isTimeoutError(newsError) ? 'Request timed out' : 'News unavailable'}</Text>
                  <Text style={styles.emptyStateText}>
                    {isTimeoutError(newsError)
                      ? 'Regional news took too long to load. Check your connection and retry.'
                      : 'Regional news could not be loaded right now.'}
                  </Text>
                </View>
              ) : newsItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No news items are available right now.</Text>
                </View>
              ) : (
                newsItems.map((article, index) => (
                  <View key={article.id || article.url || `news-${index}`} style={styles.newsCard}>
                    <Text style={styles.newsCardTitle} numberOfLines={2}>
                      {article.title || article.headline || 'Regional news update'}
                    </Text>
                    <Text style={styles.newsCardMeta} numberOfLines={1}>
                      {[article.source, article.location, article.region].filter(Boolean).join(' · ') || 'Regional feed'}
                    </Text>
                    <Text style={styles.newsCardSummary} numberOfLines={3}>
                      {article.summary || article.snippet || article.description || 'Open the full feed for more detail.'}
                    </Text>
                  </View>
                ))
              )
            ) : activeTab === 'COMMUNITY' ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>Community unavailable here</Text>
                <Text style={styles.emptyStateText}>
                  Open the dedicated Community tab to view or publish community posts. The map sheet does not embed that feed yet.
                </Text>
              </View>
            ) : filteredEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {normalizedSearchText ? 'No events match this search' : 'No events'}
                </Text>
              </View>
            ) : (
              filteredEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => handleCardPress(event)}
                  activeOpacity={0.7}
                  style={styles.card}
                >
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>{typeIcons[event.type] || 'o'}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
                      <View style={[styles.severityBadge, { backgroundColor: sevColors[event.severity] }]}>
                        <Text style={styles.severityText}>{event.severity.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardLocation} numberOfLines={1}>{event.location}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
};

const TB = 'rgba(255,255,255,0.92)';
const TB_BORDER = 'rgba(0,0,0,0.08)';
const TB_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  webMapOverlay: {
    position: 'absolute',
    top: 120,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(4,6,15,0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  webMapTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  webMapSubtitle: { color: colors.textSec, fontSize: 12 },
  topBar: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'column',
    gap: 6,
    zIndex: 10,
  },
  unavailableBanner: {
    position: 'absolute',
    top: 118,
    right: spacing.lg,
    maxWidth: 240,
    backgroundColor: 'rgba(60,16,16,0.94)',
    borderColor: 'rgba(255,120,120,0.28)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 11,
  },
  unavailableBannerTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  unavailableBannerText: { color: colors.textSec, fontSize: 11, marginTop: 2 },
  timeoutBanner: {
    position: 'absolute',
    top: 118,
    left: spacing.lg,
    right: 84,
    backgroundColor: 'rgba(60,16,16,0.96)',
    borderColor: 'rgba(255,120,120,0.28)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeoutBannerCopy: { flex: 1 },
  timeoutBannerTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  timeoutBannerText: { color: colors.textSec, fontSize: 11, marginTop: 2 },
  timeoutBannerButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  timeoutBannerButtonText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  cacheBanner: {
    position: 'absolute',
    top: 188,
    left: spacing.lg,
    right: 84,
    backgroundColor: 'rgba(14,38,58,0.96)',
    borderColor: 'rgba(77,184,255,0.28)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 11,
  },
  cacheBannerTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  cacheBannerText: { color: colors.textSec, fontSize: 11, marginTop: 2 },
  realtimeBanner: {
    position: 'absolute',
    top: 118,
    left: spacing.lg,
    right: 84,
    backgroundColor: 'rgba(56,42,8,0.96)',
    borderColor: 'rgba(255,184,77,0.28)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  realtimeBannerCopy: { flex: 1 },
  realtimeBannerTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  realtimeBannerText: { color: colors.textSec, fontSize: 11, marginTop: 2 },
  realtimeBannerButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  realtimeBannerButtonText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  topBarRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(8,11,42,0.82)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,59,59,0.3)',
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B3B',
  },
  livePillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TB,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    height: 42,
    borderWidth: 1,
    borderColor: TB_BORDER,
    ...TB_SHADOW,
  },
  searchBarFocused: {
    borderColor: colors.blue,
  },
  searchIcon: {
    fontSize: 16,
    color: '#888',
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#222',
    paddingVertical: 0,
  },
  clearBtn: {
    color: '#888',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  scopeToggle: {
    backgroundColor: TB,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TB_BORDER,
    ...TB_SHADOW,
  },
  scopeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scopeBtnActive: { backgroundColor: '#1a1a2e' },
  scopeBtnText: { color: '#666', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  scopeBtnTextActive: { color: colors.blue },
  viewToggle: {
    position: 'absolute',
    left: spacing.sm,
    bottom: 110,
    backgroundColor: TB,
    borderRadius: 10,
    flexDirection: 'column',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TB_BORDER,
    alignItems: 'center',
    paddingVertical: 4,
    zIndex: 10,
    ...TB_SHADOW,
  },
  viewButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonActive: { backgroundColor: '#2a2a3e' },
  viewButtonText: { color: '#555', fontSize: 12, fontWeight: '700' },
  viewBtnTextActive: { color: '#fff' },
  viewToggleDivider: { width: 26, height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 2 },
  mapToolCol: {
    position: 'absolute',
    left: spacing.sm,
    top: 148,
    backgroundColor: TB,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TB_BORDER,
    alignItems: 'center',
    paddingVertical: 4,
    zIndex: 10,
    ...TB_SHADOW,
  },
  mapToolBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapToolBtnActive: { backgroundColor: `${colors.blue}18` },
  mapToolBtnDisabled: { opacity: 0.45 },
  mapToolBtnText: { color: '#333', fontSize: 22, fontWeight: '300' },
  mapToolIcon: { color: '#444', fontSize: 18 },
  mapToolIconLg: { color: '#444', fontSize: 18 },
  mapToolDivider: { width: 26, height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 2 },
  extentIcon: { width: 18, height: 18, position: 'relative' },
  extentCornerTL: { position: 'absolute', top: 0, left: 0, width: 6, height: 6, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#555' },
  extentCornerTR: { position: 'absolute', top: 0, right: 0, width: 6, height: 6, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#555' },
  extentCornerBL: { position: 'absolute', bottom: 0, left: 0, width: 6, height: 6, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#555' },
  extentCornerBR: { position: 'absolute', bottom: 0, right: 0, width: 6, height: 6, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#555' },
  layerIconStack: { gap: 2, alignItems: 'center' },
  layerLine: { width: 18, height: 2, backgroundColor: '#666', borderRadius: 1 },
  layerLineDisabled: { backgroundColor: '#999' },
  layersPanel: {
    position: 'absolute',
    left: spacing.sm + 46,
    top: 148,
    width: 224,
    maxHeight: 440,
    backgroundColor: 'rgba(8,11,42,0.96)',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    zIndex: 30,
  },
  layersPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  layersPanelTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  layersPanelClose: {
    color: colors.textSec,
    fontSize: 16,
    fontWeight: '600',
  },
  layersPanelSubtitle: {
    color: colors.textDim,
    fontSize: 10,
    marginBottom: spacing.md,
  },
  layersScroll: {
    maxHeight: 280,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.sm,
  },
  layerIcon: { fontSize: 16 },
  layerLabel: { flex: 1, color: colors.textSec, fontSize: 12, fontWeight: '500' },
  layerLabelActive: { color: colors.text },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(8,11,42,0.88)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerEmoji: { fontSize: 16 },
  bottomSheetBackground: {
    backgroundColor: '#0E1228',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  handleIndicator: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  bottomSheetContent: {
    flex: 1,
    backgroundColor: '#0E1228',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  tab: { paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.blue },
  tabText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.blue },
  cardsContainer: { gap: spacing.md },
  bottomSheetLoader: { paddingVertical: spacing.xxl },
  emptyStateTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.xs },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.panelLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: { fontSize: 28 },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  severityText: { color: colors.black, fontSize: 10, fontWeight: '700' },
  cardLocation: { color: colors.textSec, fontSize: 11 },
  newsCard: {
    backgroundColor: colors.panelLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  newsCardTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  newsCardMeta: { color: colors.blue, fontSize: 11, fontWeight: '600' },
  newsCardSummary: { color: colors.textSec, fontSize: 12, lineHeight: 18 },
  emptyState: { paddingVertical: spacing.xxl, justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { color: colors.textDim, fontSize: 12 },
});

export default MapHomeScreen;
