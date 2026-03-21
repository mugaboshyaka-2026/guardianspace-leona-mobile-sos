import React, { useMemo, useState } from 'react';
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
import { useMyEvents, useWorldEvents, useAOIs, useLeonaBrief } from '../hooks/useEvents';
import LeonaHeader from '../components/LeonaHeader';

function extractBriefText(brief) {
  if (!brief) return '';
  return brief.brief || brief.summary || brief.text || brief.content || '';
}

const severityOrder = { critical: 0, high: 1, elevated: 2, monitoring: 3 };

const BriefsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('WORLD');
  const { events: myEvents } = useMyEvents();
  const { events: worldEvents } = useWorldEvents();
  const { aois } = useAOIs();
  const events = useMemo(
    () => [...new Map([...myEvents, ...worldEvents].map((event) => [event.id, event])).values()],
    [myEvents, worldEvents]
  );
  const userAois = useMemo(() => aois.map((aoi) => aoi.name || aoi), [aois]);

  const severityCounts = {
    critical: events.filter((event) => event.severity === 'critical').length,
    high: events.filter((event) => event.severity === 'high').length,
    elevated: events.filter((event) => event.severity === 'elevated').length,
    monitoring: events.filter((event) => event.severity === 'monitoring').length,
  };
  const mySeverityCounts = {
    critical: myEvents.filter((event) => event.severity === 'critical').length,
    high: myEvents.filter((event) => event.severity === 'high').length,
    elevated: myEvents.filter((event) => event.severity === 'elevated').length,
    monitoring: myEvents.filter((event) => event.severity === 'monitoring').length,
  };
  const topEvents = useMemo(
    () => [...events].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 4),
    [events]
  );
  const myTopEvents = useMemo(
    () => [...myEvents].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 4),
    [myEvents]
  );
  const worldThreatScore = Math.min(
    100,
    severityCounts.critical * 20 +
      severityCounts.high * 10 +
      severityCounts.elevated * 5 +
      severityCounts.monitoring * 2
  );

  const worldBriefContext = useMemo(() => ({
    scope: 'world',
    event_count: events.length,
    severity_counts: severityCounts,
    events: topEvents.map((event) => ({
      id: event.id,
      title: event.title,
      severity: event.severity,
      location: event.location,
    })),
  }), [events.length, severityCounts, topEvents]);
  const myBriefContext = useMemo(() => ({
    scope: 'my',
    aois: userAois,
    event_count: myEvents.length,
    severity_counts: mySeverityCounts,
    events: myTopEvents.map((event) => ({
      id: event.id,
      title: event.title,
      severity: event.severity,
      location: event.location,
    })),
  }), [userAois, myEvents.length, mySeverityCounts, myTopEvents]);
  const { brief: worldBrief } = useLeonaBrief(worldBriefContext);
  const { brief: myBrief } = useLeonaBrief(myBriefContext);

  const tabs = [
    { label: 'WORLD BRIEF', value: 'WORLD' },
    { label: 'MY BRIEF', value: 'MY' },
    { label: 'CHAT', value: 'CHAT' },
  ];

  const handleChatPress = () => {
    navigation.navigate('LeonaChat');
  };

  const renderSeverityChip = (severity, count) => {
    const severityColor = sevColors[severity];
    return (
      <View key={severity} style={[styles.severityChip, { borderColor: severityColor }]}>
        <Text style={[styles.severityCount, { color: severityColor }]}>{count}</Text>
        <Text style={[styles.severityLabel, { color: severityColor }]}>{severity.toUpperCase()}</Text>
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
      <View style={[styles.severityDot, { backgroundColor: sevColors[item.severity] }]} />
    </TouchableOpacity>
  );

  const renderWorldBrief = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.severityGrid}>
        {renderSeverityChip('critical', severityCounts.critical)}
        {renderSeverityChip('high', severityCounts.high)}
        {renderSeverityChip('elevated', severityCounts.elevated)}
        {renderSeverityChip('monitoring', severityCounts.monitoring)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TOP EVENTS</Text>
        <FlatList
          scrollEnabled={false}
          data={topEvents}
          renderItem={renderEventRow}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.eventSeparator} />}
          ListEmptyComponent={() => <Text style={styles.emptyCopy}>No live events available.</Text>}
        />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>GLOBAL THREAT INDEX</Text>
        <View style={styles.threatRow}>
          <Text style={styles.threatScore}>{worldThreatScore}</Text>
          <Text style={styles.threatMax}>/100</Text>
        </View>
        <View style={styles.threatBar}>
          <View style={[styles.threatBarFill, { width: `${worldThreatScore}%` }]} />
        </View>
        <Text style={styles.summaryNarrative}>
          {extractBriefText(worldBrief) || `${events.length} active events globally. ${severityCounts.critical} critical situations currently require immediate attention.`}
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

        <View style={styles.aoiTagsRow}>
          {userAois.map((aoi, idx) => (
            <View key={idx} style={styles.aoiTag}>
              <Text style={styles.aoiText}>📍 {aoi}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.narrativeText}>
          {extractBriefText(myBrief) || `Active monitoring across ${userAois.length} Areas of Interest with ${myEvents.length} live events currently matched to your scope.`}
        </Text>

        <View style={styles.briefStats}>
          <View style={styles.briefStat}>
            <Text style={[styles.briefStatNum, { color: colors.critical }]}>{mySeverityCounts.critical}</Text>
            <Text style={styles.briefStatLabel}>Critical</Text>
          </View>
          <View style={styles.briefStat}>
            <Text style={[styles.briefStatNum, { color: colors.high }]}>{mySeverityCounts.high}</Text>
            <Text style={styles.briefStatLabel}>High</Text>
          </View>
          <View style={styles.briefStat}>
            <Text style={[styles.briefStatNum, { color: colors.blue }]}>{userAois.length}</Text>
            <Text style={styles.briefStatLabel}>AOIs</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR EVENTS</Text>
          <FlatList
            scrollEnabled={false}
            data={myTopEvents}
            renderItem={renderEventRow}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.eventSeparator} />}
            ListEmptyComponent={() => <Text style={styles.emptyCopy}>No live events matched to your AOIs.</Text>}
          />
        </View>

        <TouchableOpacity style={styles.footerLink} onPress={handleChatPress}>
          <Text style={styles.footerLinkText}>Ask LEONA for a full brief →</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LeonaHeader
        title="INTELLIGENCE"
        right={(
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tabButton, activeTab === tab.value && styles.tabButtonActive]}
            onPress={() => {
              if (tab.value === 'CHAT') {
                handleChatPress();
              } else {
                setActiveTab(tab.value);
              }
            }}
          >
            <Text style={[styles.tabLabel, activeTab === tab.value && styles.tabLabelActive]}>{tab.label}</Text>
            {activeTab === tab.value && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeTab === 'WORLD' && renderWorldBrief()}
      {activeTab === 'MY' && renderMyBrief()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  emptyCopy: {
    color: colors.textDim,
    fontSize: 12,
    paddingVertical: spacing.md,
  },
});

export default BriefsScreen;
