import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  Platform,
  type StyleProp,
  type ViewStyle,
  type AccessibilityRole,
  type AccessibilityState,
} from 'react-native';
import { control } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * 押した瞬間だけ 0.97 まで沈み込む押し面。
 *
 * 不透明度は動かさない（色が濁って安く見える）。動かすのは scale だけ。
 * タップできる面はすべてこれを通し、TouchableOpacity は新規で使わないこと。
 */
export function PressScale({
  children,
  onPress,
  onLongPress,
  delayLongPress,
  disabled,
  style,
  scaleTo = control.pressScale,
  hitSlop,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  pointerEvents,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hitSlop?: number;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = useCallback(
    (toValue: number) => {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        stiffness: 420,
        damping: 28,
        mass: 0.7,
      }).start();
    },
    [scale],
  );

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      onPressIn={() => spring(scaleTo)}
      onPressOut={() => spring(1)}
      disabled={disabled}
      hitSlop={hitSlop}
      pointerEvents={pointerEvents}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState ?? { disabled: !!disabled }}
      {...(Platform.OS === 'web' ? { 'aria-expanded': accessibilityState?.expanded, 'aria-checked': accessibilityState?.checked } : {})}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
