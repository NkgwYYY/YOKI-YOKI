/**
 * YOKI-YOKI デザインシステム — 単一のソース・オブ・トゥルース。
 *
 * コンセプト: "Little Felt World" (ミルク色の布、若葉、いちご色の刺繍)
 * クリーム・ピスタチオ・いちごミルク。陰影と縫い目で、触れたくなる世界へ。
 */

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

const atelierColors = {
  900: '#574234', // Bright headings
  800: '#644F40', // Main text
  700: '#7F6D5D', // Muted text
  600: '#917E68', // Borders strong, Icons
  500: '#AB9F8D', // Disabled
  400: '#D7C6AA', // Borders subtle
  300: '#E9DFCC', // Muted backgrounds / Dividers
  200: '#F3EBDC', // Secondary surfaces
  100: '#F6F1E5', // App background
  50:  '#FFF9EC', // Raised purple surfaces
} as const;

const charmColors = {
  500: '#627C57', // Violet command fill
  600: '#4C6543', // Primary pressed
  900: '#E4ECD9', // Selected purple surface
} as const;

export const colors = {
  /* 面 */
  background: atelierColors[100],
  backgroundSunken: atelierColors[300],
  card: atelierColors[50], // Raised purple surface
  cardForeground: atelierColors[900],
  sheet: atelierColors[50],
  scrim: 'rgba(45, 32, 60, 0.38)', // Soft purple shadow

  /* 文字 */
  foreground: atelierColors[900],
  text: atelierColors[900],
  mutedForeground: atelierColors[700],
  subtleForeground: atelierColors[600],
  disabledForeground: atelierColors[500],

  /* 塗り */
  muted: atelierColors[200],
  mutedStrong: atelierColors[300],
  input: atelierColors[50],

  /* 境界 */
  border: atelierColors[300],
  borderStrong: atelierColors[400],
  borderSubtle: atelierColors[200],
  borderOnFill: 'rgba(255, 255, 255, 0.5)',

  /* ブランド */
  primary: charmColors[500],
  primaryForeground: '#FFFFFF',
  primaryPressed: charmColors[600],
  primarySoft: charmColors[900],
  primaryOnSoft: '#4D6546',
  ring: charmColors[500],
  tint: charmColors[500],

  /* 補助 */
  success: '#52856B', // Cool-toned green
  successSoft: 'rgba(32, 214, 149, 0.15)',
  warning: '#AF763C', // Vibrant orange
  warningSoft: 'rgba(255, 149, 51, 0.15)',
  danger: '#B75574',
  dangerSoft: 'rgba(255, 77, 109, 0.15)',
  destructive: '#B96673',
  destructiveForeground: '#FFFFFF',

  /* 互換 */
  secondary: atelierColors[200],
  secondaryForeground: atelierColors[800],
  accent: charmColors[500],
  accentForeground: '#FFFFFF',
} as const;

export const homePalette = {
  backgroundTop: '#E8E5F7',
  backgroundMid: '#ECE7FB',
  backgroundBottom: '#E4ECFB',
  groundTop: '#FFA3C1',
  groundBottom: '#FF6595',
  cloudYellow: '#FFE7BF',
  cloudPink: '#F5CBE5',
  cloudBlue: '#C8EAF4',
  cloudHighlight: 'rgba(255, 255, 255, 0.46)',
  foodIcon: '#E06A8B',
  foodSurface: '#FFF0F4',
  recordIcon: '#5B7BE2',
  recordSurface: '#EEF2FF',
  chatIcon: '#40A86A',
  chatSurface: '#ECFAF2',
  playIcon: '#C89D28',
  playSurface: '#FFF7D7',
  playCell: '#F1DB82',
  playMarker: '#E7B944',
  gaugeTrack: '#E8DDCA',
  dateText: '#6D5F8A',
  navActive: '#697F5A',
  navInactive: '#94836C',
  navBackground: '#FFF9EC',
  navBorder: 'rgba(160, 149, 181, 0.22)',
  softShadow: 'rgba(180, 170, 210, 0.25)',
  actionShadow: 'rgba(200, 180, 210, 0.35)',
} as const;

export const roomPalette = {
  wall: '#A66BC4',
  wallLight: '#D98BCB',
  floor: '#8A4E9F',
  floorLine: '#F5B1D8',
  window: '#8C86DE',
  windowNight: '#55418C',
  sofa: '#F05A9D',
  vanity: '#9B6BD0',
  shelf: '#6D4B9B',
  flowerPink: '#FF77B7',
  flowerViolet: '#C79BFF',
  flowerRainbow: '#FFB5DF',
  leaf: '#55D6B0',
  panel: '#F7D8F0',
  groundTop: homePalette.groundTop,
  groundBottom: homePalette.groundBottom,
} as const;

