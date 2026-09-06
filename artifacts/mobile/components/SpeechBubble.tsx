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
  hint?: string;
  showHint?: boolean;
  tailDirection?: 'up' | 'down';
}

export function SpeechBubble({
  message,
  onPress,
  hint = 'タップで変更',
  showHint,
  tailDirection = 'down',
}: SpeechBubbleProps) {
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

  const content = (
    <>
      {tailDirection === 'up' ? (
        <View style={styles.tailUpWrap}>
          <View style={styles.tailUpOuter} />
          <View style={styles.tailUpInner} />
        </View>
      ) : null}
      <View style={styles.bubble}>
        <Text style={styles.text}>{message}</Text>
        {(showHint ?? !!onPress) && hint ? <Text style={styles.tap}>{hint}</Text> : null}
      </View>
      {/* しっぽ。面と同じ 1px の輪郭を三角形で継ぐ */}
      {tailDirection === 'down' ? (
        <View style={styles.tailWrap}>
          <View style={styles.tailOuter} />
          <View style={styles.tailInner} />
        </View>
      ) : null}
    </>
  );

  return (
    <Animated.View style={bubbleStyle}>
      {onPress ? (
        <PressScale onPress={onPress} accessibilityLabel={message}>
          {content}
        </PressScale>
      ) : (
        <View pointerEvents="none">{content}</View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 影は付けない。面は白 + 1px のボーダーだけで背景から浮かせる。
  bubble: {
    maxWidth: 280,
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
  tailUpWrap: { alignItems: 'center', marginBottom: -1, zIndex: 1 },
  tailUpOuter: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.border,
  },
  tailUpInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.card,
    marginTop: -8,
  },
});
