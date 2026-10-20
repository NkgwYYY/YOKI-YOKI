import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { useCommunity } from '@/contexts/CommunityContext';
import { getMascotStage, getStageName } from '@/utils/mascotUtils';
import { type CommunityMe, GREETINGS } from '@/utils/community/api';
import { StaticMascot } from '@/components/Mascot';
import { WorldPill } from '@/components/world/WorldPill';
import { Icon } from '@/components/ui/Icon';

export default function FriendsScreen() {
  const router=useRouter(), insets=useSafeAreaInsets(), {client,config,reloadConfig,metric}=useCommunity();
  const {progress,roomCustomization,feedState}=useApp();
  const [me,setMe]=useState<CommunityMe|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[invite,setInvite]=useState('');
  const [confirm,setConfirm]=useState<{label:string;action:()=>Promise<void>}|null>(null);
  const home={stage:getMascotStage(progress.level),furniture:roomCustomization.furniture,flower:roomCustomization.flower,robot:feedState.housekeeping?.robotPlaced===true};
  const refresh=useCallback(async()=>{setMe(await client.call<CommunityMe>('/me'));},[client]);
  useFocusEffect(useCallback(()=>{let alive=true;void client.exists().then(async exists=>{if(exists&&config?.enabled){const data=await client.call<CommunityMe>('/me');if(alive)setMe(data);}}).catch(()=>{if(alive)setError('つながりませんでした。もう一度お試しください。');}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[client,config?.enabled]));
  const run=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const begin=()=>run(async()=>{await reloadConfig();await client.identity();await refresh();});
  const toggle=()=>run(async()=>{await client.call('/home','PUT',{home,enabled:!me?.visits_enabled});await refresh();});
  return <View style={s.root}><ScrollView contentContainerStyle={[s.content,{paddingTop:insets.top+18,paddingBottom:insets.bottom+36}]}>
    <View style={s.top}><WorldPill compact label="おうちへ戻る" icon="arrow-left" onPress={()=>router.back()}/><Text style={s.eyebrow}>YOKI YOKI / FRIENDS</Text><WorldPill compact label="更新する" icon="refresh-cw" disabled={busy} onPress={()=>void run(async()=>{await reloadConfig();if(me)await refresh();})}/></View>
    <Text style={s.title}>ふらっと、会いに。</Text><Text style={s.lead}>留守でも、おうちへ遊びにいける。{ '\n' }小さな足跡が、帰りを待っています。</Text>
    {loading?<ActivityIndicator color="#DCC8A5"/>:!me?<View style={s.welcome}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:25}}><StaticMascot stage={getMascotStage(progress.level)} mood="happy" size={95}/><Icon name="heart" color="#D3B8D9" size={24}/><StaticMascot stage="odango" mood="happy" size={95}/></View>
      <Text style={s.text}>招待コードで友だちとつながろう。見せるのはキャラクターと部屋の家具だけ。日記・会話・気分の記録は共有されません。</Text>
      <WorldPill primary label={busy?'準備しています…':'友だち機能をはじめる'} icon="users" disabled={busy||config?.enabled===false} onPress={()=>void begin()}/>
      {config?.enabled===false&&<Text style={s.small}>ただいま準備中です。</Text>}
      <Text style={s.small}>公開は最初オフです。この端末のつながりとして保存されます。</Text>
    </View>:<>
      <View style={s.card}>
        <View style={s.row}><View style={{flex:1,gap:6}}><Text style={s.section}>自分のおうち</Text><Text style={s.small}>{me.visits_enabled?'友だちをお迎えしています':'いまは自分だけの時間'}</Text></View><Switch accessibilityLabel="友だちへのおうち公開" value={me.visits_enabled} disabled={busy} onValueChange={()=>void toggle()} trackColor={{false:'#60516D',true:'#AD91BB'}} thumbColor="#F8F0DF"/></View>
        {me.visits_enabled&&<><Text selectable accessibilityLabel={`招待コード ${me.invite_code}`} style={s.code}>{me.invite_code}</Text><WorldPill label="招待コードを共有" icon="share-2" onPress={()=>void Share.share({message:`YOKI YOKIのおうちに遊びにきてね。招待コード：${me.invite_code}\nアプリの「友だちのおうち」から入力できます。`}).catch(()=>{})}/><Pressable accessibilityRole="button" onPress={()=>setConfirm({label:'招待コードを変えますか？ 今のコードでは新しい友だちを追加できなくなります。登録済みの友だちは変わりません。',action:async()=>{await client.call('/invite/rotate','POST');await refresh();}})}><Text style={s.link}>招待コードを変える</Text></Pressable></>}
      </View>
      <View style={s.card}><Text style={s.section}>友だちをお迎え</Text><View style={s.row}><TextInput testID="friend-invite-code" accessibilityLabel="友だちの招待コード" value={invite} onChangeText={setInvite} autoCapitalize="characters" autoCorrect={false} maxLength={16} placeholder="招待コード" placeholderTextColor="#B7A9BE" style={s.input}/><WorldPill label="つながる" icon="plus" disabled={busy||invite.trim().length<12} onPress={()=>void run(async()=>{await client.call('/friends','POST',{code:invite});setInvite('');await refresh();})}/></View><Text style={s.small}>コードを伝えた相手と、お互いに友だちになります。</Text></View>
      <Text style={s.section}>遊びにいく</Text>
      {me.friends.length===0?<Text style={s.empty}>まだ、静かな小道。{ '\n' }コードを交換したら、ここにおうちが並びます。</Text>:me.friends.map((friend,index)=><View key={friend.id} style={s.friend}>
        <StaticMascot stage={friend.home.stage} mood="happy" size={66}/><View style={{flex:1,gap:6}}><Text style={s.friendName}>{getStageName(friend.home.stage)}のおうち {index+1}</Text><Text style={s.small}>{friend.visits_enabled?'いつでもどうぞ':'おうちをお休み中'}</Text></View>
        <WorldPill compact label="このおうちへ遊びにいく" icon="arrow-right" disabled={!friend.visits_enabled||busy} onPress={()=>{metric('visit_opened');router.push({pathname:'/friend-home',params:{id:friend.id}});}}/>
        <Pressable accessibilityRole="button" accessibilityLabel="この友だちをブロック" hitSlop={8} onPress={()=>setConfirm({label:'この相手とのつながりを止めますか？ お互いの訪問ができなくなります。',action:async()=>{await client.call(`/friends/${friend.id}/block`,'POST');await refresh();}})}><Icon name="slash" size={17} color="#BDAAC6"/></Pressable>
      </View>)}
      <Text style={[s.section,{marginTop:10}]}>届いた足跡</Text>
      {me.visits.length===0?<Text style={s.empty}>誰かが遊びにきたら、ここに残ります。</Text>:me.visits.map(visit=><View key={visit.visitor_id+visit.created_at} style={s.footprint}><StaticMascot stage={visit.home.stage} mood="happy" size={50}/><View style={{flex:1,gap:5}}><Text style={s.text}>{GREETINGS[visit.greeting]}</Text><Text style={s.small}>{new Date(visit.created_at).toLocaleDateString('ja-JP')} · {getStageName(visit.home.stage)}が遊びにきた</Text></View></View>)}
      {me.blocks.length>0&&<View style={s.card}><Text style={s.section}>訪問を止めた相手</Text>{me.blocks.map((block,index)=><WorldPill key={block.id} label={`相手 ${index+1} のブロックを解除`} disabled={busy} onPress={()=>void run(async()=>{await client.call(`/blocks/${block.id}`,'DELETE');await refresh();})}/>)}<Text style={s.small}>解除しても自動ではつながりません。もう一度コードを交換してください。</Text></View>}
      <Pressable accessibilityRole="button" onPress={()=>setConfirm({label:'友だち機能のデータを削除しますか？ 招待コード・友だち・足跡と、追加報酬の受取履歴が削除されます。日記やお部屋のデータは残ります。購入済みのパスは購入の復元で再確認できます。',action:async()=>{await client.call('/me','DELETE');await client.forget();setMe(null);}})}><Text style={s.link}>友だち機能のデータを削除</Text></Pressable>
    </>}
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </ScrollView>
  <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={()=>setConfirm(null)}><View style={s.scrim}><View style={s.dialog}><Text style={s.text}>{confirm?.label}</Text><WorldPill label="実行する" disabled={busy} onPress={()=>{const action=confirm?.action;setConfirm(null);if(action)void run(action);}}/><WorldPill label="やめておく" onPress={()=>setConfirm(null)}/></View></View></Modal>
  </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#211D2A'},content:{width:'100%',maxWidth:600,alignSelf:'center',padding:22,gap:22},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},eyebrow:{fontSize:10,letterSpacing:2,color:'#BEAACB'},title:{fontSize:30,lineHeight:42,color:'#F4E5CE',marginTop:12},lead:{fontSize:14,lineHeight:26,color:'#D2C1DA'},welcome:{gap:24,paddingVertical:18},text:{fontSize:13,color:'#E3D7E9',lineHeight:24},small:{fontSize:11,lineHeight:19,color:'#BFB0C8'},card:{backgroundColor:'#332B40',padding:20,borderRadius:18,gap:16},row:{flexDirection:'row',gap:12,alignItems:'center'},section:{fontSize:17,color:'#F2DFC0',fontWeight:'600'},code:{color:'#F5E4BC',letterSpacing:3,fontSize:23,textAlign:'center',paddingVertical:9},input:{flex:1,minWidth:80,borderRadius:8,borderWidth:1,borderColor:'#796786',paddingHorizontal:12,minHeight:48,fontSize:15,color:'#F6E8F8'},link:{color:'#BFB0C8',fontSize:11,lineHeight:20,textDecorationLine:'underline',textAlign:'center',paddingVertical:8},empty:{color:'#BFB0C8',fontSize:13,lineHeight:25,paddingVertical:5},friend:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderBottomWidth:1,borderColor:'#61506B55'},friendName:{fontSize:14,color:'#EADCF2'},footprint:{flexDirection:'row',gap:14,alignItems:'center',padding:14,borderRadius:14,backgroundColor:'#352B3F'},error:{fontSize:13,lineHeight:22,color:'#F0C5D3'},scrim:{flex:1,backgroundColor:'#0B0714AA',alignItems:'center',justifyContent:'center',padding:25},dialog:{backgroundColor:'#392C47',padding:24,borderRadius:18,gap:22,width:'100%',maxWidth:440}});
