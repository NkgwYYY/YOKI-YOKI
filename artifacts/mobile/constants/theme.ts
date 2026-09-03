/**
 * YOKI-YOKI デザインシステム — 単一のソース・オブ・トゥルース。
 *
 * コンセプト: "Cosmic Cozy" (静かだけれど個性のある小さな宇宙の居場所)
 * 暗い宇宙色（深い紫・紺）をベースに、星の光のようなイエロー/ゴールドをアクセントにする。
 * 白いカードの反復ではなく、深みのある面と光の表現で居場所感を演出する。
 */

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

const spaceColors = {
  900: '#06040A',
  800: '#0F0C20', // Background
  700: '#181328', // Card
  600: '#241E3A', // Muted / Sunken
  500: '#322A4E', // Border Strong
  400: '#4A416D',
  300: '#6C6582', // Subtle Foreground
  200: '#9A92B4', // Muted Foreground
  100: '#D3CBEA',
  50:  '#FDFBFF', // Foreground
} as const;

const starColors = {
  500: '#FFD166', // Primary Starlight
  600: '#E5B955', // Primary Pressed
  900: '#3D2F0A', // Soft background for primary
} as const;

export const colors = {
  /* 面 */
  background: spaceColors[800],
  backgroundSunken: spaceColors[900],
  card: spaceColors[700],
  cardForeground: spaceColors[50],
  sheet: spaceColors[700],
  scrim: 'rgba(6, 4, 10, 0.8)', // 暗いスクリム

  /* 文字 */
  foreground: spaceColors[50],
  text: spaceColors[50],
  mutedForeground: spaceColors[200],
  subtleForeground: spaceColors[300],
  disabledForeground: spaceColors[400],

  /* 塗り */
  muted: spaceColors[600],
  mutedStrong: spaceColors[500],
  input: spaceColors[900],

  /* 境界 */
  border: spaceColors[600],
  borderStrong: spaceColors[500],
  borderSubtle: spaceColors[700],
  borderOnFill: 'rgba(255, 255, 255, 0.15)',

  /* ブランド */
  primary: starColors[500],
  primaryForeground: '#241900', // 暗い文字色でコントラスト確保
  primaryPressed: starColors[600],
  primarySoft: 'rgba(255, 209, 102, 0.15)',
  primaryOnSoft: starColors[500],
  ring: starColors[500],
  tint: starColors[500],

  /* 補助 */
  success: '#06D6A0',
  successSoft: 'rgba(6, 214, 160, 0.15)',
  warning: '#FF9F1C',
  warningSoft: 'rgba(255, 159, 28, 0.15)',
  danger: '#EF476F',
  dangerSoft: 'rgba(239, 71, 111, 0.15)',
  destructive: '#EF476F',
  destructiveForeground: '#FFFFFF',

  /* 互換 */
  secondary: spaceColors[600],
  secondaryForeground: spaceColors[100],
  accent: starColors[500],
  accentForeground: '#241900',
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
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/* ------------------------------------------------------------------ *
 * Border
 * ------------------------------------------------------------------ */
export const border = {
  width: 1,
  hairline: { borderWidth: 1, borderColor: colors.border },
  hairlineStrong: { borderWidth: 1, borderColor: colors.borderStrong },
  inner: { borderWidth: 1, borderColor: colors.borderOnFill },
} as const;

/* ------------------------------------------------------------------ *
 * Elevation
 * ------------------------------------------------------------------ */
export const elevation = {
  overlay: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
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
  pressScale: 0.96,
} as const;

/* ------------------------------------------------------------------ *
 * Data palettes
 * ------------------------------------------------------------------ */
export const moodPalette: Record<number, string> = {
  1: '#EF476F',
  2: '#FF9F1C',
  3: '#A49DBE',
  4: '#06D6A0',
  5: '#FFD166',
};

export const activityPalette = {
  reading: '#9D8BCE',
  exercise: '#06D6A0',
  study: '#FF9F1C',
  journal: '#118AB2',
  earlySleep: '#4A416D',
  selfCare: '#EF476F',
} as const;

export const categoryPalette = {
  basics: '#FF9F1C',
  body: '#06D6A0',
  mind: '#9D8BCE',
  social: '#118AB2',
} as const;

export const rarityPalette = {
  common: { bg: spaceColors[600], text: spaceColors[100], border: spaceColors[500] },
  rare: { bg: 'rgba(157, 139, 206, 0.2)', text: '#D3CBEA', border: '#9D8BCE' },
  special: { bg: 'rgba(255, 209, 102, 0.2)', text: '#FFD166', border: '#FFD166' },
} as const;

export const judgePalette = {
  perfect: starColors[500],
  great: '#06D6A0',
  good: '#118AB2',
  miss: spaceColors[400],
} as const;

export const lanePalette = ['#EF476F', '#FF9F1C', '#06D6A0', '#118AB2'] as const;

export const gameSurface = {
  background: spaceColors[900],
  scrim: 'rgba(6, 4, 10, 0.85)',
} as const;

export const chartPalette = ['#FFD166', '#06D6A0', '#118AB2', '#FF9F1C', '#EF476F'] as const;

/* ------------------------------------------------------------------ *
 * Hook
 * ------------------------------------------------------------------ */
export type ThemeColors = typeof colors & { radius: number };
export function useColors(): ThemeColors { return THEME_COLORS; }
const THEME_COLORS: ThemeColors = { ...colors, radius: radius.lg };
export default colors;
