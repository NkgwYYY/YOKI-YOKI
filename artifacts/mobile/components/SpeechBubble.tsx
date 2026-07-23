import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface SpeechBubbleProps {
  message: string;
  onPress?: () => void;
}

export function SpeechBubble({ message, onPress }: SpeechBubbleProps) {
  const colors = useColors();

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
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.text, { color: colors.foreground }]}>{message}</Text>
          <Text style={[styles.tap, { color: colors.mutedForeground }]}>タップで変更</Text>
        </View>
        {/* tail */}
        <View style={styles.tailWrap}>
          <View style={[styles.tailOuter, { borderTopColor: colors.border }]} />
          <View style={[styles.tailInner, { borderTopColor: colors.card }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  tap: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  tailWrap: {
    alignItems: 'center',
    marginTop: -1,
  },
  tailOuter: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tailInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -9,
  },
});
