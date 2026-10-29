import React from 'react';
import {Linking,StyleSheet,Text,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {MOON_PHASES} from '@/utils/dailySky';
import type {FortuneReading} from '@/utils/dailyFortune';
export function MoonReading({reading,compact=false}:{reading:FortuneReading;compact?:boolean}){
 const sky=reading.sky;if(!sky)return null;
 return <View testID="fortune-sourced-reading" style={s.root}>
  <View style={s.facts}><Text style={s.kicker}>今日の月 · {sky.date.replaceAll('-','.')}</Text><View style={s.row}><View style={{flex:1,gap:7}}><Text style={s.phase}>{MOON_PHASES[sky.phase]}</Text><Text style={s.note}>月の出 {sky.moonrise??'この日はなし'} · 東京</Text></View><View style={s.percent}><Text style={s.number}>{sky.illumination}<Text style={s.unit}>%</Text></Text><Text style={s.note}>照らされている割合</Text></View></View><Text style={s.note}>月相・割合は日本時間12時の計算値</Text></View>
  <View style={s.interpretation}><Text style={s.kicker}>月相からの占い</Text><Text style={s.title}>{reading.title}</Text><Text style={s.copy}>{reading.advice}</Text></View>
  {!compact&&<Text style={s.note}>月の満ち欠けを行動のヒントとして読む占いです。天体データ自体が運勢を予測するものではありません。</Text>}
  <Pressable testID="fortune-source" accessibilityRole="link" accessibilityLabel="出典の米海軍天文台データを開く" onPress={()=>void Linking.openURL(sky.sourceUrl).catch(()=>{})} style={s.source}><Text style={s.sourceText}>出典：米海軍天文台 USNO ↗</Text><Text style={s.note}>取得 {new Date(sky.fetchedAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'})} JST</Text></Pressable>
 </View>;
}
const s=StyleSheet.create({root:{gap:14},facts:{backgroundColor:'#30213F',borderRadius:13,padding:17,gap:12},kicker:{fontSize:10,letterSpacing:1,color:'#A68BB5'},row:{flexDirection:'row',alignItems:'center',gap:10},phase:{fontSize:19,fontWeight:'600',color:'#F4EAF7'},note:{fontSize:10,lineHeight:17,color:'#A18DAA'},percent:{alignItems:'flex-end',gap:4},number:{fontSize:32,fontWeight:'500',color:'#E8CC9C',fontVariant:['tabular-nums']},unit:{fontSize:15},interpretation:{gap:8},title:{fontSize:18,fontWeight:'600',color:'#594268',lineHeight:27},copy:{fontSize:13,lineHeight:24,color:'#6A5873'},source:{minHeight:44,justifyContent:'center',gap:3},sourceText:{fontSize:11,color:'#74558A',textDecorationLine:'underline'}});
