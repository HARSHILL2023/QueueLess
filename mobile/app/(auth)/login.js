import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { setCredentials, setError } from '../../src/store/slices/authSlice';
import { setUser } from '../../src/store/slices/userSlice';
import { authAPI, API_BASE_URL } from '../../src/services/api';

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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚡</Text>
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to access your virtual tokens and healthcare queues.</Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="patient@example.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => handleLogin()}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerLink}>
          <Text style={styles.footerText}>New to QueueLess? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>Create an Account</Text>
          </TouchableOpacity>
        </View>

        {/* Demo Helpers for Quick Evaluation */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Demo Logins</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => loginAsDemo('patient')}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>Login: Patient Demo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => loginAsDemo('staff')}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>Login: Staff Demo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  errorBanner: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  linkText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  demoSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    fontWeight: '700',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  demoButtonText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
});
