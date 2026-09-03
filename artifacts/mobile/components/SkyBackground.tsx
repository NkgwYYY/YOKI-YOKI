import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * 全画面の下敷き。時間帯でごくわずかに色味が変わる単色の面。
 *
 * 以前はここに写真の空とグラデーションのスクリムを重ねていたが、
 * 前面のカード（白 + 1px ボーダー）の輪郭を濁らせていたため単色にした。
 * 時間帯の手がかりは残しつつ、差は本文の可読性を一切動かさない範囲に収めている。
 */
const SKY_TINTS = {
  morning: '#FBF8FF',
  day: colors.background,
  sunset: '#FDF7FB',
  night: '#F6F3FD',
} as const;

export type SkyPeriod = keyof typeof SKY_TINTS;

export function getSkyPeriod(hour: number): SkyPeriod {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'sunset';
  return 'night';
}

export function SkyBackground() {
  const [period, setPeriod] = useState<SkyPeriod>(() => getSkyPeriod(new Date().getHours()));

  // 時間の経過とともに色味を切り替える（1分ごとに時間帯をチェック）
  useEffect(() => {
    const iv = setInterval(() => {
      setPeriod(getSkyPeriod(new Date().getHours()));
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: SKY_TINTS[period] }]}
      pointerEvents="none"
    />
  );
}
