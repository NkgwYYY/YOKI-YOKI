import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

const easeBezier = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useColors } from '@/constants/theme';

// @ts-ignore
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MentalMeterProps {
  percentage: number;
  level: number;
  experience: number;
}

export function MentalMeter({ percentage, level, experience }: MentalMeterProps) {
  const colors = useColors();
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 88;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Animated ring fill
  const animProgress = useSharedValue(0);
  useEffect(() => {
    animProgress.value = withDelay(
      350,
      withTiming(percentage, {
        duration: 1400,
        easing: easeBezier,
      })
    );
  }, [percentage]);

  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value / 100),
  }));

  // Pulse glow on outer ring
  const glowOpacity = useSharedValue(0.25);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1800, easing: easeInOutSine }),
        withTiming(0.25, { duration: 1800, easing: easeInOutSine })
      ),
      -1,
      false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Fade in center text
  const textOpacity = useSharedValue(0);
  useEffect(() => {
    textOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
  }, []);
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size + 32,
            height: size + 32,
            borderRadius: (size + 32) / 2,
            borderColor: colors.primary,
          },
          glowStyle,
        ]}
      />

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="meterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} />
            <Stop offset="60%" stopColor="#64FFDA" />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="0.8" />
          </LinearGradient>
          <LinearGradient id="trackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.border} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.border} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          {/* Track */}
          <Circle
            cx={cx} cy={cy} r={radius}
            stroke="url(#trackGrad)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={cx} cy={cy} r={radius}
            stroke="url(#meterGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedRingProps}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <Animated.View style={[styles.centerInner, textStyle]}>
          <Text style={[styles.percentageText, { color: colors.foreground }]}>
            {Math.round(percentage)}
            <Text style={[styles.percentUnit, { color: colors.mutedForeground }]}>%</Text>
          </Text>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            メンタル筋肉量
          </Text>
          <View style={[styles.levelPill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.levelText, { color: colors.primaryForeground }]}>
              Lv.{level}
            </Text>
          </View>
          <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
            {experience} XP
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerInner: {
    alignItems: 'center',
    gap: 2,
  },
  percentageText: {
    fontSize: 50,
    fontFamily: 'Inter_700Bold',
    lineHeight: 56,
    letterSpacing: -2,
  },
  percentUnit: {
    fontSize: 22,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  levelPill: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  xpText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
});
