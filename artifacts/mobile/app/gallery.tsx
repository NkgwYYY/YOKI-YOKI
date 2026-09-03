import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { border, colors, radius, space, typography } from '@/constants/theme';
import { Mascot } from '@/components/Mascot';

const ITEMS: {
  label: string; sub: string;
  stage: 'egg' | 'odango' | 'stage3' | 'stage4';
}[] = [
  { label: 'たまご', sub: 'Lv.1〜（1段階目）', stage: 'egg' },
  { label: 'モフモフ', sub: 'Lv.3〜（2段階目）', stage: 'odango' },
  { label: 'はっぱ', sub: 'Lv.6〜（3段階目）', stage: 'stage3' },
  { label: 'カラフルはっぱ', sub: 'Lv.15〜（4段階目）', stage: 'stage4' },
];

export default function GalleryScreen() {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>キャラクター図鑑（開発用）</Text>
      <View style={styles.grid}>
        {ITEMS.map((it) => (
          <View key={it.label} style={styles.card}>
            <Mascot stage={it.stage} mood="happy" size={110} />
            <Text style={styles.label}>{it.label}</Text>
            <Text style={styles.sub}>{it.sub}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  wrap: { padding: space.lg, paddingBottom: space.xxxl, gap: space.lg },
  title: { ...typography.heading, color: colors.foreground, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  card: {
    width: 168,
    alignItems: 'center',
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
    gap: space.xs,
  },
  label: { ...typography.calloutStrong, color: colors.foreground, marginTop: space.sm },
  sub: { ...typography.caption, color: colors.mutedForeground },
});
