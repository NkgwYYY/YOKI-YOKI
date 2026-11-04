import {useRouter} from 'expo-router';
import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon,type IconName} from '@/components/ui/Icon';
import {ConditionFace} from '@/components/record/ConditionFace';
import {CONDITION_LABELS} from '@/utils/conditionTrends';
type Props={onClose:()=>void;onRecord:()=>void;onPlay:()=>void;onShop:()=>void;onAtelier:()=>void;onFriends:()=>void;onGrowth:()=>void;onHints:()=>void;onGuide:()=>void;mood?:number;children:React.ReactNode};
export function HomeDashboardMenu(p:Props){
 const router=useRouter();
 const [settings,setSettings]=useState(false);
 const cards:{id:string;label:string;caption:string;icon:IconName;color:string;edge:string;run:()=>void}[]=[
  {id:'world-map-open',label:'あそぶ',caption:'ミニゲーム・占い',icon:'play',color:'#EDE6F2',edge:'#D2BFDF',run:p.onPlay},
  {id:'home-menu-shop',label:'ショップ',caption:'ごはん・家具・花',icon:'shopping-bag',color:'#E4ECE1',edge:'#BFD1BA',run:p.onShop},
  {id:'home-menu-atelier',label:'模様替え',caption:'お気に入りの\nお部屋に',icon:'home',color:'#EFE5D7',edge:'#D7BB97',run:p.onAtelier},
  {id:'home-menu-friends',label:'友だち',caption:'有料オプション\n予定',icon:'users',color:'#E2E9F1',edge:'#B7CADF',run:p.onFriends},
 ];
 return <BottomSheet visible onClose={p.onClose} title={settings?'お世話・設定':'メニュー'} maxHeightRatio={.94}>
  {settings?<><Pressable testID="home-settings-back" accessibilityRole="button" onPress={()=>setSettings(false)} style={s.row}><Icon name="arrow-left" size={18} color="#796583"/><Text style={s.rowText}>メニューに戻る</Text></Pressable>{p.children}</>:<View testID="home-dashboard-menu" style={{gap:18}}>
   <Pressable testID="home-menu-condition" accessibilityRole="button" onPress={p.onRecord} style={s.summary}><ConditionFace mood={p.mood} size={48}/><View style={{flex:1,gap:4}}><Text style={s.small}>いまのあなた</Text><Text style={s.summaryMood}>{CONDITION_LABELS.mood[p.mood??0]??'未記録'}</Text></View><Icon name="chevron-right" size={18} color="#796583"/></Pressable>
   <Text style={s.section}>相棒との暮らし</Text><View style={s.grid}>{cards.map(card=><Pressable key={card.id} testID={card.id} accessibilityRole="button" accessibilityLabel={card.id==='home-menu-friends'?'友だちのおうち。準備中・有料予定':card.label} onPress={card.run} style={[s.card,{backgroundColor:card.color,borderColor:card.edge}]}>
    <View style={s.cardHead}><Icon name={card.icon} size={28} color="#796583"/>{card.id==='home-menu-friends'&&<Text style={s.badge}>準備中</Text>}</View><Text style={s.cardTitle}>{card.label}</Text><Text style={s.small}>{card.caption}</Text>
   </Pressable>)}</View>
   <Text style={s.section}>ふりかえる・整える</Text>
   {([
    ['home-menu-wardrobe','着ぐるみ','shopping-bag',()=>{p.onClose();router.push('/wardrobe');}],
    ['home-menu-growth','相棒の成長と思い出','heart',p.onGrowth],
    ['home-menu-hints','自分のヒント帳','bookmark',p.onHints],
    ['home-menu-settings','お世話・アカウント・設定','sliders',()=>setSettings(true)],
   ] as [string,string,IconName,()=>void][]).map(([id,label,icon,run])=><Pressable key={id} testID={id} accessibilityRole="button" onPress={run} style={s.row}><Icon name={icon} size={18} color="#927B9E"/><Text style={s.rowText}>{label}</Text><Icon name="chevron-right" size={16} color="#927B9E"/></Pressable>)}
   <Pressable accessibilityRole="button" onPress={p.onGuide} style={s.guide}><Text style={s.small}>使い方ガイド</Text></Pressable>
  </View>}
 </BottomSheet>;
}
const s=StyleSheet.create({summary:{padding:16,backgroundColor:'#FFFCF6',borderWidth:1,borderBottomWidth:4,borderColor:'#E2DBE4',borderRadius:23,flexDirection:'row',alignItems:'center',gap:13},summaryMood:{fontSize:18,fontWeight:'600',lineHeight:27,color:'#51405B'},small:{fontSize:11,lineHeight:19,color:'#7C6885'},section:{fontSize:12,letterSpacing:.5,color:'#8D7894',paddingTop:5},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},card:{width:'47.5%',flexGrow:1,minHeight:138,padding:16,borderWidth:1,borderBottomWidth:5,borderRadius:24,gap:6},cardHead:{minHeight:44,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:4},badge:{fontSize:11,lineHeight:17,color:'#76637D',backgroundColor:'#FFFCF6',paddingHorizontal:5,paddingVertical:2,borderRadius:7},cardTitle:{fontSize:19,lineHeight:29,color:'#493A54'},row:{minHeight:52,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#DFD6E4'},rowText:{flex:1,fontSize:13,lineHeight:23,color:'#594663'},guide:{minHeight:44,alignItems:'center',justifyContent:'center'}});
