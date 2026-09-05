import React, { useState } from 'react';
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ItemCategory, useItems } from '@/contexts/ItemContext';

const tabs: { id: ItemCategory; label: string }[] = [
  { id: 'food', label: 'ごはん' }, { id: 'accessory', label: 'アクセサリー' },
  { id: 'background', label: '背景' }, { id: 'voice', label: 'ボイス' },
];
export default function ShopScreen() {
  const router = useRouter(); const { isSignedIn } = useAuth();
  const { items, shopState, loading, error, buyItem, equipItem } = useItems();
  const [tab, setTab] = useState<ItemCategory>('food'); const [busy, setBusy] = useState<string | null>(null);
  const visibleItems = items.filter(x => x.category === tab && x.isActive);
  const act = async (id: string, category: ItemCategory) => {
    if (!isSignedIn) { Alert.alert('ログインしてください', 'ショップの購入と着せ替えはログイン後に使えます。', [{ text: 'ログイン', onPress: () => router.push('/login') }, { text: 'あとで' }]); return; }
    setBusy(id);
    try {
      if (!shopState.inventory.includes(id)) await buyItem(id);
      else if (category !== 'food') await equipItem(category, shopState.equipped[category] === id ? null : id);
    } catch (e) { Alert.alert('できませんでした', e instanceof Error ? e.message : 'もう一度お試しください'); }
    finally { setBusy(null); }
  };
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.wrap}>
    <View style={s.head}><Pressable onPress={() => router.back()}><Text style={s.back}>‹ 戻る</Text></Pressable><Text style={s.title}>YOKI SHOP</Text><Text style={s.points}>✦ {shopState.points} pt</Text></View>
    {!isSignedIn && <Pressable style={s.signin} onPress={() => router.push('/login')}><Text style={s.signinText}>ログインしてアイテムを集めよう ›</Text></Pressable>}
    <View style={s.tabs}>{tabs.map(x => <Pressable key={x.id} onPress={() => setTab(x.id)} style={[s.tab, tab === x.id && s.tabOn]}><Text style={[s.tabText, tab === x.id && s.tabTextOn]}>{x.label}</Text></Pressable>)}</View>
    {loading ? <Text style={s.note}>アイテムを読み込み中…</Text> : error ? <Text style={s.error}>{error}</Text> : visibleItems.length === 0 ? <Text style={s.note}>このカテゴリのアイテムは、ただいま準備中です。</Text> : visibleItems.map(item => {
      const owned = shopState.inventory.includes(item.id); const equipped = tab !== 'food' && shopState.equipped[tab] === item.id;
      const insufficient = isSignedIn && !owned && shopState.points < item.cost;
      const label = !isSignedIn ? 'ログインして交換' : insufficient ? 'ポイントが足りません' : !owned ? `${item.cost} pt で交換` : tab === 'food' ? '持っています' : equipped ? 'はずす' : '着ける / 設定する';
      const disabled = busy === item.id || insufficient || (owned && tab === 'food');
      return <View key={item.id} style={s.card}><View style={s.preview}>{item.assetUrl ? <Image source={{ uri: item.assetUrl }} style={s.image} /> : <Text>✦</Text>}</View><View style={s.info}><Text style={s.name}>{item.name}</Text><Text style={s.cost}>{owned ? '所持済み' : `${item.cost} ポイント`}</Text><Pressable disabled={disabled} onPress={() => act(item.id, tab)} style={[s.button, (disabled || equipped) && s.buttonOn]}><Text style={s.buttonText}>{busy === item.id ? '処理中…' : label}</Text></Pressable></View></View>;
    })}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F5F4FF'},wrap:{padding:20,gap:14},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{fontSize:16,color:'#5B57A8'},title:{fontWeight:'800',fontSize:20,color:'#34306E'},points:{fontWeight:'700',color:'#7650B7'},signin:{backgroundColor:'#34306E',padding:14,borderRadius:14},signinText:{color:'white',fontWeight:'700',textAlign:'center'},tabs:{flexDirection:'row',backgroundColor:'#E8E6F5',borderRadius:12,padding:3},tab:{flex:1,paddingVertical:9,borderRadius:9},tabOn:{backgroundColor:'white'},tabText:{fontSize:12,textAlign:'center',color:'#69657C'},tabTextOn:{color:'#403A8A',fontWeight:'700'},card:{backgroundColor:'white',borderRadius:18,padding:12,flexDirection:'row',gap:14,shadowColor:'#59547D',shadowOpacity:.08,shadowRadius:8,elevation:2},preview:{width:92,height:92,borderRadius:13,backgroundColor:'#EFEDFA',alignItems:'center',justifyContent:'center',overflow:'hidden'},image:{width:'100%',height:'100%',resizeMode:'contain'},info:{flex:1,justifyContent:'space-around'},name:{fontSize:16,fontWeight:'700',color:'#302D4F'},cost:{color:'#78738D',fontSize:13},button:{backgroundColor:'#6258B6',paddingVertical:9,borderRadius:10},buttonOn:{backgroundColor:'#A39DBF'},buttonText:{color:'white',fontWeight:'700',fontSize:13,textAlign:'center'},note:{textAlign:'center',color:'#777',padding:30},error:{color:'#B33',textAlign:'center',padding:20} });