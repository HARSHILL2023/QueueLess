import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hospitalAPI, queueAPI } from '../../../src/services/api';
import { setCurrentToken } from '../../../src/store/slices/queueSlice';
import Screen from '../../../src/components/Screen';
import ScreenHeader from '../../../src/components/ScreenHeader';
import Card from '../../../src/components/Card';
import Button from '../../../src/components/Button';
import StatusPill from '../../../src/components/StatusPill';
import SectionHeading from '../../../src/components/SectionHeading';
import FadeIn from '../../../src/components/FadeIn';
import { EmptyState, ErrorState, LoadingState } from '../../../src/components/States';
import { colors, layout, radius, spacing, type } from '../../../src/theme';

export default function HospitalDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookedToken, setBookedToken] = useState(null);

  const fetchHospital = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    hospitalAPI
      .getHospital(id)
      .then((res) => setHospital(res.data?.data || null))
      .catch((err) => {
        console.error('Error fetching hospital:', err);
        setLoadError(
          err.response
            ? 'This hospital could not be loaded. It may no longer be available.'
            : 'No connection to QueueLess. Check your network and try again.'
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchHospital();
  }, [fetchHospital]);

  const openConfirmation = (department) => {
    setSelectedDepartment(department);
    setBookingError('');
    setBookedToken(null);
  };

  const closeConfirmation = () => {
    if (booking) return;
    setSelectedDepartment(null);
    setBookingError('');
    setBookedToken(null);
  };

  const confirmBooking = async () => {
    if (!selectedDepartment) return;
    setBooking(true);
    setBookingError('');
    try {
      const res = await queueAPI.getToken(id, selectedDepartment._id, 'Online mobile booking');
      const tokenData = res.data?.data;
      dispatch(setCurrentToken(tokenData));
      setBookedToken(tokenData);
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError(
        err.response?.data?.error ||
          (err.response
            ? 'We could not issue your token. Please try again.'
            : 'No connection to QueueLess. Check your network and try again.')
      );
    } finally {
      setBooking(false);
    }
  };

  const goToLiveToken = () => {
    setSelectedDepartment(null);
    router.push('/(patient)/active-token');
  };

  const departments = hospital?.departments || [];
  const bookedNumber = bookedToken?.token?.tokenDisplay || bookedToken?.tokenDisplay;

  return (
    <Screen padded={false} contentContainerStyle={styles.screenContent}>
      <View style={styles.inner}>
        <ScreenHeader
          onBack={() => router.back()}
          title={hospital?.name || 'Hospital'}
          subtitle={
            hospital
              ? [hospital.address?.street, hospital.address?.city, hospital.address?.state]
                  .filter(Boolean)
                  .join(', ')
              : undefined
          }
        />

        {loading ? (
          <LoadingState label="Loading clinics" />
        ) : loadError ? (
          <ErrorState
            title="Hospital unavailable"
            message={loadError}
            onAction={fetchHospital}
          />
        ) : !hospital ? (
          <EmptyState
            eyebrow="Not found"
            title="Hospital not found"
            message="This facility is no longer listed on QueueLess."
            actionLabel="Browse hospitals"
            onAction={() => router.replace('/(patient)/hospitals')}
          />
        ) : (
          <>
            <FadeIn>
              <Card tone="peachSoft" style={styles.overviewCard}>
                <View style={styles.overviewTopRow}>
                  <Text style={type.eyebrow}>Verified facility</Text>
                  {hospital.code ? <StatusPill label={hospital.code} tone="warning" /> : null}
                </View>

                <Text style={styles.overviewText}>
                  {hospital.description ||
                    'A verified healthcare centre offering online outpatient tokens through QueueLess.'}
                </Text>

                <View style={styles.overviewDivider} />

                <View style={styles.overviewMetrics}>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Outpatient hours</Text>
                    <Text style={styles.metricValue}>
                      {hospital.settings?.openTime || '08:00'} – {hospital.settings?.closeTime || '20:00'}
                    </Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Contact</Text>
                    <Text style={styles.metricValue}>{hospital.phone || 'Available on site'}</Text>
                  </View>
                </View>
              </Card>
            </FadeIn>

            <FadeIn delay={80}>
              <Card tone="surface" style={styles.noticeCard}>
                <Text style={styles.noticeTitle}>Join from anywhere</Text>
                <Text style={styles.noticeBody}>
                  Choose a clinic below to receive a sequential virtual token. Track your position
                  live and arrive when your turn is close.
                </Text>
              </Card>
            </FadeIn>

            <SectionHeading
              eyebrow="Outpatient clinics"
              title={`Departments (${departments.length})`}
              subtitle="Each clinic issues its own numbered queue"
              style={styles.sectionHeading}
            />

            {departments.length === 0 ? (
              <EmptyState
                eyebrow="No clinics"
                title="No online queues open"
                message="This hospital is not accepting virtual tokens for any clinic at the moment."
                actionLabel="Browse other hospitals"
                onAction={() => router.replace('/(patient)/hospitals')}
              />
            ) : (
              departments.map((dept, index) => (
                <FadeIn key={dept._id} delay={Math.min(index, 6) * 50} distance={10}>
                  <Card tone="surface" elevated style={styles.departmentCard}>
                    <View style={styles.departmentTopRow}>
                      <Text style={styles.departmentName}>{dept.name}</Text>
                      {dept.code ? <StatusPill label={dept.code} tone="accent" /> : null}
                    </View>

                    <Text style={styles.departmentMeta}>
                      {[dept.floor, dept.roomNumber ? `Room ${dept.roomNumber}` : null]
                        .filter(Boolean)
                        .join(' · ') || 'Location shared at the front desk'}
                    </Text>

                    <Text style={styles.departmentDesc}>
                      {dept.description || 'Specialist outpatient consultations and medical care.'}
                    </Text>

                    <View style={styles.departmentMetrics}>
                      <View style={styles.metricBlock}>
                        <Text style={styles.metricLabel}>Average consultation</Text>
                        <Text style={styles.metricValue}>{dept.avgWaitMinutes || 15} min</Text>
                      </View>
                      <View style={styles.metricBlock}>
                        <Text style={styles.metricLabel}>Daily token limit</Text>
                        <Text style={styles.metricValue}>{dept.maxTokensPerDay || 100}</Text>
                      </View>
                    </View>

                    <Button
                      label="Join queue"
                      variant="primary"
                      onPress={() => openConfirmation(dept)}
                      style={styles.departmentButton}
                    />
                  </Card>
                </FadeIn>
              ))
            )}
          </>
        )}
      </View>

      <Modal
        visible={Boolean(selectedDepartment)}
        transparent
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={closeConfirmation}
            accessibilityRole="button"
            accessibilityLabel="Dismiss booking"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            {bookedToken ? (
              <>
                <Text style={type.eyebrow}>Token confirmed</Text>
                <Text style={styles.sheetNumber}>{bookedNumber || 'Assigned'}</Text>
                <Text style={styles.sheetTitle}>{selectedDepartment?.name}</Text>
                <Text style={styles.sheetBody}>
                  Your place in the queue is held. Track the live position and arrive when your
                  turn is close.
                </Text>
                <Button
                  label="Track live queue"
                  variant="primary"
                  size="lg"
                  onPress={goToLiveToken}
                  style={styles.sheetButton}
                />
                <Button
                  label="Back to hospital"
                  variant="plain"
                  onPress={closeConfirmation}
                />
              </>
            ) : (
              <>
                <Text style={type.eyebrow}>Confirm booking</Text>
                <Text style={styles.sheetTitle}>{selectedDepartment?.name}</Text>
                <Text style={styles.sheetBody}>
                  A virtual token will be issued for {hospital?.name}. You can cancel it any time
                  before your consultation starts.
                </Text>

                <View style={styles.sheetDetails}>
                  <View style={styles.sheetDetailRow}>
                    <Text style={styles.sheetDetailLabel}>Hospital</Text>
                    <Text style={styles.sheetDetailValue}>{hospital?.name}</Text>
                  </View>
                  <View style={styles.sheetDetailRow}>
                    <Text style={styles.sheetDetailLabel}>Clinic</Text>
                    <Text style={styles.sheetDetailValue}>
                      {selectedDepartment?.code || selectedDepartment?.name}
                    </Text>
                  </View>
                  <View style={styles.sheetDetailRow}>
                    <Text style={styles.sheetDetailLabel}>Average wait</Text>
                    <Text style={styles.sheetDetailValue}>
                      {selectedDepartment?.avgWaitMinutes || 15} min per patient
                    </Text>
                  </View>
                </View>

                {bookingError ? (
                  <View style={styles.sheetError}>
                    <Text style={styles.sheetErrorText}>{bookingError}</Text>
                  </View>
                ) : null}

                {bookingError && /active token/i.test(bookingError) ? (
                  <Button
                    label="View my active token"
                    variant="primary"
                    size="lg"
                    onPress={goToLiveToken}
                    style={styles.sheetButton}
                  />
                ) : (
                  <Button
                    label="Confirm and get token"
                    variant="primary"
                    size="lg"
                    loading={booking}
                    onPress={confirmBooking}
                    style={styles.sheetButton}
                  />
                )}

                <Button label="Not now" variant="plain" onPress={closeConfirmation} disabled={booking} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: spacing.xxxl,
  },
  inner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  overviewCard: {
    gap: spacing.md,
  },
  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  overviewText: {
    ...type.body,
    color: colors.peachInk,
  },
  overviewDivider: {
    height: 1,
    backgroundColor: 'rgba(168, 94, 47, 0.16)',
  },
  overviewMetrics: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metricBlock: {
    flex: 1,
    gap: 3,
  },
  metricLabel: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.faint,
  },
  metricValue: {
    ...type.bodySmall,
    fontWeight: '600',
    color: colors.ink,
  },
  noticeCard: {
    marginTop: spacing.base,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  noticeTitle: {
    ...type.subheading,
  },
  noticeBody: {
    ...type.bodySmall,
    color: colors.muted,
  },
  sectionHeading: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  departmentCard: {
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  departmentTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  departmentName: {
    ...type.title,
    fontSize: 20,
    lineHeight: 26,
    flex: 1,
  },
  departmentMeta: {
    ...type.captionStrong,
    color: colors.muted,
  },
  departmentDesc: {
    ...type.bodySmall,
  },
  departmentMetrics: {
    flexDirection: 'row',
    gap: spacing.lg,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  departmentButton: {
    marginTop: spacing.sm,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  sheetNumber: {
    ...type.stat,
    fontSize: 46,
    lineHeight: 52,
    color: colors.lavenderInk,
    marginTop: spacing.xs,
  },
  sheetTitle: {
    ...type.title,
    fontSize: 23,
    lineHeight: 29,
  },
  sheetBody: {
    ...type.bodySmall,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  sheetDetails: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  sheetDetailLabel: {
    ...type.caption,
    color: colors.muted,
  },
  sheetDetailValue: {
    ...type.captionStrong,
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
  sheetError: {
    backgroundColor: colors.rose,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetErrorText: {
    ...type.bodySmall,
    color: colors.roseInk,
  },
  sheetButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
