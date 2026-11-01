import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { saveHint, readSavedHints } from '@/utils/hintBookStorage';
import type { HintInput } from '@/utils/hintBook';

export function SaveHintButton({ hint }: { hint: HintInput }) {
  const owner = useAuth().user?.id ?? 'guest';
  const [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false), epoch = useRef(0);
  useFocusEffect(useCallback(() => {
    const generation = ++epoch.current;
    setSaved(false); setError(''); setBusy(false); pending.current = false;
    void readSavedHints(owner).then(hints => { if (epoch.current === generation) setSaved(hints.some(h => h.id === hint.id)); }).catch(() => {});
    return () => { epoch.current += 1; };
  }, [owner, hint.id]));
  const save = async () => {
    if (pending.current || saved) return;
    const generation = epoch.current;
    pending.current = true; setBusy(true); setError('');
    try { await saveHint(owner, hint); if (generation === epoch.current) setSaved(true); }
    catch (e) { if (generation === epoch.current) setError(e instanceof Error ? e.message : '保存できませんでした。もう一度試してね。'); }
    finally { if (generation === epoch.current) { pending.current = false; setBusy(false); } }
  };
  return <View>
    <PressScale accessibilityRole="button" accessibilityLabel={saved ? 'ヒント帳に保存済み' : 'ヒント帳に保存'} disabled={busy || saved} onPress={save} style={s.button}>
      <Icon name={saved ? 'check' : 'bookmark'} size={16} color="#755B8F" />
      <Text style={s.label}>{saved ? 'ヒント帳に保存しました' : busy ? '保存しています…' : 'ヒントを保存'}</Text>
    </PressScale>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}
const s = StyleSheet.create({ button: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 8 }, label: { fontSize: 12, color: '#755B8F' }, error: { color: '#9C3750', fontSize: 12, lineHeight: 18 } });
