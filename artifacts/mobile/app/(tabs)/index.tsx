import {FirstSteps,useFirstSteps} from '@/components/onboarding/FirstSteps';
import {hasMoodForDay} from '@/utils/firstSteps';
import {nextHomeAssist} from '@/utils/homeAssist';
import {useScenicVisit} from '@/components/world/useScenicVisit';
import {DailyLetter,useDailyLetter} from '@/components/daily/DailyLetter';
import {QuickAffirmationRecord} from '@/components/record/QuickAffirmationRecord';
import {FeltDecoration} from '@/components/ui/Felt';
import {CompanionCollection} from '@/components/collection/CompanionCollection';
import {DailyAdRail, DailyAdRewardButton, useDailyAdRailHeight} from '@/components/ads/DailyAdPlacements';
import {useAdEnvironment} from '@/components/ads/useAdEnvironment';
import {WORLD_MAPS} from '@/utils/worldMaps';
import {useAuth} from '@/contexts/AuthContext';
import {useCharacterGifts} from '@/components/gifts/useCharacterGifts';
import {GiftPresentation} from '@/components/gifts/GiftPresentation';
import type {CharacterGift} from '@/utils/characterGifts';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import { useRouter,useLocalSearchParams,useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCharacterVoice} from '@/components/world/useCharacterVoice';
import {useWelcomeVisit} from '@/components/world/useWelcomeVisit';
import { useApp } from '@/contexts/AppContext';
import { useItems, resolveItemAssetUrl } from '@/contexts/ItemContext';
import { getMascotStage } from '@/utils/mascotUtils';
import { SatietyGauge } from '@/components/world/SatietyGauge';
import {HappinessGauge} from '@/components/world/HappinessGauge';
import {useWorldHappiness} from '@/components/world/useWorldHappiness';
import {useVillageMusic} from '@/contexts/VillageMusicContext';
import {HAPPY_REWARDS,type HappyAction} from '@/utils/happiness';
import {SmokingCare} from '@/components/world/SmokingCare';
import { WorldPill } from '@/components/world/WorldPill';
import { WorldHome } from '@/components/world/WorldHome';
import { useWorldTime } from '@/components/world/useWorldTime';
import type { ResidentInteraction } from '@/components/room/RoomResident';
import { RoomAtelier, type AtelierCategory } from '@/components/room/RoomAtelier';
import { useRoomActivity } from '@/components/room/useRoomActivity';
import { BottomSheet, CenterDialog } from '@/components/ui/BottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { FeedModal } from '@/components/FeedModal';
import { getHomeComment } from '@/utils/homeComment';
import { getTodayDate } from '@/utils/dateUtils';

import { useRecordPrompt } from '@/contexts/RecordPromptContext';
import { isRecordPromptDue } from '@/utils/recordPrompt';
import { useDailyBath } from '@/components/world/useDailyBath';

