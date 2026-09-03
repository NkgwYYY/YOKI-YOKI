import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * アプリ全体の背景。模様やグラデーションを重ねず、落ち着いた無地にする。
 */
export function SkyBackground() {
  return <View style={styles.background} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
});