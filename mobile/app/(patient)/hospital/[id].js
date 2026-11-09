import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { hospitalAPI, queueAPI } from '../../../src/services/api';
import { setCurrentToken } from '../../../src/store/slices/queueSlice';

export default function HospitalDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingDeptId, setBookingDeptId] = useState(null);

  useEffect(() => {
    if (!id) return;
    hospitalAPI.getHospital(id)
      .then((res) => setHospital(res.data?.data || null))
      .catch((err) => {
        console.error('Error fetching hospital:', err);
        Alert.alert('Error', 'Unable to load hospital details.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleBookToken = async (departmentId, deptName) => {
    setBookingDeptId(departmentId);
    try {
      const res = await queueAPI.getToken(id, departmentId, 'Online mobile booking');
      const tokenData = res.data?.data;
      dispatch(setCurrentToken(tokenData));
      Alert.alert(
        'Token Booked! 🎉',
        `Your virtual token ${tokenData?.token?.tokenDisplay || 'assigned'} has been issued. You can track your live queue position now.`,
        [
          {
            text: 'Track Live Queue',
            onPress: () => router.push('/(patient)/active-token'),
          },
        ]
      );
    } catch (err) {
      console.error('Booking error:', err);
      if (err.response?.status === 409) {
        Alert.alert(
          'Active Token Exists',
          err.response?.data?.error || 'You already have an active token in this department.',
          [
            {
              text: 'View My Active Token',
              onPress: () => router.push('/(patient)/active-token'),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Booking Failed', err.response?.data?.error || 'Failed to issue virtual token.');
      }
    } finally {
      setBookingDeptId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading hospital clinics...</Text>
      </View>
    );
  }

  if (!hospital) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Hospital Not Found</Text>
      </View>
    );
  }

  const departments = hospital.departments || [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hospital Overview Card */}
      <View style={styles.hospitalCard}>
        <View style={styles.headerRow}>
          <Text style={styles.hospitalTitle}>{hospital.name}</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{hospital.code}</Text>
          </View>
        </View>

        <Text style={styles.addressText}>
          📍 {hospital.address?.street ? `${hospital.address.street}, ` : ''}{hospital.address?.city}, {hospital.address?.state}
        </Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>OPD Timings</Text>
            <Text style={styles.infoValue}>
              {hospital.settings?.openTime || '08:00'} - {hospital.settings?.closeTime || '20:00'}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Facility Contact</Text>
            <Text style={styles.infoValue}>{hospital.phone || 'Available on site'}</Text>
          </View>
        </View>

        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            🔒 Online Virtual Queue: Avoid crowded waiting rooms. Book below and arrive when your token is near.
          </Text>
        </View>
      </View>

      {/* Departments Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Select Outpatient Clinic ({departments.length})</Text>
        <Text style={styles.sectionSub}>Choose a department to request an instant sequential token</Text>
      </View>

      {departments.length === 0 ? (
        <View style={styles.noDeptsCard}>
          <Text style={styles.noDeptsText}>No active clinics available for online queue at this time.</Text>
        </View>
      ) : (
        departments.map((dept) => {
          const isBooking = bookingDeptId === dept._id;
          return (
            <View key={dept._id} style={styles.deptCard}>
              <View style={styles.deptHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deptName}>{dept.name}</Text>
                  <Text style={styles.deptLocation}>
                    {dept.floor} &bull; Room {dept.roomNumber}
                  </Text>
                </View>
                <View style={styles.deptCodeBadge}>
                  <Text style={styles.deptCodeText}>{dept.code}</Text>
                </View>
              </View>

              <Text style={styles.deptDesc}>
                {dept.description || 'Specialist outpatient consultations and medical care.'}
              </Text>

              <View style={styles.metricsRow}>
                <Text style={styles.metricText}>
                  ⏱ Avg consultation: <Text style={{ fontWeight: '700', color: '#f8fafc' }}>{dept.avgWaitMinutes || 15} mins</Text>
                </Text>
                <Text style={styles.metricText}>
                  🎫 Daily limit: <Text style={{ fontWeight: '700', color: '#f8fafc' }}>{dept.maxTokensPerDay || 100}</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.bookButton, isBooking && styles.bookButtonDisabled]}
                onPress={() => handleBookToken(dept._id, dept.name)}
                disabled={isBooking}
                activeOpacity={0.8}
              >
                {isBooking ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.bookButtonText}>Book Virtual Token 🎟️</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#0f172a',
    paddingBottom: 48,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  hospitalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  hospitalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    paddingRight: 10,
  },
  codeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  codeBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  addressText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  infoValue: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  noticeBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  noticeText: {
    color: '#bae6fd',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 13,
    color: '#94a3b8',
  },
  deptCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  deptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  deptName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  deptLocation: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  deptCodeBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deptCodeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  deptDesc: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  metricText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  bookButton: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  noDeptsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  noDeptsText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
});
