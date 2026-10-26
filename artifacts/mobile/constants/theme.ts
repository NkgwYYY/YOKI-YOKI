/**
 * YOKI-YOKI デザインシステム — 単一のソース・オブ・トゥルース。
 *
 * コンセプト: "Lavender Keepsakes" (ラベンダーの布とミルク色の紙、柔らかな暮らし)
 * ピンク、ラベンダー、パープルを基調とした、透明感と温かみのある世界観。
 */

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

const atelierColors = {
  900: '#4B3D5C', // Bright headings
  800: '#5B4C69', // Main text
  700: '#796B89', // Muted text
  600: '#8C7B9C', // Borders strong, Icons
  500: '#A398AE', // Disabled
  400: '#CEBEDC', // Borders subtle
  300: '#E7DDEC', // Muted backgrounds / Dividers
  200: '#F3EDF7', // Secondary surfaces
  100: '#F7F2FA', // App background
  50:  '#FFFBFF', // Raised purple surfaces
} as const;

const charmColors = {
  500: '#8465A3', // Violet command fill
  600: '#6B5089', // Primary pressed
  900: '#EDE2F5', // Selected purple surface
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
  primaryOnSoft: '#705188',
  ring: charmColors[500],
  tint: charmColors[500],

  /* 補助 */
  success: '#52856B', // Cool-toned green
  successSoft: 'rgba(32, 214, 149, 0.15)',
  warning: '#AF763C', // Vibrant orange
  warningSoft: 'rgba(255, 149, 51, 0.15)',
  danger: '#B75574',
  dangerSoft: 'rgba(255, 77, 109, 0.15)',
  destructive: '#FF4D6D',
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
  gaugeTrack: '#EDE8F5',
  dateText: '#6D5F8A',
  navActive: '#756293',
  navInactive: '#94849F',
  navBackground: '#FFFAFF',
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
  sm: 12,
  md: 16, // Softer curves for dream aesthetic
  homeCard: 20,
  lg: 22,
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
  pressScale: 0.98, // slightly squishier
} as const;

/* ------------------------------------------------------------------ *
 * Data palettes
 * ------------------------------------------------------------------ */
export const moodPalette: Record<number, string> = {
  1: '#FF4D6D',
  2: '#FF9533',
  3: '#80788D',
  4: '#20D695',
  5: '#756293',
};

export const activityPalette = {
  reading: '#9D8BCE',
  exercise: '#20D695',
  study: '#FF9533',
  journal: '#33B5E5',
  earlySleep: '#B3A4CB',
  selfCare: '#756293',
} as const;

export const categoryPalette = {
  basics: '#FF9533',
  body: '#20D695',
  mind: '#9D8BCE',
  social: '#33B5E5',
} as const;

export const rarityPalette = {
  common: { bg: atelierColors[200], text: atelierColors[800], border: atelierColors[400] },
  rare: { bg: '#203545', text: '#A5DAED', border: '#70C2E8' },
  special: { bg: '#352B45', text: '#55436F', border: '#756293' },
} as const;

export const judgePalette = {
  perfect: charmColors[500],
  great: '#20D695',
  good: '#33B5E5',
  miss: atelierColors[500],
} as const;

export const lanePalette = ['#756293', '#FF9533', '#20D695', '#33B5E5'] as const;

export const gameSurface = {
  background: atelierColors[100],
  scrim: 'rgba(42, 24, 70, 0.6)',
} as const;

export const chartPalette = ['#756293', '#20D695', '#33B5E5', '#FF9533', '#FF4D6D'] as const;

/* ------------------------------------------------------------------ *
 * Hook
 * ------------------------------------------------------------------ */
export type ThemeColors = typeof colors & { radius: number };
export function useColors(): ThemeColors { return THEME_COLORS; }
const THEME_COLORS: ThemeColors = { ...colors, radius: radius.lg };
export default colors;
