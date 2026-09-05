import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { EquipmentSlot, Item, ItemCategory, resolveItemAssetUrl, useItems } from '@/contexts/ItemContext';

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
  const { items, shopState, loading, error, buyItem, equipItem, updateItemPlacement } = useItems();
  const [tab, setTab] = useState<ShopGenre>('wear'); const [busy, setBusy] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<Item | null>(null);
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
  </ScrollView>{customizing && <Modal transparent animationType="fade" onRequestClose={() => setCustomizing(null)}><View style={s.modalShade}><View style={s.modalCard}><Text style={s.modalTitle}>{customizing.name}</Text><Text style={s.modalHelp}>矢印で移動、− / ＋で大きさを調整できます</Text><View style={s.pad}><Pressable style={s.padButton} onPress={() => adjust(customizing, 0, -10)}><Text>↑</Text></Pressable><View style={s.padRow}><Pressable style={s.padButton} onPress={() => adjust(customizing, -10, 0)}><Text>←</Text></Pressable><Pressable style={s.padButton} onPress={() => adjust(customizing, 10, 0)}><Text>→</Text></Pressable></View><Pressable style={s.padButton} onPress={() => adjust(customizing, 0, 10)}><Text>↓</Text></Pressable></View><View style={s.sizeRow}><Pressable style={s.sizeButton} onPress={() => adjust(customizing, 0, 0, -0.1)}><Text>− 小さく</Text></Pressable><Pressable style={s.sizeButton} onPress={() => adjust(customizing, 0, 0, 0.1)}><Text>＋ 大きく</Text></Pressable></View><Pressable style={s.resetButton} onPress={() => updateItemPlacement(customizing.id, { x: 0, y: 0, scale: 1 })}><Text>初期位置に戻す</Text></Pressable><Pressable style={s.removeButton} onPress={async () => { await equipItem(slot(customizing), null); setCustomizing(null); }}><Text style={s.removeText}>取り外す</Text></Pressable><Pressable style={s.closeButton} onPress={() => setCustomizing(null)}><Text style={s.buttonText}>完了</Text></Pressable></View></View></Modal>}</SafeAreaView>;
}
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F5F4FF'},wrap:{padding:20,gap:14},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{fontSize:16,color:'#5B57A8'},title:{fontWeight:'800',fontSize:20,color:'#34306E'},points:{fontWeight:'700',color:'#7650B7'},guestNote:{backgroundColor:'#E9E6FF',color:'#4A4384',padding:12,borderRadius:12,fontSize:12,lineHeight:18,textAlign:'center'},tabs:{flexDirection:'row',flexWrap:'wrap',gap:3,backgroundColor:'#E8E6F5',borderRadius:12,padding:3},tab:{width:'32.6%',paddingVertical:9,borderRadius:9},tabOn:{backgroundColor:'white'},tabText:{fontSize:11,textAlign:'center',color:'#69657C'},tabTextOn:{color:'#403A8A',fontWeight:'700'},card:{backgroundColor:'white',borderRadius:18,padding:12,flexDirection:'row',gap:14,shadowColor:'#59547D',shadowOpacity:.08,shadowRadius:8,elevation:2},preview:{width:92,height:92,borderRadius:13,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center',overflow:'hidden'},image:{width:'100%',height:'100%',resizeMode:'contain'},voicePreview:{fontSize:44,fontWeight:'700',color:'#6258B6'},info:{flex:1,justifyContent:'space-around'},name:{fontSize:16,fontWeight:'700',color:'#302D4F'},cost:{color:'#78738D',fontSize:13},button:{backgroundColor:'#6258B6',paddingVertical:9,borderRadius:10},buttonOn:{backgroundColor:'#A39DBF'},buttonText:{color:'white',fontWeight:'700',fontSize:13,textAlign:'center'},customButton:{paddingVertical:6},customText:{textAlign:'center',fontSize:12,fontWeight:'700',color:'#554EA0'},modalShade:{flex:1,backgroundColor:'rgba(25,20,55,.55)',alignItems:'center',justifyContent:'center',padding:24},modalCard:{width:'100%',maxWidth:360,backgroundColor:'white',borderRadius:24,padding:22,gap:14},modalTitle:{fontSize:20,fontWeight:'800',color:'#302D4F',textAlign:'center'},modalHelp:{fontSize:13,color:'#77738B',textAlign:'center'},pad:{alignItems:'center',gap:8},padRow:{flexDirection:'row',gap:58},padButton:{width:52,height:44,borderRadius:12,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center'},sizeRow:{flexDirection:'row',gap:10},sizeButton:{flex:1,padding:12,borderRadius:12,backgroundColor:'#EFEDFA',alignItems:'center'},resetButton:{padding:10,alignItems:'center'},removeButton:{padding:11,borderRadius:12,backgroundColor:'#FFF0F2',alignItems:'center'},removeText:{color:'#A33A4B',fontWeight:'700'},closeButton:{padding:12,borderRadius:12,backgroundColor:'#6258B6'},note:{textAlign:'center',color:'#777',padding:30},error:{color:'#B33',textAlign:'center',padding:20} });