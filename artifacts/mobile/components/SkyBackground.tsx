import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * 時間帯で変化するドリーミーな空の背景。
 * 朝 5-10時 / 昼 10-16時 / 夕 16-19時 / 夜 19-5時
 */
const SKY_IMAGES = {
  morning: require('../assets/images/sky/morning.png'),
  day: require('../assets/images/sky/day.png'),
  sunset: require('../assets/images/sky/sunset.png'),
  night: require('../assets/images/sky/night.png'),
} as const;

export type SkyPeriod = keyof typeof SKY_IMAGES;

export function getSkyPeriod(hour: number): SkyPeriod {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'sunset';
  return 'night';
}

export function SkyBackground() {
  const [period, setPeriod] = useState<SkyPeriod>(() => getSkyPeriod(new Date().getHours()));

  // 時間の経過とともに空を変化させる（1分ごとに時間帯をチェック）
  useEffect(() => {
    const iv = setInterval(() => {
      setPeriod(getSkyPeriod(new Date().getHours()));
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={SKY_IMAGES[period]}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* 上部にうっすら紫のスクリム（ヘッダー文字の可読性用） */}
        <LinearGradient
          colors={['rgba(58,42,110,0.45)', 'rgba(58,42,110,0.08)', 'rgba(0,0,0,0)']}
          locations={[0, 0.35, 0.6]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
    </View>
  );
}
