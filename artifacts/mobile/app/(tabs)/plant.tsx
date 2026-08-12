import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp } from '@/contexts/AppContext';

/** 発電所タブ(中身は次のアップデートで登場する準備中プレースホルダ) */
export default function PlantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lightEnergy } = useApp();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <SkyBackground />
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Text style={styles.bigIcon}>🌞</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>ひかり発電所</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          じゅんびちゅう…{'\n'}
          キミのつくった光で街を明るくする場所が、もうすぐオープンするよ！
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: '#FFD86B' }]}>⚡ {lightEnergy.todayEnergy}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>今日つくった光</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: '#8AB4FF' }]}>🔋 {lightEnergy.storedEnergy}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>蓄電中</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{lightEnergy.totalEnergy}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>これまでの合計</Text>
          </View>
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          記録やあそびで光をためておこう!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  bigIcon: { fontSize: 64 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, padding: 18, borderWidth: 1, marginTop: 10, alignSelf: 'stretch',
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  divider: { width: 1, height: 32 },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
});
