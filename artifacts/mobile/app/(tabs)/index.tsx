import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useApp } from '@/contexts/AppContext';
import { useItems, resolveItemAssetUrl } from '@/contexts/ItemContext';
import { getMascotStage } from '@/utils/mascotUtils';
import { WorldHome } from '@/components/world/WorldHome';
import { useWorldTime } from '@/components/world/useWorldTime';
import type { ResidentInteraction } from '@/components/room/RoomResident';
import { RoomAtelier } from '@/components/room/RoomAtelier';
import { useRoomActivity } from '@/components/room/useRoomActivity';
import { BottomSheet, CenterDialog } from '@/components/ui/BottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { FeedModal } from '@/components/FeedModal';
import { QuickAffirmationRecord } from '@/components/record/QuickAffirmationRecord';
import { getHomeComment } from '@/utils/homeComment';
import { getTodayDate } from '@/utils/dateUtils';

const HINT_KEY = '@yoki/world_hints_v3';
type Sheet = 'record' | 'feed' | 'chat' | 'menu' | 'atelier' | 'name' | null;
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const compact = window.height < 600;
  const wide = window.width > window.height;
  const tabHeight = 60 + Math.max(12, insets.bottom);
  const { active, reduceMotion } = useRoomActivity();
  const time = useWorldTime(active);
  const { progress, growth, mascotName, setMascotName, roomCustomization, companionState,
    getTodayRecord, getCompletedCount, getTotalCheckCount, homeCommentPreferences } = useApp();
  const { items, shopState } = useItems();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hints, setHints] = useState(false);
  const [name, setName] = useState('');
  const [reaction, setReaction] = useState(0);
  const [meal, setMeal] = useState(0);
  const [rest, setRest] = useState(0);
  const [food, setFood] = useState<string | null>(null);
  const [speech, setSpeech] = useState('');
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [message, setMessage] = useState('おかえり。今日は、どんな一日だった？');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameBusy = useRef(false);
  const nameSession = useRef(0);
  const today = getTodayRecord();
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundGeneration = useRef(0);
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
  useEffect(() => { let alive = true; AsyncStorage.getItem(HINT_KEY).then(value => { if (alive) setHints(value === 'show'); }).catch(() => {}); return () => { alive = false; clearTimeout(speechTimer.current); }; }, []);
  useEffect(() => {
    if (!active || sheet !== 'chat') return;
    let alive = true;
    getHomeComment({ date: getTodayDate(), mascotName: mascotName || 'よっきー', record: today,
      completed: getCompletedCount(), total: getTotalCheckCount(), preferences: homeCommentPreferences })
      .then(value => { if (alive && value) setMessage(value); }).catch(() => {});
    return () => { alive = false; };
  }, [active, sheet, today, mascotName, homeCommentPreferences, getCompletedCount, getTotalCheckCount]);
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
  const say = (text: string) => {
    clearTimeout(speechTimer.current); setSpeech(text);
    speechTimer.current = setTimeout(() => setSpeech(''), 5500);
  };
  const interact = (kind: ResidentInteraction) => say({
    greet: 'あ、きてくれた。うれしいな。', pet: 'なでなで、きもちいい。',
    space: 'くすぐったいよ。ゆっくりで大丈夫。', held: 'ふわっ。そっと、抱っこしてね。', land: 'ぽふっ。ただいま。',
  }[kind]);
  const restTogether = () => {setRest(n => n + 1); say('少し、ここでひと休みしよう。');};
  const menuRow = (icon: IconName, label: string, onPress: () => void) => <Pressable key={label} accessibilityRole="button" onPress={onPress} style={s.menuRow}><Icon name={icon} size={20} color="#786081" /><Text style={s.menuText}>{label}</Text><Icon name="chevron-right" size={16} color="#786081" /></Pressable>;
  return <View style={s.root}>
    <WorldHome customization={roomCustomization} stage={getMascotStage(progress.level)} growthSize={growth.growthSize}
      mascotName={mascotName || 'よっきー'} active={active && !sheet} reduceMotion={reduceMotion}
      period={time.period} daySeed={time.seed} food={food} onInteract={interact}
      onMealFinished={() => {setFood(null); say('ごちそうさま。また一緒に食べようね。');}}
      resting={!!today && today.mood <= 2} reaction={reaction} meal={meal} rest={rest} hints={hints} companion={companionState.extraEggs > 0}
      totalDays={progress.totalDays} wear={equipment('wear')} effect={equipment('effect')} decor={equipment('decor')}
      background={background?.assetUrl ? resolveItemAssetUrl(background.assetUrl) : undefined}
      onRecord={() => setSheet('record')} onFeed={() => setSheet('feed')}
      onChat={chat} onRest={restTogether} onAlbum={() => router.push('/(tabs)/growth')} />
    <View pointerEvents="box-none" style={[s.header, {top: insets.top + (compact ? 6 : 16)}]}>
      <View pointerEvents="none"><Text style={s.brand}>YOKI YOKI</Text><Text style={s.subtitle}>{time.dateLabel}　{time.label}</Text></View>
      <View style={s.headerTools}>
        <Pressable accessibilityRole="button" accessibilityLabel={hints ? '家具のヒントを隠す' : '家具のヒントを表示'} onPress={toggleHints} style={s.iconButton}><Icon name="help-circle" size={21} color="#F2E8DE" /></Pressable>
        <Pressable testID="home-more-menu" accessibilityRole="button" accessibilityLabel="部屋のメニュー" onPress={() => setSheet('menu')} style={s.iconButton}><Icon name="menu" size={22} color="#F2E8DE" /></Pressable>
      </View>
    </View>
    <View pointerEvents="box-none" style={[s.footer, {bottom: tabHeight + 12}, compact && s.compactFooter, wide && {left: window.width * 0.65, right: 20, width: window.width * 0.32, bottom: tabHeight + 48}]}>
      <View pointerEvents="none" style={s.speech}>
        <Text style={s.residentName}>{mascotName || 'よっきー'}</Text>
        <Text testID="world-speech" style={s.whisper} numberOfLines={2} accessibilityLiveRegion="polite">{speech || (today?.mood && today.mood <= 2 ? '今日はここで、一緒にひと休み。' : time.moment)}</Text>
      </View>
      <View style={[s.quickActions, wide && {flexDirection: 'column', alignItems: 'center'}]}>
        <Pressable testID="home-daily-record" accessibilityRole="button" accessibilityLabel="今日の記録を開く" onPress={() => setSheet('record')} style={({pressed}) => [s.noteButton, pressed && {opacity: 0.8}]}>
          <Icon name={today ? 'check' : 'edit-3'} size={17} color="#454934" /><Text style={s.noteText}>{today ? '今日の記録' : '今日を、ひとこと'}</Text>
        </Pressable>
        <Pressable testID="home-chat" accessibilityRole="button" accessibilityLabel="この子とお話しする" onPress={chat} style={s.talkButton}><Icon name="message-circle" size={18} color="#FFF3DF" /><Text style={s.talkText}>おはなし</Text></Pressable>
      </View>
    </View>
    {sheet === 'record' && <BottomSheet visible onClose={close} title="今日の記録" maxHeightRatio={0.95} wide={wide} contentStyle={compact ? {paddingTop: 8, paddingBottom: 16, gap: 8} : undefined}>
      <QuickAffirmationRecord onComplete={() => { setReaction(n => n + 1); say('今日のこと、教えてくれてありがとう。'); close(); }} />
      {menuRow('book-open', 'もう少し残したいとき', () => { close(); router.push('/(tabs)/record'); })}
    </BottomSheet>}
    {sheet === 'feed' && <FeedModal visible onClose={close} onFed={id => { setFood(id); setMeal(n => n + 1); say('わあ、いいにおい。いま行くね。'); close(); }} />}
    {sheet === 'chat' && <BottomSheet visible onClose={close} title={mascotName || 'よっきー'}>
      <Text style={s.chatText}>{today && today.mood <= 2 ? '今日は一緒に休もう。話したいことがあったら、ここにいるよ。' : message}</Text>
      <Button label="少し、お話しする" icon="message-circle" onPress={() => { close(); router.push('/(tabs)/chat'); }} />
    </BottomSheet>}
    {sheet === 'menu' && <BottomSheet visible onClose={close} title="この部屋でできること">
      {menuRow('edit-3', '今日を記録する', () => setSheet('record'))}
      {menuRow('message-circle', 'この子とお話しする', chat)}
      {menuRow('coffee', 'ごはんの時間', () => setSheet('feed'))}
      {menuRow('heart', 'そっと、なでる', () => { setReaction(n => n + 1); interact('pet'); close(); })}
      {menuRow('moon', 'ベッドで一緒に休む', () => { restTogether(); close(); })}
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
  root: { flex: 1, backgroundColor: '#243A33' },
  header: { position: 'absolute', left: 20, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 12, letterSpacing: 3, color: '#FFF5E6', fontWeight: '700', textShadowColor: '#263A35', textShadowRadius: 6 },
  subtitle: { marginTop: 6, fontSize: 11, color: '#FFF1D9', textShadowColor: '#263A35', textShadowRadius: 6 },
  headerTools: { flexDirection: 'row', gap: 5 }, iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#223D367A', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 22, right: 22, alignItems: 'center', gap: 14 },
  compactFooter: {left: 14, right: 14, gap: 5},
  speech: {alignItems: 'center', gap: 6, maxWidth: 380},
  residentName: {fontSize: 10, letterSpacing: 1, color: '#FAE3B8', textShadowColor: '#17291B', textShadowRadius: 6},
  whisper: { color: '#FFFAEF', fontSize: 14, lineHeight: 22, textAlign: 'center', textShadowColor: '#17291B', textShadowRadius: 6 },
  quickActions: {flexDirection: 'row', gap: 10, justifyContent: 'center'},
  noteButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 20, borderRadius: 24, backgroundColor: '#F5E9CE'},
  noteText: {fontSize: 12, fontWeight: '600', color: '#454934'},
  talkButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 24, backgroundColor: '#20352ACF', borderWidth: 1, borderColor: '#D8DBBD40'},
  talkText: {fontSize: 12, color: '#FFF3DF'},
  menuRow: { minHeight: 50, flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 10 },
  menuText: { flex: 1, fontSize: 14, color: '#4B3C52' },
  chatText: { fontSize: 17, lineHeight: 28, color: '#4B3C52', marginVertical: 18 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CEBDCE', borderRadius: 12, padding: 12, marginVertical: 18, color: '#4B3C52' },
});
