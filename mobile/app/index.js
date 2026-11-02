import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { role } = useSelector((state) => state.user);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Virtual Queue Platform</Text>
        </View>

        <Text style={styles.title}>QueueLess</Text>
        <Text style={styles.subtitle}>
          Book online virtual tokens for hospitals and clinics. Track your position in real time without standing in lines.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>System Status</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Auth State:</Text>
            <Text style={styles.rowValue}>{isAuthenticated ? `Logged in (${role})` : 'Not logged in'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Virtual Tokens:</Text>
            <Text style={styles.rowValue}>Online Only</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            // Future route navigation
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
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
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
    paddingBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
