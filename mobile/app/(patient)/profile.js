import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { logout } from '../../src/store/slices/authSlice';
import { clearUser } from '../../src/store/slices/userSlice';
import { clearCurrentToken } from '../../src/store/slices/queueSlice';
import { authAPI } from '../../src/services/api';
import Screen from '../../src/components/Screen';
import ScreenHeader from '../../src/components/ScreenHeader';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import StatusPill from '../../src/components/StatusPill';
import FadeIn from '../../src/components/FadeIn';
import { colors, spacing, type } from '../../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.user);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to log out of QueueLess?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authAPI.logout().catch(() => {});
          } finally {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            dispatch(logout());
            dispatch(clearUser());
            dispatch(clearCurrentToken());
            router.replace('/(auth)/login');
          }
        },
      },
    ]);
  };

  const displayName = profile?.name || 'Registered patient';
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : null;

  const rows = [
    { label: 'Email address', value: profile?.email || 'Not provided' },
    { label: 'Contact phone', value: profile?.phone || 'Not provided' },
    { label: 'Account type', value: 'Patient account' },
    { label: 'Queue notifications', value: 'Enabled' },
    ...(memberSince ? [{ label: 'Member since', value: memberSince }] : []),
  ];

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.replace('/(patient)/hospitals')}
        title="Profile"
        subtitle="Your details and account settings"
      />

      <FadeIn>
        <Card tone="lavenderSoft" style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{profile?.email || 'Not provided'}</Text>
          <StatusPill label="Verified patient" tone="accent" style={styles.pill} />
        </Card>
      </FadeIn>

      <FadeIn delay={80}>
        <Card tone="surface" style={styles.detailsCard}>
          <Text style={type.eyebrow}>Personal information</Text>
          <View style={styles.rows}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={140}>
        <Card tone="surfaceSoft" style={styles.settingsCard}>
          <Text style={type.eyebrow}>Quick links</Text>
          <View style={styles.linkRow}>
            <Button
              label="My activity"
              variant="soft"
              size="sm"
              full={false}
              onPress={() => router.push('/(patient)/history')}
            />
            <Button
              label="Live token"
              variant="outline"
              size="sm"
              full={false}
              onPress={() => router.push('/(patient)/active-token')}
            />
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={200}>
        <View style={styles.actions}>
          <Button label="Sign out" variant="danger" onPress={handleSignOut} />
          <Text style={styles.footNote}>
            You will need to sign in again to book a new virtual token.
          </Text>
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    ...type.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.lavenderInk,
  },
  name: {
    ...type.title,
    textAlign: 'center',
  },
  email: {
    ...type.caption,
  },
  pill: {
    marginTop: spacing.sm,
  },
  detailsCard: {
    marginTop: spacing.base,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rows: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingBottom: spacing.md,
  },
  rowLabel: {
    ...type.caption,
    color: colors.muted,
  },
  rowValue: {
    ...type.captionStrong,
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
  settingsCard: {
    marginTop: spacing.base,
    gap: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  footNote: {
    ...type.caption,
    fontSize: 11.5,
    textAlign: 'center',
    color: colors.faint,
  },
});
