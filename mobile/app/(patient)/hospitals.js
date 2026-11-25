import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { hospitalAPI, queueAPI } from '../../src/services/api';
import { setCurrentToken } from '../../src/store/slices/queueSlice';
import Screen from '../../src/components/Screen';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Field from '../../src/components/Field';
import SectionHeading from '../../src/components/SectionHeading';
import StatusPill from '../../src/components/StatusPill';
import PulseDot from '../../src/components/PulseDot';
import FadeIn from '../../src/components/FadeIn';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/States';
import { colors, layout, radius, spacing, type } from '../../src/theme';

const greetingForHour = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatVisitDate = (value) => {
  if (!value) return 'Previous visit';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Previous visit';
  return `Visited ${parsed.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
};

export default function PatientHomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.user);
  const { currentToken } = useSelector((state) => state.queue);

  const [hospitals, setHospitals] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHospitals = useCallback(async () => {
    setError('');
    try {
      const [hospRes, activeRes, historyRes] = await Promise.all([
        hospitalAPI.getHospitals({ search: search || undefined, verifiedOnly: 'true' }),
        queueAPI.getActiveToken().catch(() => ({ data: { data: null } })),
        queueAPI.getHistory().catch(() => ({ data: { data: [] } })),
      ]);

      setHospitals(hospRes.data?.data || []);
      setHistory(historyRes.data?.data || []);

      if (activeRes.data?.data) {
        dispatch(setCurrentToken(activeRes.data.data));
      } else {
        dispatch(setCurrentToken(null));
      }
    } catch (err) {
      console.error('Error fetching hospitals:', err);
      setError(
        err.response
          ? 'We could not reach the hospital directory. Please try again.'
          : 'No connection to QueueLess. Check your network and try again.'
      );
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

  const recentHospitals = useMemo(() => {
    const seen = new Map();
    history.forEach((item) => {
      const hospital = item.hospitalId;
      if (hospital?._id && !seen.has(hospital._id)) {
        seen.set(hospital._id, {
          ...hospital,
          lastVisit: item.completedAt || item.createdAt || item.date,
        });
      }
    });
    return Array.from(seen.values()).slice(0, 6);
  }, [history]);

  const firstName = profile?.name ? String(profile.name).split(' ')[0] : 'there';
  const activeTokenNumber =
    currentToken?.token?.tokenDisplay || currentToken?.tokenDisplay || null;

  const openHospital = (hospitalId) => router.push(`/(patient)/hospital/${hospitalId}`);

  const renderHospital = ({ item, index }) => (
    <FadeIn delay={Math.min(index, 6) * 45} distance={10}>
      <Pressable
        onPress={() => openHospital(item._id)}
        accessibilityRole="button"
        accessibilityLabel={`View clinics at ${item.name}`}
        style={({ pressed }) => [pressed && styles.pressedCard]}
      >
        <Card tone="surface" elevated style={styles.hospitalCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.hospitalName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.code ? <StatusPill label={item.code} tone="neutral" /> : null}
          </View>

          <Text style={styles.hospitalMeta}>
            {[item.address?.city, item.address?.state].filter(Boolean).join(', ') ||
              'Location available on request'}
          </Text>

          <Text style={styles.hospitalDesc} numberOfLines={2}>
            {item.description || 'Verified healthcare centre offering online virtual queue booking.'}
          </Text>

          <View style={styles.cardDivider} />

          <View style={styles.cardFooterRow}>
            <View style={styles.cardFooterBlock}>
              <Text style={styles.cardFooterLabel}>Outpatient hours</Text>
              <Text style={styles.cardFooterValue}>
                {item.settings?.openTime || '08:00'} – {item.settings?.closeTime || '20:00'}
              </Text>
            </View>
            <Text style={styles.inlineAction}>View clinics</Text>
          </View>
        </Card>
      </Pressable>
    </FadeIn>
  );

  const header = (
    <View style={styles.headerBlock}>
      <FadeIn>
        <View style={styles.brandRow}>
          <Text style={type.eyebrow}>QueueLess</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/(patient)/history')}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.textAction, pressed && styles.pressedText]}
            >
              <Text style={styles.textActionLabel}>Activity</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(patient)/profile')}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.textAction, pressed && styles.pressedText]}
            >
              <Text style={styles.textActionLabel}>Profile</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.greeting}>
          {greetingForHour()},{'\n'}
          <Text style={styles.greetingName}>{firstName}</Text>
        </Text>
        <Text style={styles.greetingSub}>
          Book a virtual token and arrive only when your turn is close.
        </Text>
      </FadeIn>

      {activeTokenNumber ? (
        <FadeIn delay={90}>
          <Pressable
            onPress={() => router.push('/(patient)/active-token')}
            accessibilityRole="button"
            accessibilityLabel={`Track active token ${activeTokenNumber}`}
            style={({ pressed }) => [pressed && styles.pressedCard]}
          >
            <Card tone="lavender" style={styles.activeCard}>
              <View style={styles.activeTopRow}>
                <View style={styles.activeLabelRow}>
                  <PulseDot />
                  <Text style={styles.activeLabel}>Live token</Text>
                </View>
                <Text style={styles.activeTap}>Track</Text>
              </View>
              <Text style={styles.activeNumber}>{activeTokenNumber}</Text>
              <Text style={styles.activeSub}>
                Your place in the queue is updating automatically. Open to see people ahead and
                estimated wait.
              </Text>
            </Card>
          </Pressable>
        </FadeIn>
      ) : null}

      <FadeIn delay={activeTokenNumber ? 150 : 100}>
        <View style={styles.searchBlock}>
          <Field
            placeholder="Search hospital or city"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="words"
            accessibilityLabel="Search hospitals"
          />
        </View>
      </FadeIn>

      {recentHospitals.length > 0 ? (
        <View style={styles.recentBlock}>
          <SectionHeading
            eyebrow="Continue where you left off"
            title="Recently visited"
            style={styles.recentHeading}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          >
            {recentHospitals.map((hospital) => (
              <Pressable
                key={hospital._id}
                onPress={() => openHospital(hospital._id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${hospital.name}`}
                style={({ pressed }) => [styles.recentCard, pressed && styles.pressedCard]}
              >
                <Text style={styles.recentName} numberOfLines={2}>
                  {hospital.name || 'Hospital'}
                </Text>
                <Text style={styles.recentCity} numberOfLines={1}>
                  {[hospital.address?.city, hospital.address?.state].filter(Boolean).join(', ') ||
                    'Clinic visit'}
                </Text>
                <Text style={styles.recentDate}>{formatVisitDate(hospital.lastVisit)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <SectionHeading
        eyebrow="Verified facilities"
        title="Hospitals"
        subtitle={
          loading || error ? undefined : `${hospitals.length} ${hospitals.length === 1 ? 'hospital' : 'hospitals'} accepting online tokens`
        }
        style={styles.listHeading}
      />
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={error ? [] : hospitals}
        keyExtractor={(item) => item._id}
        renderItem={renderHospital}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lavenderStrong}
            colors={[colors.lavenderStrong]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={
          error ? (
            <ErrorState title="Hospital directory unavailable" message={error} onAction={fetchHospitals} />
          ) : loading ? (
            <LoadingState label="Finding verified hospitals" />
          ) : (
            <EmptyState
              eyebrow="Nothing here yet"
              title="No hospitals found"
              message={
                search
                  ? 'No verified hospital matches that search. Try a different name or city.'
                  : 'Verified hospitals will appear here as soon as they go live.'
              }
              actionLabel={search ? 'Clear search' : undefined}
              onAction={search ? () => setSearch('') : undefined}
            />
          )
        }
        ListFooterComponent={
          !loading && !error && hospitals.length > 0 ? (
            <View style={styles.listFooter}>
              <Text style={styles.footerNote}>
                Tokens are issued online only. Your queue position is held while you travel.
              </Text>
              <Button
                label="My activity"
                variant="soft"
                size="sm"
                onPress={() => router.push('/(patient)/history')}
              />
            </View>
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
  headerBlock: {
    paddingTop: spacing.base,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  textAction: {
    paddingVertical: 2,
  },
  textActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  pressedText: {
    opacity: 0.5,
  },
  greeting: {
    ...type.hero,
    marginTop: spacing.lg,
  },
  greetingName: {
    ...type.hero,
    color: colors.lavenderInk,
  },
  greetingSub: {
    ...type.body,
    color: colors.muted,
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  activeCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 2,
    gap: spacing.sm,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeLabel: {
    ...type.eyebrow,
    color: colors.lavenderInk,
  },
  activeTap: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.lavenderInk,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  activeNumber: {
    ...type.stat,
    fontSize: 40,
    lineHeight: 46,
    color: colors.lavenderInk,
  },
  activeSub: {
    ...type.bodySmall,
    color: colors.lavenderInk,
    opacity: 0.8,
  },
  searchBlock: {
    marginTop: spacing.xl,
  },
  recentBlock: {
    marginTop: spacing.xl,
  },
  recentHeading: {
    marginBottom: spacing.md,
  },
  recentList: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  recentCard: {
    width: 172,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  recentName: {
    ...type.subheading,
    fontSize: 14,
  },
  recentCity: {
    ...type.caption,
  },
  recentDate: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.faint,
    marginTop: spacing.sm,
  },
  listHeading: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  hospitalCard: {
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  hospitalName: {
    ...type.title,
    fontSize: 21,
    lineHeight: 27,
    flex: 1,
  },
  hospitalMeta: {
    ...type.captionStrong,
    color: colors.muted,
  },
  hospitalDesc: {
    ...type.bodySmall,
    color: colors.inkSoft,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardFooterBlock: {
    gap: 2,
  },
  cardFooterLabel: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.faint,
  },
  cardFooterValue: {
    ...type.bodySmall,
    fontWeight: '600',
    color: colors.ink,
  },
  inlineAction: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.lavenderInk,
  },
  pressedCard: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  listFooter: {
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.base,
  },
  footerNote: {
    ...type.caption,
    textAlign: 'center',
    maxWidth: 300,
  },
});
