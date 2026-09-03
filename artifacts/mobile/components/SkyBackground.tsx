import React, { useEffect, useState } from 'react';
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
 * 昼夜の雰囲気がほんのり変わる明るい空の背景。
 */
function Petal({ top, left, size, delay, duration }: { top: DimensionValue; left: DimensionValue; size: number; delay: number; duration: number }) {
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);
  const op = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(delay, withRepeat(withTiming(-120, { duration, easing: Easing.linear }), -1, false));
    tx.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(15, { duration: duration / 4, easing: Easing.inOut(Easing.sin) }),
        withTiming(-15, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: duration / 4, easing: Easing.inOut(Easing.sin) })
      ),
      -1, false
    ));
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.6, { duration: duration * 0.2 }),
        withTiming(0.6, { duration: duration * 0.6 }),
        withTiming(0, { duration: duration * 0.2 })
      ),
      -1, false
    ));
    rot.value = withDelay(delay, withRepeat(withTiming(360, { duration: duration * 1.5, easing: Easing.linear }), -1, false));
  }, []);

  const st = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [
      { translateY: ty.value },
      { translateX: tx.value },
      { rotate: `${rot.value}deg` }
    ]
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top,
          left,
          width: size,
          height: size * 0.6,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
        },
        st,
      ]}
    />
  );
}

function Cloud({ top, left, width, height, opacity, delay }: { top: DimensionValue, left: DimensionValue, width: number, height: number, opacity: number, delay: number }) {
  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(30, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 15000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    ));
  }, []);

  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }]
  }));

  return (
    <Animated.View style={[{ position: 'absolute', top, left, opacity }, st]}>
      <View style={{ width, height, backgroundColor: '#FFFFFF', borderRadius: height, position: 'absolute', top: 0, left: 0 }} />
      <View style={{ width: height * 1.5, height: height * 1.5, backgroundColor: '#FFFFFF', borderRadius: height * 1.5, position: 'absolute', bottom: height * 0.4, left: width * 0.15 }} />
      <View style={{ width: height * 1.2, height: height * 1.2, backgroundColor: '#FFFFFF', borderRadius: height * 1.2, position: 'absolute', bottom: height * 0.2, right: width * 0.1 }} />
    </Animated.View>
  );
}

export function SkyBackground() {
  const [hour, setHour] = useState(new Date().getHours());

  // Update hour periodically just in case the app is left open
  useEffect(() => {
    const interval = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isNight = hour >= 19 || hour < 5;
  const isSunset = hour >= 16 && hour < 19;

  const gradientColors = isNight
    ? ['#8E70C4', '#6B55A2', '#49377D']
    : isSunset
    ? ['#F09BC9', '#C47DE4', '#9C6DCE']
    : ['#D7B6F0', '#E69ACA', '#C58AE2'];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 遠くの雲 */}
      <Cloud top="15%" left="-10%" width={120} height={40} opacity={0.3} delay={0} />
      <Cloud top="40%" left="60%" width={180} height={50} opacity={0.2} delay={2000} />
      <Cloud top="75%" left="10%" width={140} height={45} opacity={0.4} delay={1000} />

      {/* 舞い上がる花びらや光の粒 */}
      <Petal top="90%" left="22%" size={8} delay={0} duration={12000} />
      <Petal top="100%" left="78%" size={12} delay={2000} duration={14000} />
      <Petal top="85%" left="45%" size={6} delay={5000} duration={10000} />
      <Petal top="95%" left="85%" size={10} delay={1500} duration={13000} />
      <Petal top="110%" left="30%" size={14} delay={4000} duration={16000} />

      {/* 画面全体の柔らかな光のオーラ */}
      <View
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          width: 400,
          height: 400,
          marginLeft: -200,
          borderRadius: 200,
          backgroundColor: '#FFFFFF',
          opacity: isNight ? 0.08 : 0.14,
          transform: [{ scale: 2 }],
        }}
      />
    </View>
  );
}