import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { colors, spacing, type } from '../theme';

export function LoadingState({ label = 'Loading', style }) {
  return (
    <View style={[styles.wrapper, style]}>
      <ActivityIndicator size="small" color={colors.lavenderStrong} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ eyebrow, title, message, actionLabel, onAction, style }) {
  return (
    <View style={[styles.wrapper, style]}>
      {eyebrow ? <Text style={type.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="soft" size="sm" full={false} style={styles.action} />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this right now.',
  actionLabel = 'Try again',
  onAction,
  style,
}) {
  return (
    <View style={[styles.wrapper, styles.errorWrapper, style]}>
      <Text style={type.eyebrow}>Please retry</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="primary" size="sm" full={false} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  errorWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...type.caption,
    marginTop: spacing.xs,
  },
  title: {
    ...type.title,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  message: {
    ...type.bodySmall,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 300,
  },
  action: {
    marginTop: spacing.md,
  },
});
