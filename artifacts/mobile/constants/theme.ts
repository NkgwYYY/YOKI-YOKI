/**
 * YOKI-YOKI デザインシステム — 単一のソース・オブ・トゥルース。
 *
 * 原則
 * 1. 色は「ライトパープル」1系統に統一する。装飾的なグラデーションは使わない。
 * 2. 面の区切りは 1px の hairline ボーダー（`colors.border`）で表現する。影は
 *    コンテンツの上に浮くもの（モーダル・シート）だけに限定する。
 * 3. 余白は 8pt グリッド（`space`）。4 は half-step。生の数値は書かない。
 * 4. 文字は `typography` のスケールから選ぶ。fontSize / lineHeight / fontFamily /
 *    letterSpacing を個別に指定しない。
 * 5. 絵文字は使わない。アイコンは `components/ui/Icon` の単色線画だけ。
 */

/* ------------------------------------------------------------------ *
 * Primitives — 意味を持たない生の値。UI から直接参照しないこと。
 * ------------------------------------------------------------------ */

/** ブランドの土台となるライトパープルの階調。面と境界に使う。 */
const purple = {
  25: '#FCFBFE',
  50: '#FAF8FF',
  100: '#F3E8FF',
  200: '#E9D5FF',
  300: '#DCC6F5',
  400: '#C6A8EB',
} as const;

/** 操作可能な要素に使う彩度の高い端。面には広く敷かない。 */
const violet = {
  500: '#8B5CF6',
  600: '#7C3AED',
  700: '#6D28D9',
  800: '#5B21B6',
} as const;

/** ニュートラルグレー。文字とアイコン用。 */
const ink = {
  900: '#111827',
  700: '#374151',
  500: '#6B7280',
  400: '#9CA3AF',
  300: '#D1D5DB',
} as const;

/* ------------------------------------------------------------------ *
 * Semantic colors
 * ------------------------------------------------------------------ */

export const colors = {
  /* 面 */
  background: purple[25],
  /** 背景から一段沈めたい区画（セクション帯など） */
  backgroundSunken: purple[50],
  card: '#FFFFFF',
  cardForeground: ink[900],
  /** モーダル・ボトムシートなど、不透明が必須の面 */
  sheet: '#FFFFFF',
  /** シート背後のスクリム */
  scrim: 'rgba(17, 24, 39, 0.32)',

  /* 文字 */
  foreground: ink[900],
  text: ink[900],
  /** 補足・キャプション。本文サイズでも AA を満たす明度に留めてある。 */
  mutedForeground: ink[500],
  /** アイコンや区切り記号など、読解に必須でない要素のみ */
  subtleForeground: ink[400],
  disabledForeground: ink[300],

  /* 塗り */
  /** チップ・入力欄・二次ボタンの塗り */
  muted: purple[100],
  /** muted の上にさらに重ねる面 */
  mutedStrong: purple[200],
  input: '#FFFFFF',

  /* 境界 — すべて 1px */
  /** 白い面（card / sheet）の上の境界 */
  border: purple[200],
  /** `background` の上に直接置く要素の境界。border では明度差が足りない。 */
  borderStrong: purple[300],
  /** 入力欄など、面と同色の背景の上で輪郭を出したいとき */
  borderSubtle: purple[100],
  /** 濃い面の内側に入れる 1px。光が当たったような立体感を作る。 */
  borderOnFill: 'rgba(255, 255, 255, 0.2)',

  /* ブランド */
  primary: violet[600],
  primaryForeground: '#FFFFFF',
  primaryPressed: violet[700],
  /** primary の淡い面。上に載せる文字は primaryOnSoft を使う。 */
  primarySoft: purple[100],
  primaryOnSoft: violet[700],
  /** フォーカスリング */
  ring: violet[500],
  tint: violet[600],

  /* 補助（意味を持つ色。装飾には使わない） */
  success: '#0E7C5A',
  successSoft: '#E3F4EE',
  warning: '#9A6410',
  warningSoft: '#FBF0DE',
  danger: '#C0344A',
  dangerSoft: '#FBE9EC',
  destructive: '#C0344A',
  destructiveForeground: '#FFFFFF',

  /* 旧トークンとの互換（段階的に上の意味的トークンへ寄せる） */
  secondary: purple[100],
  secondaryForeground: violet[700],
  accent: violet[600],
  accentForeground: '#FFFFFF',
} as const;

/* ------------------------------------------------------------------ *
 * Spacing — 8pt グリッド。4 のみ half-step として許容する。
 * ------------------------------------------------------------------ */

export const space = {
  /** 4 — アイコンとラベルの間など、密着させたいときだけ */
  xs: 4,
  /** 8 — 基準単位 */
  sm: 8,
  md: 12,
  /** 16 — カード内側の標準パディング */
  lg: 16,
  /** 24 — 画面左右の標準マージン、大きめカードの内側 */
  xl: 24,
  /** 32 — セクション間 */
  xxl: 32,
  /** 48 — 画面上下の大きな区切り */
  xxxl: 48,
} as const;

/** 画面の左右マージン。全画面で共通。 */
export const screenPadding = space.xl;

/* ------------------------------------------------------------------ *
 * Radius
 * ------------------------------------------------------------------ */

export const radius = {
  /** 8 — チップ、小さなアイコン枠 */
  sm: 8,
  /** 10 — ボタン・入力欄・リスト行（コントロール共通） */
  md: 10,
  /** 16 — カード */
  lg: 16,
  /** 24 — ボトムシートの上端、ダイアログ */
  xl: 24,
  pill: 999,
} as const;

