import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import Screen from '../src/components/Screen';
import Button from '../src/components/Button';
import Card from '../src/components/Card';
import StatusPill from '../src/components/StatusPill';
import PulseDot from '../src/components/PulseDot';
import FadeIn from '../src/components/FadeIn';
import { colors, spacing, type } from '../src/theme';

const FEATURES = [
  {
    index: '01',
    title: 'Reserve before you leave',
    body: 'Pick a hospital and clinic, then receive a virtual token instantly.',
  },
  {
    index: '02',
    title: 'Follow the live queue',
    body: 'See people ahead and the estimated wait, refreshed while the line moves.',
  },
  {
    index: '03',
    title: 'Arrive only when close',
    body: 'No crowded waiting rooms. Travel when your token number is near.',
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { role, profile } = useSelector((state) => state.user);

  const goToPortal = () => {
    if (role === 'staff') {
      router.replace('/(staff)/queue');
    } else {
      router.replace('/(patient)/hospitals');
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      goToPortal();
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <FadeIn>
        <View style={styles.brandRow}>
          <Text style={type.eyebrow}>QueueLess</Text>
          {isAuthenticated ? (
            <View style={styles.liveRow}>
              <PulseDot />
              <Text style={styles.signedIn}>
                {profile?.name ? `${profile.name.split(' ')[0]} · ` : ''}
                {role}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.hero}>
          Healthcare queues,{'\n'}without the waiting room.
        </Text>
        <Text style={styles.heroBody}>
          Book a virtual outpatient token, track your position live, and arrive at the clinic only
          when your turn is close.
        </Text>
      </FadeIn>

      <FadeIn delay={100} style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.index} style={styles.featureRow}>
            <Text style={styles.featureIndex}>{feature.index}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureBody}>{feature.body}</Text>
            </View>
          </View>
        ))}
      </FadeIn>

      <FadeIn delay={180}>
        <Card tone="lavenderSoft" style={styles.noteCard}>
          <StatusPill label="Online tokens only" tone="accent" />
          <Text style={styles.noteText}>
            Tokens are issued through the app. Your place in the queue is held while you travel to
            the hospital.
          </Text>
        </Card>
      </FadeIn>

      <FadeIn delay={240}>
        <View style={styles.actions}>
          <Button
            label={isAuthenticated ? 'Enter QueueLess' : 'Get started'}
            variant="primary"
            size="lg"
            onPress={handleGetStarted}
          />
          {!isAuthenticated ? (
            <>
              <Button
                label="Create an account"
                variant="soft"
                onPress={() => router.push('/(auth)/register')}
              />
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              >
                <Text style={styles.linkMuted}>Already registered? </Text>
                <Text style={styles.link}>Sign in</Text>
              </Pressable>
            </>
          ) : (
            <Button label="My activity" variant="soft" onPress={() => router.push('/(patient)/history')} />
          )}
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    justifyContent: 'space-between',
    gap: spacing.xxl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  signedIn: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkSoft,
  },
  hero: {
    ...type.hero,
    fontSize: 40,
    lineHeight: 47,
  },
  heroBody: {
    ...type.body,
    color: colors.muted,
    marginTop: spacing.base,
    maxWidth: 340,
  },
  features: {
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: spacing.lg,
  },
  featureIndex: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.lavenderInk,
    width: 24,
    paddingTop: 2,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    ...type.subheading,
    fontSize: 15.5,
  },
  featureBody: {
    ...type.caption,
    color: colors.muted,
  },
  noteCard: {
    gap: spacing.sm,
  },
  noteText: {
    ...type.bodySmall,
    color: colors.lavenderInk,
    opacity: 0.85,
  },
  actions: {
    gap: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  linkMuted: {
    ...type.bodySmall,
    color: colors.muted,
  },
  link: {
    ...type.bodySmall,
    fontWeight: '700',
    color: colors.lavenderInk,
  },
  pressed: {
    opacity: 0.6,
  },
});
