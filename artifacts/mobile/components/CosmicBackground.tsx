import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

/* Deterministic star field (same positions every render) */
const STARS = Array.from({ length: 36 }).map((_, i) => ({
  id: i,
  top: Math.abs(Math.sin(i * 1234.5)) * 100,
  left: Math.abs(Math.cos(i * 567.8)) * 100,
  size: (i % 3) + 1,
  opacity: 0.25 + (i % 10) * 0.06,
  twinkle: i % 6 === 0,
  delay: (i % 5) * 600,
}));

function TwinkleStar({ top, left, size, delay }: { top: number; left: number; size: number; delay: number }) {
  const o = useSharedValue(0.25);
  useEffect(() => {
    o.value = withDelay(delay, withRepeat(withTiming(0.9, { duration: 1600 }), -1, true));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        styles.star,
        { top: `${top}%`, left: `${left}%`, width: size + 1, height: size + 1, borderRadius: (size + 1) / 2 },
        style,
      ]}
    />
  );
}

/* CSS-style planet built from gradient circles */
function Planet({
  size, top, bottom, left, right, colors, ringColor, ringRotate = '-15deg', opacity = 0.85, rotate = '0deg',
}: {
  size: number;
  top?: number; bottom?: number; left?: number; right?: number;
  colors: [string, string, ...string[]];
  ringColor?: string;
  ringRotate?: string;
  opacity?: number;
  rotate?: string;
}) {
  return (
    <View
      style={{
        position: 'absolute', width: size, height: size,
        top, bottom, left, right, opacity,
        transform: [{ rotate }],
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.2, y: 0.15 }}
        end={{ x: 0.9, y: 0.95 }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
      {ringColor && (
        <View
          style={{
            position: 'absolute',
            top: size / 2 - size * 0.16,
            left: -size * 0.28,
            width: size * 1.56,
            height: size * 0.32,
            borderRadius: size,
            borderWidth: 1.5,
            borderColor: ringColor,
            transform: [{ rotate: ringRotate }],
          }}
        />
      )}
    </View>
  );
}

export function CosmicBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base deep-space gradient */}
      <LinearGradient
        colors={['#160E33', '#0A051A', '#0A051A', '#120A2E']}
        style={StyleSheet.absoluteFill}
      />
      {/* Nebula glows */}
      <View style={[styles.glow, { top: -120, right: -100, backgroundColor: 'rgba(80,60,160,0.22)' }]} />
      <View style={[styles.glow, { bottom: -140, left: -120, backgroundColor: 'rgba(120,60,160,0.16)' }]} />

      {/* Stars */}
      {STARS.map((s) =>
        s.twinkle ? (
          <TwinkleStar key={s.id} top={s.top} left={s.left} size={s.size} delay={s.delay} />
        ) : (
          <View
            key={s.id}
            style={[
              styles.star,
              {
                top: `${s.top}%`, left: `${s.left}%`,
                width: s.size, height: s.size, borderRadius: s.size / 2, opacity: s.opacity,
              },
            ]}
          />
        ),
      )}

      {/* Planets */}
      <Planet size={110} top={270} left={-45} colors={['#E2BBE9', '#9B72CB', '#3B256D']} ringColor="rgba(255,255,255,0.22)" rotate="15deg" />
      <Planet size={56} top={185} right={-14} colors={['#80D0C7', '#359088', '#0A3D44']} opacity={0.8} />
      <Planet size={84} bottom={290} right={-30} colors={['#D1A3F5', '#9E65D9', '#6B32A1']} ringColor="rgba(255,255,255,0.3)" ringRotate="25deg" opacity={0.8} rotate="-20deg" />
      <Planet size={28} bottom={170} left={30} colors={['#4A85D1', '#142A5C']} opacity={0.6} />
    </View>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', backgroundColor: '#FFFFFF' },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160 },
});
