import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { hospitalAPI, queueAPI } from '../../src/services/api';
import { setCurrentToken } from '../../src/store/slices/queueSlice';

export default function HospitalsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.user);
  const { currentToken } = useSelector((state) => state.queue);

  const [hospitals, setHospitals] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHospitals = useCallback(async () => {
    try {
      const [hospRes, activeRes] = await Promise.all([
        hospitalAPI.getHospitals({ search: search || undefined, verifiedOnly: 'true' }),
        queueAPI.getActiveToken().catch(() => ({ data: { data: null } })),
      ]);

      setHospitals(hospRes.data?.data || []);
      if (activeRes.data?.data) {
        dispatch(setCurrentToken(activeRes.data.data));
      } else {
        dispatch(setCurrentToken(null));
      }
    } catch (err) {
      console.error('Error fetching hospitals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, dispatch]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHospitals();
  };

  const renderHospitalCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/(patient)/hospital/${item._id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.hospitalTitleBlock}>
          <Text style={styles.hospitalName}>{item.name}</Text>
          <Text style={styles.hospitalLocation}>
            📍 {item.address?.city}, {item.address?.state}
          </Text>
        </View>
        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeText}>{item.code}</Text>
        </View>
      </View>

      <Text style={styles.hospitalDesc} numberOfLines={2}>
        {item.description || 'Verified healthcare center offering online virtual queue booking.'}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.verifiedTag}>
          <Text style={styles.verifiedText}>✓ Verified Facility</Text>
        </View>
        <Text style={styles.timingText}>
          🕒 {item.settings?.openTime || '08:00'} - {item.settings?.closeTime || '20:00'}
        </Text>
      </View>

      <View style={styles.ctaButton}>
        <Text style={styles.ctaButtonText}>View Departments & Book Token &rarr;</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hello, {profile?.name ? profile.name.split(' ')[0] : 'Patient'} 👋</Text>
          <Text style={styles.subgreeting}>Find a hospital to book a virtual token</Text>
        </View>
        <View style={styles.navIcons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/(patient)/history')}
          >
            <Text style={styles.navIconText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/(patient)/profile')}
          >
            <Text style={styles.navIconText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Token Banner if any */}
      {currentToken && (
        <TouchableOpacity
          style={styles.activeTokenPill}
          activeOpacity={0.85}
          onPress={() => router.push('/(patient)/active-token')}
        >
          <View style={styles.pulseDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTokenTitle}>
              You have an active token: <Text style={{ fontWeight: '800' }}>{currentToken.token?.tokenDisplay || currentToken.tokenDisplay}</Text>
            </Text>
            <Text style={styles.activeTokenSub}>Tap to track live queue status & wait time &rarr;</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Search Input */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by hospital name or city..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Hospital List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Locating verified healthcare centers...</Text>
        </View>
      ) : (
        <FlatList
          data={hospitals}
          keyExtractor={(item) => item._id}
          renderItem={renderHospitalCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏥</Text>
              <Text style={styles.emptyTitle}>No Hospitals Found</Text>
              <Text style={styles.emptyText}>Try searching for another city or hospital name.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 56,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  subgreeting: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  navIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  navIconText: {
    fontSize: 18,
  },
  activeTokenPill: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38bdf8',
  },
  activeTokenTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTokenSub: {
    color: '#bae6fd',
    fontSize: 11,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  hospitalTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  hospitalName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  hospitalLocation: {
    fontSize: 13,
    color: '#94a3b8',
  },
  codeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  codeBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  hospitalDesc: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginBottom: 12,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  timingText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  ctaButton: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
