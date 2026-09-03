import React from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, control, radius } from '@/constants/theme';

/**
 * アプリで使う唯一のアイコン。Feather の単色線画だけを使う。
 *
 * Feather は 24 グリッド上を 2px のストロークで描いているので、実効線幅は
 * `size * 2 / 24`。既定の `md`（18）でちょうど 1.5px になる。線幅をそろえるため
 * サイズは必ず `iconSize` から選び、生の数値を渡さないこと。
 *
 * 絵文字は使わない。意味を持つ記号はすべてここを通す。
 */
export type IconName = React.ComponentProps<typeof Feather>['name'];

export const iconSize = {
  /** 14 — 行内の補助記号 */
  xs: 14,
  /** 16 — ボタン内、リスト行の矢印 */
  sm: 16,
  /** 18 — 既定（実効線幅 1.5px） */
  md: 18,
  /** 22 — セクション見出し、丸枠の中 */
  lg: 22,
  /** 28 — 空状態・達成表示の主役 */
  xl: 28,
} as const;

export function Icon({
  name,
  size = iconSize.md,
  color = colors.subtleForeground,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Feather name={name} size={size} color={color} style={style} />;
}

/**
 * 淡い紫の丸にアイコンを 1 つ。リスト行の先頭や統計の見出しに使う。
 * 面は塗りだけで、影もボーダーも付けない。
 */
export function IconBadge({
  name,
  size = 'md',
  tint = colors.primaryOnSoft,
  background = colors.primarySoft,
  style,
}: {
  name: IconName;
  /** sm = 32 / md = 40 / lg = 48 */
  size?: 'sm' | 'md' | 'lg';
  tint?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const box = size === 'sm' ? control.iconSm : size === 'lg' ? control.height : control.icon;
  const glyph = size === 'sm' ? iconSize.sm : size === 'lg' ? iconSize.lg : iconSize.md;
  return (
    <View
      style={[styles.badge, { width: box, height: box, backgroundColor: background }, style]}
    >
      <Icon name={name} size={glyph} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
