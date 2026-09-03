import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { Icon, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

export type ButtonVariant =
  /** 画面の主導線。1 画面に 1 つまで。 */
  | 'primary'
  /** 淡い紫の面。副次的な操作。 */
  | 'secondary'
  /** 白 + 1px ボーダー。並列する選択肢。 */
  | 'outline'
  /** 面を持たない。取り消し・戻るなど。 */
  | 'ghost';

/**
 * 塗りと 1px の内側ボーダー。ボーダーは面より 1 段明るい線を入れて、
 * 塗りっぱなしに見えないようにするためのもの。影は使わない。
 */
const FILL: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary, ...border.inner },
  secondary: { backgroundColor: colors.primarySoft, ...border.hairline },
  outline: { backgroundColor: colors.card, ...border.hairlineStrong },
  ghost: { backgroundColor: 'transparent', borderWidth: border.width, borderColor: 'transparent' },
};

const LABEL: Record<ButtonVariant, string> = {
  primary: colors.primaryForeground,
  secondary: colors.primaryOnSoft,
  outline: colors.foreground,
  ghost: colors.mutedForeground,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  fullWidth,
  style,
  labelStyle,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** md = 上下 14 / 左右 24（主要操作） / sm = 行内・並列 */
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  /** ラベルの左に置くアイコン。色は variant から自動で決まる。 */
  icon?: IconName;
  /** 横幅いっぱいに伸ばす */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const inert = disabled || loading;
  const tint = disabled ? colors.disabledForeground : LABEL[variant];
  const glyph = size === 'md' ? iconSize.md : iconSize.sm;

  return (
    <PressScale
      testID={testID}
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert }}
      style={[
        styles.base,
        size === 'md' ? styles.sizeMd : styles.sizeSm,
        FILL[variant],
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : icon ? (
        <Icon name={icon} size={glyph} color={tint} />
      ) : null}
      <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: tint }, labelStyle]}>
        {label}
      </Text>
    </PressScale>
  );
}

/** ボタンを横並びにする器。等幅にそろえる。 */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.md,
  },
  /** 仕様どおり上下 14 / 左右 24。高さは文字とアイコンに任せる。 */
  sizeMd: {
    paddingVertical: control.padV,
    paddingHorizontal: control.padH,
    minHeight: control.height,
  },
  sizeSm: {
    paddingVertical: control.padVSm,
    paddingHorizontal: control.padHSm,
    minHeight: control.heightSm,
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { backgroundColor: colors.muted, borderColor: colors.border },
  label: { ...typography.bodyStrong },
  labelSm: { ...typography.calloutStrong },
  row: { flexDirection: 'row', gap: space.sm },
});
