import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * 発電所画面の下敷き。イラストのシーンをそのまま載せるための面。
 * ダークな宇宙から、淡いピンク・パープルの明るい空に変更。
 */
export function CosmicBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#FFF0F5', '#F5E6FE', '#E4DFF8']}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}