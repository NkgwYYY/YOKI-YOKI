import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useApp } from '@/contexts/AppContext';
import { useItems, resolveItemAssetUrl } from '@/contexts/ItemContext';
import { getMascotStage } from '@/utils/mascotUtils';
import { getCurrentSlot, MAX_PLAYS_PER_SLOT, resolveMiniGameState } from '@/utils/miniGameUtils';
import { RoomView } from '@/components/RoomView';
import { RoomAtelier } from '@/components/room/RoomAtelier';
import { useRoomActivity } from '@/components/room/useRoomActivity';
import { BottomSheet, CenterDialog } from '@/components/ui/BottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { FeedModal } from '@/components/FeedModal';
import { MiniGameModal } from '@/components/MiniGameModal';
import { QuickAffirmationRecord } from '@/components/record/QuickAffirmationRecord';
import { getHomeComment } from '@/utils/homeComment';
import { getTodayDate } from '@/utils/dateUtils';

const HINT_KEY = '@yoki/room_hints_v2';
type Sheet = 'record' | 'feed' | 'music' | 'chat' | 'menu' | 'atelier' | 'name' | null;
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabHeight = Platform.OS === 'web' ? 84 : 49 + insets.bottom;
  const { active, reduceMotion } = useRoomActivity();
  const { progress, growth, mascotName, setMascotName, roomCustomization, companionState,
    getTodayRecord, getCompletedCount, getTotalCheckCount, homeCommentPreferences,
    miniGameState, completeMiniGame } = useApp();
  const { items, shopState } = useItems();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hints, setHints] = useState(true);
  const [name, setName] = useState('');
  const [reaction, setReaction] = useState(0);
  const [meal, setMeal] = useState(0);
  const [rest, setRest] = useState(0);
  const [message, setMessage] = useState('おかえり。今日は、どんな一日だった？');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameBusy = useRef(false);
  const nameSession = useRef(0);
  const today = getTodayRecord();
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundGeneration = useRef(0);
  const slot = getCurrentSlot() ?? 'night';
  const canEarn = resolveMiniGameState(miniGameState)[slot] < MAX_PLAYS_PER_SLOT;
  const close = () => { nameSession.current++; setSheet(null); };
  const saveName = async () => {
    if (nameBusy.current || !name.trim()) return;
    const session = nameSession.current;
    nameBusy.current = true; setSavingName(true); setNameError('');
    try {
      await setMascotName(name.trim());
      if (session === nameSession.current) close();
    } catch {
      if (session === nameSession.current) setNameError('名前を保存できませんでした。入力は残っています。もう一度お試しください。');
    } finally { nameBusy.current = false; setSavingName(false); }
  };
  useEffect(() => { let alive = true; AsyncStorage.getItem(HINT_KEY).then(value => { if (alive) setHints(value !== 'seen'); }).catch(() => {}); return () => { alive = false; }; }, []);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    getHomeComment({ date: getTodayDate(), mascotName: mascotName || 'よっきー', record: today,
      completed: getCompletedCount(), total: getTotalCheckCount(), preferences: homeCommentPreferences })
      .then(value => { if (alive && value) setMessage(value); }).catch(() => {});
    return () => { alive = false; };
  }, [active, today, mascotName, homeCommentPreferences, getCompletedCount, getTotalCheckCount]);
  useEffect(() => {
    if (!active) { soundGeneration.current++; soundRef.current?.unloadAsync().catch(() => {}); soundRef.current = null; }
    return () => { soundGeneration.current++; soundRef.current?.unloadAsync().catch(() => {}); soundRef.current = null; };
  }, [active]);
  const equipment = (category: 'wear' | 'effect' | 'decor') => {
    const id = shopState.equipped[category] ?? (category === 'wear' ? shopState.equipped.accessory : null);
    const item = items.find(i => i.id === id);
    if (!item?.assetUrl) return undefined;
    const p = shopState.placements[item.id];
    return { id: item.id, uri: resolveItemAssetUrl(item.assetUrl), x: p?.x ?? 0, y: p?.y ?? 0, scale: p?.scale ?? 1 };
  };
  const background = items.find(i => i.id === shopState.equipped.background);
  const chat = () => {
    setSheet('chat');
    const voice = items.find(i => i.id === shopState.equipped.voice);
    if (!voice?.assetUrl) return;
    const generation = ++soundGeneration.current;
    soundRef.current?.unloadAsync().catch(() => {});
    Audio.Sound.createAsync({ uri: resolveItemAssetUrl(voice.assetUrl) }, { shouldPlay: false }).then(async ({ sound }) => {
      if (generation !== soundGeneration.current) { await sound.unloadAsync(); return; }
      soundRef.current = sound; await sound.playAsync();
    }).catch(() => {});
  };
  const toggleHints = () => {
    setHints(!hints); AsyncStorage.setItem(HINT_KEY, hints ? 'seen' : 'show').catch(() => {});
  };
  const menuRow = (icon: IconName, label: string, onPress: () => void) => <Pressable key={label} accessibilityRole="button" onPress={onPress} style={s.menuRow}><Icon name={icon} size={20} color="#786081" /><Text style={s.menuText}>{label}</Text><Icon name="chevron-right" size={16} color="#786081" /></Pressable>;
  return <View style={[s.root, { paddingTop: insets.top, paddingBottom: tabHeight }]}>
    <View style={s.header}>
      <View><Text style={s.brand}>YOKI YOKI</Text><Text style={s.subtitle}>{mascotName ? `${mascotName}の部屋` : 'ふたりの、小さな暮らし'}</Text></View>
      <View style={s.headerTools}>
        <Pressable accessibilityRole="button" accessibilityLabel={hints ? '家具のヒントを隠す' : '家具のヒントを表示'} onPress={toggleHints} style={s.iconButton}><Icon name="help-circle" size={21} color="#F2E8DE" /></Pressable>
        <Pressable testID="home-more-menu" accessibilityRole="button" accessibilityLabel="部屋のメニュー" onPress={() => setSheet('menu')} style={s.iconButton}><Icon name="menu" size={22} color="#F2E8DE" /></Pressable>
      </View>
    </View>
    <RoomView customization={roomCustomization} stage={getMascotStage(progress.level)} growthSize={growth.growthSize}
      mascotName={mascotName || 'よっきー'} active={active && !sheet} reduceMotion={reduceMotion}
      resting={!!today && today.mood <= 2} reaction={reaction} meal={meal} rest={rest} hints={hints} companion={companionState.extraEggs > 0}
      totalDays={progress.totalDays} wear={equipment('wear')} effect={equipment('effect')} decor={equipment('decor')}
      background={background?.assetUrl ? resolveItemAssetUrl(background.assetUrl) : undefined}
      onRecord={() => setSheet('record')} onFeed={() => setSheet('feed')} onPlay={() => setSheet('music')}
      onChat={chat} onRest={() => setRest(n => n + 1)} onAlbum={() => router.push('/(tabs)/growth')} />
    <View style={s.footer} pointerEvents="none"><Text style={s.whisper} numberOfLines={2} accessibilityLiveRegion="polite">{today?.mood && today.mood <= 2 ? '今日はここで、一緒にひと休み。' : hints ? 'ノートに今日を。音楽にひと息。長押しで抱っこ。' : 'ここでは、あなたのペースで。'}</Text></View>
    {sheet === 'record' && <BottomSheet visible onClose={close} title="今日を、ひとこと" maxHeightRatio={0.95}>
      <QuickAffirmationRecord onComplete={() => { setReaction(n => n + 1); close(); }} />
      {menuRow('book-open', 'もっと詳しく記録する・チェック', () => { close(); router.push('/(tabs)/record'); })}
    </BottomSheet>}
    {sheet === 'feed' && <FeedModal visible onClose={close} onFed={() => { setMeal(n => n + 1); close(); }} />}
    {sheet === 'music' && <MiniGameModal visible slot={slot} onClose={close} rewardEnabled={canEarn}
      onReward={async (reward, playId) => { const earned = await completeMiniGame(slot, reward, playId); if (earned) setReaction(n => n + 1); return earned; }} />}
    {sheet === 'chat' && <BottomSheet visible onClose={close} title={mascotName || 'よっきー'}>
      <Text style={s.chatText}>{today && today.mood <= 2 ? '今日は一緒に休もう。話したいことがあったら、ここにいるよ。' : message}</Text>
      <Button label="少し、お話しする" icon="message-circle" onPress={() => { close(); router.push('/(tabs)/chat'); }} />
    </BottomSheet>}
    {sheet === 'menu' && <BottomSheet visible onClose={close} title="この部屋でできること">
      {menuRow('edit-3', '今日を記録する', () => setSheet('record'))}
      {menuRow('message-circle', 'この子とお話しする', chat)}
      {menuRow('coffee', 'ごはんの時間', () => setSheet('feed'))}
      {menuRow('moon', 'ベッドで一緒に休む', () => { setRest(n => n + 1); close(); })}
      {menuRow('music', '音楽であそぶ', () => setSheet('music'))}
      {menuRow('shopping-bag', '暮らしのお店', () => { close(); router.push('/shop'); })}
      {menuRow('home', '部屋の模様替え', () => setSheet('atelier'))}
      {menuRow('edit-3', 'なまえをつける', () => { setName(mascotName); setNameError(''); setSheet('name'); })}
      {menuRow('user', 'プロフィール・話しかけ設定', () => { close(); router.push('/profile'); })}
      {menuRow('book-open', '使い方ガイド', () => { close(); router.push('/guide'); })}
    </BottomSheet>}
    {sheet === 'atelier' && <RoomAtelier onClose={close} />}
    {sheet === 'name' && <CenterDialog visible onClose={close}><Text style={s.menuText}>この子を、なんて呼ぼう？</Text>
      <TextInput accessibilityLabel="なかまの名前" editable={!savingName} maxLength={16} value={name} onChangeText={setName} style={s.input} placeholder="よっきー" />
      {nameError ? <Text accessibilityRole="alert">{nameError}</Text> : null}
      <Button label="この名前にする" disabled={!name.trim() || savingName} loading={savingName} onPress={saveName} />
    </CenterDialog>}
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#382B37' },
  header: { height: 64, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 17, letterSpacing: 3, color: '#FFF3DF', fontWeight: '600' },
  subtitle: { marginTop: 4, fontSize: 11, color: '#C9B7C5' },
  headerTools: { flexDirection: 'row' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footer: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  whisper: { color: '#D7C5D1', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  menuRow: { minHeight: 50, flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 10 },
  menuText: { flex: 1, fontSize: 14, color: '#4B3C52' },
  chatText: { fontSize: 17, lineHeight: 28, color: '#4B3C52', marginVertical: 18 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CEBDCE', borderRadius: 12, padding: 12, marginVertical: 18, color: '#4B3C52' },
});
