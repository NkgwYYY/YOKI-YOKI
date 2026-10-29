import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCommunity } from '@/contexts/CommunityContext';
import { WorldPill } from '@/components/world/WorldPill';
import { buyPass, canBuyPass, loadPassOffer, restorePass, type PassOffer } from '@/utils/community/commerce';
const terms = process.env.EXPO_PUBLIC_PASS_TERMS_URL ?? '', privacy = process.env.EXPO_PUBLIC_PRIVACY_URL ?? '';
const legalReady = /^https:\/\//.test(terms) && /^https:\/\//.test(privacy);
export default function WorkshopPass() {
  const router=useRouter(), insets=useSafeAreaInsets(), {client,config,metric}=useCommunity();
  const [offer,setOffer]=useState<PassOffer|null>(null),[active,setActive]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{
    if (!config?.enabled || !canBuyPass()) return;
    let alive=true;
    void (async()=>{
      const {id}=await client.identity(); metric('pass_opened');
      const status=await client.call<{active:boolean}>('/pass'); if(alive)setActive(status.active);
      if(config.passSales&&legalReady) {const product=await loadPassOffer(id);if(alive)setOffer(product);}
    })().catch(()=>{if(alive)setMessage('購入情報を読み込めませんでした。');});
    return()=>{alive=false;};
  },[client,config?.enabled,config?.passSales]);
  const perform=async(restore:boolean)=>{
    if(busy)return;setBusy(true);setMessage('');
    try{
      const {id}=await client.identity();
      if(restore)await restorePass(id);else await buyPass(id);
      const status=await client.call<{active:boolean}>('/pass');setActive(status.active);
      setMessage(status.active?'パスを利用できます。工房でおまけを受け取ってね。':'購入状況を確認しています。少し待ってから「購入を復元」を押してください。');
      if(status.active)metric(restore?'pass_restored':'pass_purchased');
    }catch(error){if(!(error as {userCancelled?:boolean}).userCancelled)setMessage((error as Error).message||'購入を完了できませんでした。');}
    finally{setBusy(false);}
  };
  return <ScrollView style={s.root} contentContainerStyle={[s.body,{paddingTop:insets.top+20,paddingBottom:insets.bottom+36}]}>
    <WorldPill label="戻る" icon="arrow-left" onPress={()=>router.back()}/>
    <Text style={s.kicker}>ゆでたまご工房</Text><Text style={s.title}>おまけパス</Text>
    <Text style={s.lead}>お仕事のあとは、{ '\n' }広告なしで、もうひとつ。</Text>
    <Text style={s.text}>成功した注文のおまけ30ptを、広告を見ずに受け取れます。1日3回まで。通常のお給料は変わりません。</Text>
    <View style={s.card}><Text style={s.price}>{active?'パスを利用中':offer?`${offer.price} / 月`:'ただいま準備中'}</Text>
      {active?<Text style={s.text}>工房の結果画面から受け取れます。</Text>:offer&&config?.passSales&&legalReady?<><WorldPill primary label={busy?'確認中…':`${offer.price} / 月で申し込む`} disabled={busy} icon="gift" onPress={()=>void perform(false)}/><Text style={s.small}>月額の自動更新です。解約するまで毎月請求されます。解約はApp Store・Google Playの定期購入設定から行えます。利用しなかった日のおまけは繰り越されません。1日は日本時間0時に切り替わります。</Text></>:<Text style={s.text}>販売が始まるまで、いつもどおり遊べます。</Text>}
      {canBuyPass()&&<WorldPill label="購入を復元" disabled={busy} onPress={()=>void perform(true)}/>}
    </View>
    {!!message&&<Text accessibilityLiveRegion="polite" style={s.text}>{message}</Text>}
    {legalReady&&<View style={{gap:12}}><WorldPill label="パスの利用規約" icon="external-link" onPress={()=>void Linking.openURL(terms)}/><WorldPill label="プライバシーポリシー" icon="external-link" onPress={()=>void Linking.openURL(privacy)}/></View>}
    <Text style={s.small}>日記・会話・友だちのおうちへの訪問は、パスなしで利用できます。</Text>
  </ScrollView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#211B2A'},body:{padding:24,gap:24,width:'100%',maxWidth:560,alignSelf:'center'},kicker:{color:'#C6ABD1',letterSpacing:3,fontSize:12},title:{color:'#F8EAD4',fontSize:34,fontWeight:'600'},lead:{color:'#F2DFBF',fontSize:24,lineHeight:36},text:{color:'#DDCFE6',fontSize:14,lineHeight:25},small:{color:'#BFAFC8',fontSize:12,lineHeight:22},card:{padding:22,borderRadius:18,backgroundColor:'#352B43',gap:20},price:{color:'#F6DFAC',fontSize:25}});
