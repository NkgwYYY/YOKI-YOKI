import React, { useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { backToRoom } from '@/utils/backToRoom';
import { useAuth } from '@/contexts/AuthContext';
import { RoomView } from '@/components/RoomView';
import { fitRoom } from '@/utils/roomGeometry';
import { useApp } from '@/contexts/AppContext';
import { EquipmentSlot, Item, ItemCategory, resolveItemAssetUrl, useItems } from '@/contexts/ItemContext';
import { getMascotStage } from '@/utils/mascotUtils';

type ShopGenre = 'wear' | 'effect' | 'decor' | 'background' | 'voice';
type ItemPlacement = { x: number; y: number; scale: number };
const DEFAULT_PLACEMENT: ItemPlacement = { x: 0, y: 0, scale: 1 };
const clampPlacement = ({ x, y, scale }: ItemPlacement): ItemPlacement => ({
  x: Math.max(-160, Math.min(160, x)),
  y: Math.max(-160, Math.min(160, y)),
  scale: Math.max(0.55, Math.min(1.45, scale)),
});
const touchDistance = (touches: readonly { pageX: number; pageY: number }[]) => {
  if (touches.length < 2) return 0;
  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
};
const tabs: { id: ShopGenre; label: string }[] = [
  { id: 'wear', label: '身につける' },
  { id: 'effect', label: 'エフェクト' },
  { id: 'decor', label: '置きもの' },
  { id: 'background', label: '背景' },
  { id: 'voice', label: 'ボイス' },
];
const genreOf = (id: string, category: ItemCategory): ShopGenre => {
  if (id.startsWith('catalog-effect-')) return 'effect';
  if (id.startsWith('catalog-decor-')) return 'decor';
  if (category === 'accessory') return 'wear';
  return category as ShopGenre;
};

const ignorePreviewAction = () => {};

function HomeScenePreview({
  stage,
  growthSize,
  roomCustomization,
  background,
  wear,
  effect,
  decor,
  placements,
}: {
  stage: ReturnType<typeof getMascotStage>;
  growthSize: number;
  roomCustomization: React.ComponentProps<typeof RoomView>['customization'];
  background?: Item;
  wear?: Item;
  effect?: Item;
  decor?: Item;
  placements: Record<string, ItemPlacement>;
}) {
  const { progress, companionState } = useApp();
  const equipment = (item?: Item) => item?.assetUrl ? {
    id: item.id, uri: resolveItemAssetUrl(item.assetUrl),
    ...(placements[item.id] ?? DEFAULT_PLACEMENT),
  } : undefined;
  return <RoomView customization={roomCustomization} stage={stage} growthSize={growthSize}
    mascotName="試着中" active={false} reduceMotion resting={false} reaction={0} meal={0} rest={0}
    hints={false} companion={companionState.extraEggs > 0} totalDays={progress.totalDays}
    onRecord={ignorePreviewAction} onFeed={ignorePreviewAction} onPlay={ignorePreviewAction}
    onChat={ignorePreviewAction} onAlbum={ignorePreviewAction} onRest={ignorePreviewAction}
    wear={equipment(wear)} effect={equipment(effect)} decor={equipment(decor)}
    background={background?.assetUrl ? resolveItemAssetUrl(background.assetUrl) : undefined} />;
}

export default function ShopScreen() {
  const router = useRouter(); const { isSignedIn } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const stackCards = width < 360 || fontScale >= 1.4;
  const { progress, growth, roomCustomization } = useApp();
  const { items, shopState, loading, error, catalogOnline, refreshItems, buyItem, equipItem, updateItemPlacement } = useItems();
  const [tab, setTab] = useState<ShopGenre>('wear'); const [busy, setBusy] = useState<string | null>(null);
  const actionBusy = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<Item | null>(null);
  const [draftPlacement, setDraftPlacement] = useState<ItemPlacement>(DEFAULT_PLACEMENT);
  const draftPlacementRef = useRef<ItemPlacement>(DEFAULT_PLACEMENT);
  const customizingRef = useRef<Item | null>(null);
  const previewWidth = useRef(220);
  const gestureStart = useRef({ placement: DEFAULT_PLACEMENT, pinchDistance: 0, pinchScale: 1, pinching: false });
  draftPlacementRef.current = draftPlacement;
  customizingRef.current = customizing;
  const previewStage = getMascotStage(progress.level);
  const visibleItems = items.filter(x => x.category !== 'food' && genreOf(x.id, x.category) === tab && (x.isActive || shopState.inventory.includes(x.id)));
  const slot = (item: Item): EquipmentSlot => genreOf(item.id, item.category) as EquipmentSlot;
  const equippedIdFor = (target: EquipmentSlot) => target === 'wear'
    ? shopState.equipped.wear ?? shopState.equipped.accessory
    : shopState.equipped[target];
  const customizingSlot = customizing ? slot(customizing) : null;
  const itemForSlot = (target: EquipmentSlot) => {
    if (customizing && customizingSlot === target) return customizing;
    const equippedId = equippedIdFor(target);
    return items.find((item) => item.id === equippedId);
  };
  const scenePlacements = customizing
    ? { ...shopState.placements, [customizing.id]: draftPlacement }
    : shopState.placements;
  const customizingEquipped = !!customizing && equippedIdFor(customizingSlot!) === customizing.id;
  const act = async (item: Item) => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    setActionError(null);
    setBusy(item.id);
    try {
      if (!shopState.inventory.includes(item.id)) await buyItem(item.id);
      else {
        const itemSlot = slot(item);
        await equipItem(itemSlot, equippedIdFor(itemSlot) === item.id ? null : item.id);
      }
    } catch (e) { setActionError('保存が完了しませんでした。もう一度操作すると保存状況を確認します。' + (e instanceof Error ? ` ${e.message}` : '')); }
    finally { actionBusy.current = false; setBusy(null); }
  };
  const openCustomizer = (item: Item) => {
    setActionError(null);
    const placement = shopState.placements[item.id] ?? DEFAULT_PLACEMENT;
    setDraftPlacement(placement);
    draftPlacementRef.current = placement;
    setCustomizing(item);
  };
  const persistPlacement = async (item: Item, placement: ItemPlacement) => {
    try {
      await updateItemPlacement(item.id, placement);
      setActionError(null);
      return true;
    } catch {
      setActionError('位置を保存できませんでした。「この位置で完了」からもう一度保存できます。');
      return false;
    }
  };
  const finishCustomizer = async () => {
    if (!customizing || actionBusy.current) return;
    actionBusy.current = true;
    setBusy(customizing.id);
    try {
      if (customizingSlot === 'background' || await persistPlacement(customizing, draftPlacementRef.current)) setCustomizing(null);
    } finally { actionBusy.current = false; setBusy(null); }
  };
  const savePlacement = (item: Item, placement: ItemPlacement) => {
    const next = clampPlacement(placement);
    setDraftPlacement(next);
    draftPlacementRef.current = next;
    void persistPlacement(item, next);
  };
  const adjust = (item: Item, dx: number, dy: number, ds = 0) => {
    savePlacement(item, {
      x: draftPlacementRef.current.x + dx,
      y: draftPlacementRef.current.y + dy,
      scale: draftPlacementRef.current.scale + ds,
    });
  };
  const gestureResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const distance = touchDistance(event.nativeEvent.touches);
      gestureStart.current = {
        placement: draftPlacementRef.current,
        pinchDistance: distance,
        pinchScale: draftPlacementRef.current.scale,
        pinching: distance > 0,
      };
    },
    onPanResponderMove: (event, gesture) => {
      const item = customizingRef.current;
      if (!item) return;
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const distance = touchDistance(touches);
        gestureStart.current.pinching = true;
        if (!gestureStart.current.pinchDistance) {
          gestureStart.current.pinchDistance = distance;
          gestureStart.current.pinchScale = draftPlacementRef.current.scale;
        }
        const next = clampPlacement({
          ...draftPlacementRef.current,
          scale: gestureStart.current.pinchScale * (distance / gestureStart.current.pinchDistance),
        });
        setDraftPlacement(next);
        draftPlacementRef.current = next;
        return;
      }
      // Keep the last pinch result stable when one finger lifts before the other.
      if (gestureStart.current.pinching) return;
      const unitsPerPixel = slot(item) === 'wear'
        ? 512 / (previewWidth.current * 0.29 * Math.max(0.85, Math.min(1.2, growth.growthSize))) : 1;
      const next = clampPlacement({
        ...gestureStart.current.placement,
        x: gestureStart.current.placement.x + gesture.dx * unitsPerPixel,
        y: gestureStart.current.placement.y + gesture.dy * unitsPerPixel,
      });
      setDraftPlacement(next);
      draftPlacementRef.current = next;
    },
    onPanResponderRelease: () => {
      const item = customizingRef.current;
      if (item) void persistPlacement(item, draftPlacementRef.current);
    },
    onPanResponderTerminate: () => {
      const item = customizingRef.current;
      if (item) void persistPlacement(item, draftPlacementRef.current);
    },
    onPanResponderTerminationRequest: () => false,
  }), [updateItemPlacement, growth.growthSize]);
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.wrap}>
    {actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
    <View style={s.head}><Pressable accessibilityRole="button" accessibilityLabel="戻る" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => backToRoom(router)}><Text style={s.back}>‹ 戻る</Text></Pressable><Text style={s.title}>暮らしのお店</Text></View>
    <Text style={s.points}>✦ {shopState.points} YOKI pt</Text>
    {!isSignedIn && (
      <Text style={s.guestNote}>
        {Platform.OS === 'ios'
          ? '購入したアイテムと設定はこの端末に自動で保存されます。'
          : 'ログインなしで購入できます。ログインすると端末データをバックアップできます。'}
      </Text>
    )}
    <View style={s.tabs} accessibilityRole="tablist">{tabs.map(x => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }} aria-selected={tab === x.id} accessibilityLabel={x.label} key={x.id} onPress={() => setTab(x.id)} style={[s.tab, tab === x.id && s.tabOn]}><Text style={[s.tabText, tab === x.id && s.tabTextOn]}>{x.label}</Text></Pressable>)}</View>
    {error && <View><Text style={s.error}>{error}</Text><Pressable accessibilityRole="button" onPress={refreshItems} style={s.resetButton}><Text style={s.resetText}>お店に再接続する</Text></Pressable></View>}
    {loading && !items.length ? <Text style={s.note}>アイテムを読み込み中…</Text> : visibleItems.length === 0 ? <Text style={s.note}>このカテゴリのアイテムは、ただいま準備中です。</Text> : visibleItems.map(item => {
      const owned = shopState.inventory.includes(item.id); const itemSlot = slot(item); const equipped = equippedIdFor(itemSlot) === item.id;
      const insufficient = !owned && shopState.points < item.cost;
      const label = !owned && !catalogOnline ? '再接続すると交換できます' : insufficient ? 'YOKIポイントが足りません' : !owned ? `${item.cost} pt で交換` : equipped ? 'はずす' : '着ける / 設定する';
      const disabled = busy !== null || insufficient || (!owned && !catalogOnline);
      return <View key={item.id} testID={`shop-item-${item.id}`} style={[s.card, stackCards && s.cardStack]}><View style={s.preview}>{item.category === 'voice' ? <Text style={s.voicePreview}>♪</Text> : item.assetUrl ? <Image source={{ uri: resolveItemAssetUrl(item.assetUrl) }} style={s.image} /> : <Text>✦</Text>}</View><View style={s.info}><Text style={s.name}>{item.name}</Text><Text style={s.cost}>{owned ? '所持済み' : `${item.cost} YOKIポイント`}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${item.name}：${label}`} accessibilityState={{ disabled, busy: busy === item.id }} disabled={disabled} onPress={() => act(item)} style={[s.button, (disabled || equipped) && s.buttonOn]}><Text style={s.buttonText}>{busy === item.id ? '処理中…' : label}</Text></Pressable>{item.category !== 'voice' && <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}：${owned ? itemSlot === 'background' ? 'ホームで確認' : 'ホームで位置を調整' : 'ホームで試す'}`} onPress={() => openCustomizer(item)} style={s.customButton}><Text style={s.customText}>{owned ? itemSlot === 'background' ? 'ホームで確認' : 'ホームで位置を調整' : 'ホームで試す'}</Text></Pressable>}</View></View>;
    })}
  </ScrollView>{customizing && <Modal transparent animationType="fade" onRequestClose={() => setCustomizing(null)}><View style={s.modalShade}><ScrollView style={s.modalCard} contentContainerStyle={{ padding: 18, gap: 10 }}>{actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}<Text style={s.modalTitle}>{customizing.name}</Text><Text style={s.modalHelp}>{customizingSlot === 'background' ? '実際のホーム全体で見え方を確認できます' : 'アイテムを直接ドラッグ。2本指で大きさも変えられます'}</Text><View testID="shop-room-preview" onLayout={e => { previewWidth.current = Math.max(1, fitRoom(e.nativeEvent.layout.width, e.nativeEvent.layout.height).width); }} style={s.characterPreview}><View pointerEvents="none" style={StyleSheet.absoluteFill}><HomeScenePreview stage={previewStage} growthSize={growth.growthSize} roomCustomization={roomCustomization} background={itemForSlot('background')} wear={itemForSlot('wear')} effect={itemForSlot('effect')} decor={itemForSlot('decor')} placements={scenePlacements} /></View>{customizingSlot !== 'background' ? <View accessibilityLabel="アイテムを直接動かして調整" style={StyleSheet.absoluteFill} {...gestureResponder.panHandlers} /> : null}</View>{customizingSlot !== 'background' && <><View style={s.controls}><View style={s.pad}><Pressable accessibilityRole="button" accessibilityLabel="上へ移動" style={s.padButton} onPress={() => adjust(customizing, 0, -10)}><Text style={s.padText}>↑</Text></Pressable><View style={s.padRow}><Pressable accessibilityRole="button" accessibilityLabel="左へ移動" style={s.padButton} onPress={() => adjust(customizing, -10, 0)}><Text style={s.padText}>←</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="右へ移動" style={s.padButton} onPress={() => adjust(customizing, 10, 0)}><Text style={s.padText}>→</Text></Pressable></View><Pressable accessibilityRole="button" accessibilityLabel="下へ移動" style={s.padButton} onPress={() => adjust(customizing, 0, 10)}><Text style={s.padText}>↓</Text></Pressable></View><View style={s.sizeColumn}><Pressable accessibilityRole="button" style={s.sizeButton} onPress={() => adjust(customizing, 0, 0, 0.1)}><Text style={s.sizeText}>＋ 大きく</Text></Pressable><Pressable accessibilityRole="button" style={s.sizeButton} onPress={() => adjust(customizing, 0, 0, -0.1)}><Text style={s.sizeText}>− 小さく</Text></Pressable></View></View><View style={s.secondaryRow}><Pressable accessibilityRole="button" style={s.resetButton} onPress={() => savePlacement(customizing, DEFAULT_PLACEMENT)}><Text style={s.resetText}>初期位置に戻す</Text></Pressable>{customizingEquipped && <Pressable accessibilityRole="button" style={s.removeButton} disabled={busy !== null} onPress={async () => { if (actionBusy.current) return; actionBusy.current = true; setBusy(customizing.id); try { await equipItem(slot(customizing), null); setCustomizing(null); } catch { setActionError('取り外しを保存できませんでした。もう一度お試しください。'); } finally { actionBusy.current = false; setBusy(null); } }}><Text style={s.removeText}>取り外す</Text></Pressable>}</View></>}<Pressable accessibilityRole="button" style={s.closeButton} disabled={busy !== null} onPress={finishCustomizer}><Text style={s.buttonText}>{customizingSlot === 'background' ? 'プレビューを閉じる' : 'この位置で完了'}</Text></Pressable></ScrollView></View></Modal>}</SafeAreaView>;
}
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F8F4EF'},wrap:{padding:20,gap:14},head:{gap:12,flexWrap:'wrap',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{fontSize:16,color:'#5B57A8'},title:{fontWeight:'800',fontSize:20,color:'#34306E'},points:{fontWeight:'700',color:'#7650B7',alignSelf:'flex-end'},guestNote:{backgroundColor:'#E9E6FF',color:'#4A4384',padding:12,borderRadius:12,fontSize:12,lineHeight:18,textAlign:'center'},tabs:{flexDirection:'row',flexWrap:'wrap',gap:3,backgroundColor:'#E8E6F5',borderRadius:12,padding:3},tab:{width:'32.6%',minHeight:44,justifyContent:'center',paddingVertical:9,borderRadius:9},tabOn:{backgroundColor:'white'},tabText:{fontSize:11,textAlign:'center',color:'#69657C'},tabTextOn:{color:'#403A8A',fontWeight:'700'},card:{backgroundColor:'white',borderRadius:18,padding:12,flexDirection:'row',gap:14,shadowColor:'#59547D',shadowOpacity:.08,shadowRadius:8,elevation:2},cardStack:{flexDirection:'column'},preview:{width:92,height:92,borderRadius:13,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center',overflow:'hidden'},image:{width:'100%',height:'100%',resizeMode:'contain'},voicePreview:{fontSize:44,fontWeight:'700',color:'#6258B6'},info:{flex:1,minWidth:0,gap:8,justifyContent:'space-around'},name:{fontSize:16,fontWeight:'700',color:'#302D4F'},cost:{color:'#78738D',fontSize:13},button:{minHeight:44,justifyContent:'center',backgroundColor:'#6258B6',paddingVertical:9,borderRadius:10},buttonOn:{backgroundColor:'#A39DBF'},buttonText:{color:'white',fontWeight:'700',fontSize:13,textAlign:'center'},customButton:{minHeight:44,justifyContent:'center',paddingVertical:6},customText:{textAlign:'center',fontSize:12,fontWeight:'700',color:'#554EA0'},modalShade:{flex:1,backgroundColor:'rgba(25,20,55,.55)',alignItems:'center',justifyContent:'center',padding:16},modalCard:{width:'100%',maxWidth:380,maxHeight:'95%',flexGrow:0,backgroundColor:'#F8F4EF',borderRadius:20},modalTitle:{fontSize:20,fontWeight:'800',color:'#302D4F',textAlign:'center'},modalHelp:{fontSize:13,color:'#77738B',textAlign:'center'},characterPreview:{height:330,borderRadius:18,backgroundColor:'#F5F4FF',alignItems:'stretch',justifyContent:'center',overflow:'hidden'},controls:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:26},pad:{alignItems:'center',gap:7},padRow:{flexDirection:'row',gap:48},padButton:{width:48,height:44,borderRadius:12,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center'},padText:{fontSize:19,fontWeight:'700',color:'#403A8A'},sizeColumn:{gap:10},sizeButton:{minWidth:104,paddingVertical:12,paddingHorizontal:10,borderRadius:12,backgroundColor:'#EFEDFA',alignItems:'center'},sizeText:{fontWeight:'700',color:'#403A8A'},secondaryRow:{flexDirection:'row',gap:8},resetButton:{flex:1,padding:10,borderRadius:12,backgroundColor:'#F5F4FA',alignItems:'center'},resetText:{color:'#5D5872',fontWeight:'600',fontSize:12},removeButton:{flex:1,padding:10,borderRadius:12,backgroundColor:'#FFF0F2',alignItems:'center'},removeText:{color:'#A33A4B',fontWeight:'700',fontSize:12},closeButton:{padding:13,borderRadius:12,backgroundColor:'#6258B6'},note:{textAlign:'center',color:'#777',padding:30},error:{color:'#B33',textAlign:'center',padding:20} });
