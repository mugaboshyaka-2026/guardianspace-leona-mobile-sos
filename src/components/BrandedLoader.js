import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../theme';

const leonaAvatar = require('../assets/leona-avatar.png');

export default function BrandedLoader({
  title = 'LEONA',
  subtitle = 'Syncing your operational view',
}) {
  const pulse = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.92,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <Animated.View style={[styles.avatarShell, { transform: [{ scale: pulse }] }]}>
        <Image source={leonaAvatar} style={styles.avatar} />
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color={colors.blue} />
        <Text style={styles.statusText}>Initializing secure intelligence feed</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0,168,255,0.10)',
  },
  avatarShell: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSec,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statusText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '500',
  },
});
