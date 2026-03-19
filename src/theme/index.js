// LEONA — Design System
export const colors = {
  bg: '#04060F',
  panel: '#080B2A',
  panelLight: '#0A0E30',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
  blue: '#00A8FF',
  blueLight: '#33BBFF',
  blueDim: 'rgba(0,168,255,0.15)',
  purple: '#6B48FF',
  purpleLight: '#9B78FF',
  purpleDim: 'rgba(107,72,255,0.15)',
  text: '#E8EAF6',
  textSec: '#8892B0',
  textDim: '#4A5280',
  critical: '#F44336',
  criticalDim: 'rgba(244,67,54,0.15)',
  high: '#FF9800',
  highDim: 'rgba(255,152,0,0.15)',
  elevated: '#FFEB3B',
  elevatedDim: 'rgba(255,235,59,0.10)',
  safe: '#00E676',
  safeDim: 'rgba(0,230,118,0.12)',
  live: '#FF1744',
  white: '#FFFFFF',
  black: '#000000',
};

export const sevColors = {
  critical: colors.critical,
  high: colors.high,
  elevated: colors.elevated,
  monitoring: colors.safe,
};

export const sevBg = {
  critical: colors.criticalDim,
  high: colors.highDim,
  elevated: colors.elevatedDim,
  monitoring: colors.safeDim,
};

export const typeIcons = {
  wildfire: '🔥',
  flood: '🌊',
  hurricane: '🌀',
  earthquake: '⚡',
  conflict: '⚔️',
  drought: '☀️',
  volcano: '🌋',
  tsunami: '🌊',
  tornado: '🌪️',
  landslide: '⛰️',
  industrial: '⚠️',
  health: '🦠',
  nuclear: '☢️',
  storm: '🌩️',
};

export const fonts = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  semibold: { fontFamily: 'System', fontWeight: '600' },
  bold: { fontFamily: 'System', fontWeight: '700' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
