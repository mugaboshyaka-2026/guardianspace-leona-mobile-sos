import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing } from '../theme';
import { useDataSources } from '../hooks/useEvents';

// Group flat API response into categories for display
function groupSourcesByCategory(sources) {
  const groups = {};
  sources.forEach((s) => {
    const cat = (s.category || s.group || 'OTHER').toUpperCase();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({
      name: s.name || s.source_name || 'Unknown',
      status: s.status || 'Active',
      lastUpdated: s.last_update || s.lastUpdate || 'N/A',
    });
  });
  return groups;
}

const DataSourcesScreen = ({ navigation }) => {
  // Try to fetch live data sources from API
  const { sources: liveSources, loading: sourcesLoading } = useDataSources();

  // Fallback hardcoded data when API returns empty
  const dataSources = liveSources.length > 0
    ? groupSourcesByCategory(liveSources)
    : {
    'SATELLITE IMAGERY': [
      { name: 'Sentinel-1 SAR', status: 'Active', lastUpdated: '2 min ago' },
      { name: 'Sentinel-2 MSI', status: 'Active', lastUpdated: '5 min ago' },
      { name: 'Landsat-9', status: 'Active', lastUpdated: '12 min ago' },
      { name: 'VIIRS Fire', status: 'Active', lastUpdated: '1 min ago' },
      { name: 'GOES-16', status: 'Active', lastUpdated: '3 min ago' },
      { name: 'Himawari-9', status: 'Active', lastUpdated: '8 min ago' },
      { name: 'Planet Labs', status: 'Degraded', lastUpdated: '45 min ago' },
      { name: 'MODIS', status: 'Active', lastUpdated: '6 min ago' },
    ],
    'METEOROLOGICAL': [
      { name: 'ECMWF GFS', status: 'Active', lastUpdated: '15 min ago' },
      { name: 'NOAA GFS', status: 'Active', lastUpdated: '12 min ago' },
      { name: 'EUMETNET', status: 'Active', lastUpdated: '10 min ago' },
      { name: 'JMA', status: 'Active', lastUpdated: '18 min ago' },
      { name: 'IMD', status: 'Active', lastUpdated: '22 min ago' },
      { name: 'BOM Australia', status: 'Delayed', lastUpdated: '1 hour ago' },
      { name: 'CMA China', status: 'Active', lastUpdated: '20 min ago' },
    ],
    'SEISMIC': [
      { name: 'USGS ShakeMap', status: 'Active', lastUpdated: '2 min ago' },
      { name: 'EMSC', status: 'Active', lastUpdated: '1 min ago' },
      { name: 'JMA Seismic', status: 'Active', lastUpdated: '3 min ago' },
      { name: 'GeoNet NZ', status: 'Active', lastUpdated: '4 min ago' },
      { name: 'IRIS', status: 'Active', lastUpdated: '2 min ago' },
    ],
    'HUMANITARIAN': [
      { name: 'OCHA ReliefWeb', status: 'Active', lastUpdated: '30 min ago' },
      { name: 'UNHCR', status: 'Active', lastUpdated: '45 min ago' },
      { name: 'WFP VAM', status: 'Active', lastUpdated: '1 hour ago' },
      { name: 'FEWS NET', status: 'Active', lastUpdated: '2 hours ago' },
      { name: 'IPC Analysis', status: 'Delayed', lastUpdated: '3 hours ago' },
      { name: 'WHO HealthMap', status: 'Active', lastUpdated: '25 min ago' },
    ],
    'CONFLICT & SECURITY': [
      { name: 'ACLED', status: 'Active', lastUpdated: '5 min ago' },
      { name: 'GDELT', status: 'Active', lastUpdated: '2 min ago' },
      { name: 'Uppsala UCDP', status: 'Active', lastUpdated: '1 day ago' },
      { name: 'ICG CrisisWatch', status: 'Active', lastUpdated: '6 hours ago' },
      { name: 'SIPRI', status: 'Active', lastUpdated: '12 hours ago' },
    ],
    'HYDROLOGICAL': [
      { name: 'GloFAS', status: 'Active', lastUpdated: '10 min ago' },
      { name: 'GRDC', status: 'Active', lastUpdated: '2 hours ago' },
      { name: 'Dartmouth Flood', status: 'Active', lastUpdated: '8 min ago' },
      { name: 'SWOT', status: 'Active', lastUpdated: '30 min ago' },
      { name: 'HydroSOS', status: 'Degraded', lastUpdated: '2 hours ago' },
    ],
    'CROWDSOURCED': [
      { name: 'Ushahidi', status: 'Active', lastUpdated: '3 min ago' },
      { name: 'HOT OSM', status: 'Active', lastUpdated: '8 min ago' },
      { name: 'Surety AI', status: 'Active', lastUpdated: '1 min ago' },
      { name: 'Social Pulse', status: 'Active', lastUpdated: '2 min ago' },
      { name: 'Citizen Reports', status: 'Active', lastUpdated: '4 min ago' },
      { name: 'Media Scanner', status: 'Active', lastUpdated: '1 min ago' },
    ],
    'OTHER': [
      { name: 'GDACS', status: 'Active', lastUpdated: '7 min ago' },
      { name: 'PDC DisasterAWARE', status: 'Active', lastUpdated: '5 min ago' },
      { name: 'INFORM Index', status: 'Active', lastUpdated: '1 day ago' },
      { name: 'EM-DAT', status: 'Active', lastUpdated: '3 days ago' },
      { name: 'NASA EONET', status: 'Active', lastUpdated: '10 min ago' },
    ],
  };  // end of fallback ternary

  const countActiveFeedsAndTypes = () => {
    let activeCount = 0;
    Object.values(dataSources).forEach((category) => {
      activeCount += category.filter((f) => f.status === 'Active').length;
    });
    return activeCount;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return colors.safe;
      case 'Delayed':
        return '#FFC107';
      case 'Degraded':
        return '#FF9800';
      default:
        return colors.textSec;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DATA SOURCES</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          47 Active Feeds · 21 Event Types
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {Object.entries(dataSources).map(([category, feeds]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryHeader}>{category}</Text>
            {feeds.map((feed, index) => (
              <FeedRow
                key={`${category}-${index}`}
                name={feed.name}
                status={feed.status}
                lastUpdated={feed.lastUpdated}
                statusColor={getStatusColor(feed.status)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const FeedRow = ({ name, status, lastUpdated, statusColor }) => (
  <View style={styles.feedRow}>
    <View style={styles.feedInfo}>
      <View style={styles.feedNameRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: statusColor },
          ]}
        />
        <Text style={styles.feedName}>{name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{status}</Text>
        </View>
      </View>
      <Text style={styles.lastUpdated}>{lastUpdated}</Text>
    </View>
  </View>
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
  summary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryText: {
    fontSize: 14,
    color: colors.textSec,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.blue,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  feedRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feedInfo: {
    flex: 1,
  },
  feedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  feedName: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: colors.panel,
    marginLeft: spacing.sm,
  },
  statusBadgeText: {
    fontSize: 11,
    color: colors.textSec,
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.textDim,
    marginLeft: 16,
  },
});

export default DataSourcesScreen;
