import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../theme';

const leonaBadge = require('../assets/leona-badge.png');

/**
 * LeonaHeader — shared top bar used across all main screens.
 *
 * Props:
 *   right  — optional JSX rendered on the right side (action buttons, badges, etc.)
 *   title  — optional screen title shown to the right of the branding divider
 */
const LeonaHeader = ({ right, title }) => {
  return (
    <View style={styles.container}>
      {/* ── Left: LEONA branding ── */}
      <View style={styles.brand}>
        <Image source={leonaBadge} style={styles.badge} resizeMode="contain" />
        <View style={styles.brandText}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>LEONA</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.tagline}>powered by leona.bot</Text>
        </View>
      </View>

      {/* ── Optional screen title (divider + label) ── */}
      {title ? (
        <View style={styles.titleWrap}>
          <View style={styles.divider} />
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}

      {/* ── Right: screen-specific actions ── */}
      <View style={styles.right}>
        {right || null}
      </View>
    </View>
  );
};

export default LeonaHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
    minHeight: 56,
  },

  // ── Brand block ──
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  badge: {
    width: 36,
    height: 36,
  },
  brandText: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1.5,
  },
  proBadge: {
    backgroundColor: 'rgba(0,168,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,168,255,0.4)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  proText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.blue,
    letterSpacing: 0.8,
  },
  tagline: {
    fontSize: 8,
    fontWeight: '500',
    color: colors.textDim,
    letterSpacing: 0.3,
    marginTop: 1,
  },

  // ── Optional screen title ──
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 10,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSec,
    letterSpacing: 1.2,
  },

  // ── Right slot ──
  right: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
});
