import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { setCredentials } from '../../../src/store/slices/authSlice';
import { setUser } from '../../../src/store/slices/userSlice';
import { staffAPI } from '../../../src/services/api';
import Screen from '../../../src/components/Screen';
import Button from '../../../src/components/Button';
import Field from '../../../src/components/Field';
import Card from '../../../src/components/Card';
import StatusPill from '../../../src/components/StatusPill';
import FadeIn from '../../../src/components/FadeIn';
import { ErrorState, LoadingState } from '../../../src/components/States';
import { colors, spacing, type } from '../../../src/theme';

const roleLabels = {
  doctor: 'Consulting Doctor',
  nurse: 'Clinical Nurse',
  receptionist: 'Triage / Receptionist',
  admin: 'Hospital Administrator',
  staff: 'Clinical Staff',
};

export default function AcceptInvitationScreen() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoadError('This invitation link is invalid.');
      setLoading(false);
      return;
    }

    staffAPI
      .getInvitation(token)
      .then((res) => setInvitation(res.data?.data || null))
      .catch((err) => setLoadError(err.response?.data?.error || 'This invitation link is invalid.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setFormError('');

    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await staffAPI.acceptInvitation(token, { name: name.trim(), password });
      const { token: accessToken, refreshToken, user } = res.data.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      dispatch(setCredentials({ token: accessToken, refreshToken }));
      dispatch(setUser({ profile: user, role: user.role, hospitalId: user.hospitalId }));

      router.replace('/(staff)/queue');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to accept this invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.centeredContent}>
        <LoadingState label="Validating invitation" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen contentContainerStyle={styles.centeredContent}>
        <ErrorState
          title="Invitation unavailable"
          message={loadError}
          actionLabel="Go to sign in"
          onAction={() => router.replace('/(auth)/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <FadeIn>
        <Text style={type.eyebrow}>Staff invitation</Text>
        <Text style={styles.title}>Join your hospital</Text>
        <Text style={styles.subtitle}>
          Accept the invitation to run the live outpatient queue for your team.
        </Text>
      </FadeIn>

      <FadeIn delay={80}>
        <Card tone="peachSoft" style={styles.inviteCard}>
          <StatusPill label="Invitation for" tone="warning" />
          <Text style={styles.inviteEmail}>{invitation?.email}</Text>
          <Text style={styles.inviteHospital}>{invitation?.hospitalName}</Text>
          <Text style={styles.inviteMeta}>
            {invitation?.departmentName || 'All departments'} ·{' '}
            {roleLabels[invitation?.staffRole] || invitation?.staffRole}
          </Text>
        </Card>
      </FadeIn>

      {formError ? (
        <FadeIn>
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        </FadeIn>
      ) : null}

      <FadeIn delay={140}>
        <Card tone="surface" elevated style={styles.form}>
          <Field
            label="Full name"
            placeholder="Dr. Your Name"
            hint="Required for new accounts. Leave blank if you already have one."
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />

          <Field
            label="Password"
            placeholder={name ? 'Create a password (6+ characters)' : 'Your existing password'}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            label="Accept invitation"
            variant="primary"
            size="lg"
            loading={submitting}
            onPress={handleAccept}
            style={styles.submit}
          />
        </Card>
      </FadeIn>

      <FadeIn delay={200}>
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
        >
          <Text style={styles.link}>Back to sign in</Text>
        </Pressable>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  centeredContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    ...type.hero,
    fontSize: 34,
    lineHeight: 41,
    marginTop: spacing.md,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginTop: spacing.sm,
    maxWidth: 330,
  },
  inviteCard: {
    gap: spacing.xs,
  },
  inviteEmail: {
    ...type.subheading,
    color: colors.peachInk,
    marginTop: spacing.xs,
  },
  inviteHospital: {
    ...type.heading,
  },
  inviteMeta: {
    ...type.caption,
  },
  errorBanner: {
    backgroundColor: colors.rose,
    borderRadius: 18,
    padding: spacing.base,
  },
  errorText: {
    ...type.bodySmall,
    color: colors.roseInk,
  },
  form: {
    gap: spacing.base,
    borderRadius: 26,
  },
  submit: {
    marginTop: spacing.sm,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  link: {
    ...type.bodySmall,
    fontWeight: '700',
    color: colors.lavenderInk,
  },
  pressed: {
    opacity: 0.6,
  },
});