/* ------------------------------------------------------------------ *
 * Border — 1px のみ。太い枠線は使わない。
 * ------------------------------------------------------------------ */

export const border = {
  width: 1,
  /** `{ borderWidth: 1, borderColor: colors.border }` の省略形 */
  hairline: { borderWidth: 1, borderColor: colors.border },
  hairlineStrong: { borderWidth: 1, borderColor: colors.borderStrong },
  /** primary など濃い塗りの内側に入れる 1px */
  inner: { borderWidth: 1, borderColor: colors.borderOnFill },
} as const;

/* ------------------------------------------------------------------ *
 * Elevation — コンテンツの上に浮くものだけ。カードには影を付けない。
 * ------------------------------------------------------------------ */

export const elevation = {
  /** モーダル・ボトムシート */
  overlay: {
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  /** ポップオーバー、トースト */
  raised: {
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

/* ------------------------------------------------------------------ *
 * Typography — Inter。ここにあるスタイルだけを使う。
 * lineHeight はすべて 4 の倍数。字間は小さい文字ほど広げる。
 * ------------------------------------------------------------------ */

export const typography = {
  display: { fontSize: 28, lineHeight: 36, fontFamily: 'Inter_700Bold', letterSpacing: 0 },
  title: { fontSize: 22, lineHeight: 32, fontFamily: 'Inter_700Bold', letterSpacing: 0 },
  heading: { fontSize: 18, lineHeight: 28, fontFamily: 'Inter_700Bold', letterSpacing: 0.2 },
  subhead: { fontSize: 16, lineHeight: 24, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  body: { fontSize: 15, lineHeight: 24, fontFamily: 'Inter_400Regular', letterSpacing: 0.3 },
  bodyStrong: { fontSize: 15, lineHeight: 24, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  callout: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  calloutStrong: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  label: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  caption: { fontSize: 12, lineHeight: 20, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  micro: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
} as const;

/* ------------------------------------------------------------------ *
 * Control sizes — タップ領域は 44 を下回らない。
 * ------------------------------------------------------------------ */

export const control = {
  /** 標準ボタン・入力欄の高さ */
  height: 48,
  /** リスト行・二次ボタン */
  heightSm: 40,
  /** 最小タップ領域 */
  minTouch: 44,
  /** 円形アイコンボタン */
  icon: 40,
  iconSm: 32,
  /** ボタンの内側余白。上下 14 / 左右 24 で固定する。 */
  padV: 14,
  padH: 24,
  /** 小さいボタンの内側余白 */
  padVSm: 10,
  padHSm: 16,
  /** 押し込みアニメーションの縮小率 */
  pressScale: 0.97,
} as const;

/* ------------------------------------------------------------------ *
 * Data palettes — 意味のある分類にだけ使う彩色。
 * どれも白の上で 4.5:1 以上を満たす。
 * ------------------------------------------------------------------ */

/** 気分 1〜5。ネガティブ=暖色 → ニュートラル → ポジティブ=紫の発散スケール。 */
export const moodPalette: Record<number, string> = {
  1: '#B03A54',
  2: '#A6612A',
  3: '#6F6688',
  4: '#2E7D6B',
  5: '#6D28D9',
};

/** 記録できる行動カテゴリ。 */
export const activityPalette = {
  reading: '#6D5BA6',
  exercise: '#2F7D6E',
  study: '#8F5E1E',
  journal: '#4A6FA5',
  earlySleep: '#5B5F8F',
  selfCare: '#A6486E',
} as const;

/** チェックリストのカテゴリ。 */
export const categoryPalette = {
  basics: '#8F5E1E',
  body: '#2F7D6E',
  mind: '#6D5BA6',
  social: '#4A6FA5',
} as const;

/** アイテムのレアリティ。塗り・文字・境界の三点セット。 */
export const rarityPalette = {
  common: { bg: '#F4F3F7', text: ink[500], border: '#E5E7EB' },
  rare: { bg: purple[100], text: violet[700], border: purple[200] },
  special: { bg: '#FBF0DE', text: '#8A590C', border: '#E6CB98' },
} as const;

/** リズムゲームの判定表示。白い面の上で読める明度にそろえてある。 */
export const judgePalette = {
  perfect: violet[600],
  great: '#0E7C5A',
  good: '#4A6FA5',
  miss: ink[500],
} as const;

/** リズムゲームのレーン／方向。塗りとして白の上で十分に見分けられる4色。 */
export const lanePalette = ['#A6486E', '#8F5E1E', '#2F7D6E', '#4A6FA5'] as const;

/** ゲーム面の共通トークン。没入させたい領域だけに使う。 */
export const gameSurface = {
  /** 譜面・ステージの面 */
  background: purple[50],
  /** 開始前・一時停止のスクリム（明るいまま重ねる） */
  scrim: 'rgba(250, 248, 255, 0.92)',
} as const;

/** グラフの系列色。1系統目から順に使う。 */
export const chartPalette = ['#7C3AED', '#2F7D6E', '#4A6FA5', '#A6612A', '#A6486E'] as const;

/* ------------------------------------------------------------------ *
 * Hook
 * ------------------------------------------------------------------ */

export type ThemeColors = typeof colors & { radius: number };

/**
 * 画面から色を引くための入口。テーマは 1 つだけなので状態を持たない。
 * `radius` は旧コードとの互換で同梱している（新規コードは `radius.lg` を使う）。
 */
export function useColors(): ThemeColors {
  return THEME_COLORS;
}

const THEME_COLORS: ThemeColors = { ...colors, radius: radius.lg };

export default colors;
