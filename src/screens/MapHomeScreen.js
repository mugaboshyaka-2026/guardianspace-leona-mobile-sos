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
import { useMyEvents, useWorldEvents } from '../hooks/useEvents';
import { AppContext } from '../../App';
import { deriveLocalRegion, filterEventsForConfig } from '../lib/locality';

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
  const mapRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const [is3D, setIs3D] = useState(false);
  const [mapScope, setMapScope] = useState('LOCAL');
  const [activeTab, setActiveTab] = useState('MY_ALERTS');
  const [layersVisible, setLayersVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
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

  const { events: myEvents } = useMyEvents();
  const { events: worldEvents } = useWorldEvents();
  const localSourceEvents = useMemo(
    () => (myEvents.length > 0 ? myEvents : worldEvents),
    [myEvents, worldEvents]
  );
  const localEvents = useMemo(
    () => filterEventsForConfig(localSourceEvents, userConfig, 'local'),
    [localSourceEvents, userConfig]
  );
  const globalEvents = useMemo(
    () => filterEventsForConfig(worldEvents, userConfig, 'global'),
    [userConfig, worldEvents]
  );
  const localRegion = useMemo(
    () => deriveLocalRegion(userConfig?.location, localEvents) || LOCAL_REGION,
    [localEvents, userConfig?.location]
  );

  const allEvents = useMemo(() => {
    const deduped = new Map();
    [...localEvents, ...globalEvents].forEach((event) => deduped.set(event.id, event));
    return Array.from(deduped.values());
  }, [globalEvents, localEvents]);

  const filteredEvents = useMemo(() => {
    if (activeTab === 'MY_ALERTS') return localEvents;
    if (activeTab === 'EVENTS') return globalEvents;
    if (activeTab === 'NEWS') return allEvents.slice(0, 5);
    if (activeTab === 'COMMUNITY') return allEvents.slice(0, 3);
    return allEvents;
  }, [activeTab, allEvents, globalEvents, localEvents]);

  const scopedEvents = useMemo(
    () => (mapScope === 'LOCAL' ? localEvents : globalEvents),
    [globalEvents, localEvents, mapScope]
  );

  const visibleEvents = useMemo(
    () => scopedEvents.filter((event) => layerStates[event.type] !== false),
    [scopedEvents, layerStates]
  );

  useEffect(() => {
    const region = mapScope === 'LOCAL' ? localRegion : GLOBAL_REGION;
    mapRef.current?.animateToRegion?.(region, 600);
  }, [localRegion, mapScope]);

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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={Platform.OS === 'web' ? undefined : is3D ? 'hybridFlyover' : 'mutedStandard'}
        userInterfaceStyle={Platform.OS === 'web' ? undefined : 'dark'}
        initialRegion={LOCAL_REGION}
        pitchEnabled={Platform.OS !== 'web' && is3D}
        rotateEnabled={Platform.OS !== 'web'}
        showsCompass={false}
        showsScale={false}
        showsUserLocation={false}
      >
        {visibleEvents.map((event) => (
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
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchText.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearBtn}>X</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.topBarRow2}>
          <View style={styles.livePill}>
            <View style={styles.liveDotSmall} />
            <Text style={styles.livePillText}>{visibleEvents.length} LIVE</Text>
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
          style={[styles.mapToolBtn, layersVisible && styles.mapToolBtnActive]}
          onPress={() => setLayersVisible((prev) => !prev)}
        >
          <View style={styles.layerIconStack}>
            <View style={[styles.layerLine, layersVisible && { backgroundColor: colors.blue }]} />
            <View style={[styles.layerLine, { width: 14 }, layersVisible && { backgroundColor: colors.blue }]} />
            <View style={[styles.layerLine, { width: 10 }, layersVisible && { backgroundColor: colors.blue }]} />
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
          style={[styles.viewButton, !is3D && styles.viewButtonActive]}
          onPress={() => setIs3D(false)}
        >
          <Text style={[styles.viewButtonText, !is3D && styles.viewBtnTextActive]}>2D</Text>
        </TouchableOpacity>
        <View style={styles.viewToggleDivider} />
        <TouchableOpacity
          style={[styles.viewButton, is3D && styles.viewButtonActive]}
          onPress={() => setIs3D(true)}
        >
          <Text style={[styles.viewButtonText, is3D && styles.viewBtnTextActive]}>3D</Text>
        </TouchableOpacity>
      </View>

      {layersVisible ? (
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
            {layers.map((layer) => (
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
            {['MY_ALERTS', 'EVENTS', 'NEWS', 'COMMUNITY'].map((tab) => (
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
            {filteredEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No events</Text>
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
  emptyState: { paddingVertical: spacing.xxl, justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { color: colors.textDim, fontSize: 12 },
});

export default MapHomeScreen;