/* ------------------------------------------------------------------ *
 * Spacing
 * ------------------------------------------------------------------ */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;
export const screenPadding = space.xl;

/* ------------------------------------------------------------------ *
 * Radius
 * ------------------------------------------------------------------ */
export const radius = {
  sm: 18,
  md: 22, // Softer curves for dream aesthetic
  homeCard: 20,
  lg: 26,
  xl: 28,
  pill: 999,
} as const;

/* ------------------------------------------------------------------ *
 * Border
 * ------------------------------------------------------------------ */
export const border = {
  width: 1, // Slightly thicker for cute aesthetic
  hairline: { borderWidth: 1, borderColor: colors.border },
  hairlineStrong: { borderWidth: 1, borderColor: colors.borderStrong },
  inner: { borderWidth: 1, borderColor: colors.borderOnFill },
} as const;

/* ------------------------------------------------------------------ *
 * Elevation
 * ------------------------------------------------------------------ */
export const elevation = {
  overlay: {
    shadowColor: atelierColors[700],
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  raised: {
    shadowColor: atelierColors[700],
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

/* ------------------------------------------------------------------ *
 * Typography
 * ------------------------------------------------------------------ */
export const typography = {
  display: { fontSize: 28, lineHeight: 36, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 32, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 28, fontFamily: 'Inter_700Bold', letterSpacing: 0 },
  subhead: { fontSize: 16, lineHeight: 24, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.1 },
  body: { fontSize: 15, lineHeight: 24, fontFamily: 'Inter_400Regular', letterSpacing: 0.2 },
  bodyStrong: { fontSize: 15, lineHeight: 24, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 },
  callout: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', letterSpacing: 0.3 },
  calloutStrong: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  label: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4 },
  caption: { fontSize: 12, lineHeight: 20, fontFamily: 'Inter_400Regular', letterSpacing: 0.4 },
  micro: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
} as const;

/* ------------------------------------------------------------------ *
 * Control sizes
 * ------------------------------------------------------------------ */
export const control = {
  height: 52,
  heightSm: 40,
  minTouch: 44,
  icon: 44,
  iconSm: 32,
  padV: 14,
  padH: 24,
  padVSm: 10,
  padHSm: 16,
  pressScale: 0.97, // slightly squishier
} as const;

/* ------------------------------------------------------------------ *
 * Data palettes
 * ------------------------------------------------------------------ */
export const moodPalette: Record<number, string> = {
  1: '#B96673',
  2: '#AE8153',
  3: '#80788D',
  4: '#7E9B6C',
  5: '#697F5A',
};

export const activityPalette = {
  reading: '#9D8BCE',
  exercise: '#7E9B6C',
  study: '#AE8153',
  journal: '#729F9D',
  earlySleep: '#B3A4CB',
  selfCare: '#697F5A',
} as const;

export const categoryPalette = {
  basics: '#AE8153',
  body: '#7E9B6C',
  mind: '#9D8BCE',
  social: '#729F9D',
} as const;

export const rarityPalette = {
  common: { bg: atelierColors[200], text: atelierColors[800], border: atelierColors[400] },
  rare: { bg: '#203545', text: '#A5DAED', border: '#70C2E8' },
  special: { bg: '#352B45', text: '#55436F', border: '#697F5A' },
} as const;

export const judgePalette = {
  perfect: charmColors[500],
  great: '#7E9B6C',
  good: '#729F9D',
  miss: atelierColors[500],
} as const;

export const lanePalette = ['#697F5A', '#AE8153', '#7E9B6C', '#729F9D'] as const;

export const gameSurface = {
  background: atelierColors[100],
  scrim: 'rgba(42, 24, 70, 0.6)',
} as const;

export const chartPalette = ['#697F5A', '#7E9B6C', '#729F9D', '#AE8153', '#B96673'] as const;

/* ------------------------------------------------------------------ *
 * Hook
 * ------------------------------------------------------------------ */
export type ThemeColors = typeof colors & { radius: number };
export function useColors(): ThemeColors { return THEME_COLORS; }
const THEME_COLORS: ThemeColors = { ...colors, radius: radius.lg };
export default colors;
