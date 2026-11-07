import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Analytics } from '@/utils/analytics';
export const QUICK_ACTIONS: { label: string; icon: IconName }[] = [
  { label: 'ご飯を食べた', icon: 'coffee' }, { label: '外に出た', icon: 'sun' },
  { label: 'お風呂に入った', icon: 'droplet' }, { label: '仕事・学校に行った', icon: 'briefcase' },
  { label: 'ゆっくり休んだ', icon: 'moon' }, { label: 'その他', icon: 'heart' },
];
const MOODS: { value: number; label: string; icon: IconName }[] = [
  { value: 1, label: 'つらい', icon: 'cloud-lightning' }, { value: 2, label: 'しんどい', icon: 'cloud-rain' },
  { value: 3, label: 'ふつう', icon: 'cloud' }, { value: 4, label: 'いい感じ', icon: 'sunrise' }, { value: 5, label: 'うれしい', icon: 'sun' },
];
export function QuickAffirmationRecord({ onComplete, onSaveStart, onSaveFailed }: {
  onComplete?: () => void; onSaveStart?: () => void; onSaveFailed?: () => void;
}) {
  const { getTodayRecord, saveRecord, holdLightFlow } = useApp();
  const today = getTodayRecord();
  const [mood, setMood] = useState<number | null>(today?.mood ?? null);
  const [action, setAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const save = async () => {
    if (lock.current || mood === null) return;
    lock.current = true; setSaving(true); setError(''); setSaved(false); onSaveStart?.(); holdLightFlow(true);
    try {
      // Read again at submit time; retain detailed fields and previously chosen activities.
      const previous = getTodayRecord();
      const behaviors = [...new Set([...(previous?.behaviors ?? []), ...(action ? [action] : [])])];
      await saveRecord(mood, previous?.sleep ?? 0, behaviors, previous?.notes ?? '', {
        exercise: previous?.exercise, meal: previous?.meal, social: previous?.social,
        win: previous?.win, activities: previous?.activities,
        sleepRecorded: previous ? previous.sleepRecorded !== false : false,
      });
      Analytics.moodRecorded(mood);
      if (mounted.current) { setSaved(true); onComplete?.(); }
    } catch {
      if (mounted.current) { setError('保存できませんでした。もう一度お試しください。'); onSaveFailed?.(); }
    } finally {
      holdLightFlow(false); lock.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return <View style={s.body}>
    <Text style={s.question}>いまの気分は？</Text>
    <Text style={s.helper}>どの日も、そのままで大丈夫。</Text>
    <View style={s.moods}>{MOODS.map(option => <Pressable key={option.value} testID={`quick-mood-${option.value}`} accessibilityRole="button" accessibilityState={{ selected: mood === option.value }} accessibilityLabel={`気分：${option.label}`} disabled={saving}
      onPress={() => { setMood(option.value); setSaved(false); }} style={[s.mood, mood === option.value && s.selected]}>
      <Icon name={option.icon} size={24} color="#786081" /><Text style={s.label}>{option.label}</Text>
    </Pressable>)}</View>
    <Text style={s.question}>今日のひとこま <Text style={s.helper}>（選ばなくてもOK）</Text></Text>
    <View style={s.actions}>{QUICK_ACTIONS.map(item => <Pressable key={item.label} accessibilityRole="button" disabled={saving} accessibilityState={{ selected: action === item.label }} onPress={() => setAction(action === item.label ? null : item.label)} style={[s.action, action === item.label && s.selected]}>
      <Icon name={item.icon} size={16} color="#786081" /><Text style={s.label}>{item.label}</Text>
    </Pressable>)}</View>
    {error ? <Text accessibilityRole="alert" style={s.helper}>{error}</Text> : null}
    {saved ? <Text accessibilityLiveRegion="polite" style={s.helper}>今日の気持ち、この子に届いたよ。</Text> : null}
    <Button testID="quick-record-save" label={saving ? '記録しています…' : today ? '今日の記録を更新' : 'この気持ちを残す'} disabled={mood === null || saving} loading={saving} onPress={save} fullWidth />
  </View>;
}
const s = StyleSheet.create({
  body: { gap: 12 }, question: { fontSize: 16, fontWeight: '600', color: '#4B3C52' },
  helper: { fontSize: 12, color: '#827287', lineHeight: 18 },
  moods: { flexDirection: 'row', gap: 5 }, mood: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#E2D9E3', borderRadius: 14 },
  label: { fontSize: 11, color: '#5D4D65', textAlign: 'center' }, selected: { backgroundColor: '#EDE2F1', borderColor: '#92749F' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, action: { flexBasis: '31%', flexGrow: 1, minHeight: 50, borderWidth: 1, borderColor: '#E2D9E3', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 5 },
});
