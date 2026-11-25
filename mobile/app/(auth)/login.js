import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { setCredentials, setError } from '../../src/store/slices/authSlice';
import { setUser } from '../../src/store/slices/userSlice';
import { authAPI, API_BASE_URL } from '../../src/services/api';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import Field from '../../src/components/Field';
import Card from '../../src/components/Card';
import FadeIn from '../../src/components/FadeIn';
import { colors, spacing, type } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (loginEmail, loginPassword) => {
    const e = loginEmail || email;
    const p = loginPassword || password;

    if (!e || !p) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await authAPI.login({ email: e.trim(), password: p });
      const { token, refreshToken, user } = res.data.data;

      // Persist auth tokens in SecureStore
      await SecureStore.setItemAsync('accessToken', token);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      // Update Redux state
      dispatch(setCredentials({ token, refreshToken }));
      dispatch(setUser({
        profile: user,
        role: user.role,
        hospitalId: user.hospitalId,
      }));

      // Role-based routing
      if (user.role === 'staff') {
        router.replace('/(staff)/queue');
      } else {
        router.replace('/(patient)/hospitals');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg =
        err.response?.data?.error ||
        (err.response
          ? 'Unable to log in. Please check your credentials.'
          : `Cannot reach the QueueLess server at ${API_BASE_URL}. Check your network and make sure the backend is running.`);
      setErrorMsg(msg);
      dispatch(setError(msg));
    } finally {
      setLoading(false);
    }
  };

  const DEMO_ACCOUNTS = {
    patient: { email: 'patient@example.com', password: 'Password123!' },
    staff: { email: 'staff@hospital.com', password: 'Password123!' },
  };

  const loginAsDemo = (role) => {
    if (loading) return;
    const demo = DEMO_ACCOUNTS[role];
    setEmail(demo.email);
    setPassword(demo.password);
    handleLogin(demo.email, demo.password);
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <FadeIn>
        <Text style={type.eyebrow}>QueueLess</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to pick up your virtual token and follow the live queue.
        </Text>
      </FadeIn>

      {errorMsg ? (
        <FadeIn>
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        </FadeIn>
      ) : null}

      <FadeIn delay={80}>
        <Card tone="surface" elevated style={styles.form}>
          <Field
            label="Email address"
            placeholder="patient@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />

          <Field
            label="Password"
            placeholder="Your password"
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />

          <Button
            label="Sign in"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={() => handleLogin()}
            style={styles.submit}
          />
        </Card>
      </FadeIn>

      <FadeIn delay={140}>
        <Pressable
          onPress={() => router.push('/(auth)/register')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
        >
          <Text style={styles.linkMuted}>New to QueueLess? </Text>
          <Text style={styles.link}>Create an account</Text>
        </Pressable>
      </FadeIn>

      <FadeIn delay={200}>
        <View style={styles.demoSection}>
          <Text style={type.eyebrow}>Quick demo access</Text>
          <View style={styles.demoRow}>
            <Pressable
              onPress={() => loginAsDemo('patient')}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => [styles.demoChip, pressed && styles.pressed]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.inkSoft} />
              ) : (
                <Text style={styles.demoChipText}>Patient demo</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => loginAsDemo('staff')}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => [styles.demoChip, pressed && styles.pressed]}
            >
              <Text style={styles.demoChipText}>Staff demo</Text>
            </Pressable>
          </View>
          <Text style={styles.demoHint}>For evaluation only. Saved hospital demo credentials.</Text>
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  title: {
    ...type.hero,
    fontSize: 36,
    lineHeight: 43,
    marginTop: spacing.md,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginTop: spacing.sm,
    maxWidth: 320,
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
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  linkMuted: {
    ...type.bodySmall,
    color: colors.muted,
  },
  link: {
    ...type.bodySmall,
    fontWeight: '700',
    color: colors.lavenderInk,
  },
  demoSection: {
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: spacing.lg,
  },
  demoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  demoChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  demoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  demoHint: {
    ...type.caption,
    fontSize: 11.5,
    color: colors.faint,
  },
  pressed: {
    opacity: 0.6,
  },
});
