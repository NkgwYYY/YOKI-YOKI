import {HygieneGauge} from '@/components/world/HygieneGauge';
import {hygieneValue,readHygiene} from '@/utils/hygiene';
import {readHousekeeping,roomDirt} from '@/utils/housekeeping';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter,useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useApp } from '@/contexts/AppContext';
import { useItems, resolveItemAssetUrl } from '@/contexts/ItemContext';
import { getMascotStage } from '@/utils/mascotUtils';
import { SatietyGauge } from '@/components/world/SatietyGauge';
import {HappinessGauge} from '@/components/world/HappinessGauge';
import {useWorldHappiness} from '@/components/world/useWorldHappiness';
import {useVillageBgm} from '@/components/world/useVillageBgm';
import {HAPPY_REWARDS,type HappyAction} from '@/utils/happiness';
import {SmokingCare} from '@/components/world/SmokingCare';
import { WorldPill } from '@/components/world/WorldPill';
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

import { useRecordPrompt } from '@/contexts/RecordPromptContext';
import { isRecordPromptDue } from '@/utils/recordPrompt';
import { useDailyBath } from '@/components/world/useDailyBath';
import { DailyRecordInvitation } from '@/components/record/DailyRecordInvitation';

const HINT_KEY = '@yoki/world_hints_v3';
type Sheet = 'record' | 'feed' | 'chat' | 'menu' | 'atelier' | 'name' | 'happiness' | 'hygiene' | null;
export default function HomeScreen() {
  const router = useRouter();
  const {place,bathReturn}=useLocalSearchParams<{place?:string;bathReturn?:string}>();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const compact = window.height < 600;
  const wide = window.width > window.height;
  const tabHeight = 60 + Math.max(12, insets.bottom);
  const { active, reduceMotion } = useRoomActivity();
  const time = useWorldTime(active);
  const { progress, growth, currentSatiety, feedState, mascotName, setMascotName, roomCustomization, companionState,
    getTodayRecord, getCompletedCount, getTotalCheckCount, homeCommentPreferences } = useApp();
  const { items, shopState } = useItems();
  const [sceneBusy,setSceneBusy]=useState(false);
  const [worldMap,setWorldMap]=useState('home');
  const [feedVenue,setFeedVenue]=useState<'ramen'|undefined>(undefined);
  const [sheet, setSheet] = useState<Sheet>(null);
  const happiness=useWorldHappiness(active);
  const bathCompleted=useDailyBath();
  const [hygieneNow,setHygieneNow]=useState(Date.now);
  useEffect(()=>{if(!active)return;setHygieneNow(Date.now());const timer=setInterval(()=>setHygieneNow(Date.now()),60000);return()=>clearInterval(timer);},[active]);
  const dust=roomDirt(readHousekeeping(feedState.housekeeping,hygieneNow),hygieneNow);
  const hygiene=hygieneValue(feedState.hygiene,dust.reduce((a,b)=>a+b,0)/dust.length*100,hygieneNow);
  const hygieneState=readHygiene(feedState.hygiene,hygieneNow);
  const music=useVillageBgm(active&&sheet!=='chat');
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
  const prompt = useRecordPrompt();
  const invitation = worldMap==='home' && active && !sheet && !sceneBusy && prompt.ready && isRecordPromptDue(prompt.settings, prompt.now, !!today);
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
    space: 'くすぐったいよ。ゆっくりで大丈夫。', held: 'ふわっ。そっと、抱っこしてね。', land: 'ぽふっ。ただいま。', roll:'ころころ。ちょっと、ひなたぼっこ。',
  }[kind]);
  const openFeed=(venue?:'ramen')=>{if(food){say('いま、おやつを食べているところだよ。');return;}setFeedVenue(venue);setSheet('feed');};
  const restTogether = () => {setRest(n => n + 1); say('少し、ここでひと休みしよう。');};
  const menuRow = (icon: IconName, label: string, onPress: () => void) => <Pressable key={label} accessibilityRole="button" onPress={onPress} style={s.menuRow}><Icon name={icon} size={20} color="#786081" /><Text style={s.menuText}>{label}</Text><Icon name="chevron-right" size={16} color="#786081" /></Pressable>;
  return <View style={s.root}>
    <WorldHome onMapChange={setWorldMap} key={bathReturn??'world'} cleanliness={hygiene} happinessValue={happiness.value} music={music} careInvitation={invitation} onSceneBusy={setSceneBusy} onShop={()=>router.push('/shop')} onJob={()=>router.push('/egg-job')} onGarden={()=>router.push('/(tabs)/plant')} initialMap={place==='bowling'?'bowling':undefined} level={progress.level} customization={roomCustomization} stage={getMascotStage(progress.level)} growthSize={growth.growthSize}
      mascotName={mascotName || 'よっきー'} active={active && !sheet} reduceMotion={reduceMotion}
      period={time.period} daySeed={time.seed} food={food} onInteract={interact}
      onMealFinished={() => {setFood(null); say('ごちそうさま。また一緒に食べようね。');}}
      resting={!!today && today.mood <= 2} reaction={reaction} meal={meal} rest={rest} hints={hints} companion={companionState.extraEggs > 0}
      totalDays={progress.totalDays} wear={equipment('wear')} effect={equipment('effect')} decor={equipment('decor')}
      background={background?.assetUrl ? resolveItemAssetUrl(background.assetUrl) : undefined}
      onRecord={() => setSheet('record')} onFeed={openFeed}
      onChat={chat} onRest={restTogether} onAlbum={() => router.push('/(tabs)/growth')} />
    <View pointerEvents="box-none" style={[s.header, {top: insets.top + (compact ? 6 : 16)}]}>
      <View style={s.brandRow}><View pointerEvents="none"><Text style={s.brand}>YOKI YOKI</Text><Text style={s.subtitle}>{time.dateLabel}　{time.label}</Text></View>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={s.points}><Icon name="star" size={14} color="#9476A6"/><Text style={s.pointsText}>{feedState.points} pt</Text></View><WorldPill compact testID="home-more-menu" label="部屋のメニュー" icon="more-horizontal" onPress={()=>setSheet('menu')}/></View>
      </View>
      {worldMap!=='bowling'&&(worldMap==='home'||window.height>=660)&&<View style={s.statusRow}><SatietyGauge compact value={currentSatiety} onPress={()=>openFeed()}/><HappinessGauge value={happiness.value} onPress={()=>setSheet('happiness')}/><HygieneGauge value={hygiene} onPress={()=>setSheet('hygiene')}/></View>}
    </View>
    {worldMap==='home'&&<View pointerEvents="box-none" style={[s.footer, {bottom: tabHeight + 12}, compact && s.compactFooter, wide && {left: window.width * 0.65, right: 20, width: window.width * 0.32, bottom: tabHeight + 48}]}>
      {invitation ? <><Text testID="world-speech" accessibilityLiveRegion="polite" style={[s.whisper,{position:'absolute',bottom:'100%',marginBottom:10}]}>{speech}</Text><DailyRecordInvitation compact={compact || wide} onRecord={() => setSheet('record')} onSettings={() => router.push('/profile')} /></> : <View pointerEvents="none" style={s.speech}>
        <Text style={s.residentName}>{mascotName || 'よっきー'}</Text>
        <Text testID="world-speech" style={s.whisper} numberOfLines={2} accessibilityLiveRegion="polite">{speech || (happiness.smoking.craving?'たばこ、ほしいな…。ほかの楽しみで気をまぎらわせよう。':today?.mood && today.mood <= 2 ? '今日はここで、一緒にひと休み。' : time.moment)}</Text>
      </View>}
      <View style={[s.quickActions, wide && {flexDirection: 'column', alignItems: 'center'}]}>
        <Pressable testID="home-daily-record" accessibilityRole="button" accessibilityLabel="今日の記録を開く" onPress={() => setSheet('record')} style={({pressed}) => [s.noteButton, pressed && {opacity: 0.8}]}>
          <Icon name={today ? 'check' : 'edit-3'} size={17} color="#CCBADB" /><Text style={s.noteText}>{today ? '今日の記録' : '今日を、ひとこと'}</Text>
        </Pressable>
        <Pressable testID="home-chat" accessibilityRole="button" accessibilityLabel="この子とお話しする" onPress={chat} style={s.talkButton}><Icon name="message-circle" size={18} color="#CCBADB" /><Text style={s.talkText}>おはなし</Text></Pressable>
      </View>
    </View>
    }
    {sheet==='hygiene'&&<BottomSheet visible title="からだの清潔度" onClose={()=>setSheet(null)}>
      <Text style={s.chatText}>清潔度 {hygiene}%</Text><Text style={s.chatText}>3日以上からだを洗わないと、少しずつ薄汚れていくよ。おふろのタオルを選んで、指でからだをこすって洗おう。お湯に浸かるだけでは汚れは落ちません。</Text>
      {hygieneState.protectedUntil>hygieneNow&&<Text style={s.chatText}>風呂キャン中。あと{Math.ceil((hygieneState.protectedUntil-hygieneNow)/86400000)}日間は、入浴しなくてもさっぱり。</Text>}
      <WorldPill disabled={bathCompleted} label={bathCompleted?'今日は入浴済み。また明日':'おうちのおふろへ'} icon="droplet" onPress={()=>{setSheet(null);router.push('/(tabs)/plant');}}/>
    </BottomSheet>}
    {sheet === 'happiness' && <BottomSheet visible onClose={close} title="うれしい気持ち" subtitle="会いに来てくれることが、いちばんうれしい。">
      <Text style={s.chatText}>幸福度 {happiness.value}%</Text>
      {(happiness.smoking.dependent||happiness.smoking.recovered)&&<><SmokingCare status={happiness.smoking}/>{happiness.smoking.dependent&&<View style={{gap:8}}><WorldPill label="ごはんで気分転換" icon="coffee" onPress={()=>setSheet('feed')}/><WorldPill label="今日のことを記録する" icon="edit-3" onPress={()=>setSheet('record')}/><WorldPill disabled={bathCompleted} label={bathCompleted?'今日は入浴済み':'おふろでひと休み'} icon="droplet" onPress={()=>{setSheet(null);router.push('/(tabs)/plant');}}/></View>}</>}
      <Text style={{color:'#C1B2CA',fontSize:13,lineHeight:22}}>下の楽しみの加点は、1日1回。喫煙は吸っている時間に応じて変わるよ。</Text>
      {(Object.entries({visit:'会いに来てくれた',record:'今日のことを教えてくれた',ramen:'ラーメンを食べた',bath:'温泉でひと休み',homeBath:'おうちのおふろ',meal:'一緒にごはん'}) as [HappyAction,string][]).map(([action,label])=><View key={action} style={s.menuRow}>
        <Icon name={happiness.actions.includes(action)?'check-circle':'circle'} color="#A07DAA"/><Text style={s.menuText}>{label}</Text><Text style={{color:'#CDB68E'}}>＋{HAPPY_REWARDS[action]}</Text>
      </View>)}
      {!!happiness.error&&<><Text accessibilityRole="alert">{happiness.error}</Text><Button label="もう一度保存する" onPress={happiness.retry}/></>}
    </BottomSheet>}
    {sheet === 'record' && <BottomSheet visible onClose={close} title="今日の記録" maxHeightRatio={0.95} wide={wide} contentStyle={compact ? {paddingTop: 8, paddingBottom: 16, gap: 8} : undefined}>
      <QuickAffirmationRecord onComplete={() => { setReaction(n => n + 1); say('今日のこと、教えてくれてありがとう。'); close(); }} />
      {menuRow('book-open', 'もう少し残したいとき', () => { close(); router.push('/(tabs)/record'); })}
    </BottomSheet>}
    {sheet === 'feed' && <FeedModal visible venue={feedVenue} onClose={close} onFed={id => { setFood(id); setMeal(n => n + 1); say(feedVenue==='ramen'?'いただきます。あったかくて、おいしそう。':'わあ、いいにおい。いま行くね。'); close(); }} />}
    {sheet === 'chat' && <BottomSheet visible onClose={close} title={mascotName || 'よっきー'}>
      <Text style={s.chatText}>{today && today.mood <= 2 ? '今日は一緒に休もう。話したいことがあったら、ここにいるよ。' : message}</Text>
      <Button label="少し、お話しする" icon="message-circle" onPress={() => { close(); router.push('/(tabs)/chat'); }} />
    </BottomSheet>}
    {sheet === 'menu' && <BottomSheet visible onClose={close} title="この部屋でできること">
      {menuRow('edit-3', '今日を記録する', () => setSheet('record'))}
      {menuRow('message-circle', 'この子とお話しする', chat)}
      {menuRow('coffee', 'ごはんの時間', () => openFeed())}
      {menuRow('heart', 'そっと、なでる', () => { setReaction(n => n + 1); interact('pet'); close(); })}
      {menuRow('moon', 'ベッドで一緒に休む', () => { restTogether(); close(); })}
      {menuRow('help-circle', hints ? '家具のヒントを隠す' : '家具のヒントを表示', () => { toggleHints(); close(); })}
      {menuRow('home', '部屋の模様替え', () => setSheet('atelier'))}
      {menuRow('edit-3', 'なまえをつける', () => { setName(mascotName); setNameError(''); setSheet('name'); })}
      {menuRow('clock', '記録する時間', () => { close(); router.push('/profile'); })}
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
  header: { position: 'absolute', left: 20, right: 20, gap: 10 },
  brandRow: {flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  statusRow: {flexDirection:'row',gap:8,alignItems:'center'},
  points:{minHeight:44,paddingHorizontal:12,backgroundColor:'#211B30EC',borderColor:'#B7A48290',borderWidth:1,borderRadius: 7,flexDirection:'row',alignItems:'center',gap:6},
  pointsText:{fontSize:11,fontWeight:'700',color:'#D6C4E8'},
  brand: { fontSize: 12, letterSpacing: 3, color: '#FFF5E6', fontWeight: '700', textShadowColor: '#263A35', textShadowRadius: 6 },
  subtitle: { marginTop: 6, fontSize: 11, color: '#FFF1D9', textShadowColor: '#263A35', textShadowRadius: 6 },
  headerTools: { flexDirection: 'row', gap: 5 }, iconButton: { width: 44, height: 44, borderRadius: 7, backgroundColor: '#223D367A', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 22, right: 22, alignItems: 'center', gap: 14 },
  compactFooter: {left: 14, right: 14, gap: 5},
  speech: {alignItems: 'center', gap: 6, maxWidth: 380},
  residentName: {fontSize: 10, letterSpacing: 1, color: '#FAE3B8', textShadowColor: '#17291B', textShadowRadius: 6},
  whisper: { color: '#FFFAEF', fontSize: 14, lineHeight: 22, textAlign: 'center', textShadowColor: '#17291B', textShadowRadius: 6 },
  quickActions: {flexDirection:'row',gap:0,padding:4,borderRadius: 7,backgroundColor:'#211B30F2',borderWidth:1,borderColor:'#B7A48290',justifyContent:'center',shadowColor:'#50355F',shadowOpacity:.12,shadowRadius:12},
  noteButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 20, borderRadius: 7, backgroundColor: '#51415F88'},
  noteText: {fontSize: 12, fontWeight: '600', color: '#E6DAED'},
  talkButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 7, backgroundColor:'transparent'},
  talkText: {fontSize: 12, color: '#E6DAED'},
  menuRow: { minHeight: 50, flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 10 },
  menuText: { flex: 1, fontSize: 14, color: '#EEE3F4' },
  chatText: { fontSize: 17, lineHeight: 28, color: '#EEE3F4', marginVertical: 18 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CEBDCE', borderRadius: 12, padding: 12, marginVertical: 18, color: '#EEE3F4' },
});