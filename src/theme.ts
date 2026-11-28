import { useColorScheme } from 'react-native';

/**
 * "The bulkhead instrument." A barometer that would look right screwed to
 * a boat's bulkhead or a hallway wall: a pale face in a graphite bezel,
 * fine black graduations, large engraved-looking figures, and one colored
 * hand. Calm fog greys around it, so the reading is the only thing that
 * stands out.
 *
 * One accent, sea-glass teal, and it means "the reading or the thing to
 * do": the needle, the chart line, the main button. Picked choices are
 * solid ink, never teal. Nothing else is colored. Dark follows the system
 * (a night watch: near-black, a graphite face, the teal lifted).
 */
export interface Theme {
  /** The wall: the screen background. */
  bg: string;
  /** The face: cards, the dial, sheets. */
  face: string;
  /** Inputs and quiet wells. */
  well: string;
  /** One step up: pressed rows, segment tracks. */
  raised: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** Hairlines and graduations' minor ticks. */
  rule: string;
  /** The 1 px edge of a plate. */
  edge: string;
  /** The bezel around the dial. */
  bezel: string;
  bezelInk: string;
  /** The one accent: needle, chart line, main button. */
  accent: string;
  onAccent: string;
  /** A wash of the accent behind the chart line. */
  accentWash: string;
  /** Picked: solid ink. */
  picked: string;
  onPicked: string;
  /** Stretches with no readings on the chart. */
  gap: string;
  danger: string;
  /** The PDF page: white in both themes, as it prints. */
  paper: string;
  scrim: string;
  isDark: boolean;
}

export const lightTheme: Theme = {
  bg: '#ECEEEA',
  face: '#FBFBF8',
  well: '#F3F4F0',
  raised: '#E0E3DE',
  ink: '#101418',
  inkSoft: '#4A5258',
  inkFaint: '#757E84',
  rule: '#D6DAD4',
  edge: 'rgba(16, 20, 24, 0.12)',
  bezel: '#1F272C',
  bezelInk: '#C9D0D3',
  accent: '#0B6E66',
  onAccent: '#FFFFFF',
  accentWash: 'rgba(11, 110, 102, 0.10)',
  picked: '#101418',
  onPicked: '#FFFFFF',
  gap: '#E4E7E2',
  danger: '#B42318',
  paper: '#FFFFFF',
  scrim: 'rgba(8, 12, 14, 0.45)',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#0A0F12',
  face: '#141B1F',
  well: '#10161A',
  raised: '#222B31',
  ink: '#E8EEF0',
  inkSoft: '#A9B4BA',
  inkFaint: '#7D888F',
  rule: '#28333A',
  edge: 'rgba(255, 255, 255, 0.09)',
  bezel: '#2B363D',
  bezelInk: '#9AA6AD',
  accent: '#5FD4C4',
  onAccent: '#04201D',
  accentWash: 'rgba(95, 212, 196, 0.12)',
  picked: '#E8EEF0',
  onPicked: '#0A0F12',
  gap: '#162026',
  danger: '#FF8A80',
  paper: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.6)',
  isDark: true,
};

/** Follows the system: light unless the phone is in dark mode. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/**
 * Corners: plates are softly rounded like an enamel face; buttons and
 * segments are pills, like the knobs on an instrument panel.
 */
export const radius = { plate: 18, small: 12, pill: 999 };

/** The spacing scale. Every margin, padding and gap is one of these. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

/**
 * Archivo Tab (Archivo, SIL OFL, with its tabular figures made the
 * default by store/tabular-fonts.py): every figure is the same width, so
 * a live reading never jumps sideways. Used for numbers, titles and
 * labels. Sentences people read stay in the system font, which follows
 * Dynamic Type.
 */
export const fonts = {
  regular: 'BR-Regular',
  medium: 'BR-Medium',
  semibold: 'BR-SemiBold',
  bold: 'BR-Bold',
};

/**
 * One type scale:
 *  - reading 64: the live reading on the gauge and the elevation
 *  - title 28: screen titles and onboarding lines
 *  - figure 22: a number in a plate
 *  - body 17: rows, fields, text (system)
 *  - small 14: secondary lines
 *  - label 12: capitals over a group, the scale on the dial
 *  - button 17: buttons
 */
export const type = {
  reading: { fontFamily: fonts.semibold, fontSize: 64, lineHeight: 70, letterSpacing: -1 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 33, letterSpacing: -0.3 },
  figure: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 27 },
  body: { fontSize: 17, lineHeight: 23 },
  strong: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 19 },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  button: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21, letterSpacing: 0.2 },
};

/** Numbers: Archivo Tab, whose figures are all one width. */
export const tabular = { fontFamily: fonts.medium, fontVariant: ['tabular-nums' as const] };

/** Every control is at least this tall. */
export const TOUCH = 48;
/** The main button is this tall. */
export const ACTION = 56;

/** UI font files for useFonts in App.tsx. The PDF preview uses the same names. */
export const UI_FONT_FILES = {
  [fonts.regular]: require('../assets/fonts/ArchivoTab-Regular.ttf'),
  [fonts.medium]: require('../assets/fonts/ArchivoTab-Medium.ttf'),
  [fonts.semibold]: require('../assets/fonts/ArchivoTab-SemiBold.ttf'),
  [fonts.bold]: require('../assets/fonts/ArchivoTab-Bold.ttf'),
};
