import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * 発電所画面の下敷き。イラストのシーンをそのまま載せるための単色の面。
 *
 * 以前は深宇宙のグラデーション・星・惑星をコードで描いていたが、
 * 手前のシーン画像と二重に情報を持ってしまうため単色に置き換えた。
 */
export function CosmicBackground() {
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
      pointerEvents="none"
    />
  );
}
