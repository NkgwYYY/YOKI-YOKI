import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

/**
 * 星空の背景。Cosmic Cozyテーマの根幹。
 * 微かにまたたく星と、深い紫から紺へのグラデーション。
 */
function Star({ top, left, size, delay, maxOpacity = 0.8 }: { top: DimensionValue; left: DimensionValue; size: number; delay: number; maxOpacity?: number }) {
  const op = useSharedValue(0.1);

  useEffect(() => {
    op.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(maxOpacity, { duration: 2000 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.1, { duration: 2000 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const st = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
        },
        st,
      ]}
    />
  );
}

export function SkyBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#06040A', '#0F0C20', '#181328']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 遠くの星々 */}
      <Star top="15%" left="22%" size={2} delay={0} maxOpacity={0.6} />
      <Star top="28%" left="78%" size={3} delay={800} maxOpacity={0.9} />
      <Star top="45%" left="12%" size={2} delay={1500} maxOpacity={0.5} />
      <Star top="65%" left="85%" size={2} delay={400} maxOpacity={0.7} />
      <Star top="82%" left="30%" size={3} delay={2000} maxOpacity={0.8} />
      <Star top="12%" left="60%" size={1.5} delay={1100} maxOpacity={0.4} />
      <Star top="75%" left="18%" size={2} delay={600} maxOpacity={0.6} />

      {/* うっすらとした光のオーラ */}
      <View
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          width: 300,
          height: 300,
          marginLeft: -150,
          borderRadius: 150,
          backgroundColor: colors.primary,
          opacity: 0.03,
          transform: [{ scale: 2 }],
        }}
      />
    </View>
  );
}
