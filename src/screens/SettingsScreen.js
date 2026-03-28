import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, spacing } from '../theme';
import { AppContext } from '../../App';
import { PRODUCT_CONFIGS, getProductConfig } from '../lib/products';
import { useAOIs } from '../hooks/useEvents';
import {
  addAOI,
  deleteAOI,
  fetchNotificationPreferences,
  setPrimaryAOI,
  updateAOI,
  updateNotificationPreferences,
  updateUserProfile,
} from '../lib/api';
import { mergeStoredSettingsPreferences } from '../lib/settingsPreferences';
import { setCurrentDataPreferences } from '../lib/dataPreferences';
import { clearOfflineDataset } from '../lib/offlineCache';
import { getLocationMetadata } from '../lib/locality';
import { AOI_PRESETS } from '../lib/aoiPresets';

const MAP_TYPE_OPTIONS = ['2D', '3D', 'Satellite'];
const REFRESH_INTERVAL_OPTIONS = ['30s', '1m', '5m', '15m'];

function formatAoiName(aoi) {
  return aoi?.name || aoi?.city || aoi?.location_name || aoi?.location || 'Unnamed AOI';
}

function parseCoordinateInput(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasValidCoordinates(lat, lng) {
  return (
    lat !== null
    && lng !== null
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180
  );
}

const SettingsScreen = ({ navigation }) => {
  const { userConfig, setUserConfig } = useContext(AppContext);
  const productConfig = getProductConfig(userConfig?.product);
  const plans = Object.values(PRODUCT_CONFIGS);
  const { aois, loading: aoisLoading, refresh: refreshAois } = useAOIs();
  const notifications = useMemo(
    () => userConfig?.pushNotifications ?? userConfig?.preferences?.push_notifications ?? true,
    [userConfig?.preferences?.push_notifications, userConfig?.pushNotifications]
  );
  const criticalOnly = useMemo(
    () => Boolean(userConfig?.criticalOnly),
    [userConfig?.criticalOnly]
  );
  const soundVibration = useMemo(
    () => userConfig?.soundVibration ?? userConfig?.preferences?.sound_vibration ?? true,
    [userConfig?.preferences?.sound_vibration, userConfig?.soundVibration]
  );
  const showMarkers = useMemo(
    () => userConfig?.showEventMarkers ?? userConfig?.preferences?.show_event_markers ?? true,
    [userConfig?.preferences?.show_event_markers, userConfig?.showEventMarkers]
  );
  const showRiskZones = useMemo(
    () => userConfig?.showRiskZones ?? userConfig?.preferences?.show_risk_zones ?? true,
    [userConfig?.preferences?.show_risk_zones, userConfig?.showRiskZones]
  );
  const defaultMapType = useMemo(() => {
    const configuredMapType = userConfig?.defaultMapType ?? userConfig?.preferences?.default_map_type ?? '2D';
    return MAP_TYPE_OPTIONS.includes(configuredMapType) ? configuredMapType : '2D';
  }, [userConfig?.defaultMapType, userConfig?.preferences?.default_map_type]);
  const configuredRefreshInterval = useMemo(() => {
    const savedRefreshInterval = userConfig?.refreshInterval ?? userConfig?.preferences?.refresh_interval ?? '1m';
    return REFRESH_INTERVAL_OPTIONS.includes(savedRefreshInterval) ? savedRefreshInterval : '1m';
  }, [userConfig?.preferences?.refresh_interval, userConfig?.refreshInterval]);
  const configuredOfflineCache = useMemo(
    () => Boolean(userConfig?.offlineCache ?? userConfig?.preferences?.offline_cache ?? true),
    [userConfig?.offlineCache, userConfig?.preferences?.offline_cache]
  );
  const configuredDataSaverMode = useMemo(
    () => Boolean(userConfig?.dataSaverMode ?? userConfig?.preferences?.data_saver_mode ?? false),
    [userConfig?.dataSaverMode, userConfig?.preferences?.data_saver_mode]
  );

  const [emailDigest, setEmailDigest] = useState(false);
  const [highResImagery, setHighResImagery] = useState(false);
  const [offlineCache, setOfflineCache] = useState(configuredOfflineCache);
  const [dataSaverMode, setDataSaverMode] = useState(configuredDataSaverMode);
  const [darkMode, setDarkMode] = useState(true);
  const [mapType, setMapType] = useState(defaultMapType);
  const [refreshInterval, setRefreshInterval] = useState(configuredRefreshInterval);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(null);
  const [aoiLocationInput, setAoiLocationInput] = useState('');
  const [aoiLatInput, setAoiLatInput] = useState('');
  const [aoiLngInput, setAoiLngInput] = useState('');
  const [aoiRadiusInput, setAoiRadiusInput] = useState('500');
  const [aoiBusyId, setAoiBusyId] = useState(null);
  const [addingAoi, setAddingAoi] = useState(false);

  useEffect(() => {
    setMapType(defaultMapType);
  }, [defaultMapType]);

  useEffect(() => {
    setRefreshInterval(configuredRefreshInterval);
  }, [configuredRefreshInterval]);

  useEffect(() => {
    setOfflineCache(configuredOfflineCache);
  }, [configuredOfflineCache]);

  useEffect(() => {
    setDataSaverMode(configuredDataSaverMode);
  }, [configuredDataSaverMode]);

  useEffect(() => {
    let cancelled = false;

    fetchNotificationPreferences()
      .then((prefs) => {
        if (cancelled) {
          return;
        }
        setNotificationPrefs(prefs || {});
        setEmailDigest(Boolean(prefs?.email));
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[Settings] Notification preference fetch failed:', err.message);
          setNotificationPrefs(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPrefsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const syncUserConfigPreferences = (patch, topLevelPatch = {}) => {
    setUserConfig((prev) => ({
      ...(prev || {}),
      ...topLevelPatch,
      preferences: {
        ...(prev?.preferences || {}),
        ...patch,
      },
    }));
  };

  const persistLocalPreferencePatch = async (patch, topLevelPatch = {}) => {
    syncUserConfigPreferences(patch, topLevelPatch);
    await mergeStoredSettingsPreferences(patch).catch((err) => {
      console.warn('[Settings] Local preference persist failed:', err.message);
    });
    await updateUserProfile({ preferences: patch }).catch((err) => {
      console.warn('[Settings] Profile preference persist failed:', err.message);
    });
  };

  const persistServerNotificationPrefs = async (patch, localPatch = {}, topLevelPatch = {}) => {
    setSavingPrefs(true);
    try {
      const nextPrefs = await updateNotificationPreferences(patch);
      setNotificationPrefs(nextPrefs || {});
      await persistLocalPreferencePatch(localPatch, topLevelPatch);
      return nextPrefs;
    } catch (err) {
      Alert.alert('Unable to save', err?.message || 'Notification settings could not be updated.');
      throw err;
    } finally {
      setSavingPrefs(false);
    }
  };

  const handlePlanChange = (planId) => {
    setUserConfig((prev) => ({
      ...(prev || {}),
      product: planId,
    }));
  };

  const handlePushNotificationsToggle = async (value) => {
    await persistServerNotificationPrefs(
      { push: value },
      { push_notifications: value },
      { pushNotifications: value }
    ).catch(() => {});
  };

  const handleCriticalOnlyToggle = async (value) => {
    await persistServerNotificationPrefs(
      { min_severity: value ? 'high' : 'monitoring' },
      { critical_only: value },
      { criticalOnly: value }
    ).catch(() => {});
  };

  const handleSoundVibrationToggle = async (value) => {
    await persistServerNotificationPrefs(
      { alert_sound: value },
      { sound_vibration: value },
      { soundVibration: value }
    ).catch(() => {});
  };

  const handleEmailDigestToggle = async (value) => {
    setEmailDigest(value);
    await persistServerNotificationPrefs({ email: value }).catch(() => {
      setEmailDigest(!value);
    });
  };

  const handlePreferenceToggle = (key, storageKey, value) => {
    persistLocalPreferencePatch({ [storageKey]: value }, { [key]: value });
  };

  const handleMapTypeChange = (value) => {
    setMapType(value);
    persistLocalPreferencePatch(
      { default_map_type: value },
      { defaultMapType: value }
    );
  };

  const handleRefreshIntervalChange = (value) => {
    setRefreshInterval(value);
    persistLocalPreferencePatch(
      { refresh_interval: value },
      { refreshInterval: value }
    );
  };

  const handleOfflineCacheToggle = (value) => {
    setOfflineCache(value);
    setCurrentDataPreferences({
      offline_cache: value,
      data_saver_mode: dataSaverMode,
    });
    persistLocalPreferencePatch(
      { offline_cache: value },
      { offlineCache: value }
    );
    if (!value) {
      clearOfflineDataset('myEvents').catch(() => {});
      clearOfflineDataset('worldEvents').catch(() => {});
    }
  };

  const handleDataSaverModeToggle = (value) => {
    setDataSaverMode(value);
    setCurrentDataPreferences({
      offline_cache: offlineCache,
      data_saver_mode: value,
    });
    persistLocalPreferencePatch(
      { data_saver_mode: value },
      { dataSaverMode: value }
    );
  };

  const syncAoisIntoUserConfig = (nextAois) => {
    const names = nextAois.map((aoi) => formatAoiName(aoi)).filter(Boolean);
    const primaryAoi = nextAois.find((aoi) => aoi?.is_primary) || nextAois[0] || null;

    setUserConfig((prev) => ({
      ...(prev || {}),
      aois: names,
      location: primaryAoi ? formatAoiName(primaryAoi) : prev?.location,
      radius: primaryAoi?.radius_km ?? prev?.radius ?? 0,
    }));
  };

  const handleRefreshAois = async () => {
    const refreshed = await refreshAois();
    if (Array.isArray(refreshed?.aois)) {
      syncAoisIntoUserConfig(refreshed.aois);
    } else {
      syncAoisIntoUserConfig(aois);
    }
  };

  const handleSetPrimary = async (aoiId) => {
    setAoiBusyId(aoiId);
    try {
      await setPrimaryAOI(aoiId);
      await handleRefreshAois();
    } catch (err) {
      Alert.alert('Unable to set primary AOI', err?.message || 'Please try again.');
    } finally {
      setAoiBusyId(null);
    }
  };

  const handleAdjustRadius = async (aoi, delta) => {
    const nextRadius = Math.max(10, Number(aoi?.radius_km || 0) + delta);
    setAoiBusyId(aoi.id);
    try {
      await updateAOI(aoi.id, { radius_km: nextRadius });
      await handleRefreshAois();
    } catch (err) {
      Alert.alert('Unable to update AOI', err?.message || 'Please try again.');
    } finally {
      setAoiBusyId(null);
    }
  };

  const handleDeleteAoi = (aoi) => {
    Alert.alert(
      'Delete AOI',
      `Remove ${formatAoiName(aoi)} from your monitored areas?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setAoiBusyId(aoi.id);
            try {
              await deleteAOI(aoi.id);
              await handleRefreshAois();
            } catch (err) {
              Alert.alert('Unable to delete AOI', err?.message || 'Please try again.');
            } finally {
              setAoiBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleAddAoi = async () => {
    const location = aoiLocationInput.trim();
    const lat = parseCoordinateInput(aoiLatInput);
    const lng = parseCoordinateInput(aoiLngInput);
    const radiusKm = Math.max(10, Number(aoiRadiusInput) || 0);
    const metadata = getLocationMetadata(location);

    if (!location || lat === null || lng === null) {
      Alert.alert('Coordinates required', 'Enter an AOI name plus latitude and longitude values before saving.');
      return;
    }

    if (!hasValidCoordinates(lat, lng)) {
      Alert.alert('Coordinates invalid', 'Latitude must be between -90 and 90, and longitude must be between -180 and 180.');
      return;
    }

    setAddingAoi(true);
    try {
      await addAOI({
        name: location,
        city: metadata.city || location,
        country_code: metadata.country_code || '',
        lat,
        lng,
        radius_km: radiusKm,
        is_primary: aois.length === 0,
        boundary_geojson: null,
      });
      setAoiLocationInput('');
      setAoiLatInput('');
      setAoiLngInput('');
      setAoiRadiusInput('500');
      await handleRefreshAois();
    } catch (err) {
      Alert.alert('Unable to add AOI', err?.message || 'Please try again.');
    } finally {
      setAddingAoi(false);
    }
  };

  const applyPresetAoi = (preset) => {
    setAoiLocationInput(preset.name);
    setAoiLatInput(String(preset.lat));
    setAoiLngInput(String(preset.lng));
  };

  const notificationSummary = notificationPrefs
    ? `Min severity ${notificationPrefs.min_severity || 'monitoring'} · Push ${notificationPrefs.push ? 'on' : 'off'} · Email ${notificationPrefs.email ? 'on' : 'off'}`
    : 'Notification settings are using local defaults.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
          {(prefsLoading || savingPrefs) && (
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={colors.blue} size="small" />
              <Text style={styles.inlineStatusText}>
                {prefsLoading ? 'Loading server preferences…' : 'Saving preferences…'}
              </Text>
            </View>
          )}
          {!prefsLoading && <Text style={styles.sectionNote}>{notificationSummary}</Text>}
          <SettingRow label="Push Notifications" value={notifications} onToggle={handlePushNotificationsToggle} />
          <SettingRow label="Critical Alerts Only" value={criticalOnly} onToggle={handleCriticalOnlyToggle} />
          <SettingRow label="Sound & Vibration" value={soundVibration} onToggle={handleSoundVibrationToggle} />
          <SettingRow label="Email Digest" value={emailDigest} onToggle={handleEmailDigestToggle} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>MAP & LAYERS</Text>
          <SelectorRow
            label="Default Map Type"
            value={mapType}
            options={MAP_TYPE_OPTIONS}
            onSelect={handleMapTypeChange}
          />
          <SettingRow label="Show Event Markers" value={showMarkers} onToggle={(value) => handlePreferenceToggle('showEventMarkers', 'show_event_markers', value)} />
          <SettingRow label="Show Risk Zones" value={showRiskZones} onToggle={(value) => handlePreferenceToggle('showRiskZones', 'show_risk_zones', value)} />
          <SelectorRow
            label="Auto-Refresh Interval"
            value={refreshInterval}
            options={REFRESH_INTERVAL_OPTIONS}
            onSelect={handleRefreshIntervalChange}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA PREFERENCES</Text>
          <SettingRow
            label="High-Res Imagery"
            value={highResImagery}
            onToggle={setHighResImagery}
            subtitle="Uses more data"
          />
          <SettingRow
            label="Offline Cache"
            value={offlineCache}
            onToggle={handleOfflineCacheToggle}
            subtitle="Keeps recent event feeds available when the network drops"
          />
          <SettingRow
            label="Data Saver Mode"
            value={dataSaverMode}
            onToggle={handleDataSaverModeToggle}
            subtitle="Uses cached feeds and reduces automatic refreshes"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>APPEARANCE</Text>
          <SettingRow label="Dark Mode" value={darkMode} onToggle={setDarkMode} disabled />
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Language</Text>
            </View>
            <Text style={styles.settingValue}>English</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUBSCRIPTION</Text>
          <View style={styles.planCard}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Current Plan</Text>
              <Text style={styles.subtitle}>{productConfig.label} · Select a different plan below</Text>
            </View>
            <View style={styles.planOptions}>
              {plans.map((plan) => {
                const isActive = plan.id === productConfig.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planPill,
                      { borderColor: plan.accent },
                      isActive && { backgroundColor: `${plan.accent}18` },
                    ]}
                    onPress={() => handlePlanChange(plan.id)}
                    disabled={isActive}
                  >
                    <Text
                      style={[
                        styles.planPillText,
                        { color: isActive ? plan.accent : colors.textSec },
                      ]}
                    >
                      {plan.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.planDetailRow}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.planDetailText}>Open plan details</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AREAS OF INTEREST</Text>
          <View style={styles.planCard}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Manage AOIs</Text>
              <Text style={styles.subtitle}>Backed by `/api/users/me/aois`. New AOIs require explicit coordinates instead of client-only preset cities.</Text>
            </View>

            <View style={styles.aoiComposer}>
              <TextInput
                value={aoiLocationInput}
                onChangeText={setAoiLocationInput}
                placeholder="AOI name"
                placeholderTextColor={colors.textDim}
                style={styles.aoiInput}
              />
              <TextInput
                value={aoiLatInput}
                onChangeText={setAoiLatInput}
                placeholder="Latitude"
                placeholderTextColor={colors.textDim}
                style={[styles.aoiInput, styles.aoiCoordinateInput]}
                keyboardType="numeric"
              />
              <TextInput
                value={aoiLngInput}
                onChangeText={setAoiLngInput}
                placeholder="Longitude"
                placeholderTextColor={colors.textDim}
                style={[styles.aoiInput, styles.aoiCoordinateInput]}
                keyboardType="numeric"
              />
              <TextInput
                value={aoiRadiusInput}
                onChangeText={setAoiRadiusInput}
                placeholder="Radius km"
                placeholderTextColor={colors.textDim}
                style={[styles.aoiInput, styles.aoiRadiusInput]}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[styles.aoiAddButton, addingAoi && styles.aoiActionDisabled]}
                onPress={handleAddAoi}
                disabled={addingAoi}
              >
                <Text style={styles.aoiAddButtonText}>{addingAoi ? 'ADDING' : 'ADD'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Quick presets autofill the fields only. Backend AOI data remains the source of truth.</Text>
            <View style={styles.presetRow}>
              {AOI_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={styles.presetChip}
                  onPress={() => applyPresetAoi(preset)}
                >
                  <Text style={styles.presetChipText}>{preset.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {aoisLoading ? (
              <ActivityIndicator color={colors.blue} style={styles.loadingIndicator} />
            ) : aois.length > 0 ? (
              <View style={styles.aoiList}>
                {aois.map((aoi) => {
                  const busy = aoiBusyId === aoi.id;
                  return (
                    <View key={aoi.id} style={styles.aoiCard}>
                      <View style={styles.aoiCardHeader}>
                        <View>
                          <Text style={styles.aoiName}>{formatAoiName(aoi)}</Text>
                          <Text style={styles.aoiMeta}>
                            {(aoi?.country_code || '').toUpperCase() || 'N/A'} · {Number(aoi?.radius_km || 0)} km
                          </Text>
                        </View>
                        {aoi?.is_primary ? (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.aoiActions}>
                        <TouchableOpacity
                          style={styles.aoiAction}
                          disabled={busy}
                          onPress={() => handleAdjustRadius(aoi, -50)}
                        >
                          <Text style={styles.aoiActionText}>-50km</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.aoiAction}
                          disabled={busy}
                          onPress={() => handleAdjustRadius(aoi, 50)}
                        >
                          <Text style={styles.aoiActionText}>+50km</Text>
                        </TouchableOpacity>
                        {!aoi?.is_primary && (
                          <TouchableOpacity
                            style={styles.aoiAction}
                            disabled={busy}
                            onPress={() => handleSetPrimary(aoi.id)}
                          >
                            <Text style={styles.aoiActionText}>Set primary</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.aoiAction, styles.aoiDeleteAction]}
                          disabled={busy}
                          onPress={() => handleDeleteAoi(aoi)}
                        >
                          <Text style={[styles.aoiActionText, styles.aoiDeleteActionText]}>
                            {busy ? 'Working…' : 'Delete'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.subtitle}>No AOIs are configured on this account.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA SOURCES</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('DataSources')}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Manage Data Feeds</Text>
              <Text style={styles.subtitle}>Open the live backend datasource inventory.</Text>
            </View>
            <View style={styles.sourcesStatus}>
              <View style={styles.sourcesStatusDot} />
              <Text style={styles.sourcesStatusText}>Live</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ABOUT</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>App Version</Text>
            <Text style={styles.settingValue}>LEONA v1.2.0</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Build</Text>
            <Text style={styles.settingValue}>3</Text>
          </View>
          <ChevronRow label="Terms of Service" />
          <ChevronRow label="Privacy Policy" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const SettingRow = ({ label, value, onToggle, subtitle, disabled = false }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLabel}>
      <Text style={styles.settingText}>{label}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: colors.panel, true: colors.purple }}
      thumbColor={colors.white}
      disabled={disabled}
      style={styles.switch}
    />
  </View>
);

const SelectorRow = ({ label, value, options, onSelect }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingText}>{label}</Text>
    <View style={styles.selectorContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.selectorButton, value === option && styles.selectorButtonActive]}
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.selectorButtonText, value === option && styles.selectorButtonTextActive]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const ChevronRow = ({ label }) => (
  <TouchableOpacity style={styles.settingRow}>
    <Text style={styles.settingText}>{label}</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

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
  sectionNote: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inlineStatusText: {
    color: colors.textSec,
    fontSize: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
  settingValue: {
    fontSize: 16,
    color: colors.textSec,
    marginLeft: spacing.md,
  },
  switch: {
    marginLeft: spacing.md,
  },
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  selectorButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  selectorButtonActive: {
    borderColor: colors.blue,
    backgroundColor: `${colors.blue}15`,
  },
  selectorButtonText: {
    color: colors.textSec,
    fontSize: 12,
    fontWeight: '600',
  },
  selectorButtonTextActive: {
    color: colors.blue,
  },
  chevron: {
    color: colors.textDim,
    fontSize: 18,
    marginLeft: spacing.md,
  },
  sourcesStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sourcesStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.safe,
  },
  sourcesStatusText: {
    color: colors.safe,
    fontSize: 12,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  planOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  planPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 999,
    backgroundColor: colors.bg,
  },
  planPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  planDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  planDetailText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '600',
  },
  aoiComposer: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  aoiInput: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  aoiRadiusInput: {
    flexGrow: 0,
    width: 96,
  },
  aoiCoordinateInput: {
    flexGrow: 0,
    width: 110,
  },
  aoiAddButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.blue,
  },
  aoiActionDisabled: {
    opacity: 0.6,
  },
  aoiAddButtonText: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aoiList: {
    gap: spacing.md,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presetChipText: {
    color: colors.textSec,
    fontSize: 12,
    fontWeight: '600',
  },
  aoiCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  aoiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  aoiName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  aoiMeta: {
    color: colors.textSec,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  primaryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: `${colors.blue}20`,
    borderWidth: 1,
    borderColor: `${colors.blue}55`,
    alignSelf: 'flex-start',
  },
  primaryBadgeText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '700',
  },
  aoiActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aoiAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.panel,
  },
  aoiActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  aoiDeleteAction: {
    borderColor: 'rgba(244,67,54,0.35)',
    backgroundColor: 'rgba(244,67,54,0.12)',
  },
  aoiDeleteActionText: {
    color: colors.critical,
  },
  loadingIndicator: {
    paddingVertical: spacing.lg,
  },
});

export default SettingsScreen;
