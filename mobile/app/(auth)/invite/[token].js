import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { setCredentials } from '../../../src/store/slices/authSlice';
import { setUser } from '../../../src/store/slices/userSlice';
import { staffAPI } from '../../../src/services/api';

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Validating invitation…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Invitation Unavailable</Text>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.primaryButtonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Join QueueLess Staff</Text>
        <Text style={styles.subtitle}>
          Accept your hospital invitation to run the live outpatient queue.
        </Text>
      </View>

      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>INVITATION FOR</Text>
        <Text style={styles.inviteEmail}>{invitation?.email}</Text>
        <Text style={styles.inviteHospital}>{invitation?.hospitalName}</Text>
        <Text style={styles.inviteMeta}>
          {invitation?.departmentName || 'All departments'} •{' '}
          {roleLabels[invitation?.staffRole] || invitation?.staffRole}
        </Text>
      </View>

      {formError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{formError}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Dr. Your Name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.hint}>Required for new accounts. Leave blank if you already have one.</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder={name ? 'Create a password (6+ characters)' : 'Your existing password'}
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Accept Invitation</Text>
          )}
        </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  inviteCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
    marginBottom: 20,
  },
  inviteLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inviteEmail: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '700',
  },
  inviteHospital: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  inviteMeta: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
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
  hint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
});
