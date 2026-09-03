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
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost';

const FILL: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary, ...border.inner, borderColor: 'rgba(255,255,255,0.4)' },
  secondary: { backgroundColor: colors.secondary, ...border.hairline },
  outline: { backgroundColor: colors.card, ...border.hairlineStrong, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent', borderWidth: border.width, borderColor: 'transparent' },
};

const LABEL: Record<ButtonVariant, string> = {
  primary: colors.primaryForeground,
  secondary: colors.foreground,
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
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
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

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.pill, // Buttons use pill radius for softer feel
  },
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
  disabled: { backgroundColor: colors.mutedStrong, borderColor: colors.border },
  label: { ...typography.bodyStrong },
  labelSm: { ...typography.calloutStrong },
  row: { flexDirection: 'row', gap: space.sm },
});