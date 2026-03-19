import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { colors, sevColors, typeIcons, spacing } from '../theme';
import { GRI_COUNTRIES } from '../data/events';
import { useMyEvents, useWorldEvents, useAOIs } from '../hooks/useEvents';
import LeonaHeader from '../components/LeonaHeader';

const BriefsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('WORLD');

  // ── Live API data ──
  const { events: myEvents } = useMyEvents();
  const { events: worldEvents } = useWorldEvents();
  const { aois } = useAOIs();
  const EVENTS = [...new Map([...myEvents, ...worldEvents].map(e => [e.id, e])).values()];
  const USER_AOIS = aois.map((a) => a.name || a);

  const tabs = [
    { label: 'WORLD BRIEF', value: 'WORLD' },
    { label: 'MY BRIEF', value: 'MY' },
    { label: 'COUNTRY RISK', value: 'COUNTRY' },
    { label: 'CHAT', value: 'CHAT' },
  ];

  const handleChatPress = () => {
    navigation.navigate('LeonaChat');
  };

  // Count events by severity
  const severityCounts = {
    critical: EVENTS.filter((e) => e.severity === 'critical').length,
    high: EVENTS.filter((e) => e.severity === 'high').length,
    elevated: EVENTS.filter((e) => e.severity === 'elevated').length,
    monitoring: EVENTS.filter((e) => e.severity === 'monitoring').length,
  };

  // Get top 4 events by severity priority
  const severityOrder = { critical: 0, high: 1, elevated: 2, monitoring: 3 };
  const topEvents = [...EVENTS].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  ).slice(0, 4);

  const renderSeverityChip = (severity, count) => {
    const severityLabel = severity.toUpperCase();
    const severityColor = sevColors[severity];
    return (
      <View
        key={severity}
        style={[styles.severityChip, { borderColor: severityColor }]}
      >
        <Text style={[styles.severityCount, { color: severityColor }]}>
          {count}
        </Text>
        <Text style={[styles.severityLabel, { color: severityColor }]}>
          {severityLabel}
        </Text>
      </View>
    );
  };

  const renderEventRow = ({ item }) => (
    <TouchableOpacity
      style={styles.eventRow}
      onPress={() => navigation.navigate('EventDetail', { event: item })}
    >
      <View style={[styles.eventIconCircle, { borderColor: sevColors[item.severity] || colors.border }]}>
        <Text style={styles.eventIcon}>{typeIcons[item.type] || '📍'}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventLocation}>{item.location}</Text>
      </View>
      <View
        style={[
          styles.severityDot,
          { backgroundColor: sevColors[item.severity] },
        ]}
      />
    </TouchableOpacity>
  );

  const getGriColor = (gri) => {
    if (gri >= 85) return sevColors.critical;
    if (gri >= 75) return sevColors.high;
    if (gri >= 60) return sevColors.elevated;
    return sevColors.monitoring;
  };

  const renderWorldBrief = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Severity Chips */}
      <View style={styles.severityGrid}>
        {renderSeverityChip('critical', severityCounts.critical)}
        {renderSeverityChip('high', severityCounts.high)}
        {renderSeverityChip('elevated', severityCounts.elevated)}
        {renderSeverityChip('monitoring', severityCounts.monitoring)}
      </View>

      {/* Top Events Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TOP EVENTS</Text>
        <FlatList
          scrollEnabled={false}
          data={topEvents}
          renderItem={renderEventRow}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => (
            <View style={styles.eventSeparator} />
          )}
        />
      </View>

      {/* Global Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>GLOBAL THREAT INDEX</Text>
        <View style={styles.threatRow}>
          <Text style={styles.threatScore}>72</Text>
          <Text style={styles.threatMax}>/100</Text>
          <View style={styles.threatTrend}>
            <Text style={styles.threatTrendText}>↑ +3</Text>
          </View>
        </View>
        <View style={styles.threatBar}>
          <View style={[styles.threatBarFill, { width: '72%' }]} />
        </View>
        <Text style={styles.summaryNarrative}>
          {EVENTS.length} active events globally. {severityCounts.critical} critical situations requiring immediate attention.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderMyBrief = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.briefContainer}>
        <View style={styles.briefHeader}>
          <View style={styles.blueBorderLeft} />
          <Text style={styles.briefTitle}>MY BRIEF</Text>
        </View>

        {/* AOI Tags */}
        <View style={styles.aoiTagsRow}>
          {USER_AOIS.map((aoi, idx) => (
            <View key={idx} style={styles.aoiTag}>
              <Text style={styles.aoiText}>📍 {aoi}</Text>
            </View>
          ))}
        </View>

        {/* Narrative */}
        <Text style={styles.narrativeText}>
          Active monitoring across your {USER_AOIS.length} Areas of Interest. Los Angeles Wildfire
          Complex (CRITICAL) has expanded to 47,200 acres with mandatory evacuations
          in 7 communities. Ukraine conflict escalation (CRITICAL) showing increased
          cross-border activity. Horn of Africa drought crisis (HIGH) affecting 22
          million people. Bangladesh flooding (HIGH) has displaced 2.1 million with
          Brahmaputra River at danger crest.
        </Text>

        {/* Quick Stats */}
        <View style={styles.briefStats}>
          <View style={styles.briefStat}>
            <Text style={[styles.briefStatNum, { color: colors.critical }]}>2</Text>
            <Text style={styles.briefStatLabel}>Critical</Text>
          </View>
          <View style={styles.briefStat}>
            <Text style={[styles.briefStatNum, { color: colors.high }]}>2</Text>
            <Text style={styles.briefStatLabel}>High</Text>
          </View>
          <View style={styles.briefStat}>
            <Text style={[styles.briefStatNum, { color: colors.blue }]}>4</Text>
            <Text style={styles.briefStatLabel}>AOIs</Text>
          </View>
        </View>

        {/* Footer Link */}
        <TouchableOpacity
          style={styles.footerLink}
          onPress={handleChatPress}
        >
          <Text style={styles.footerLinkText}>Ask LEONA for a full brief →</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderCountryRisk = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GLOBAL RISK INDEX — TOP 10</Text>
        <Text style={styles.sectionSubtitle}>Countries ranked by composite threat score</Text>
      </View>

      {GRI_COUNTRIES.map((country, idx) => {
        const griColor = getGriColor(country.gri);
        return (
          <View key={country.code} style={styles.countryRow}>
            <Text style={styles.countryRank}>{idx + 1}</Text>
            <Text style={styles.countryFlag}>{country.flag}</Text>
            <View style={styles.countryInfo}>
              <Text style={styles.countryName}>{country.name}</Text>
              <View style={styles.griBarBg}>
                <View style={[styles.griBarFill, { width: `${country.gri}%`, backgroundColor: griColor }]} />
              </View>
            </View>
            <View style={styles.countryRight}>
              <Text style={[styles.griScore, { color: griColor }]}>{country.gri}</Text>
              <Text style={[styles.countryTrend, { color: country.trend === '↑' ? colors.critical : country.trend === '↓' ? colors.safe : colors.textSec }]}>
                {country.trend}
              </Text>
            </View>
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LeonaHeader
        title="INTELLIGENCE"
        right={
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        }
      />

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.tabButton,
              activeTab === tab.value && styles.tabButtonActive,
            ]}
            onPress={() => {
              if (tab.value === 'CHAT') {
                handleChatPress();
              } else {
                setActiveTab(tab.value);
              }
            }}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.value && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.value && (
              <View style={styles.tabUnderline} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      {activeTab === 'WORLD' && renderWorldBrief()}
      {activeTab === 'MY' && renderMyBrief()}
      {activeTab === 'COUNTRY' && renderCountryRisk()}
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.safe,
  },
  liveText: {
    color: colors.safe,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabBarScroll: {
    maxHeight: 48,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  tabBarContent: {
    paddingHorizontal: spacing.lg,
  },
  tabButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    position: 'relative',
    marginRight: spacing.sm,
  },
  tabButtonActive: {},
  tabLabel: {
    color: colors.textSec,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.blue,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.blue,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  severityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  severityChip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.panel,
  },
  severityCount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  severityLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSec,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    color: colors.textDim,
    fontSize: 11,
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  eventIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventIcon: {
    fontSize: 18,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  eventLocation: {
    color: colors.textSec,
    fontSize: 12,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  summaryCardTitle: {
    color: colors.textSec,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  threatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  threatScore: {
    color: colors.high,
    fontSize: 36,
    fontWeight: '700',
  },
  threatMax: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 2,
  },
  threatTrend: {
    marginLeft: spacing.md,
    backgroundColor: `${colors.critical}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  threatTrendText: {
    color: colors.critical,
    fontSize: 11,
    fontWeight: '700',
  },
  threatBar: {
    height: 4,
    backgroundColor: colors.bg,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  threatBarFill: {
    height: 4,
    backgroundColor: colors.high,
    borderRadius: 2,
  },
  summaryNarrative: {
    color: colors.textSec,
    fontSize: 12,
    lineHeight: 18,
  },

  // My Brief
  briefContainer: {
    paddingVertical: spacing.lg,
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  blueBorderLeft: {
    width: 4,
    height: 24,
    backgroundColor: colors.blue,
    borderRadius: 2,
  },
  briefTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aoiTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  aoiTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.panel,
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: 16,
  },
  aoiText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '500',
  },
  narrativeText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  briefStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  briefStat: {
    alignItems: 'center',
    flex: 1,
  },
  briefStatNum: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  briefStatLabel: {
    color: colors.textSec,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerLink: {
    paddingVertical: spacing.md,
  },
  footerLinkText: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: '600',
  },

  // Country Risk
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  countryRank: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  countryFlag: {
    fontSize: 22,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  griBarBg: {
    height: 4,
    backgroundColor: colors.panel,
    borderRadius: 2,
  },
  griBarFill: {
    height: 4,
    borderRadius: 2,
  },
  countryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  griScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  countryTrend: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BriefsScreen;
