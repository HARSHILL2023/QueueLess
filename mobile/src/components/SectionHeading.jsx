import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

export default function SectionHeading({ eyebrow, title, subtitle, actionLabel, onAction, style }) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.textBlock}>
        {eyebrow ? <Text style={type.eyebrow}>{eyebrow}</Text> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...type.heading,
  },
  subtitle: {
    ...type.caption,
  },
  action: {
    paddingBottom: 2,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.lavenderInk,
    letterSpacing: 0.2,
  },
});
