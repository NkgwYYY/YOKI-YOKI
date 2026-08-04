import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Mascot } from '../components/Mascot';

const ITEMS: {
  label: string; sub: string;
  stage: 'egg' | 'odango' | 'stage3' | 'stage4' | 'stage5';
  evolutionType?: 'heart' | 'star' | 'crown' | null;
}[] = [
  { label: 'たまご', sub: 'Lv.1〜（1段階目・全タイプ共通）', stage: 'egg' },
  { label: 'おだんご', sub: 'Lv.3〜（2段階目・全タイプ共通）', stage: 'odango' },
  { label: '塩おにぎり 🍙食物', sub: 'Lv.6〜（3段階目）', stage: 'stage3', evolutionType: 'heart' },
  { label: 'はっぱ 🌱植物', sub: 'Lv.6〜（3段階目）', stage: 'stage3', evolutionType: 'crown' },
  { label: 'ねこ 🐾動物', sub: 'Lv.6〜（3段階目）', stage: 'stage3', evolutionType: 'star' },
  { label: 'タコ 🍙食物', sub: 'Lv.15〜（4段階目）', stage: 'stage4', evolutionType: 'heart' },
  { label: 'カラフルはっぱ 🌱植物', sub: 'Lv.15〜（4段階目）', stage: 'stage4', evolutionType: 'crown' },
  { label: 'うさぎ 🐾動物', sub: 'Lv.15〜（4段階目）', stage: 'stage4', evolutionType: 'star' },
  { label: 'エビフライ 🍙食物', sub: 'Lv.25〜（5段階目）', stage: 'stage5', evolutionType: 'heart' },
  { label: '？？？ 🌱植物', sub: 'Lv.25〜（5段階目・検討中）', stage: 'stage5', evolutionType: 'crown' },
  { label: 'ライオン 🐾動物', sub: 'Lv.25〜（5段階目）', stage: 'stage5', evolutionType: 'star' },
];

export default function GalleryScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F4FB' }} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>キャラクター図鑑（開発用）</Text>
      <View style={styles.grid}>
        {ITEMS.map((it) => (
          <View key={it.label} style={styles.card}>
            <Mascot stage={it.stage} mood="happy" evolutionType={it.evolutionType ?? null} size={110} />
            <Text style={styles.label}>{it.label}</Text>
            <Text style={styles.sub}>{it.sub}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginVertical: 12, color: '#4A4458' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  card: {
    width: 170, alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8,
  },
  label: { marginTop: 10, fontSize: 14, fontWeight: '600', color: '#4A4458' },
  sub: { marginTop: 2, fontSize: 12, color: '#9A93AB' },
});
