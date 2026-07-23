import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface MentalMeterProps {
  percentage: number;
  level: number;
  experience: number;
}

export function MentalMeter({ percentage, level, experience }: MentalMeterProps) {
  const colors = useColors();
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 86;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(100, percentage)) / 100);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="meterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} />
            <Stop offset="100%" stopColor="#00FFD1" />
          </LinearGradient>
        </Defs>
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="url(#meterGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <Text style={[styles.percentageText, { color: colors.foreground }]}>
          {Math.round(percentage)}
          <Text style={[styles.percentUnit, { color: colors.mutedForeground }]}>%</Text>
        </Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>メンタル筋肉量</Text>
        <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.levelText, { color: colors.primaryForeground }]}>Lv.{level}</Text>
        </View>
        <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
          {experience} XP
        </Text>
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
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    lineHeight: 54,
    letterSpacing: -1,
  },
  percentUnit: {
    fontSize: 22,
    fontFamily: 'Inter_400Regular',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  levelBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  xpText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
});
