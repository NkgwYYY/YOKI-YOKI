import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StaticMascot } from '@/components/Mascot';
import { Icon } from '@/components/ui/Icon';
import { NotebookPaper, notebookFont } from '@/components/record/NotebookPaper';
import { usePersonalInsights } from '@/components/insights/usePersonalInsights';
import { getMascotStage } from '@/utils/mascotUtils';
import type { PersonalInsight } from '@/utils/personalInsights';
import { readSavedHints, saveHint } from '@/utils/hintBookStorage';

const savedId = (insight: PersonalInsight) => `${insight.id}:${insight.evidence.from}:${insight.evidence.to}`;
export default function InsightsScreen() {
  const context = usePersonalInsights();
  return <InsightsNotebook key={context.owner} context={context} />;
}
function InsightsNotebook({ context }: { context: ReturnType<typeof usePersonalInsights> }) {
  const { report, ready, owner, mascotName, progress } = context;
  const router = useRouter(), insets = useSafeAreaInsets();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null), [error, setError] = useState('');
  const epoch = useRef(0);
  useFocusEffect(useCallback(() => {
    const generation = ++epoch.current;
    setSaving(null); setError('');
    void readSavedHints(owner).then(hints => { if (generation === epoch.current) setSaved(new Set(hints.map(h => h.id))); })
      .catch(() => { if (generation === epoch.current) setError('ヒント帳を読み込めませんでした。保存した言葉は変更していません。'); });
    return () => { epoch.current += 1; };
  }, [owner]));
  const keep = async (insight: PersonalInsight) => {
    if (saving || !ready) return;
    const id = savedId(insight), generation = epoch.current;
    setSaving(id); setError('');
    try {
      await saveHint(owner, { id, title: insight.title, body: `${insight.body}\n\n${insight.suggestion}`,
        source: 'insight', evidence: insight.evidenceText });
      if (generation === epoch.current) setSaved(previous => new Set([...previous, id]));
    } catch (e) { if (generation === epoch.current) setError(e instanceof Error ? e.message : '保存できませんでした。もう一度試してね。'); }
    finally { if (generation === epoch.current) setSaving(null); }
  };
  return <View testID="personal-insights-screen" style={s.root}>
    <View style={[s.nav, { paddingTop: (Platform.OS === 'web' ? 16 : insets.top) + 6 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="歩みに戻る" onPress={() => router.navigate('/(tabs)/growth')} style={s.iconButton}><Icon name="chevron-left" size={22} color="#674F70" /></Pressable>
      <Text style={s.navTitle}>元気な日の傾向</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="自分のヒント帳を開く" onPress={() => router.push('/hints')} style={s.iconButton}><Icon name="bookmark" size={22} color="#674F70" /></Pressable>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]}>
      <View style={s.intro}>
        <View style={s.portrait}><StaticMascot stage={getMascotStage(progress)} mood="happy" size={92} /></View>
        <Text style={s.eyebrow}>{mascotName}と一緒に振り返ろう</Text>
        <Text style={s.title}>どんな日に元気だった？</Text>
        <Text style={s.description}>気分と過ごし方の記録から、{ '\n' }元気な日に共通することを探すよ。</Text>
      </View>
      {!ready ? <ActivityIndicator accessibilityLabel="記録を読み込んでいます" color="#9873AA" /> : <>
        <View style={s.summary}><Icon name="calendar" size={18} color="#9576A2" /><Text style={s.summaryText}>最近30日・{report.recordedDays}日分の気分</Text><Text style={s.range}>{report.windowStart.slice(5).replace('-', '/')} – {report.windowEnd.slice(5).replace('-', '/')}</Text></View>
        {!!report.moodDays.length && <View style={s.chartCard}>
          <Text style={s.sectionLabel}>気分の変化</Text>
          <View style={s.chart}>{report.moodDays.map(day => <View key={day.date} style={s.barColumn} accessible accessibilityLabel={`${day.date}、気分${day.mood}、5段階`}><View style={[s.bar, { height: day.mood * 10 + 5, backgroundColor: day.mood >= 4 ? '#AD91B9' : '#D6CCDD' }]} /></View>)}</View>
          <View style={s.chartLabels}><Text style={s.small}>{report.moodDays[0].date.slice(5).replace('-', '/')}</Text><Text style={s.small}>記録のある日だけ表示</Text><Text style={s.small}>{report.moodDays[report.moodDays.length - 1].date.slice(5).replace('-', '/')}</Text></View>
        </View>}
        {report.insights.length ? report.insights.map(insight => <InsightCard key={insight.id} insight={insight} saved={saved.has(savedId(insight))} busy={saving !== null} onSave={() => void keep(insight)} />) : <NotebookPaper style={s.emptyPaper}>
          <Icon name={report.status === 'gathering' ? 'book-open' : 'sunrise'} size={28} color="#9576A2" />
          <Text style={s.emptyTitle}>{report.status === 'gathering' ? '記録がたまると傾向が見えてくるよ' : 'まだ、はっきりした傾向はないよ'}</Text>
          <Text style={s.body}>{report.status === 'gathering'
            ? `今は${report.recordedDays}日分の気分が残っているよ。最近30日の中で14日分以上たまったら、過ごし方とのつながりを見ていこう。`
            : '今ある記録では、はっきりした傾向は見つかっていないよ。いつも同じように過ごしていたり、過ごし方の記録が少ないこともあるから、無理に結論を出さずにおこうね。'}</Text>
          <View style={s.emptyNote}><Text style={s.noteTitle}>その日の過ごし方も記録してみよう</Text><Text style={s.body}>「外に出た」「人と話した」「ひとりで休んだ」など、書けそうな日の過ごし方を選ぶだけで大丈夫。</Text></View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/exchange-diary')} style={s.primary}><Icon name="edit-3" size={18} color="#FFFDF7" /><Text style={s.primaryText}>今日のページへ</Text></Pressable>
        </NotebookPaper>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <View style={s.explanation}><Text style={s.sectionLabel}>この気づきについて</Text><Text style={s.small}>「元気な日」は、気分を「いい感じ・うれしい」と残した日。気分と過ごし方を両方記録した日を比べています。書いていないことは、していないこととして数えません。</Text><Text style={s.small}>同じ日に複数のことをしていたり、ほかの出来事が関係することもあります。原因や効果を確かめたものではなく、その期間の記録から見えた手がかりです。</Text><Text style={s.small}>この画面の集計は端末の中で行います。日記の本文は使わず、分析のために外部へ送りません。</Text></View>
      </>}
    </ScrollView>
  </View>;
}
function InsightCard({ insight, saved, busy, onSave }: { insight: PersonalInsight; saved: boolean; busy: boolean; onSave: () => void }) {
  const [expanded, setExpanded] = useState(false), e = insight.evidence;
  return <NotebookPaper testID="personal-insight-card" style={s.paper}>
    <View style={s.stamp}><Icon name="sunrise" size={18} color="#9169A1" /><Text style={s.stampText}>記録から見つけたこと</Text></View>
    <Text style={s.cardTitle}>{insight.title}</Text><Text style={s.body}>{insight.body}</Text>
    <Pressable testID="personal-insight-evidence-toggle" accessibilityRole="button" accessibilityLabel={`比較した記録を見る（${e.selectedDays + e.comparisonDays}日分）`} accessibilityState={{ expanded }} onPress={() => setExpanded(v => !v)} style={s.evidenceButton}><Text style={s.evidenceButtonText}>比較した記録を見る（{e.selectedDays + e.comparisonDays}日分）</Text><Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#866693" /></Pressable>
    {expanded && <View testID="personal-insight-evidence" style={s.evidence}><Text style={s.small}>{e.from} 〜 {e.to}</Text><EvidenceRow testID="personal-insight-selected-count" label={e.selectedLabel} days={e.selectedDays} goodDays={e.selectedGoodDays} /><EvidenceRow testID="personal-insight-comparison-count" label={e.comparisonLabel} days={e.comparisonDays} goodDays={e.comparisonGoodDays} /><Text style={s.small}>「いい感じ」「うれしい」を選んだ日を「元気な日」としています。比較には、気分と対象の項目を両方記録した日だけを使います。</Text></View>}
    <View style={s.note}><Text style={s.noteTitle}>あなたのペースで</Text><Text style={s.body}>{insight.suggestion}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'ヒント帳に保存済み' : 'この気づきをヒント帳に保存'} disabled={saved || busy} onPress={onSave} style={[s.primary, (saved || busy) && s.disabled]}><Icon name={saved ? 'check' : 'bookmark'} size={18} color="#FFFDF7" /><Text style={s.primaryText}>{saved ? 'ヒント帳に保存しました' : 'ヒント帳に保存'}</Text></Pressable>
  </NotebookPaper>;
}
function EvidenceRow({ testID, label, days, goodDays }: { testID: string; label: string; days: number; goodDays: number }) {
  return <View style={s.evidenceRow}><Text style={s.evidenceLabel}>{label}</Text><Text testID={testID} accessibilityLabel={`${days}日中${goodDays}日が元気な日`} style={s.evidenceCount}>{days}日中 <Text style={s.evidenceStrong}>{goodDays}日</Text> が元気な日</Text></View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F4EE' }, nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E9E0D8' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, navTitle: { flex: 1, textAlign: 'center', fontSize: 15, color: '#5E4969', fontWeight: '600' },
  content: { width: '100%', maxWidth: 650, alignSelf: 'center', padding: 20, gap: 19 }, intro: { alignItems: 'center', gap: 10, paddingTop: 3, paddingBottom: 6 }, portrait: { width: 116, height: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9E0ED', borderRadius: 58, borderBottomWidth: 4, borderBottomColor: '#DDD2E2' }, eyebrow: { fontSize: 11, lineHeight: 18, color: '#91759D', letterSpacing: 1 }, title: { fontFamily: notebookFont, color: '#4C3459', fontSize: 27, lineHeight: 39 }, description: { textAlign: 'center', fontSize: 13, lineHeight: 23, color: '#806A85' },
  summary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, summaryText: { flexGrow: 1, color: '#715A7D', fontSize: 12, lineHeight: 19, fontWeight: '600' }, range: { fontSize: 11, color: '#9A879D' }, chartCard: { borderWidth: 1, borderColor: '#E8DFD4', backgroundColor: '#FFFCF6', padding: 16, borderRadius: 14, gap: 10 }, chart: { height: 66, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }, barColumn: { flex: 1, height: 65, alignItems: 'center', justifyContent: 'flex-end' }, bar: { width: '100%', maxWidth: 18, borderRadius: 6 }, chartLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  paper: { minHeight: 0, gap: 17, borderRadius: 18 }, stamp: { flexDirection: 'row', alignItems: 'center', gap: 7 }, stampText: { fontSize: 11, color: '#9271A0', letterSpacing: .5 }, cardTitle: { fontFamily: notebookFont, color: '#4F365C', fontSize: 22, lineHeight: 34 }, body: { fontSize: 14, lineHeight: 26, color: '#6B566F' }, note: { padding: 16, borderRadius: 9, backgroundColor: '#F0E8F3', gap: 7 }, noteTitle: { fontSize: 13, fontWeight: '600', lineHeight: 21, color: '#745882' }, evidenceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 8 }, evidenceButtonText: { flex: 1, color: '#866693', fontSize: 12, lineHeight: 21, textDecorationLine: 'underline' }, evidence: { gap: 12, borderTopWidth: 1, borderTopColor: '#E3D9CF', paddingTop: 12 }, evidenceRow: { gap: 4 }, evidenceLabel: { fontSize: 12, color: '#88728D', lineHeight: 21 }, evidenceCount: { fontSize: 14, color: '#6C5479', lineHeight: 24 }, evidenceStrong: { fontSize: 18, fontWeight: '700' }, primary: { minHeight: 48, borderRadius: 24, backgroundColor: '#9273A4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 }, primaryText: { fontSize: 14, fontWeight: '600', color: '#FFFDF7', lineHeight: 22 }, disabled: { opacity: .65 },
  emptyPaper: { minHeight: 0, gap: 17 }, emptyTitle: { fontFamily: notebookFont, fontSize: 22, lineHeight: 34, color: '#594363' }, emptyNote: { gap: 7, borderTopWidth: 1, borderTopColor: '#E2D6C8', paddingTop: 15 }, error: { color: '#9A4B58', fontSize: 13, lineHeight: 23 }, explanation: { paddingHorizontal: 5, gap: 9 }, sectionLabel: { fontSize: 12, fontWeight: '600', lineHeight: 21, color: '#806889' }, small: { fontSize: 11, lineHeight: 20, color: '#8F7C94' },
});
