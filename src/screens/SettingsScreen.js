import React, { useState } from 'react';
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

const SettingsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [soundVibration, setSoundVibration] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [highResImagery, setHighResImagery] = useState(false);
  const [offlineCache, setOfflineCache] = useState(true);
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [mapType, setMapType] = useState('2D');
  const [refreshInterval, setRefreshInterval] = useState('1m');

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
        {/* NOTIFICATIONS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
          <SettingRow
            label="Push Notifications"
            value={notifications}
            onToggle={setNotifications}
          />
          <SettingRow
            label="Critical Alerts Only"
            value={criticalOnly}
            onToggle={setCriticalOnly}
          />
          <SettingRow
            label="Sound & Vibration"
            value={soundVibration}
            onToggle={setSoundVibration}
          />
          <SettingRow
            label="Email Digest"
            value={emailDigest}
            onToggle={setEmailDigest}
          />
        </View>

        {/* MAP & LAYERS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>MAP & LAYERS</Text>
          <SelectorRow
            label="Default Map Type"
            value={mapType}
            options={['2D', '3D', 'Satellite']}
            onSelect={setMapType}
          />
          <SettingRow
            label="Show Event Markers"
            value={showMarkers}
            onToggle={setShowMarkers}
          />
          <SettingRow
            label="Show Risk Zones"
            value={showRiskZones}
            onToggle={setShowRiskZones}
          />
          <SelectorRow
            label="Auto-Refresh Interval"
            value={refreshInterval}
            options={['30s', '1m', '5m', '15m']}
            onSelect={setRefreshInterval}
          />
        </View>

        {/* DATA PREFERENCES Section */}
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
            onToggle={setOfflineCache}
          />
          <SettingRow
            label="Data Saver Mode"
            value={dataSaverMode}
            onToggle={setDataSaverMode}
          />
        </View>

        {/* APPEARANCE Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>APPEARANCE</Text>
          <SettingRow
            label="Dark Mode"
            value={darkMode}
            onToggle={setDarkMode}
            disabled={true}
          />
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Language</Text>
            </View>
            <Text style={styles.settingValue}>English</Text>
          </View>
        </View>

        {/* DATA SOURCES Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA SOURCES</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('DataSources')}
          >
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

        {/* ABOUT Section */}
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

const SettingRow = ({
  label,
  value,
  onToggle,
  subtitle,
  disabled = false,
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLabel}>
      <Text style={styles.settingText}>{label}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{
        false: colors.panel,
        true: colors.purple,
      }}
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
          style={[
            styles.selectorButton,
            value === option && styles.selectorButtonActive,
          ]}
          onPress={() => onSelect(option)}
        >
          <Text
            style={[
              styles.selectorButtonText,
              value === option && styles.selectorButtonTextActive,
            ]}
          >
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
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  selectorButtonActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  selectorButtonText: {
    fontSize: 12,
    color: colors.textSec,
    fontWeight: '500',
  },
  selectorButtonTextActive: {
    color: colors.white,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSec,
    marginLeft: spacing.md,
  },
  sourcesStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sourcesStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00E676',
  },
  sourcesStatusText: {
    fontSize: 13,
    color: '#00E676',
    fontWeight: '600',
  },
});

export default SettingsScreen;
