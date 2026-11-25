import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

export default function Field({
  label,
  hint,
  error,
  style,
  inputStyle,
  multiline = false,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
        placeholderTextColor={colors.faint}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.inputFocused,
          error && styles.inputError,
          inputStyle,
        ]}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...type.captionStrong,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + 1,
    fontSize: 15,
    color: colors.ink,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.lavenderStrong,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.roseInk,
  },
  hint: {
    ...type.caption,
  },
  error: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.roseInk,
  },
});
