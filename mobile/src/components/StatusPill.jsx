import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const TONES = {
  neutral: { backgroundColor: colors.surfaceSoft, color: colors.inkSoft },
  accent: { backgroundColor: colors.lavenderSoft, color: colors.lavenderInk },
  success: { backgroundColor: colors.sage, color: colors.sageInk },
  warning: { backgroundColor: colors.peachSoft, color: colors.peachInk },
  danger: { backgroundColor: colors.rose, color: colors.roseInk },
  solid: { backgroundColor: colors.ink, color: colors.white },
};

export function toneForStatus(status) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'serving':
      return 'success';
    case 'called':
      return 'warning';
    case 'cancelled':
      return 'danger';
    case 'no-show':
      return 'warning';
    case 'waiting':
      return 'accent';
    default:
      return 'neutral';
  }
}

export function labelForStatus(status) {
  if (!status) return 'Unknown';
  return String(status).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusPill({ label, tone = 'neutral', style, textStyle }) {
  const palette = TONES[tone] || TONES.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: palette.backgroundColor }, style]}>
      <Text style={[styles.text, { color: palette.color }, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
