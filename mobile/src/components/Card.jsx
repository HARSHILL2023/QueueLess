import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme';

const TONES = {
  surface: { backgroundColor: colors.surface },
  soft: { backgroundColor: colors.surfaceSoft },
  lavender: { backgroundColor: colors.lavender },
  lavenderSoft: { backgroundColor: colors.lavenderSoft },
  peach: { backgroundColor: colors.peach },
  peachSoft: { backgroundColor: colors.peachSoft },
  sage: { backgroundColor: colors.sage },
};

export default function Card({
  children,
  tone = 'surface',
  padded = true,
  elevated = false,
  style,
}) {
  return (
    <View
      style={[
        styles.base,
        TONES[tone] || TONES.surface,
        padded && styles.padded,
        elevated && shadows.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
});
