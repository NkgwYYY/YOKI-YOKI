/**
 * 宇宙テーマ（ホーム画面と同じ深宇宙×ガラスパレット）の共通トークン。
 * useColors() と同じキー構成なので、タブ画面では
 * `import { useCosmicColors as useColors } from '@/constants/cosmicTheme'`
 * と差し替えるだけで宇宙テーマに統一できる。
 */
export const COSMIC = {
  text: '#FFFFFF',
  tint: '#B79CE4',
  background: '#0A051A',
  foreground: '#FFFFFF',
  card: 'rgba(28,18,61,0.55)',
  cardForeground: '#FFFFFF',
  primary: '#9B72CB',
  primaryForeground: '#FFFFFF',
  secondary: '#80D0C7',
  secondaryForeground: '#FFFFFF',
  muted: 'rgba(255,255,255,0.12)',
  mutedForeground: 'rgba(255,255,255,0.62)',
  accent: '#FFB347',
  accentForeground: '#1A0E2E',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  border: 'rgba(255,255,255,0.12)',
  input: 'rgba(255,255,255,0.12)',
  radius: 20,
} as const;

/** モーダル・シートなど不透明が必要な面 */
export const COSMIC_SHEET = '#241949';

export function useCosmicColors() {
  return COSMIC;
}
