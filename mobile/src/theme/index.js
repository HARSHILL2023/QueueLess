import { Platform } from 'react-native';

/**
 * QueueLess patient design system.
 * Warm cream surfaces, soft lavender / peach pastels, generous spacing and
 * pill-shaped controls. Typography carries the hierarchy — no icon set.
 */

export const colors = {
  background: '#FAF6F0',
  backgroundDeep: '#F4EDE3',
  surface: '#FFFFFF',
  surfaceSoft: '#F6F1EA',
  ink: '#241F1B',
  inkSoft: '#4C443C',
  muted: '#8C8177',
  faint: '#B4A99E',
  line: '#EDE4D8',
  lavender: '#EAE4FA',
  lavenderSoft: '#F3EFFD',
  lavenderStrong: '#6D5AD6',
  lavenderInk: '#463A93',
  peach: '#FBE4D3',
  peachSoft: '#FDF0E6',
  peachInk: '#A85E2F',
  sage: '#E4EFE3',
  sageInk: '#3E7350',
  rose: '#FBE2E0',
  roseInk: '#A34A44',
  white: '#FFFFFF',
  overlay: 'rgba(36, 31, 27, 0.35)',
};

export const fonts = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, serif',
  }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const layout = {
  screenPadding: 22,
  maxContentWidth: 520,
};

export const shadows = {
  soft: {
    shadowColor: '#4A3A2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 3,
  },
  lifted: {
    shadowColor: '#4A3A2A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 6,
  },
};

export const type = {
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: colors.ink,
  },
  hero: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '600',
    letterSpacing: -0.8,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.ink,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.ink,
  },
  subheading: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: colors.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkSoft,
  },
  bodySmall: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  caption: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
  },
  captionStrong: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.inkSoft,
  },
  stat: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: colors.ink,
  },
};
