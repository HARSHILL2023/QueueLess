import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { logout } from '../../src/store/slices/authSlice';
import { clearUser } from '../../src/store/slices/userSlice';
import { queueAPI, departmentAPI } from '../../src/services/api';

export default function StaffQueueScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.user);

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const hospitalId = typeof profile?.hospitalId === 'object' ? profile.hospitalId._id : profile?.hospitalId;

  const fetchDepartments = useCallback(async () => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }
    try {
      const res = await departmentAPI.getDepartments(hospitalId);
      const depts = res.data?.data || [];
      setDepartments(depts);
      if (depts.length > 0) {
        const assignedId = typeof profile?.departmentId === 'object' ? profile.departmentId?._id : profile?.departmentId;
        setSelectedDeptId(assignedId || depts[0]._id);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  }, [hospitalId, profile]);

  const fetchQueue = useCallback(async () => {
    if (!hospitalId || !selectedDeptId) return;
    try {
      const res = await queueAPI.getDepartmentQueue(hospitalId, selectedDeptId);
      setQueueData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setRefreshing(false);
    }
  }, [hospitalId, selectedDeptId]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (selectedDeptId) {
      fetchQueue();
    }
  }, [selectedDeptId, fetchQueue]);

  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const res = await queueAPI.callNext(hospitalId, selectedDeptId);
      Alert.alert('Patient Called', res.data?.data?.message || 'Token called successfully');
      await fetchQueue();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to call patient.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkServing = async (tokenId) => {
    setActionLoading(true);
    try {
      await queueAPI.markServing(tokenId);
      await fetchQueue();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update token.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (tokenId) => {
    setActionLoading(true);
    try {
      await queueAPI.markCompleted(tokenId);
      await fetchQueue();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to complete token.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkNoShow = async (tokenId) => {
    setActionLoading(true);
    try {
      await queueAPI.markNoShow(tokenId);
      await fetchQueue();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to mark no-show.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    dispatch(logout());
    dispatch(clearUser());
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading staff terminal...</Text>
      </View>
    );
  }

  const waitingList = queueData?.grouped?.waiting || [];
  const currentServing = queueData?.grouped?.serving?.[0] || null;
  const currentCalled = queueData?.grouped?.called?.[0] || null;
  const activeToken = currentServing || currentCalled;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQueue(); }} tintColor="#38bdf8" />}
    >
      {/* Staff Header */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hospitalLabel}>HOSPITAL STAFF CONSOLE</Text>
          <Text style={styles.staffName}>{profile?.name || 'Clinical Officer'}</Text>
          <Text style={styles.roleSub}>{profile?.staffRole || 'Doctor'} &bull; Mobile Terminal</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Department Selector */}
      {departments.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
          {departments.map((d) => (
            <TouchableOpacity
              key={d._id}
              style={[styles.deptPill, selectedDeptId === d._id && styles.deptPillActive]}
              onPress={() => setSelectedDeptId(d._id)}
            >
              <Text style={[styles.deptPillText, selectedDeptId === d._id && styles.deptPillTextActive]}>
                {d.name} ({d.code})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Active Consultation Spotlight */}
      <View style={styles.spotlightCard}>
        <Text style={styles.spotlightLabel}>NOW IN CONSULTATION</Text>
        {activeToken ? (
          <View>
            <View style={styles.activeRow}>
              <Text style={styles.bigToken}>{activeToken.tokenDisplay}</Text>
              <View style={[styles.statusBadge, activeToken.status === 'serving' ? styles.badgeGreen : styles.badgeYellow]}>
                <Text style={styles.statusBadgeText}>{activeToken.status.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.patientNameText}>{activeToken.patientName}</Text>
            <Text style={styles.patientPhoneText}>Contact: {activeToken.patientPhone || 'Not provided'}</Text>

            <View style={styles.actionsRow}>
              {activeToken.status === 'called' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnBlue]}
                  onPress={() => handleMarkServing(activeToken._id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.btnText}>Start Consult</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnGreen]}
                onPress={() => handleMarkCompleted(activeToken._id)}
                disabled={actionLoading}
              >
                <Text style={styles.btnText}>✓ Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnRed]}
                onPress={() => handleMarkNoShow(activeToken._id)}
                disabled={actionLoading}
              >
                <Text style={styles.btnText}>✕ No-Show</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noActiveBlock}>
            <Text style={styles.noActiveText}>No patient currently called.</Text>
          </View>
        )}
      </View>

      {/* Call Next Patient Big Button */}
      <TouchableOpacity
        style={[styles.callNextBtn, waitingList.length === 0 && styles.callNextBtnDisabled]}
        onPress={handleCallNext}
        disabled={actionLoading || waitingList.length === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.callNextIcon}>📢</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.callNextTitle}>Call Next Waiting Patient</Text>
          <Text style={styles.callNextSub}>{waitingList.length} patients in line</Text>
        </View>
      </TouchableOpacity>

      {/* Waiting List */}
      <View style={styles.listSection}>
        <Text style={styles.listSectionTitle}>Waiting Patients Queue ({waitingList.length})</Text>
        {waitingList.length === 0 ? (
          <View style={styles.emptyList}>
            <Text style={styles.emptyListText}>Queue is empty. No patients waiting.</Text>
          </View>
        ) : (
          waitingList.map((token, idx) => (
            <View key={token._id} style={styles.queueItem}>
              <Text style={styles.queuePos}>#{idx + 1}</Text>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.queueToken}>{token.tokenDisplay}</Text>
                <Text style={styles.queuePatient}>{token.patientName}</Text>
              </View>
              <TouchableOpacity
                style={styles.directServeBtn}
                onPress={() => handleMarkServing(token._id)}
                disabled={actionLoading}
              >
                <Text style={styles.directServeText}>Serve</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#0f172a',
    paddingTop: 56,
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  hospitalLabel: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  staffName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 2,
  },
  roleSub: {
    fontSize: 13,
    color: '#94a3b8',
  },
  signOutBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  signOutText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  deptScroll: {
    marginBottom: 20,
  },
  deptPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  deptPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  deptPillText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  deptPillTextActive: {
    color: '#ffffff',
  },
  spotlightCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  spotlightLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bigToken: {
    fontSize: 32,
    fontWeight: '900',
    color: '#38bdf8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeGreen: {
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
  },
  badgeYellow: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f8fafc',
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  patientPhoneText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnBlue: {
    backgroundColor: '#0284c7',
  },
  btnGreen: {
    backgroundColor: '#16a34a',
  },
  btnRed: {
    backgroundColor: '#dc2626',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  noActiveBlock: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noActiveText: {
    color: '#64748b',
    fontSize: 14,
  },
  callNextBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  callNextBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  callNextIcon: {
    fontSize: 28,
  },
  callNextTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  callNextSub: {
    color: '#bae6fd',
    fontSize: 12,
  },
  listSection: {
    gap: 10,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptyList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#64748b',
    fontSize: 13,
  },
  queueItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  queuePos: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    width: 28,
  },
  queueToken: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38bdf8',
  },
  queuePatient: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  directServeBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  directServeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
});
