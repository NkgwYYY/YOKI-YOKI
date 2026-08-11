import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Mascot } from '../components/Mascot';

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
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F4FB' }} contentContainerStyle={styles.wrap}>
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
