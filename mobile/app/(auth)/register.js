import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMsg('Please fill in your name, email, and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await authAPI.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });

      const { token, refreshToken, user } = res.data.data;

      await SecureStore.setItemAsync('accessToken', token);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      dispatch(setCredentials({ token, refreshToken }));
      dispatch(setUser({ profile: user, role: user.role }));

      router.replace('/(patient)/hospitals');
    } catch (err) {
      console.error('Registration error:', err);
      const msg =
        err.response?.data?.error ||
        (err.response
          ? 'Registration failed. Please try again.'
          : `Cannot reach the QueueLess server at ${API_BASE_URL}. Check your network and make sure the backend is running.`);
      setErrorMsg(msg);
      dispatch(setError(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <FadeIn>
        <Text style={type.eyebrow}>QueueLess</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Book virtual tokens, skip the waiting room, and keep every visit in one place.
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
            label="Full name"
            placeholder="Aarav Sharma"
            autoCapitalize="words"
            textContentType="name"
            value={name}
            onChangeText={setName}
          />

          <Field
            label="Email address"
            placeholder="aarav@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />

          <Field
            label="Phone number"
            hint="Optional — used by the hospital only if they need to reach you."
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
          />

          <Field
            label="Password"
            hint="At least 6 characters."
            placeholder="Create a password"
            secureTextEntry
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
          />

          <Button
            label="Create patient account"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleRegister}
            style={styles.submit}
          />
        </Card>
      </FadeIn>

      <FadeIn delay={140}>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
        >
          <Text style={styles.linkMuted}>Already registered? </Text>
          <Text style={styles.link}>Sign in</Text>
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
  pressed: {
    opacity: 0.6,
  },
});
