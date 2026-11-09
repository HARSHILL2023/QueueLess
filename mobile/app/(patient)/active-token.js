import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { queueAPI } from '../../src/services/api';
import { clearCurrentToken, setCurrentToken } from '../../src/store/slices/queueSlice';

export default function ActiveTokenScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchActiveToken = useCallback(async () => {
    try {
      const res = await queueAPI.getActiveToken();
      const data = res.data?.data;
      if (data && data.token) {
        setTokenData(data);
        dispatch(setCurrentToken(data));
      } else {
        setTokenData(null);
        dispatch(clearCurrentToken());
      }
    } catch (err) {
      console.error('Error fetching active token:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchActiveToken();

    // Auto-poll every 10 seconds to ensure live wait time and position update
    const interval = global.setInterval(fetchActiveToken, 10000);
    return () => global.clearInterval(interval);
  }, [fetchActiveToken]);

  const handleCancelToken = () => {
    const tokenId = tokenData?.token?._id;
    if (!tokenId) return;

    Alert.alert(
      'Cancel Virtual Token?',
      'Are you sure you want to surrender your spot in the queue? This cannot be undone.',
      [
        { text: 'Keep Spot', style: 'cancel' },
        {
          text: 'Yes, Cancel Token',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await queueAPI.cancelToken(tokenId, 'Cancelled by patient');
              dispatch(clearCurrentToken());
              Alert.alert('Token Cancelled', 'Your virtual token has been cancelled.');
              router.replace('/(patient)/hospitals');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to cancel token.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Syncing live queue position...</Text>
      </View>
    );
  }

  if (!tokenData || !tokenData.token) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎫</Text>
        <Text style={styles.emptyTitle}>No Active Token Found</Text>
        <Text style={styles.emptyText}>
          You do not have any active virtual queue tokens today.
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => router.replace('/(patient)/hospitals')}
        >
          <Text style={styles.browseButtonText}>Browse Hospitals & Clinics</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { token, positionInQueue, estimatedWaitMinutes } = tokenData;
  const isCalled = token.status === 'called';
  const isServing = token.status === 'serving';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchActiveToken(); }} tintColor="#38bdf8" />}
    >
      {/* Status Alert Banner */}
      {isCalled ? (
        <View style={styles.calledBanner}>
          <Text style={styles.calledBannerEmoji}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.calledBannerTitle}>YOUR TOKEN HAS BEEN CALLED!</Text>
            <Text style={styles.calledBannerSub}>
              Please proceed immediately to {token.departmentId?.floor || 'Clinic'}, Room {token.departmentId?.roomNumber || '101'}.
            </Text>
          </View>
        </View>
      ) : isServing ? (
        <View style={styles.servingBanner}>
          <Text style={styles.calledBannerEmoji}>🩺</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.servingBannerTitle}>Currently in Consultation</Text>
            <Text style={styles.calledBannerSub}>Doctor is attending to your consultation now.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingBannerText}>
            ⏱ Live Tracking Active: Position automatically updates as the line advances.
          </Text>
        </View>
      )}

      {/* Main Big Token Card */}
      <View style={styles.tokenCard}>
        <View style={styles.tokenHeader}>
          <Text style={styles.hospitalHeaderName}>{token.hospitalId?.name || 'Healthcare Facility'}</Text>
          <View style={[styles.statusBadge, isCalled && styles.statusBadgeCalled, isServing && styles.statusBadgeServing]}>
            <Text style={styles.statusBadgeText}>{token.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.tokenDisplayWrapper}>
          <Text style={styles.tokenLabel}>YOUR VIRTUAL TOKEN</Text>
          <Text style={styles.tokenDisplay}>{token.tokenDisplay}</Text>
          <Text style={styles.deptSub}>{token.departmentId?.name || 'Clinic'} ({token.departmentId?.code || 'GEN'})</Text>
        </View>

        {/* Live Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Queue Position</Text>
            <Text style={styles.metricNumber}>
              {isServing ? 'NOW' : isCalled ? 'CALLED' : `#${positionInQueue || 1}`}
            </Text>
            <Text style={styles.metricSub}>
              {positionInQueue > 1 ? `${positionInQueue - 1} patients ahead` : 'You are next!'}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Est. Wait Time</Text>
            <Text style={styles.metricNumber}>
              {isServing ? '0' : `${estimatedWaitMinutes || 0}`}
            </Text>
            <Text style={styles.metricSub}>Minutes remaining</Text>
          </View>
        </View>

        {/* Clinic & Room Details */}
        <View style={styles.detailsBlock}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Floor / Location:</Text>
            <Text style={styles.detailValue}>{token.departmentId?.floor || 'Ground Floor'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Consultation Room:</Text>
            <Text style={styles.detailValue}>Room {token.departmentId?.roomNumber || '101'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Patient Name:</Text>
            <Text style={styles.detailValue}>{token.patientName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issued Today:</Text>
            <Text style={styles.detailValue}>{token.date}</Text>
          </View>
        </View>

        {/* Cancel Button */}
        {!isServing && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelToken}
            disabled={cancelling}
            activeOpacity={0.8}
          >
            {cancelling ? (
              <ActivityIndicator color="#f87171" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel My Spot in Queue</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace('/(patient)/hospitals')}
      >
        <Text style={styles.backButtonText}>&larr; Back to Hospitals</Text>
      </TouchableOpacity>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  calledBanner: {
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  calledBannerEmoji: {
    fontSize: 32,
  },
  calledBannerTitle: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  calledBannerSub: {
    color: '#fef3c7',
    fontSize: 12,
    lineHeight: 16,
  },
  servingBanner: {
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  servingBannerTitle: {
    color: '#4ade80',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  waitingBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  waitingBannerText: {
    color: '#38bdf8',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  tokenCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  hospitalHeaderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  statusBadgeCalled: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    borderColor: '#f59e0b',
  },
  statusBadgeServing: {
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    borderColor: '#22c55e',
  },
  statusBadgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  tokenDisplayWrapper: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  tokenLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tokenDisplay: {
    fontSize: 48,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1,
  },
  deptSub: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2,
  },
  metricSub: {
    color: '#64748b',
    fontSize: 11,
  },
  detailsBlock: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  detailValue: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 10,
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
  },
  cancelButtonText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
