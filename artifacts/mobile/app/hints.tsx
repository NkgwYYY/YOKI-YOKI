import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { StaticMascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { Icon } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { CenterDialog } from '@/components/ui/BottomSheet';
import { readSavedHints, removeSavedHint } from '@/utils/hintBookStorage';
import type { SavedHint } from '@/utils/hintBook';

export default function HintsScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <View style={s.loading}><ActivityIndicator color="#8967A3" /></View>;
  const owner = user?.id ?? 'guest';
  return <HintNotebook key={owner} owner={owner} />;
}

function HintNotebook({ owner }: { owner: string }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const { progress, mascotName } = useApp();
  const [hints, setHints] = useState<SavedHint[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null), [removing, setRemoving] = useState(false);
  const epoch = useRef(0), busy = useRef(false);
  const load = useCallback(async () => {
    const generation = ++epoch.current;
    setLoading(true); setError(''); setRemoveId(null); setRemoving(false); busy.current = false;
    try { const saved = await readSavedHints(owner); if (generation === epoch.current) setHints(saved); }
    catch (e) { if (generation === epoch.current) setError(e instanceof Error ? e.message : '読み込めませんでした。もう一度試してね。'); }
    finally { if (generation === epoch.current) setLoading(false); }
  }, [owner]);
  useFocusEffect(useCallback(() => { void load(); return () => { epoch.current += 1; }; }, [load]));
  const remove = async () => {
    if (!removeId || busy.current) return;
    const generation = epoch.current;
    busy.current = true; setRemoving(true); setError('');
    try {
      await removeSavedHint(owner, removeId);
      if (generation === epoch.current) { setHints(current => current.filter(h => h.id !== removeId)); setRemoveId(null); }
    } catch (e) { if (generation === epoch.current) setError(e instanceof Error ? e.message : '外せませんでした。もう一度試してね。'); }
    finally { busy.current = false; if (generation === epoch.current) setRemoving(false); }
  };
  return <View testID="hintbook-screen" style={s.root}>
    <View style={[s.header, { paddingTop: (Platform.OS === 'web' ? 16 : insets.top) + 8 }]}>
      <PressScale style={s.icon} accessibilityLabel="戻る" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}><Icon name="chevron-left" size={22} color="#4C3A58" /></PressScale>
      <Text style={s.headerLabel}>保存したヒント</Text>
      <View style={s.icon}><Icon name="book-open" size={22} color="#8967A3" /></View>
    </View>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 36 }]} showsVerticalScrollIndicator={false}>
      <View style={s.welcome}>
        <View style={s.mascot}><StaticMascot stage={getMascotStage(progress)} mood="happy" size={82} /></View>
        <View style={s.welcomeCopy}><Text style={s.eyebrow}>YOUR LITTLE NOTEBOOK</Text><Text accessibilityRole="header" style={s.title}>自分のヒント帳</Text><Text style={s.subtitle}>心に残った言葉を読み返せます。</Text></View>
      </View>
      <Text style={s.note}>会話のヒントや、記録から見つかった傾向を保存できます。保存先はこの端末です。</Text>
      {loading ? <ActivityIndicator accessibilityLabel="ヒントを読み込み中" color="#8967A3" /> : null}
      {!!error && <View style={s.errorBox}><Text accessibilityRole="alert" style={s.error}>{error}</Text><PressScale style={s.link} onPress={load}><Text style={s.linkText}>読み込み直す</Text></PressScale></View>}
      {!loading && !error && !hints.length && <View style={s.empty}>
        <Icon name="bookmark" size={28} color="#967CAD" />
        <Text style={s.emptyTitle}>残しておきたいヒントを集めよう</Text>
        <Text style={s.subtitle}>おはなしや「元気な日の傾向」で、気に入ったヒントを保存してね。</Text>
        <PressScale style={s.primary} onPress={() => router.push('/(tabs)/chat')}><Text style={s.primaryText}>おはなしする</Text></PressScale>
        <PressScale style={s.link} onPress={() => router.push('/insights')}><Text style={s.linkText}>記録からの気づきを見る</Text></PressScale>
      </View>}
      {!loading && hints.map(hint => <View key={hint.id} testID="saved-hint" style={s.card}>
        <View style={s.cardTop}><Text style={s.source}>{hint.source === 'insight' ? '記録からの気づき' : 'おはなしで受け取った言葉'}</Text><Icon name="bookmark" size={18} color="#967CAD" /></View>
        <Text accessibilityRole="header" style={s.cardTitle}>{hint.title}</Text>
        <Text selectable style={s.body}>{hint.body}</Text>
        {!!hint.evidence && <Text style={s.evidence}>{hint.evidence}</Text>}
        {!!hint.citations?.length && <View><Text style={s.note}>受け取ったときの参考情報</Text>{hint.citations.map(c => <PressScale key={c.url} style={s.link} accessibilityRole="link" onPress={() => { void Linking.openURL(c.url).catch(() => setError('参考情報を開けませんでした。')); }}><Text style={s.linkText}>{c.title}</Text></PressScale>)}</View>}
        <View style={s.cardBottom}><Text style={s.date}>{new Date(hint.savedAt).toLocaleDateString('ja-JP')}に保存</Text><PressScale style={s.link} accessibilityLabel={`${hint.title}をヒント帳から外す`} onPress={() => setRemoveId(hint.id)}><Text style={s.removeText}>ヒント帳から外す</Text></PressScale></View>
      </View>)}
    </ScrollView>
    <CenterDialog visible={!!removeId} onClose={() => { if (!removing) setRemoveId(null); }}>
      <View style={s.dialog}><Text style={s.cardTitle}>このヒントを削除しますか？</Text><Text style={s.subtitle}>元のおはなしや日記の記録は残ります。</Text>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <PressScale disabled={removing} style={s.primary} onPress={remove}><Text style={s.primaryText}>{removing ? '外しています…' : 'ヒント帳から外す'}</Text></PressScale>
        <PressScale disabled={removing} style={s.link} onPress={() => setRemoveId(null)}><Text style={s.linkText}>残しておく</Text></PressScale>
      </View>
    </CenterDialog>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F3EB' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F3EB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E6DCCB', backgroundColor: '#FFFCF5' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, headerLabel: { flex: 1, textAlign: 'center', color: '#594362', fontSize: 13 },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 22, gap: 18 }, welcome: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }, mascot: { backgroundColor: '#EEE6F5', borderRadius: 42, padding: 3 }, welcomeCopy: { flex: 1, gap: 6 },
  eyebrow: { color: '#8D789A', letterSpacing: 2, fontSize: 10 }, title: { fontSize: 27, color: '#493454', fontWeight: '600' }, subtitle: { fontSize: 14, lineHeight: 23, color: '#776B77' }, note: { fontSize: 12, lineHeight: 20, color: '#897D87' },
  card: { padding: 22, borderRadius: 18, backgroundColor: '#FFFCF3', borderWidth: 1, borderColor: '#E3D7C5', gap: 14, borderLeftWidth: 4, borderLeftColor: '#C7B2D9' }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, source: { fontSize: 11, color: '#8C769B' }, cardTitle: { fontSize: 19, lineHeight: 28, color: '#543F60', fontWeight: '600' }, body: { fontSize: 16, lineHeight: 29, color: '#5A4C57' }, evidence: { fontSize: 12, lineHeight: 21, color: '#897989', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E7DECF' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }, date: { fontSize: 11, color: '#978995' }, removeText: { fontSize: 11, color: '#8A7C88' }, empty: { alignItems: 'center', gap: 20, borderRadius: 20, padding: 24, backgroundColor: '#FFFCF3', borderColor: '#E3D7C5', borderWidth: 1 }, emptyTitle: { fontSize: 18, lineHeight: 28, color: '#614A6D', textAlign: 'center' }, primary: { minHeight: 48, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 25, backgroundColor: '#8967A3', justifyContent: 'center', alignItems: 'center' }, primaryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' }, link: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }, linkText: { fontSize: 13, color: '#795D90', textDecorationLine: 'underline' }, errorBox: { gap: 6 }, error: { color: '#9C3750', fontSize: 13, lineHeight: 21 }, dialog: { gap: 20, padding: 18 },
});
