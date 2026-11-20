import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { role } = useSelector((state) => state.user);

  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'staff') {
        router.replace('/(staff)/queue');
      } else {
        router.replace('/(patient)/hospitals');
      }
    }
  }, [isAuthenticated, role, router]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (role === 'staff') {
        router.replace('/(staff)/queue');
      } else {
        router.replace('/(patient)/hospitals');
      }
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Real-Time Healthcare Platform</Text>
        </View>

        <Text style={styles.title}>QueueLess</Text>
        <Text style={styles.subtitle}>
          Book online virtual tokens for hospital clinics. Track your live queue position remotely and avoid waiting rooms.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>System Status</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Virtual Tokens:</Text>
            <Text style={styles.rowValue}>Online Only</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Token Assignment:</Text>
            <Text style={styles.rowValue}>Atomic & Safe</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Live Tracking:</Text>
            <Text style={styles.rowValue}>Active</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.rowLabel}>User State:</Text>
            <Text style={styles.rowValue}>{isAuthenticated ? `Logged in (${role})` : 'Guest'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {isAuthenticated ? 'Enter Portal &rarr;' : 'Get Started &rarr;'}
          </Text>
        </TouchableOpacity>

        {!isAuthenticated && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Create New Account</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 64,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#94a3b8',
    marginBottom: 28,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  rowLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  rowValue: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
});
