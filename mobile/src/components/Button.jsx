import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const VARIANTS = {
  primary: {
    container: { backgroundColor: colors.ink },
    label: { color: colors.white },
    spinner: colors.white,
  },
  accent: {
    container: { backgroundColor: colors.lavenderStrong },
    label: { color: colors.white },
    spinner: colors.white,
  },
  soft: {
    container: { backgroundColor: colors.lavenderSoft },
    label: { color: colors.lavenderInk },
    spinner: colors.lavenderInk,
  },
  peach: {
    container: { backgroundColor: colors.peachSoft },
    label: { color: colors.peachInk },
    spinner: colors.peachInk,
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
    label: { color: colors.inkSoft },
    spinner: colors.inkSoft,
  },
  danger: {
    container: { backgroundColor: colors.rose },
    label: { color: colors.roseInk },
    spinner: colors.roseInk,
  },
  plain: {
    container: { backgroundColor: 'transparent', paddingHorizontal: 0 },
    label: { color: colors.inkSoft },
    spinner: colors.inkSoft,
  },
};

const SIZES = {
  sm: { paddingVertical: 9, paddingHorizontal: 16, fontSize: 13 },
  md: { paddingVertical: 13, paddingHorizontal: 22, fontSize: 15 },
  lg: { paddingVertical: 17, paddingHorizontal: 26, fontSize: 16 },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  full = true,
  style,
  labelStyle,
  accessibilityLabel,
}) {
  const palette = VARIANTS[variant] || VARIANTS.primary;
  const sizing = SIZES[size] || SIZES.md;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        palette.container,
        {
          paddingVertical: sizing.paddingVertical,
          paddingHorizontal: sizing.paddingHorizontal,
        },
        full ? styles.full : styles.auto,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.spinner} />
      ) : (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { fontSize: sizing.fontSize }, palette.label, labelStyle]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  full: {
    alignSelf: 'stretch',
  },
  auto: {
    alignSelf: 'flex-start',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  inactive: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
});
