import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, homePalette } from '@/constants/theme';

/**
 * アプリ全体の背景。模様やグラデーションを重ねず、落ち着いた無地にする。
 */
export function SkyBackground() {
  return <View style={styles.background} pointerEvents="none" />;
}

function DreamCloud({
  style,
  scale = 1,
}: {
  style?: StyleProp<ViewStyle>;
  scale?: number;
}) {
  return (
    <View pointerEvents="none" style={[styles.cloud, style, { transform: [{ scale }] }]}>
      <LinearGradient
        colors={[homePalette.cloudYellow, homePalette.cloudPink, homePalette.cloudBlue]}
        start={{ x: 0.08, y: 0.25 }}
        end={{ x: 0.92, y: 0.8 }}
        style={styles.cloudBody}
      />
      <View style={[styles.cloudPuff, styles.cloudPuffSmall]} />
      <View style={[styles.cloudPuff, styles.cloudPuffLarge]} />
      <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
    </View>
  );
}

export function HomeSkyBackdrop() {
  return (
    <View pointerEvents="none" style={styles.homeBackdrop}>
      <LinearGradient
        colors={[homePalette.backgroundTop, homePalette.backgroundMid, homePalette.backgroundBottom]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />
      <DreamCloud scale={0.82} style={{ top: '29%', left: '-8%' }} />
      <DreamCloud scale={0.68} style={{ top: '16%', left: '58%' }} />
      <DreamCloud scale={1.08} style={{ top: '39%', right: '-10%' }} />
      <DreamCloud scale={0.56} style={{ top: '53%', left: '39%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  homeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  cloud: {
    position: 'absolute',
    width: 96,
    height: 42,
    opacity: 0.72,
    shadowColor: homePalette.cloudPink,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cloudBody: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 6,
    height: 22,
    borderRadius: 999,
    opacity: 0.84,
  },
  cloudPuff: {
    position: 'absolute',
    backgroundColor: homePalette.cloudHighlight,
    borderRadius: 999,
  },
  cloudPuffSmall: { left: 13, bottom: 11, width: 25, height: 24 },
  cloudPuffLarge: { left: 32, bottom: 13, width: 36, height: 32 },
  cloudPuffRight: { right: 10, bottom: 9, width: 30, height: 25 },
});