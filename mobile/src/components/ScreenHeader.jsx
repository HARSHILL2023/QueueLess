import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

export default function ScreenHeader({ title, subtitle, onBack, rightLabel, onRight }) {
  return (
    <View style={styles.wrapper}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}

      <View style={styles.row}>
        <View style={styles.textBlock}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightLabel ? (
          <Pressable
            onPress={onRight}
            accessibilityRole="button"
            hitSlop={10}
            style={({ pressed }) => [styles.right, pressed && styles.pressed]}
          >
            <Text style={styles.rightText}>{rightLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: {
    ...type.eyebrow,
    color: colors.lavenderInk,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    ...type.display,
  },
  subtitle: {
    ...type.bodySmall,
    color: colors.muted,
  },
  right: {
    paddingTop: 6,
  },
  rightText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  pressed: {
    opacity: 0.6,
  },
});
