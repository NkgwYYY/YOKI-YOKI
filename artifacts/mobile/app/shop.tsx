import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { StageCharacter } from '@/components/StageCharacter';
import { useApp } from '@/contexts/AppContext';
import { EquipmentSlot, Item, ItemCategory, resolveItemAssetUrl, useItems } from '@/contexts/ItemContext';
import { getMascotStage } from '@/utils/mascotUtils';

type ShopGenre = 'wear' | 'effect' | 'decor' | 'background' | 'voice';
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
export default function ShopScreen() {
  const router = useRouter(); const { isSignedIn } = useAuth();
  const { progress, growth, getTodayRecord } = useApp();
  const { items, shopState, loading, error, buyItem, equipItem, updateItemPlacement } = useItems();
  const [tab, setTab] = useState<ShopGenre>('wear'); const [busy, setBusy] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<Item | null>(null);
  const customPlacement = customizing
    ? shopState.placements[customizing.id] ?? { x: 0, y: 0, scale: 1 }
    : { x: 0, y: 0, scale: 1 };
  const previewStage = getMascotStage(progress.level);
  const previewMood = getTodayRecord() ? 'happy' : 'normal';
  const visibleItems = items.filter(x => x.category !== 'food' && genreOf(x.id, x.category) === tab && x.isActive);
  const slot = (item: Item): EquipmentSlot => genreOf(item.id, item.category) as EquipmentSlot;
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
  const adjust = async (item: Item, dx: number, dy: number, ds = 0) => {
    const current = shopState.placements[item.id] ?? { x: 0, y: 0, scale: 1 };
    await updateItemPlacement(item.id, {
      x: Math.max(-160, Math.min(160, current.x + dx)),
      y: Math.max(-160, Math.min(160, current.y + dy)),
      scale: Math.max(0.55, Math.min(1.45, current.scale + ds)),
    });
  };
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.wrap}>
    <View style={s.head}><Pressable onPress={() => router.back()}><Text style={s.back}>‹ 戻る</Text></Pressable><Text style={s.title}>YOKI SHOP</Text><Text style={s.points}>✦ {shopState.points} YOKI pt</Text></View>
    {!isSignedIn && <Text style={s.guestNote}>ログインなしで購入できます。ログインすると端末データをバックアップできます。</Text>}
    <View style={s.tabs}>{tabs.map(x => <Pressable key={x.id} onPress={() => setTab(x.id)} style={[s.tab, tab === x.id && s.tabOn]}><Text style={[s.tabText, tab === x.id && s.tabTextOn]}>{x.label}</Text></Pressable>)}</View>
    {loading ? <Text style={s.note}>アイテムを読み込み中…</Text> : error ? <Text style={s.error}>{error}</Text> : visibleItems.length === 0 ? <Text style={s.note}>このカテゴリのアイテムは、ただいま準備中です。</Text> : visibleItems.map(item => {
      const owned = shopState.inventory.includes(item.id); const itemSlot = slot(item); const equipped = shopState.equipped[itemSlot] === item.id;
      const insufficient = !owned && shopState.points < item.cost;
      const label = insufficient ? 'YOKIポイントが足りません' : !owned ? `${item.cost} pt で交換` : equipped ? 'はずす' : '着ける / 設定する';
      const disabled = busy === item.id || insufficient;
      return <View key={item.id} style={s.card}><View style={s.preview}>{item.category === 'voice' ? <Text style={s.voicePreview}>♪</Text> : item.assetUrl ? <Image source={{ uri: resolveItemAssetUrl(item.assetUrl) }} style={s.image} /> : <Text>✦</Text>}</View><View style={s.info}><Text style={s.name}>{item.name}</Text><Text style={s.cost}>{owned ? '所持済み' : `${item.cost} YOKIポイント`}</Text><Pressable disabled={disabled} onPress={() => act(item)} style={[s.button, (disabled || equipped) && s.buttonOn]}><Text style={s.buttonText}>{busy === item.id ? '処理中…' : label}</Text></Pressable>{owned && <Pressable onPress={() => setCustomizing(item)} style={s.customButton}><Text style={s.customText}>位置・大きさを調整</Text></Pressable>}</View></View>;
    })}
  </ScrollView>{customizing && <Modal transparent animationType="fade" onRequestClose={() => setCustomizing(null)}><View style={s.modalShade}><View style={s.modalCard}><Text style={s.modalTitle}>{customizing.name}</Text><Text style={s.modalHelp}>キャラクターを見ながら位置と大きさを合わせよう</Text><View style={s.characterPreview} pointerEvents="none"><StageCharacter stage={previewStage} mood={previewMood} size={104} growthSize={growth.growthSize} wearable={slot(customizing) === 'wear' && customizing.assetUrl ? { id: customizing.id, url: resolveItemAssetUrl(customizing.assetUrl), offsetX: customPlacement.x, offsetY: customPlacement.y, scale: customPlacement.scale } : null} /></View><View style={s.controls}><View style={s.pad}><Pressable accessibilityLabel="上へ移動" style={s.padButton} onPress={() => adjust(customizing, 0, -10)}><Text style={s.padText}>↑</Text></Pressable><View style={s.padRow}><Pressable accessibilityLabel="左へ移動" style={s.padButton} onPress={() => adjust(customizing, -10, 0)}><Text style={s.padText}>←</Text></Pressable><Pressable accessibilityLabel="右へ移動" style={s.padButton} onPress={() => adjust(customizing, 10, 0)}><Text style={s.padText}>→</Text></Pressable></View><Pressable accessibilityLabel="下へ移動" style={s.padButton} onPress={() => adjust(customizing, 0, 10)}><Text style={s.padText}>↓</Text></Pressable></View><View style={s.sizeColumn}><Pressable style={s.sizeButton} onPress={() => adjust(customizing, 0, 0, 0.1)}><Text style={s.sizeText}>＋ 大きく</Text></Pressable><Pressable style={s.sizeButton} onPress={() => adjust(customizing, 0, 0, -0.1)}><Text style={s.sizeText}>− 小さく</Text></Pressable></View></View><View style={s.secondaryRow}><Pressable style={s.resetButton} onPress={() => updateItemPlacement(customizing.id, { x: 0, y: 0, scale: 1 })}><Text style={s.resetText}>初期位置に戻す</Text></Pressable><Pressable style={s.removeButton} onPress={async () => { await equipItem(slot(customizing), null); setCustomizing(null); }}><Text style={s.removeText}>取り外す</Text></Pressable></View><Pressable style={s.closeButton} onPress={() => setCustomizing(null)}><Text style={s.buttonText}>この位置で完了</Text></Pressable></View></View></Modal>}</SafeAreaView>;
}
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F5F4FF'},wrap:{padding:20,gap:14},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{fontSize:16,color:'#5B57A8'},title:{fontWeight:'800',fontSize:20,color:'#34306E'},points:{fontWeight:'700',color:'#7650B7'},guestNote:{backgroundColor:'#E9E6FF',color:'#4A4384',padding:12,borderRadius:12,fontSize:12,lineHeight:18,textAlign:'center'},tabs:{flexDirection:'row',flexWrap:'wrap',gap:3,backgroundColor:'#E8E6F5',borderRadius:12,padding:3},tab:{width:'32.6%',paddingVertical:9,borderRadius:9},tabOn:{backgroundColor:'white'},tabText:{fontSize:11,textAlign:'center',color:'#69657C'},tabTextOn:{color:'#403A8A',fontWeight:'700'},card:{backgroundColor:'white',borderRadius:18,padding:12,flexDirection:'row',gap:14,shadowColor:'#59547D',shadowOpacity:.08,shadowRadius:8,elevation:2},preview:{width:92,height:92,borderRadius:13,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center',overflow:'hidden'},image:{width:'100%',height:'100%',resizeMode:'contain'},voicePreview:{fontSize:44,fontWeight:'700',color:'#6258B6'},info:{flex:1,justifyContent:'space-around'},name:{fontSize:16,fontWeight:'700',color:'#302D4F'},cost:{color:'#78738D',fontSize:13},button:{backgroundColor:'#6258B6',paddingVertical:9,borderRadius:10},buttonOn:{backgroundColor:'#A39DBF'},buttonText:{color:'white',fontWeight:'700',fontSize:13,textAlign:'center'},customButton:{paddingVertical:6},customText:{textAlign:'center',fontSize:12,fontWeight:'700',color:'#554EA0'},modalShade:{flex:1,backgroundColor:'rgba(25,20,55,.55)',alignItems:'center',justifyContent:'center',padding:16},modalCard:{width:'100%',maxWidth:380,backgroundColor:'white',borderRadius:24,padding:18,gap:10},modalTitle:{fontSize:20,fontWeight:'800',color:'#302D4F',textAlign:'center'},modalHelp:{fontSize:13,color:'#77738B',textAlign:'center'},characterPreview:{height:250,borderRadius:18,backgroundColor:'#F5F4FF',alignItems:'center',justifyContent:'center',overflow:'hidden'},controls:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:26},pad:{alignItems:'center',gap:7},padRow:{flexDirection:'row',gap:48},padButton:{width:48,height:39,borderRadius:12,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center'},padText:{fontSize:19,fontWeight:'700',color:'#403A8A'},sizeColumn:{gap:10},sizeButton:{minWidth:104,paddingVertical:12,paddingHorizontal:10,borderRadius:12,backgroundColor:'#EFEDFA',alignItems:'center'},sizeText:{fontWeight:'700',color:'#403A8A'},secondaryRow:{flexDirection:'row',gap:8},resetButton:{flex:1,padding:10,borderRadius:12,backgroundColor:'#F5F4FA',alignItems:'center'},resetText:{color:'#5D5872',fontWeight:'600',fontSize:12},removeButton:{flex:1,padding:10,borderRadius:12,backgroundColor:'#FFF0F2',alignItems:'center'},removeText:{color:'#A33A4B',fontWeight:'700',fontSize:12},closeButton:{padding:13,borderRadius:12,backgroundColor:'#6258B6'},note:{textAlign:'center',color:'#777',padding:30},error:{color:'#B33',textAlign:'center',padding:20} });