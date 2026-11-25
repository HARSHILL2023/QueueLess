import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { queueAPI } from '../../src/services/api';
import Screen from '../../src/components/Screen';
import ScreenHeader from '../../src/components/ScreenHeader';
import Card from '../../src/components/Card';
import StatusPill, { labelForStatus, toneForStatus } from '../../src/components/StatusPill';
import FadeIn from '../../src/components/FadeIn';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/States';
import { colors, layout, spacing, type } from '../../src/theme';

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    setError('');
    try {
      const res = await queueAPI.getHistory();
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(
        err.response
          ? 'We could not load your visit records. Please try again.'
          : 'No connection to QueueLess. Check your network and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const renderItem = ({ item, index }) => {
    const completedTime = item.completedAt ? formatTime(item.completedAt) : '';

    return (
      <FadeIn delay={Math.min(index, 6) * 45} distance={10}>
        <Card tone="surface" elevated style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.tokenText}>{item.tokenDisplay}</Text>
            <StatusPill
              label={labelForStatus(item.status)}
              tone={toneForStatus(item.status)}
            />
          </View>

          <Text style={styles.hospitalName}>{item.hospitalId?.name || 'Hospital'}</Text>
          <Text style={styles.clinicName}>
            {item.departmentId?.name || 'Department'}
            {item.departmentId?.code ? ` · ${item.departmentId.code}` : ''}
          </Text>

          <View style={styles.cardDivider} />

          <View style={styles.cardFooterRow}>
            <View style={styles.footerBlock}>
              <Text style={styles.footerLabel}>Visit date</Text>
              <Text style={styles.footerValue}>{formatDate(item.date)}</Text>
            </View>
            {completedTime ? (
              <View style={[styles.footerBlock, styles.footerRight]}>
                <Text style={styles.footerLabel}>Completed</Text>
                <Text style={styles.footerValue}>{completedTime}</Text>
              </View>
            ) : null}
          </View>
        </Card>
      </FadeIn>
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={error ? [] : history}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchHistory();
            }}
            tintColor={colors.lavenderStrong}
            colors={[colors.lavenderStrong]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <ScreenHeader
            onBack={() => router.replace('/(patient)/hospitals')}
            title="Activity"
            subtitle="Every queue visit and its outcome, in one place"
          />
        }
        ListEmptyComponent={
          error ? (
            <ErrorState title="Activity unavailable" message={error} onAction={fetchHistory} />
          ) : loading ? (
            <LoadingState label="Loading your visits" />
          ) : (
            <EmptyState
              eyebrow="No records yet"
              title="No visits so far"
              message="Once you join a queue, the visit and its outcome will appear here."
              actionLabel="Browse hospitals"
              onAction={() => router.replace('/(patient)/hospitals')}
            />
          )
        }
        ListFooterComponent={
          !loading && !error && history.length > 0 ? (
            <Text style={styles.footerNote}>
              Showing your complete QueueLess visit history.
            </Text>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.base,
    gap: spacing.xs,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  tokenText: {
    ...type.title,
    fontSize: 24,
    lineHeight: 30,
  },
  hospitalName: {
    ...type.subheading,
  },
  clinicName: {
    ...type.caption,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.md,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerBlock: {
    gap: 2,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerLabel: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.faint,
  },
  footerValue: {
    ...type.bodySmall,
    fontWeight: '600',
  },
  footerNote: {
    ...type.caption,
    fontSize: 11.5,
    textAlign: 'center',
    color: colors.faint,
    paddingTop: spacing.base,
  },
});
