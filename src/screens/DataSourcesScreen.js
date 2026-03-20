import React from 'react';
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

function groupSourcesByCategory(sources) {
  const groups = {};
  sources.forEach((source) => {
    const category = (source.category || source.group || 'OTHER').toUpperCase();
    if (!groups[category]) groups[category] = [];
    groups[category].push({
      name: source.name || source.source_name || 'Unknown',
      status: source.status || 'Unknown',
      lastUpdated: source.last_update || source.lastUpdate || 'N/A',
    });
  });
  return groups;
}

const DataSourcesScreen = ({ navigation }) => {
  const { sources: liveSources, loading, error } = useDataSources();
  const dataSources = groupSourcesByCategory(liveSources);
  const categoryCount = Object.keys(dataSources).length;
  const activeCount = Object.values(dataSources).reduce(
    (total, feeds) => total + feeds.filter((feed) => feed.status === 'Active').length,
    0
  );

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
          {activeCount} Active Feeds · {categoryCount} Source Groups
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading && <ActivityIndicator color={colors.blue} style={styles.loadingIndicator} />}

        {!loading && error && (
          <EmptyState
            title="Unable to load data sources"
            subtitle="The backend did not return a live source list."
          />
        )}

        {!loading && !error && categoryCount === 0 && (
          <EmptyState
            title="No live data sources"
            subtitle="The API returned an empty source list."
          />
        )}

        {!loading && !error && Object.entries(dataSources).map(([category, feeds]) => (
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

const EmptyState = ({ title, subtitle }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
  </View>
);

const FeedRow = ({ name, status, lastUpdated, statusColor }) => (
  <View style={styles.feedRow}>
    <View style={styles.feedInfo}>
      <View style={styles.feedNameRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
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
  loadingIndicator: {
    paddingVertical: spacing.xl,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: colors.textSec,
    textAlign: 'center',
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
