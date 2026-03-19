import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors, spacing } from '../theme';

const SubscriptionScreen = ({ navigation }) => {
  const invoices = [
    { month: 'Mar 2026', amount: 2400, date: 'March 1, 2026' },
    { month: 'Feb 2026', amount: 2400, date: 'February 1, 2026' },
    { month: 'Jan 2026', amount: 2400, date: 'January 1, 2026' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SUBSCRIPTION</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Current Plan Card */}
        <View style={styles.currentPlanCard}>
          <View style={styles.planBadgeContainer}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>ENTERPRISE</Text>
            </View>
          </View>
          <Text style={styles.planCardOrg}>Guardian Space Inc.</Text>
          <Text style={styles.planCardBilling}>Billed annually</Text>
          <Text style={styles.planCardRenewal}>Renews: March 15, 2027</Text>

          {/* Usage Stats */}
          <View style={styles.usageStatsContainer}>
            <UsageStat
              label="API Calls"
              used={2847}
              total={10000}
              percent={28.47}
            />
            <UsageStat
              label="Users"
              used={8}
              total={12}
              percent={66.67}
            />
            <UsageStat
              label="Storage"
              used={2.1}
              total={5}
              percent={42}
              unit="GB"
            />
          </View>
        </View>

        {/* Plan Comparison */}
        <View style={styles.planComparisonSection}>
          <Text style={styles.sectionHeader}>PLAN COMPARISON</Text>

          <PlanCard
            name="GUARDIAN"
            price="Free"
            features={[
              '5 events',
              '1 user',
              'Basic map',
              'Community access',
            ]}
            borderColor={colors.panelLight}
            backgroundColor={colors.panel}
          />

          <PlanCard
            name="PROFESSIONAL"
            price="$49/mo"
            features={[
              '50 events',
              '5 users',
              'All data sources',
              'LEONA AI basic',
            ]}
            borderColor={colors.blue}
            backgroundColor={colors.panel}
          />

          <PlanCard
            name="ENTERPRISE"
            price="Custom"
            badge="CURRENT"
            features={[
              'Unlimited events',
              'Unlimited users',
              'Full API',
              'LEONA AI Pro',
              'Dedicated support',
            ]}
            borderColor={colors.purple}
            backgroundColor={colors.panel}
            isCurrent={true}
          />
        </View>

        {/* Billing History */}
        <View style={styles.billingHistorySection}>
          <Text style={styles.sectionHeader}>BILLING HISTORY</Text>
          {invoices.map((invoice, index) => (
            <View key={index} style={styles.invoiceRow}>
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceMonth}>{invoice.month}</Text>
                <Text style={styles.invoiceDate}>{invoice.date}</Text>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>
                  ${invoice.amount.toLocaleString()}
                </Text>
                <TouchableOpacity>
                  <Text style={styles.downloadButton}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Footer Buttons */}
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.contactSalesButton}>
            <Text style={styles.contactSalesText}>Contact Sales</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.cancelText}>Cancel Subscription</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const UsageStat = ({ label, used, total, percent, unit = '' }) => (
  <View style={styles.usageStat}>
    <View style={styles.usageStatHeader}>
      <Text style={styles.usageStatLabel}>{label}</Text>
      <Text style={styles.usageStatValue}>
        {used.toLocaleString()}/{total.toLocaleString()} {unit}
      </Text>
    </View>
    <View style={styles.usageStatBar}>
      <View
        style={[
          styles.usageStatBarFill,
          { width: `${percent}%` },
        ]}
      />
    </View>
  </View>
);

const PlanCard = ({
  name,
  price,
  badge,
  features,
  borderColor,
  backgroundColor,
  isCurrent,
}) => (
  <View
    style={[
      styles.planCard,
      {
        borderColor,
        backgroundColor,
        borderWidth: isCurrent ? 2 : 1,
      },
    ]}
  >
    <View style={styles.planCardHeader}>
      <Text style={styles.planCardName}>{name}</Text>
      {isCurrent && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={styles.planCardPrice}>{price}</Text>
    <View style={styles.planCardFeatures}>
      {features.map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <Text style={styles.featureDot}>•</Text>
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  currentPlanCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.purple,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  planBadgeContainer: {
    marginBottom: spacing.md,
  },
  planBadge: {
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  planCardOrg: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  planCardBilling: {
    fontSize: 13,
    color: colors.textSec,
    marginBottom: spacing.xs,
  },
  planCardRenewal: {
    fontSize: 13,
    color: colors.textDim,
    marginBottom: spacing.lg,
  },
  usageStatsContainer: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  usageStat: {
    gap: spacing.sm,
  },
  usageStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageStatLabel: {
    fontSize: 13,
    color: colors.textSec,
    fontWeight: '600',
  },
  usageStatValue: {
    fontSize: 13,
    color: colors.blue,
    fontWeight: '600',
  },
  usageStatBar: {
    height: 4,
    backgroundColor: colors.panelLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageStatBarFill: {
    height: '100%',
    backgroundColor: colors.blue,
  },
  planComparisonSection: {
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
  planCard: {
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  currentBadge: {
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  planCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.blue,
    marginBottom: spacing.md,
  },
  planCardFeatures: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureDot: {
    fontSize: 16,
    color: colors.textSec,
  },
  featureText: {
    fontSize: 13,
    color: colors.text,
  },
  billingHistorySection: {
    marginBottom: spacing.xl,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceMonth: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  invoiceDate: {
    fontSize: 12,
    color: colors.textDim,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  downloadButton: {
    fontSize: 12,
    color: colors.blue,
    fontWeight: '600',
  },
  footerButtons: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  contactSalesButton: {
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 6,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  contactSalesText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.blue,
    letterSpacing: 1,
  },
  cancelText: {
    fontSize: 13,
    color: colors.critical,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});

export default SubscriptionScreen;
