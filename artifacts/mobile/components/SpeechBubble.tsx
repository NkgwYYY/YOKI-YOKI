import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { border, colors, radius, space, typography } from '@/constants/theme';
import { PressScale } from '@/components/ui/PressScale';

interface SpeechBubbleProps {
  message: string;
  onPress?: () => void;
}

export function SpeechBubble({ message, onPress }: SpeechBubbleProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    scale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 200 }));
    // gentle float
    wiggle.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 1800 }),
        withTiming(2, { duration: 1800 })
      ),
      -1,
      true
    );
  }, [message]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: wiggle.value },
    ],
  }));

  return (
    <Animated.View style={bubbleStyle}>
      <PressScale onPress={onPress} accessibilityLabel={message}>
        <View style={styles.bubble}>
          <Text style={styles.text}>{message}</Text>
          <Text style={styles.tap}>タップで変更</Text>
        </View>
        {/* しっぽ。面と同じ 1px の輪郭を三角形で継ぐ */}
        <View style={styles.tailWrap}>
          <View style={styles.tailOuter} />
          <View style={styles.tailInner} />
        </View>
      </PressScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 影は付けない。面は白 + 1px のボーダーだけで背景から浮かせる。
  bubble: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    ...border.hairline,
    alignItems: 'center',
    gap: space.xs,
  },
  text: { ...typography.calloutStrong, color: colors.foreground, textAlign: 'center' },
  tap: { ...typography.micro, color: colors.mutedForeground },
  tailWrap: { alignItems: 'center', marginTop: -1 },
  tailOuter: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.border,
  },
  tailInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.card,
    marginTop: -9,
  },
});