const HINT_KEY = '@yoki/world_hints_v3';
type Sheet = 'collection' | 'points' | 'feed' | 'chat' | 'menu' | 'atelier' | 'name' | 'happiness' | 'brief' | 'mood' | 'gift' | 'tutorial' | null;
export default function HomeScreen() {
  const router = useRouter();
  const navigation=useNavigation<{setParams:(params:{learn:string})=>void}>();
  const {place,bathReturn,atelier,journey,learn}=useLocalSearchParams<{place?:string;bathReturn?:string;atelier?:string;journey?:string;learn?:string}>();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const compact = window.height < 600;
  const wide = window.width > window.height;
  const dockBottom = Math.max(12, insets.bottom);
  const tabHeight = 58 + dockBottom;
  const { active, reduceMotion } = useRoomActivity();
  const time = useWorldTime(active);
  const { progress, growth, currentSatiety, feedState, mascotName, setMascotName, roomCustomization, companionState,
    isLoading, cloudSynced, getTodayRecord, getCompletedCount, getTotalCheckCount, homeCommentPreferences } = useApp();
  const { items, shopState } = useItems();
  const [sceneBusy,setSceneBusy]=useState(false);
  const [worldInteracting,setWorldInteracting]=useState(false);
  const [worldMap,setWorldMap]=useState('home');
  const [feedVenue,setFeedVenue]=useState<'ramen'|undefined>(undefined);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [cleanRequest,setCleanRequest]=useState(0);
  const auth=useAuth(),giftOwner=auth.user?.id??'guest';
  const currentOwner=useRef(giftOwner);currentOwner.current=giftOwner;
  const tutorial=useFirstSteps(giftOwner,!isLoading&&!auth.isLoading&&(!auth.isSignedIn||cloudSynced));
  useEffect(()=>{setSheet(null);},[giftOwner]);
  const {runCharacterGifts}=useApp();
  const gifts=useCharacterGifts(active&&worldMap==='home');
  const [openedGift,setOpenedGift]=useState<{gift:CharacterGift;owner:string}|null>(null);
  const [atelierCategory,setAtelierCategory]=useState<AtelierCategory>('furniture');
  useEffect(()=>{if(atelier){setAtelierCategory(['furniture','flower','decor','cleaning'].includes(atelier)?atelier as AtelierCategory:'furniture');setSheet('atelier');router.setParams({atelier:undefined});}},[atelier]);
  const voice=useCharacterVoice(active);
  const welcome=useWelcomeVisit();
  const happiness=useWorldHappiness(active);
  const music=useVillageMusic();
  const [hints, setHints] = useState(false);
  const [name, setName] = useState('');
  const [reaction, setReaction] = useState(0);
  const [meal, setMeal] = useState(0);
  const [rest, setRest] = useState(0);
  const [food, setFood] = useState<string | null>(null);
  const adPlacement = worldMap==='market' ? 'street' : 'home';
  const adEnvironment = {...useAdEnvironment(!!sheet || sceneBusy, worldInteracting || !!food), screenActive: active && (worldMap==='home' || worldMap==='market')};
  const rewardEnvironment = useAdEnvironment(sheet!=='points', !!food);
  const railHeight = useDailyAdRailHeight(adPlacement, adEnvironment);
  const giftAvailable=!!gifts.waiting&&active&&worldMap==='home'&&!sheet&&!sceneBusy&&!food;
  const [speech, setSpeech] = useState('');
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [message, setMessage] = useState('おかえり。今日は、どんな一日だった？');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameBusy = useRef(false);
  const nameSession = useRef(0);
  const today = getTodayRecord();
  const prompt = useRecordPrompt();
  const invitation = false; // Recording is always optional.
  const letter=useDailyLetter(giftOwner,active);
  useEffect(()=>{if(learn==='1'){letter.markSeen();setSheet('tutorial');navigation.setParams({learn:'0'});}},[learn]);
  const needsMood=!isLoading&&hasMoodForDay(today,letter.date)===false;
  const assistScope=JSON.stringify([giftOwner,letter.date]);
  const [assistVisit,setAssistVisit]=useState({scope:'',quiet:false,fed:false});
  const sameAssistVisit=assistVisit.scope===assistScope;
  const assist=active&&!isLoading&&!auth.isLoading&&(!auth.isSignedIn||cloudSynced)&&tutorial.ready&&!tutorial.due&&!sheet&&!sceneBusy&&!worldInteracting&&!food&&worldMap==='home'&&!(sameAssistVisit&&assistVisit.quiet)
    ?nextHomeAssist({date:letter.date,record:today,diary:feedState.exchangeDiary,satiety:currentSatiety,fedThisVisit:sameAssistVisit&&assistVisit.fed}):null;
  const dismissAssist=()=>setAssistVisit({scope:assistScope,quiet:true,fed:sameAssistVisit&&assistVisit.fed});
  useEffect(()=>{if(active&&tutorial.ready&&tutorial.due&&!sheet&&!sceneBusy&&!worldInteracting&&!food){letter.markSeen();setSheet('tutorial');}},[active,tutorial.ready,tutorial.due,sheet,sceneBusy,worldInteracting,food]);
  const outing=useScenicVisit(giftOwner,letter.date,time.period==='night',!!bathReturn||!!atelier||!!place);
  useEffect(()=>{if(bathReturn||place==='home'){outing.returnHome();router.setParams({place:undefined,bathReturn:undefined});}},[bathReturn,place,outing.returnHome]);
  const openLetter=()=>{letter.markSeen();setSheet('brief');};
  useEffect(()=>{if(active&&learn!=='1'&&tutorial.ready&&!tutorial.due&&letter.due&&(!place||place==='home')&&!sheet&&!sceneBusy&&!worldInteracting&&!food){letter.markSeen();setSheet('brief');}},[active,learn,tutorial.ready,tutorial.due,letter.due,letter.date,sheet,sceneBusy,worldInteracting,food]);
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
    getHomeComment({ owner: giftOwner, date: getTodayDate(), mascotName: mascotName || 'よっきー', record: today,
      completed: getCompletedCount(), total: getTotalCheckCount(), preferences: homeCommentPreferences })
      .then(value => { if (alive && value) setMessage(value); }).catch(() => {});
    return () => { alive = false; };
  }, [active, sheet, today, mascotName, homeCommentPreferences, getCompletedCount, getTotalCheckCount, giftOwner]);
  const equipment = (category: 'wear' | 'effect' | 'decor') => {
    const id = shopState.equipped[category] ?? (category === 'wear' ? shopState.equipped.accessory : null);
    const item = items.find(i => i.id === id);
    if (!item?.assetUrl) return undefined;
    const p = shopState.placements[item.id];
    return { id: item.id, uri: resolveItemAssetUrl(item.assetUrl), x: p?.x ?? 0, y: p?.y ?? 0, scale: p?.scale ?? 1 };
  };
  const background = items.find(i => i.id === shopState.equipped.background);
  const chat = () => {setSheet('chat');voice.play('chat');};
  const toggleHints = () => {
    setHints(!hints); AsyncStorage.setItem(HINT_KEY, hints ? 'seen' : 'show').catch(() => {});
  };
  const say = (text: string, duration=5500) => {
    clearTimeout(speechTimer.current); setSpeech(text);
    speechTimer.current = setTimeout(() => setSpeech(''), duration);
  };
  const interact = (kind: ResidentInteraction) => {voice.play(kind==='held'?'surprise':kind==='pet'?'happy':kind==='land'?'land':kind==='space'?'soft':'greet','interaction');say({
    greet: 'あ、きてくれた。うれしいな。', pet: 'なでなで、きもちいい。',
    space: 'くすぐったいよ。ゆっくりで大丈夫。', held: 'ふわっ。そっと、抱っこしてね。', land: 'ぽふっ。ただいま。', roll:'ころころ。ちょっと、ひなたぼっこ。',
  }[kind]);};
  const openFeed=(venue?:'ramen')=>{if(food){say('いま、おやつを食べているところだよ。');return;}setFeedVenue(venue);setSheet('feed');};
  const restTogether = () => {voice.play('soft');setRest(n => n + 1); say('少し、ここでひと休みしよう。');};
  const menuRow = (icon: IconName, label: string, onPress: () => void) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.menuRow}><Icon name={icon} size={20} color="#82715E" /><Text style={s.menuText}>{label}</Text><Icon name="chevron-right" size={16} color="#82715E" /></Pressable>;
  return <View style={s.root}>
    <View testID="home-world-scene" style={{flex:1}}>
    <WorldHome speech={speech} visitScene={outing.scene} onReturnHome={outing.returnHome} cleanRequest={cleanRequest} onCleaningOpened={()=>setCleanRequest(0)} dockInset={railHeight ? 12 : undefined} onInteractingChange={setWorldInteracting} carriedGift={giftAvailable?gifts.waiting?.kind:undefined} welcomeRequest={welcome.request} onWelcomeStarted={id=>{welcome.acknowledge(id);voice.play('welcome');say('わあっ、おかえり！ 会えてうれしい！',7000);}} onMapChange={setWorldMap} key={`${bathReturn??'world'}-${journey??''}-${outing.scene??'home'}`} cleanliness={100} happinessValue={happiness.value} music={music} careInvitation={invitation} onSceneBusy={setSceneBusy} onShop={tab=>router.push(tab==='seeds'?'/shop?tab=seeds':'/shop')} onJob={()=>router.push('/egg-job')} onGarden={()=>router.push('/(tabs)/plant')} initialMap={WORLD_MAPS.find(p=>p.id===place)?.id} customization={roomCustomization} stage={getMascotStage(progress)} growthSize={growth.growthSize}
      mascotName={mascotName || 'よっきー'} active={active && !sheet} reduceMotion={reduceMotion}
      period={time.period} daySeed={time.seed} food={food} onInteract={interact}
      onMealFinished={() => {setFood(null); say('ごちそうさま。また一緒に食べようね。');}}
      resting={!!today && today.mood <= 2} reaction={reaction} meal={meal} rest={rest} hints={hints} companion={companionState.extraEggs > 0}
      totalDays={progress.totalDays} wear={equipment('wear')} effect={equipment('effect')} decor={equipment('decor')}
      background={background?.assetUrl ? resolveItemAssetUrl(background.assetUrl) : undefined}
      onRecord={() => router.push('/exchange-diary')} onFeed={openFeed}
      onChat={chat} onRest={restTogether} onAlbum={() => router.push('/(tabs)/growth')} />
    <View pointerEvents="box-none" style={[s.header, {top: insets.top + (compact ? 6 : 16)}]}>
      <View pointerEvents="box-none" style={s.brandRow}><View pointerEvents="none"><Text style={s.brand}>YOKI YOKI</Text><Text style={s.subtitle}>{time.dateLabel}　{time.label}</Text></View>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Pressable testID="home-points" accessibilityRole="button" accessibilityLabel={`${feedState.points}ポイント。ポイントの受け取りを開く`} style={s.points} onPress={()=>setSheet('points')}><Icon name="star" size={14} color="#71845D"/><Text style={s.pointsText}>{feedState.points} pt</Text></Pressable><WorldPill compact testID="home-more-menu" label="部屋のメニュー" icon="more-horizontal" onPress={()=>setSheet('menu')}/></View>
      </View>
      {(worldMap==='home'||window.height>=660)&&<View style={[s.statusRow,wide&&{maxWidth:300}]}><SatietyGauge compact value={currentSatiety} onPress={()=>openFeed()}/><HappinessGauge value={happiness.value} onPress={()=>setSheet('happiness')}/><WorldPill testID="home-letter" label="今日の便り" icon="mail" onPress={openLetter}/></View>}
    </View>
    {worldMap==='home'&&<View pointerEvents="box-none" style={[s.roomNotice,{top:insets.top+164},wide&&{left:'auto',width:320}]}>
      {!!gifts.error?<Pressable accessibilityRole="button" onPress={gifts.retry} style={s.noticePill}><Text style={s.noticeText}>{gifts.error} タップして再試行</Text></Pressable>:
      giftAvailable&&gifts.waiting?<Pressable testID="home-character-gift" accessibilityRole="button" accessibilityLabel={`${gifts.waiting.from}からの贈りものを受け取る`} onPress={()=>{setOpenedGift({gift:gifts.waiting!,owner:giftOwner});setSheet('gift');}} style={s.noticePill}><Icon name="gift" size={17} color="#84728B"/><Text style={s.noticeText}>贈りものが届いてるよ</Text><Icon name="chevron-right" size={14} color="#84728B"/></Pressable>:
      null}
    </View>}
    </View>
    <DailyAdRail placement={adPlacement} environment={adEnvironment} bottomInset={tabHeight}/>
    {worldMap==='home'&&<View testID="home-care-footer" pointerEvents="box-none" style={[s.footer,{bottom:dockBottom}]}>
      <View testID="home-action-dock" style={s.quickActions}><FeltDecoration radius={20}/>
        {([
          {id:'room-meal',label:'ごはん',name:'ごはんを選ぶ',icon:'coffee',kind:'feed',run:()=>openFeed()},
          {id:'home-quick-mood',label:'気分',name:'気分を残す',icon:needsMood?'smile':'check-circle',kind:'mood',run:()=>setSheet('mood')},
          {id:'home-daily-record',label:'日記',name:'交換日記を開く',icon:feedState.exchangeDiary?.pages[getTodayDate()]?.user?'check':'book-open',kind:'diary',run:()=>router.push('/exchange-diary')},
          {id:'home-chat',label:'おはなし',name:'この子とお話しする',icon:'message-circle',run:chat},
          {id:'home-bath',label:'おふろ',name:'おふろを開く',icon:'droplet',run:()=>router.push('/(tabs)/plant')},
          {id:'home-growth',label:'歩み',name:'歩みを開く',icon:'sun',run:()=>router.push('/(tabs)/growth')},
        ] as {id:string;label:string;name:string;icon:IconName;kind?:string;run:()=>void}[]).map(action=><Pressable key={action.id} testID={action.id} accessibilityRole="button" accessibilityLabel={action.name} accessibilityHint={assist&&assist.kind===action.kind?assist?.text:undefined} onPress={()=>{dismissAssist();action.run();}} style={({pressed})=>[s.dockButton,pressed&&{backgroundColor:'#E5ECD9'}]}>
          <View><Icon name={action.icon} size={19} color="#71845D"/>{assist&&assist.kind===action.kind&&<View testID={`home-assist-dot-${action.kind}`} style={s.assistDot}/>}</View>
          <Text numberOfLines={1} style={s.dockLabel}>{action.label}</Text>
        </Pressable>)}
      </View>
    </View>}
    {sheet==='points'&&<BottomSheet visible onClose={close} title="YOKIポイント" subtitle="ごはんや、お部屋のお買い物に使えます">
      <Text style={s.chatText}>{feedState.points} pt</Text>
      <DailyAdRewardButton placement={adPlacement} environment={rewardEnvironment}/>
      <Text style={{color:'#7F6D5D',fontSize:13,lineHeight:22}}>今日の記録や、たまごバイトでもポイントを集められます。</Text>
      <WorldPill label="ごはんを選ぶ" icon="coffee" onPress={()=>openFeed()}/>
    </BottomSheet>}
    {sheet==='gift'&&openedGift?.owner===giftOwner&&<GiftPresentation key={openedGift.gift.id+giftOwner} gift={openedGift.gift} onClose={close} onReceive={async id=>{const saved=await runCharacterGifts({kind:'receive',id});if(!saved.received)throw Error('Gift missing');voice.play('happy');return saved.received;}} onList={()=>{close();router.push('/gifts');}}/>}
    {sheet==='brief'&&<DailyLetter date={letter.date} onClose={close} onGrowth={()=>{close();router.push('/(tabs)/growth');}}/>}
    {sheet==='tutorial'&&<FirstSteps key={giftOwner} onFinish={async record=>{const owner=giftOwner;await tutorial.finish();if(currentOwner.current!==owner)return;letter.markSeen();setSheet(record?'mood':null);}}/>}
    {sheet==='mood'&&<BottomSheet visible title="今日の気持ち" onClose={close}><QuickAffirmationRecord/><Button variant="ghost" label="日記も書く" onPress={()=>{close();router.push('/exchange-diary');}}/></BottomSheet>}
    {sheet === 'happiness' && <BottomSheet visible onClose={close} title="うれしい気持ち" subtitle="会いに来てくれることが、いちばんうれしい。">
      <Text style={s.chatText}>幸福度 {happiness.value}%</Text>
      <Text testID="happiness-decay-guide" style={{color:'#7F6D5D',fontSize:13,lineHeight:22}}>幸福度は、アプリを閉じている間も1時間に1ずつ下がります。24時間以上会わないと、その先は1時間に2ずつ。会いに来ると1日1回、24回復します。毎日少し会えれば保ちやすく、2日空くと大きく下がります。ごはんや日記、おふろでも回復するよ。</Text>
      {(happiness.smoking.dependent||happiness.smoking.recovered)&&<><SmokingCare status={happiness.smoking}/>{happiness.smoking.dependent&&<View style={{gap:8}}><WorldPill label="ごはんで気分転換" icon="coffee" onPress={()=>setSheet('feed')}/><WorldPill label="交換日記を書く" icon="book-open" onPress={()=>router.push('/exchange-diary')}/><WorldPill label="おふろでひと休み" icon="droplet" onPress={()=>{setSheet(null);router.push('/(tabs)/plant');}}/></View>}</>}
      <Text style={{color:'#7F6D5D',fontSize:13,lineHeight:22}}>下の楽しみの加点は、1日1回。{Platform.OS !== 'ios' && '喫煙は吸っている時間に応じて変わるよ。'}</Text>
      {(Object.entries({visit:'会いに来てくれた',record:'今日のことを教えてくれた',homeBath:'おうちのおふろ',meal:'一緒にごはん'}) as [HappyAction,string][]).map(([action,label])=><View key={action} style={s.menuRow}>
        <Icon name={happiness.actions.includes(action)?'check-circle':'circle'} color="#A07DAA"/><Text style={s.menuText}>{label}</Text><Text style={{color:'#CDB68E'}}>＋{HAPPY_REWARDS[action]}</Text>
      </View>)}
      {!!happiness.error&&<><Text accessibilityRole="alert">{happiness.error}</Text><Button label="もう一度保存する" onPress={happiness.retry}/></>}
    </BottomSheet>}
    {sheet === 'feed' && <FeedModal visible venue={feedVenue} onClose={close} onFed={id => { setAssistVisit({scope:assistScope,quiet:sameAssistVisit&&assistVisit.quiet,fed:true}); voice.play('happy'); setFood(id); setMeal(n => n + 1); say(feedVenue==='ramen'?'いただきます。あったかくて、おいしそう。':'わあ、いいにおい。いただきます。'); close(); }} />}
    {sheet === 'chat' && <BottomSheet visible onClose={close} title={mascotName || 'よっきー'}>
      <Text style={s.chatText}>{today && today.mood <= 2 ? '今日は一緒に休もう。話したいことがあったら、ここにいるよ。' : message}</Text>
      <Button label="少し、お話しする" icon="message-circle" onPress={() => { close(); router.push('/(tabs)/chat'); }} />
    </BottomSheet>}
    {sheet === 'collection' && <BottomSheet visible onClose={close} title="思い出" subtitle="少しずつ、この部屋が好きになる。"><CompanionCollection/></BottomSheet>}
    {sheet === 'menu' && <BottomSheet visible onClose={close} title="この部屋でできること">
      {menuRow('mail', '今日の便り', openLetter)}
      {menuRow('help-circle', 'はじめての使い方', () => {letter.markSeen();setSheet('tutorial');})}
      {menuRow('gift', '思い出・飾りもの', () => setSheet('collection'))}
      {menuRow('users', '友だちのおうち', () => { close(); router.push('/friends'); })}
      {menuRow('gift', 'この子からの贈りもの', () => { close(); router.push('/gifts'); })}
      {menuRow('book-open', '交換日記', () => { close(); router.push('/exchange-diary'); })}
      {menuRow('message-circle', 'この子とお話しする', chat)}
      {menuRow('coffee', 'ごはんの時間', () => openFeed())}
      {menuRow('heart', 'そっと、なでる', () => { setReaction(n => n + 1); interact('pet'); close(); })}
      {menuRow('moon', '一緒にひと休み', () => { restTogether(); close(); })}
      {menuRow('help-circle', hints ? '家具のヒントを隠す' : '家具のヒントを表示', () => { toggleHints(); close(); })}
      {menuRow('home', '部屋の模様替え', () => {setAtelierCategory('furniture');setSheet('atelier');})}
      {menuRow(voice.enabled?'volume-2':'volume-x',`鳴き声：${voice.enabled?'オン':'オフ'}`,voice.toggle)}
      {voice.enabled&&menuRow('music','鳴き声を聞く',()=>voice.play('chat','preview'))}
      {voice.enabled&&<Text testID="voice-pacing-hint" style={{color:'#7F6D5D',fontSize:12,lineHeight:19,paddingLeft:34}}>タップの鳴き声は、ときどき。続けて触っても鳴きすぎないよ。</Text>}
      {!!voice.error&&<Text style={{color:'#DFC8DB'}}>{voice.error}</Text>}
      {menuRow('edit-3', 'なまえをつける', () => { setName(mascotName); setNameError(''); setSheet('name'); })}
      {menuRow('clock', '記録する時間', () => { close(); router.push('/profile'); })}
      {menuRow('user', 'プロフィール・話しかけ設定', () => { close(); router.push('/profile'); })}
      {menuRow('book-open', '使い方ガイド', () => { close(); router.push('/guide'); })}
    </BottomSheet>}
    {sheet === 'atelier' && <RoomAtelier onClose={close} initialCategory={atelierCategory} />}
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
  points:{minHeight:44,paddingHorizontal:12,backgroundColor:'#FFF8EA',borderColor:'#D7C6AA',borderWidth:1,borderRadius: 18,flexDirection:'row',alignItems:'center',gap:6},
  pointsText:{fontSize:11,fontWeight:'700',color:'#6D7758'},
  brand: { fontSize: 12, letterSpacing: 3, color: '#FFF5E6', fontWeight: '700', textShadowColor: '#263A35', textShadowRadius: 6 },
  subtitle: { marginTop: 6, fontSize: 11, color: '#FFF1D9', textShadowColor: '#263A35', textShadowRadius: 6 },
  headerTools: { flexDirection: 'row', gap: 5 }, iconButton: { width: 44, height: 44, borderRadius: 18, backgroundColor: '#223D367A', alignItems: 'center', justifyContent: 'center' },
  footer: {position:'absolute',left:12,right:12,alignItems:'center'},
  roomNotice:{position:'absolute',left:20,right:20,alignItems:'center'},
  noticePill:{maxWidth:360,minHeight:44,paddingHorizontal:14,paddingVertical:8,borderRadius:16,backgroundColor:'#FFF8EAEF',flexDirection:'row',alignItems:'center',gap:8},
  noticeText:{color:'#685869',fontSize:12,lineHeight:18,flexShrink:1,textAlign:'center'},
  quickActions:{width:'100%',maxWidth:440,height:58,flexDirection:'row',padding:4,borderRadius:20,backgroundColor:'#FFF8EA',borderWidth:1,borderColor:'#D7C6AA',shadowColor:'#50355F',shadowOpacity:.10,shadowRadius:10,shadowOffset:{width:0,height:3}},
  dockButton:{flex:1,minWidth:44,minHeight:48,alignItems:'center',justifyContent:'center',gap:3,borderRadius:15},
  dockLabel:{fontSize:10,lineHeight:14,color:'#685D4F'},
  assistDot:{position:'absolute',right:-5,top:-2,width:6,height:6,borderRadius:3,backgroundColor:'#B793BB',borderWidth:1,borderColor:'#FFF8EA'},
  menuRow: { minHeight: 50, flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 10 },
  menuText: { flex: 1, fontSize: 14, color: '#574234' },
  chatText: { fontSize: 17, lineHeight: 28, color: '#574234', marginVertical: 18 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CEBDCE', borderRadius: 12, padding: 12, marginVertical: 18, color: '#574234' },
});
