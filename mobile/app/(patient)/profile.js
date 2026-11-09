import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { logout } from '../../src/store/slices/authSlice';
import { clearUser } from '../../src/store/slices/userSlice';
import { clearCurrentToken } from '../../src/store/slices/queueSlice';
import { authAPI } from '../../src/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.user);

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of QueueLess?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
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

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile?.name || 'P').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{profile?.name || 'Registered Patient'}</Text>
        <Text style={styles.email}>{profile?.email || 'patient@example.com'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Verified Patient Account</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact Phone</Text>
          <Text style={styles.infoValue}>{profile?.phone || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Virtual Tokens</Text>
          <Text style={styles.infoValue}>Online Only</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Queue Notification</Text>
          <Text style={styles.infoValue}>Enabled</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  roleText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 32,
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '700',
  },
});
