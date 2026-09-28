import React, { useMemo, useRef, useState } from 'react';
import { Alert, Image, Modal, PanResponder, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LegacyRoomView as RoomView } from '@/components/room/LegacyFurniture';
import { StageCharacter } from '@/components/StageCharacter';
import { useApp } from '@/contexts/AppContext';
import { EquipmentSlot, Item, ItemCategory, resolveItemAssetUrl, useItems } from '@/contexts/ItemContext';
import { getMascotStage } from '@/utils/mascotUtils';

type ShopGenre = 'wear' | 'effect' | 'decor' | 'background' | 'voice';
type ItemPlacement = { x: number; y: number; scale: number };
const DEFAULT_PLACEMENT: ItemPlacement = { x: 0, y: 0, scale: 1 };
const STAGE_UNITS_PER_PREVIEW_PIXEL = 1.75;
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

const PREVIEW_CHARACTER_SIZE = 104;
const PREVIEW_CHARACTER_FRAME = PREVIEW_CHARACTER_SIZE * 1.7;
const PREVIEW_CHARACTER_HEIGHT = PREVIEW_CHARACTER_SIZE * 2.4;

function HomeScenePreview({
  stage,
  mood,
  growthSize,
  roomCustomization,
  background,
  wear,
  effect,
  decor,
  placements,
}: {
  stage: ReturnType<typeof getMascotStage>;
  mood: 'happy' | 'normal';
  growthSize: number;
  roomCustomization: React.ComponentProps<typeof RoomView>['customization'];
  background?: Item;
  wear?: Item;
  effect?: Item;
  decor?: Item;
  placements: Record<string, ItemPlacement>;
}) {
  const wearPlacement = wear ? placements[wear.id] ?? DEFAULT_PLACEMENT : DEFAULT_PLACEMENT;
  const effectPlacement = effect ? placements[effect.id] ?? DEFAULT_PLACEMENT : DEFAULT_PLACEMENT;
  const decorPlacement = decor ? placements[decor.id] ?? DEFAULT_PLACEMENT : DEFAULT_PLACEMENT;
  const effectSize = PREVIEW_CHARACTER_SIZE * 1.55 * effectPlacement.scale;
  const decorSize = 64 * decorPlacement.scale;

  return (
    <RoomView customization={roomCustomization} sceneHeight={250}>
      <View style={s.previewGarden}>
        {background?.assetUrl ? <Image source={{ uri: resolveItemAssetUrl(background.assetUrl) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" /> : null}
        <View style={s.previewGroundGlow} />
        <View style={s.previewCharacterMain}>
          <StageCharacter
            stage={stage}
            mood={mood}
            size={PREVIEW_CHARACTER_SIZE}
            growthSize={growthSize}
            wearable={wear?.assetUrl ? {
              id: wear.id,
              url: resolveItemAssetUrl(wear.assetUrl),
              offsetX: wearPlacement.x,
              offsetY: wearPlacement.y,
              scale: wearPlacement.scale,
            } : null}
          />
          {effect?.assetUrl ? (
            <Image
              source={{ uri: resolveItemAssetUrl(effect.assetUrl) }}
              resizeMode="contain"
              style={{
                position: 'absolute',
                width: effectSize,
                height: effectSize,
                left: (PREVIEW_CHARACTER_FRAME - effectSize) / 2 + effectPlacement.x,
                top: PREVIEW_CHARACTER_HEIGHT * 0.48 + effectPlacement.y,
              }}
            />
          ) : null}
        </View>
        {decor?.assetUrl ? (
          <Image
            source={{ uri: resolveItemAssetUrl(decor.assetUrl) }}
            resizeMode="contain"
            style={{
              position: 'absolute',
              width: decorSize,
              height: decorSize,
              right: 18 - decorPlacement.x,
              bottom: 8 - decorPlacement.y,
              zIndex: 12,
            }}
          />
        ) : null}
      </View>
    </RoomView>
  );
}

export default function ShopScreen() {
  const router = useRouter(); const { isSignedIn } = useAuth();
  const { progress, growth, getTodayRecord, roomCustomization } = useApp();
  const { items, shopState, loading, error, buyItem, equipItem, updateItemPlacement } = useItems();
  const [tab, setTab] = useState<ShopGenre>('wear'); const [busy, setBusy] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<Item | null>(null);
  const [draftPlacement, setDraftPlacement] = useState<ItemPlacement>(DEFAULT_PLACEMENT);
  const draftPlacementRef = useRef<ItemPlacement>(DEFAULT_PLACEMENT);
  const customizingRef = useRef<Item | null>(null);
  const gestureStart = useRef({ placement: DEFAULT_PLACEMENT, pinchDistance: 0, pinchScale: 1, pinching: false });
  draftPlacementRef.current = draftPlacement;
  customizingRef.current = customizing;
  const previewStage = getMascotStage(progress.level);
  const previewMood = getTodayRecord() ? 'happy' : 'normal';
  const visibleItems = items.filter(x => x.category !== 'food' && genreOf(x.id, x.category) === tab && x.isActive);
  const slot = (item: Item): EquipmentSlot => genreOf(item.id, item.category) as EquipmentSlot;
  const customizingSlot = customizing ? slot(customizing) : null;
  const itemForSlot = (target: EquipmentSlot) => {
    if (customizing && customizingSlot === target) return customizing;
    const equippedId = target === 'wear'
      ? shopState.equipped.wear ?? shopState.equipped.accessory
      : shopState.equipped[target];
    return items.find((item) => item.id === equippedId);
  };
  const scenePlacements = customizing
    ? { ...shopState.placements, [customizing.id]: draftPlacement }
    : shopState.placements;
  const customizingEquipped = !!customizing && (
    customizingSlot === 'wear'
      ? (shopState.equipped.wear ?? shopState.equipped.accessory) === customizing.id
      : shopState.equipped[customizingSlot!] === customizing.id
  );
  const act = async (item: Item) => {
    setBusy(item.id);
    try {
      if (!shopState.inventory.includes(item.id)) await buyItem(item.id);
      else {
        const itemSlot = slot(item);
        await equipItem(itemSlot, shopState.equipped[itemSlot] === item.id ? null : item.id);
      }
    } catch (e) { Alert.alert('できませんでした', e instanceof Error ? e.message : 'もう一度お試しください'); }
    finally { setBusy(null); }
  };
  const openCustomizer = (item: Item) => {
    const placement = shopState.placements[item.id] ?? DEFAULT_PLACEMENT;
    setDraftPlacement(placement);
    draftPlacementRef.current = placement;
    setCustomizing(item);
  };
  const savePlacement = (item: Item, placement: ItemPlacement) => {
    const next = clampPlacement(placement);
    setDraftPlacement(next);
    draftPlacementRef.current = next;
    void updateItemPlacement(item.id, next);
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
      const next = clampPlacement({
        ...gestureStart.current.placement,
        x: gestureStart.current.placement.x + gesture.dx * (slot(item) === 'wear' ? STAGE_UNITS_PER_PREVIEW_PIXEL : 1),
        y: gestureStart.current.placement.y + gesture.dy * (slot(item) === 'wear' ? STAGE_UNITS_PER_PREVIEW_PIXEL : 1),
      });
      setDraftPlacement(next);
      draftPlacementRef.current = next;
    },
    onPanResponderRelease: () => {
      const item = customizingRef.current;
      if (item) void updateItemPlacement(item.id, draftPlacementRef.current);
    },
    onPanResponderTerminate: () => {
      const item = customizingRef.current;
      if (item) void updateItemPlacement(item.id, draftPlacementRef.current);
    },
    onPanResponderTerminationRequest: () => false,
  }), [updateItemPlacement]);
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.wrap}>
    <View style={s.head}><Pressable onPress={() => router.back()}><Text style={s.back}>‹ 戻る</Text></Pressable><Text style={s.title}>YOKI SHOP</Text><Text style={s.points}>✦ {shopState.points} YOKI pt</Text></View>
    {!isSignedIn && (
      <Text style={s.guestNote}>
        {Platform.OS === 'ios'
          ? '購入したアイテムと設定はこの端末に自動で保存されます。'
          : 'ログインなしで購入できます。ログインすると端末データをバックアップできます。'}
      </Text>
    )}
    <View style={s.tabs}>{tabs.map(x => <Pressable key={x.id} onPress={() => setTab(x.id)} style={[s.tab, tab === x.id && s.tabOn]}><Text style={[s.tabText, tab === x.id && s.tabTextOn]}>{x.label}</Text></Pressable>)}</View>
    {loading ? <Text style={s.note}>アイテムを読み込み中…</Text> : error ? <Text style={s.error}>{error}</Text> : visibleItems.length === 0 ? <Text style={s.note}>このカテゴリのアイテムは、ただいま準備中です。</Text> : visibleItems.map(item => {
      const owned = shopState.inventory.includes(item.id); const itemSlot = slot(item); const equipped = shopState.equipped[itemSlot] === item.id;
      const insufficient = !owned && shopState.points < item.cost;
      const label = insufficient ? 'YOKIポイントが足りません' : !owned ? `${item.cost} pt で交換` : equipped ? 'はずす' : '着ける / 設定する';
      const disabled = busy === item.id || insufficient;
      return <View key={item.id} style={s.card}><View style={s.preview}>{item.category === 'voice' ? <Text style={s.voicePreview}>♪</Text> : item.assetUrl ? <Image source={{ uri: resolveItemAssetUrl(item.assetUrl) }} style={s.image} /> : <Text>✦</Text>}</View><View style={s.info}><Text style={s.name}>{item.name}</Text><Text style={s.cost}>{owned ? '所持済み' : `${item.cost} YOKIポイント`}</Text><Pressable disabled={disabled} onPress={() => act(item)} style={[s.button, (disabled || equipped) && s.buttonOn]}><Text style={s.buttonText}>{busy === item.id ? '処理中…' : label}</Text></Pressable>{item.category !== 'voice' && <Pressable onPress={() => openCustomizer(item)} style={s.customButton}><Text style={s.customText}>{owned ? itemSlot === 'background' ? 'ホームで確認' : 'ホームで位置を調整' : 'ホームで試す'}</Text></Pressable>}</View></View>;
    })}
  </ScrollView>{customizing && <Modal transparent animationType="fade" onRequestClose={() => setCustomizing(null)}><View style={s.modalShade}><View style={s.modalCard}><Text style={s.modalTitle}>{customizing.name}</Text><Text style={s.modalHelp}>{customizingSlot === 'background' ? '実際のホーム全体で見え方を確認できます' : 'アイテムを直接ドラッグ。2本指で大きさも変えられます'}</Text><View style={s.characterPreview}><View pointerEvents="none" style={StyleSheet.absoluteFill}><HomeScenePreview stage={previewStage} mood={previewMood} growthSize={growth.growthSize} roomCustomization={roomCustomization} background={itemForSlot('background')} wear={itemForSlot('wear')} effect={itemForSlot('effect')} decor={itemForSlot('decor')} placements={scenePlacements} /></View>{customizingSlot !== 'background' ? <View accessibilityLabel="アイテムを直接動かして調整" style={StyleSheet.absoluteFill} {...gestureResponder.panHandlers} /> : null}</View>{customizingSlot !== 'background' && <><View style={s.controls}><View style={s.pad}><Pressable accessibilityLabel="上へ移動" style={s.padButton} onPress={() => adjust(customizing, 0, -10)}><Text style={s.padText}>↑</Text></Pressable><View style={s.padRow}><Pressable accessibilityLabel="左へ移動" style={s.padButton} onPress={() => adjust(customizing, -10, 0)}><Text style={s.padText}>←</Text></Pressable><Pressable accessibilityLabel="右へ移動" style={s.padButton} onPress={() => adjust(customizing, 10, 0)}><Text style={s.padText}>→</Text></Pressable></View><Pressable accessibilityLabel="下へ移動" style={s.padButton} onPress={() => adjust(customizing, 0, 10)}><Text style={s.padText}>↓</Text></Pressable></View><View style={s.sizeColumn}><Pressable style={s.sizeButton} onPress={() => adjust(customizing, 0, 0, 0.1)}><Text style={s.sizeText}>＋ 大きく</Text></Pressable><Pressable style={s.sizeButton} onPress={() => adjust(customizing, 0, 0, -0.1)}><Text style={s.sizeText}>− 小さく</Text></Pressable></View></View><View style={s.secondaryRow}><Pressable style={s.resetButton} onPress={() => savePlacement(customizing, DEFAULT_PLACEMENT)}><Text style={s.resetText}>初期位置に戻す</Text></Pressable>{customizingEquipped && <Pressable style={s.removeButton} onPress={async () => { await equipItem(slot(customizing), null); setCustomizing(null); }}><Text style={s.removeText}>取り外す</Text></Pressable>}</View></>}<Pressable style={s.closeButton} onPress={() => setCustomizing(null)}><Text style={s.buttonText}>{customizingSlot === 'background' ? 'プレビューを閉じる' : 'この位置で完了'}</Text></Pressable></View></View></Modal>}</SafeAreaView>;
}
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F5F4FF'},wrap:{padding:20,gap:14},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{fontSize:16,color:'#5B57A8'},title:{fontWeight:'800',fontSize:20,color:'#34306E'},points:{fontWeight:'700',color:'#7650B7'},guestNote:{backgroundColor:'#E9E6FF',color:'#4A4384',padding:12,borderRadius:12,fontSize:12,lineHeight:18,textAlign:'center'},tabs:{flexDirection:'row',flexWrap:'wrap',gap:3,backgroundColor:'#E8E6F5',borderRadius:12,padding:3},tab:{width:'32.6%',paddingVertical:9,borderRadius:9},tabOn:{backgroundColor:'white'},tabText:{fontSize:11,textAlign:'center',color:'#69657C'},tabTextOn:{color:'#403A8A',fontWeight:'700'},card:{backgroundColor:'white',borderRadius:18,padding:12,flexDirection:'row',gap:14,shadowColor:'#59547D',shadowOpacity:.08,shadowRadius:8,elevation:2},preview:{width:92,height:92,borderRadius:13,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center',overflow:'hidden'},image:{width:'100%',height:'100%',resizeMode:'contain'},voicePreview:{fontSize:44,fontWeight:'700',color:'#6258B6'},info:{flex:1,justifyContent:'space-around'},name:{fontSize:16,fontWeight:'700',color:'#302D4F'},cost:{color:'#78738D',fontSize:13},button:{backgroundColor:'#6258B6',paddingVertical:9,borderRadius:10},buttonOn:{backgroundColor:'#A39DBF'},buttonText:{color:'white',fontWeight:'700',fontSize:13,textAlign:'center'},customButton:{paddingVertical:6},customText:{textAlign:'center',fontSize:12,fontWeight:'700',color:'#554EA0'},modalShade:{flex:1,backgroundColor:'rgba(25,20,55,.55)',alignItems:'center',justifyContent:'center',padding:16},modalCard:{width:'100%',maxWidth:380,backgroundColor:'white',borderRadius:24,padding:18,gap:10},modalTitle:{fontSize:20,fontWeight:'800',color:'#302D4F',textAlign:'center'},modalHelp:{fontSize:13,color:'#77738B',textAlign:'center'},characterPreview:{height:250,borderRadius:18,backgroundColor:'#F5F4FF',alignItems:'stretch',justifyContent:'center',overflow:'hidden'},previewGarden:{width:'100%',height:250,position:'relative'},previewGroundGlow:{position:'absolute',left:0,right:0,bottom:0,height:70,backgroundColor:'rgba(226,232,255,.72)'},previewCharacterMain:{position:'absolute',top:'31%',left:'50%',width:PREVIEW_CHARACTER_FRAME,height:PREVIEW_CHARACTER_HEIGHT,marginLeft:-PREVIEW_CHARACTER_FRAME/2,marginTop:-PREVIEW_CHARACTER_HEIGHT/2,zIndex:10,alignItems:'center',justifyContent:'center'},controls:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:26},pad:{alignItems:'center',gap:7},padRow:{flexDirection:'row',gap:48},padButton:{width:48,height:39,borderRadius:12,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center'},padText:{fontSize:19,fontWeight:'700',color:'#403A8A'},sizeColumn:{gap:10},sizeButton:{minWidth:104,paddingVertical:12,paddingHorizontal:10,borderRadius:12,backgroundColor:'#EFEDFA',alignItems:'center'},sizeText:{fontWeight:'700',color:'#403A8A'},secondaryRow:{flexDirection:'row',gap:8},resetButton:{flex:1,padding:10,borderRadius:12,backgroundColor:'#F5F4FA',alignItems:'center'},resetText:{color:'#5D5872',fontWeight:'600',fontSize:12},removeButton:{flex:1,padding:10,borderRadius:12,backgroundColor:'#FFF0F2',alignItems:'center'},removeText:{color:'#A33A4B',fontWeight:'700',fontSize:12},closeButton:{padding:13,borderRadius:12,backgroundColor:'#6258B6'},note:{textAlign:'center',color:'#777',padding:30},error:{color:'#B33',textAlign:'center',padding:20} });