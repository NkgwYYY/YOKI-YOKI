import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { usePersonalInsights } from './usePersonalInsights';

/** Compact home invitation never invents a discovery when the evidence is sparse. */
export function PersonalInsightPreview({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { report, ready } = usePersonalInsights();
  if (!ready || (compact && !report.insights.length)) return null;
  const insight = report.insights[0];
  if (compact) return <Pressable testID="personal-insight-invitation" accessibilityRole="button"
    accessibilityLabel="元気な日の傾向を見る" onPress={() => router.push('/insights')}
    style={({ pressed }) => [s.compact, pressed && s.pressed]}>
    <Icon name="sunrise" size={18} color="#876199" />
    <Text style={s.compactText}>元気な日の傾向が見つかったよ</Text>
    <Icon name="chevron-right" size={16} color="#876199" />
  </Pressable>;
  return <Pressable testID="personal-insight-preview" accessibilityRole="button"
    accessibilityLabel="記録から見えてきたことを読む" onPress={() => router.push('/insights')}
    style={({ pressed }) => [s.paper, pressed && s.pressed]}>
    <View style={s.heading}><Icon name="sunrise" size={22} color="#876199" /><Text style={s.eyebrow}>記録から見えてきたこと</Text><Icon name="chevron-right" size={18} color="#876199" /></View>
    <Text style={s.title}>{insight ? 'どんな日に元気だった？' : '日々の記録を振り返ろう'}</Text>
    <Text style={s.body}>{insight ? insight.body : report.status === 'gathering'
      ? `最近30日では、${report.recordedDays}日分の気分が残っているよ。14日分以上たまったら、過ごし方とのつながりを一緒に振り返ろう。`
      : 'まだ、はっきりした傾向は見つかっていないよ。気分と過ごし方を、書きたい日に少しずつ残してね。'}</Text>
    <View style={s.footer}><Text style={s.meta}>最近30日・{report.recordedDays}日分の記録</Text><Text style={s.link}>くわしく見る</Text></View>
  </Pressable>;
}
const s = StyleSheet.create({
  compact: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#FFFBF2F2', borderRadius: 18, borderWidth: 1, borderColor: '#E1D2DF' },
  compactText: { flex: 1, color: '#5D4768', fontSize: 12, lineHeight: 19, fontWeight: '600' },
  paper: { padding: 21, gap: 12, backgroundColor: '#FFFBF2', borderRadius: 18, borderWidth: 1, borderColor: '#E6D9C8', borderBottomWidth: 3 },
  pressed: { opacity: .8 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  eyebrow: { flex: 1, fontSize: 12, lineHeight: 19, fontWeight: '600', color: '#84648F' },
  title: { color: '#493553', fontSize: 20, fontWeight: '600', lineHeight: 30 },
  body: { color: '#6C5A70', fontSize: 14, lineHeight: 25 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  meta: { fontSize: 11, lineHeight: 18, color: '#89758D' }, link: { fontSize: 12, color: '#79518D', fontWeight: '600' },
});
