import React,{useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {PressScale} from '@/components/ui/PressScale';
import {FeltDecoration} from '@/components/ui/Felt';
import {Icon,type IconName} from '@/components/ui/Icon';
import {colors} from '@/constants/theme';
import {WorldPill} from './WorldPill';
export function HomeMenu({onClose,onShop,onFortune,onBowling,onEgg}:{onClose:()=>void;onShop:()=>void;onFortune:()=>void;onBowling:()=>void;onEgg:()=>void}){
 const [games,setGames]=useState(false);
 const cards:{id:string;title:string;copy:string;icon:IconName;color:string;run:()=>void}[]=games?[
  {id:'bowling',title:'ボウリング',copy:'ころん、と転がして。めざせストライク。',icon:'circle',color:'#E9DDEB',run:onBowling},
  {id:'egg',title:'ゆでたまご',copy:'ちょうどいいゆで加減で、ポイントを集めよう。',icon:'sun',color:'#F2E5BE',run:onEgg},
 ]:[
  {id:'shop',title:'ショップ',copy:'ごはん、お部屋、身につけるもの。',icon:'shopping-bag',color:'#E1EACF',run:onShop},
  {id:'fortune',title:'占い',copy:'星座を選んで、今日の運勢をチェック。',icon:'star',color:'#E9DDEB',run:onFortune},
  {id:'play',title:'あそぶ',copy:'ちょっとひと息、ミニゲーム。',icon:'smile',color:'#F3DAD4',run:()=>setGames(true)},
 ];
 return <BottomSheet visible title={games?'あそぶ':'メニュー'} subtitle={games?'気分に合わせて、ひとあそび。':'今日は、なにをしよう。'} onClose={onClose} maxHeightRatio={.94}>
  <View testID="home-direct-menu" style={{gap:14,paddingVertical:4}}>{cards.map(c=><PressScale key={c.id} testID={`menu-${c.id}`} accessibilityRole="button" accessibilityLabel={c.title} onPress={c.run} style={[s.card,{backgroundColor:c.color}]}>
   <FeltDecoration radius={26}/><View style={s.badge}><FeltDecoration radius={24}/><Icon name={c.icon} size={32} color={colors.foreground}/></View><View style={{flex:1,gap:7}}><Text style={s.title}>{c.title}</Text><Text style={s.copy}>{c.copy}</Text></View><Icon name="chevron-right" size={20} color={colors.mutedForeground}/>
  </PressScale>)}</View>
  {games&&<WorldPill label="メニューに戻る" icon="arrow-left" onPress={()=>setGames(false)}/>}
 </BottomSheet>;
}
const s=StyleSheet.create({card:{minHeight:128,padding:20,borderRadius:26,borderWidth:1,borderColor:'#D4C2A3',flexDirection:'row',alignItems:'center',gap:16,shadowColor:'#907052',shadowOpacity:.12,shadowRadius:5,shadowOffset:{width:0,height:4}},badge:{width:64,height:64,borderRadius:24,backgroundColor:'#FFF8E8',alignItems:'center',justifyContent:'center'},title:{fontSize:21,fontWeight:'700',color:colors.foreground},copy:{fontSize:12,lineHeight:20,color:colors.mutedForeground}});
