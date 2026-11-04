import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useBattleAudio} from '@/contexts/BattleMusicContext';
export function BattleSoundControl(){
 const music=useBattleAudio(),[open,setOpen]=useState(false);
 const style={minHeight:44,padding:10,borderRadius:18,backgroundColor:'#FFF9F1',justifyContent:'center' as const};
 return <View style={{gap:5}}><View style={{flexDirection:'row',gap:6}}><Pressable testID="battle-bgm-toggle" accessibilityRole="button" accessibilityLabel={`バトルBGM ${music.enabled?'オン':'オフ'}`} onPress={music.toggle} style={style}><Text style={{color:'#725384',fontSize:12}}>♪ BGM {music.enabled?'ON':'OFF'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="音量の設定" onPress={()=>setOpen(!open)} style={style}><Text style={{color:'#725384'}}>音量</Text></Pressable></View>{open&&<View style={{flexDirection:'row',gap:5}}>{[.15,.35,.6].map((volume,i)=><Pressable key={volume} accessibilityRole="button" accessibilityState={{selected:music.volume===volume}} onPress={()=>music.setVolume(volume)} style={[style,{backgroundColor:music.volume===volume?'#EADBF3':'#FFF9F1'}]}><Text style={{color:'#725384',fontSize:12}}>{['小','中','大'][i]}</Text></Pressable>)}</View>}{!!music.error&&<Text accessibilityRole="alert" style={{color:'#925B69',fontSize:11,maxWidth:220}}>{music.error}</Text>}</View>;
}
