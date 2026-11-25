import React, { useState, useEffect, useCallback } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { queueAPI } from '../../src/services/api';
import { clearCurrentToken, setCurrentToken } from '../../src/store/slices/queueSlice';
import Screen from '../../src/components/Screen';
import ScreenHeader from '../../src/components/ScreenHeader';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import StatusPill, { labelForStatus } from '../../src/components/StatusPill';
import PulseDot from '../../src/components/PulseDot';
import FadeIn from '../../src/components/FadeIn';
import { EmptyState, LoadingState } from '../../src/components/States';
import { colors, radius, spacing, type } from '../../src/theme';

const statusNarrative = (status) => {
  switch (status) {
    case 'called':
      return {
        title: 'Your token has been called',
        body: 'Please proceed to the clinic now. Show this token number at the desk.',
      };
    case 'serving':
      return {
        title: 'You are in consultation',
        body: 'The doctor is attending to you right now.',
      };
    case 'completed':
      return {
        title: 'Consultation completed',
        body: 'This visit is closed. Your record is saved in Activity.',
      };
    default:
      return {
        title: 'Live tracking is on',
        body: 'Your position updates automatically as the queue moves.',
      };
  }
};

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
      'Cancel virtual token?',
      'Are you sure you want to surrender your spot in the queue? This cannot be undone.',
      [
        { text: 'Keep spot', style: 'cancel' },
        {
          text: 'Yes, cancel token',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await queueAPI.cancelToken(tokenId, 'Cancelled by patient');
              dispatch(clearCurrentToken());
              Alert.alert('Token cancelled', 'Your virtual token has been cancelled.');
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
      <Screen>
        <ScreenHeader title="Live token" onBack={() => router.back()} />
        <LoadingState label="Syncing live queue position" />
      </Screen>
    );
  }

  if (!tokenData || !tokenData.token) {
    return (
      <Screen>
        <ScreenHeader
          title="Live token"
          subtitle="Your position in the queue, updated automatically"
          onBack={() => router.back()}
        />
        <EmptyState
          eyebrow="No active token"
          title="You are not in a queue"
          message="You do not have any active virtual queue tokens today."
          actionLabel="Browse hospitals"
          onAction={() => router.replace('/(patient)/hospitals')}
        />
      </Screen>
    );
  }

  const { token, positionInQueue, estimatedWaitMinutes } = tokenData;
  const isCalled = token.status === 'called';
  const isServing = token.status === 'serving';
  const narrative = statusNarrative(token.status);
  const peopleAhead = positionInQueue > 1 ? positionInQueue - 1 : 0;
  const positionLabel = isServing ? 'Now' : isCalled ? 'Called' : `#${positionInQueue || 1}`;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchActiveToken();
          }}
          tintColor={colors.lavenderStrong}
          colors={[colors.lavenderStrong]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      <ScreenHeader
        title="Live token"
        subtitle="Your position in the queue, updated automatically"
        onBack={() => router.replace('/(patient)/hospitals')}
        rightLabel="Activity"
        onRight={() => router.push('/(patient)/history')}
      />

      <FadeIn>
        <Card tone="lavender" style={styles.tokenCard}>
          <View style={styles.tokenTopRow}>
            <View style={styles.liveRow}>
              <PulseDot color={isCalled ? colors.peachInk : colors.lavenderInk} />
              <Text style={styles.tokenEyebrow}>{labelForStatus(token.status)}</Text>
            </View>
            <StatusPill label="Live" tone={isCalled ? 'warning' : 'accent'} />
          </View>

          <Text style={styles.tokenNumber}>{token.tokenDisplay}</Text>
          <Text style={styles.tokenClinic}>
            {token.departmentId?.name || 'Clinic'}
            {token.departmentId?.code ? ` · ${token.departmentId.code}` : ''}
          </Text>
          <Text style={styles.tokenHospital}>{token.hospitalId?.name || 'Healthcare facility'}</Text>
        </Card>
      </FadeIn>

      <FadeIn delay={80}>
        <View style={styles.statusBlock}>
          <Text style={styles.statusTitle}>{narrative.title}</Text>
          <Text style={styles.statusBody}>{narrative.body}</Text>
          {isCalled ? (
            <Text style={styles.statusLocation}>
              {token.departmentId?.floor || 'Clinic'},{' '}
              {token.departmentId?.roomNumber
                ? `Room ${token.departmentId.roomNumber}`
                : 'report at the reception desk'}
            </Text>
          ) : null}
        </View>
      </FadeIn>

      <FadeIn delay={140}>
        <View style={styles.metricsRow}>
          <Card tone="surface" elevated style={styles.metricCard}>
            <Text style={styles.metricLabel}>People ahead</Text>
            <Text style={styles.metricValue}>{isServing ? '0' : peopleAhead}</Text>
            <Text style={styles.metricFoot}>
              {positionLabel === 'Called' ? 'You were called' : 'In this clinic'}
            </Text>
          </Card>

          <Card tone="surface" elevated style={styles.metricCard}>
            <Text style={styles.metricLabel}>Estimated wait</Text>
            <Text style={styles.metricValue}>{isServing ? '0' : estimatedWaitMinutes || 0}</Text>
            <Text style={styles.metricFoot}>Minutes remaining</Text>
          </Card>

          <Card tone="surface" elevated style={styles.metricCard}>
            <Text style={styles.metricLabel}>Position</Text>
            <Text style={styles.metricValue}>{positionLabel}</Text>
            <Text style={styles.metricFoot}>Today’s queue</Text>
          </Card>
        </View>
      </FadeIn>

      <FadeIn delay={200}>
        <Card tone="surface" style={styles.detailsCard}>
          <Text style={type.eyebrow}>Visit details</Text>
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Floor</Text>
              <Text style={styles.detailValue}>{token.departmentId?.floor || 'Ground floor'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Consultation room</Text>
              <Text style={styles.detailValue}>
                Room {token.departmentId?.roomNumber || '101'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Patient</Text>
              <Text style={styles.detailValue}>{token.patientName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Issued</Text>
              <Text style={styles.detailValue}>{token.date}</Text>
            </View>
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={240}>
        <View style={styles.actions}>
          {!isServing ? (
            <Button
              label="Cancel my spot"
              variant="danger"
              loading={cancelling}
              onPress={handleCancelToken}
            />
          ) : null}
          <Button
            label="Back to hospitals"
            variant="outline"
            onPress={() => router.replace('/(patient)/hospitals')}
          />
          <Text style={styles.refreshNote}>
            This screen refreshes every 10 seconds. Pull down to refresh immediately.
          </Text>
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tokenCard: {
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    alignItems: 'flex-start',
  },
  tokenTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tokenEyebrow: {
    ...type.eyebrow,
    color: colors.lavenderInk,
  },
  tokenNumber: {
    ...type.stat,
    fontSize: 76,
    lineHeight: 84,
    letterSpacing: -1,
    color: colors.lavenderInk,
    marginTop: spacing.sm,
  },
  tokenClinic: {
    ...type.heading,
    color: colors.lavenderInk,
  },
  tokenHospital: {
    ...type.bodySmall,
    color: colors.lavenderInk,
    opacity: 0.75,
  },
  statusBlock: {
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  statusTitle: {
    ...type.title,
    fontSize: 22,
    lineHeight: 28,
  },
  statusBody: {
    ...type.bodySmall,
    color: colors.muted,
  },
  statusLocation: {
    ...type.captionStrong,
    color: colors.peachInk,
    marginTop: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metricCard: {
    flex: 1,
    padding: spacing.base,
    gap: 2,
    borderRadius: radius.md,
  },
  metricLabel: {
    ...type.eyebrow,
    fontSize: 9.5,
    letterSpacing: 1,
    color: colors.faint,
  },
  metricValue: {
    ...type.stat,
    fontSize: 30,
    lineHeight: 36,
  },
  metricFoot: {
    ...type.caption,
    fontSize: 11,
    color: colors.muted,
  },
  detailsCard: {
    marginTop: spacing.base,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailsList: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingBottom: spacing.md,
  },
  detailLabel: {
    ...type.caption,
    color: colors.muted,
  },
  detailValue: {
    ...type.captionStrong,
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  refreshNote: {
    ...type.caption,
    fontSize: 11.5,
    textAlign: 'center',
    color: colors.faint,
    marginTop: spacing.xs,
  },
});
