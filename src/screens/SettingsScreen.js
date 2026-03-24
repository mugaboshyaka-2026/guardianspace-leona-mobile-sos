import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors, spacing } from '../theme';
import { AppContext } from '../../App';
import { PRODUCT_CONFIGS, getProductConfig } from '../lib/products';
import { useAOIs } from '../hooks/useEvents';
import { updateUserProfile } from '../lib/api';
import { mergeStoredSettingsPreferences } from '../lib/settingsPreferences';

const MAP_TYPE_OPTIONS = ['2D', '3D', 'Satellite'];

const SettingsScreen = ({ navigation }) => {
  const { userConfig, setUserConfig } = useContext(AppContext);
  const productConfig = getProductConfig(userConfig?.product);
  const plans = Object.values(PRODUCT_CONFIGS);
  const { aois } = useAOIs();
  const currentAois = aois.map((aoi) => ({
    id: aoi?.id,
    name: aoi?.name || aoi?.location_name || aoi?.location || String(aoi),
  })).filter((aoi) => aoi.name);
  const notifications = useMemo(() => (
    userConfig?.pushNotifications ?? userConfig?.preferences?.push_notifications ?? true
  ), [userConfig?.preferences?.push_notifications, userConfig?.pushNotifications]);
  const criticalOnly = useMemo(() => Boolean(userConfig?.criticalOnly), [userConfig?.criticalOnly]);
  const soundVibration = useMemo(() => (
    userConfig?.soundVibration ?? userConfig?.preferences?.sound_vibration ?? true
  ), [userConfig?.preferences?.sound_vibration, userConfig?.soundVibration]);
  const showMarkers = useMemo(() => (
    userConfig?.showEventMarkers ?? userConfig?.preferences?.show_event_markers ?? true
  ), [userConfig?.preferences?.show_event_markers, userConfig?.showEventMarkers]);
  const showRiskZones = useMemo(() => (
    userConfig?.showRiskZones ?? userConfig?.preferences?.show_risk_zones ?? true
  ), [userConfig?.preferences?.show_risk_zones, userConfig?.showRiskZones]);
  const defaultMapType = useMemo(() => {
    const configuredMapType = userConfig?.defaultMapType ?? userConfig?.preferences?.default_map_type ?? '2D';
    return MAP_TYPE_OPTIONS.includes(configuredMapType) ? configuredMapType : '2D';
  }, [userConfig?.defaultMapType, userConfig?.preferences?.default_map_type]);

  const [emailDigest, setEmailDigest] = useState(false);
  const [highResImagery, setHighResImagery] = useState(false);
  const [offlineCache, setOfflineCache] = useState(true);
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [mapType, setMapType] = useState(defaultMapType);
  const [refreshInterval, setRefreshInterval] = useState('1m');

  useEffect(() => {
    setMapType(defaultMapType);
  }, [defaultMapType]);

  const handlePlanChange = (planId) => {
    setUserConfig((prev) => ({
      ...(prev || {}),
      product: planId,
    }));
  };

  const persistNotificationPreferences = async (patch) => {
    await mergeStoredSettingsPreferences(patch).catch((err) => {
      console.warn('[Settings] Local preference persist failed:', err.message);
    });
    await updateUserProfile({ preferences: patch }).catch((err) => {
      console.warn('[Settings] Profile preference persist failed:', err.message);
    });
  };

  const handleNotificationToggle = (key, storageKey, value) => {
    setUserConfig((prev) => ({
      ...(prev || {}),
      [key]: value,
      preferences: {
        ...(prev?.preferences || {}),
        [storageKey]: value,
      },
    }));
    persistNotificationPreferences({ [storageKey]: value });
  };

  const handlePushNotificationsToggle = (value) => {
    handleNotificationToggle('pushNotifications', 'push_notifications', value);
  };

  const handleCriticalOnlyToggle = (value) => {
    handleNotificationToggle('criticalOnly', 'critical_only', value);
  };

  const handleSoundVibrationToggle = (value) => {
    handleNotificationToggle('soundVibration', 'sound_vibration', value);
  };

  const handleShowMarkersToggle = (value) => {
    handleNotificationToggle('showEventMarkers', 'show_event_markers', value);
  };

  const handleShowRiskZonesToggle = (value) => {
    handleNotificationToggle('showRiskZones', 'show_risk_zones', value);
  };

  const handleMapTypeChange = (value) => {
    setMapType(value);
    setUserConfig((prev) => ({
      ...(prev || {}),
      defaultMapType: value,
      preferences: {
        ...(prev?.preferences || {}),
        default_map_type: value,
      },
    }));
    persistNotificationPreferences({ default_map_type: value });
  };

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
          <SettingRow label="Push Notifications" value={notifications} onToggle={handlePushNotificationsToggle} />
          <SettingRow label="Critical Alerts Only" value={criticalOnly} onToggle={handleCriticalOnlyToggle} />
          <SettingRow label="Sound & Vibration" value={soundVibration} onToggle={handleSoundVibrationToggle} />
          <SettingRow label="Email Digest" value={emailDigest} onToggle={setEmailDigest} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>MAP & LAYERS</Text>
          <SelectorRow
            label="Default Map Type"
            value={mapType}
            options={MAP_TYPE_OPTIONS}
            onSelect={handleMapTypeChange}
          />
          <SettingRow label="Show Event Markers" value={showMarkers} onToggle={handleShowMarkersToggle} />
          <SettingRow label="Show Risk Zones" value={showRiskZones} onToggle={handleShowRiskZonesToggle} />
          <SelectorRow
            label="Auto-Refresh Interval"
            value={refreshInterval}
            options={['30s', '1m', '5m', '15m']}
            onSelect={setRefreshInterval}
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
          <SettingRow label="Offline Cache" value={offlineCache} onToggle={setOfflineCache} />
          <SettingRow label="Data Saver Mode" value={dataSaverMode} onToggle={setDataSaverMode} />
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
              <Text style={styles.settingText}>Current AOIs</Text>
              <Text style={styles.subtitle}>
                AOI editing is not available in Settings right now. Use this list to review what is active.
              </Text>
            </View>
            <View style={styles.planOptions}>
              {currentAois.length > 0 ? (
                currentAois.map((aoi, idx) => (
                  <View key={`${aoi.name}-${idx}`} style={[styles.planPill, { borderColor: colors.blue }]}>
                    <Text style={[styles.planPillText, { color: colors.blue }]}>{aoi.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.subtitle}>No AOIs are configured on this account.</Text>
              )}
            </View>
            <View style={styles.aoiHelpBox}>
              <Text style={styles.aoiHelpTitle}>AOI changes</Text>
              <Text style={styles.aoiHelpText}>
                AOI add and remove actions have been disabled in Settings. Use the setup flow to change active areas of interest.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA SOURCES</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('DataSources')}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Manage Data Feeds</Text>
              <Text style={styles.subtitle}>47 active feeds · 21 event types</Text>
            </View>
            <View style={styles.sourcesStatus}>
              <View style={styles.sourcesStatusDot} />
              <Text style={styles.sourcesStatusText}>Live</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Satellite Imagery</Text>
              <Text style={styles.subtitle}>8 feeds · Sentinel, GOES, VIIRS, Planet</Text>
            </View>
            <Text style={styles.settingValue}>Active</Text>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Meteorological</Text>
              <Text style={styles.subtitle}>7 feeds · ECMWF, NOAA, JMA, BOM</Text>
            </View>
            <Text style={styles.settingValue}>Active</Text>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Seismic</Text>
              <Text style={styles.subtitle}>5 feeds · USGS, EMSC, IRIS</Text>
            </View>
            <Text style={styles.settingValue}>Active</Text>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Humanitarian & Conflict</Text>
              <Text style={styles.subtitle}>11 feeds · OCHA, ACLED, UNHCR, WFP</Text>
            </View>
            <Text style={styles.settingValue}>Active</Text>
          </View>
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
  aoiHelpBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  aoiHelpTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  aoiHelpText: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default SettingsScreen;
