import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import Svg,{Circle,Path} from 'react-native-svg';
import {Icon} from '@/components/ui/Icon';
import type {HomeAssist} from '@/utils/homeAssist';

/** Small, anchored guidance; the existing controls remain the primary actions. */
export function HomeAssistBubble({assist,onPress,onDismiss,tail='left',above=false}:{
  assist:HomeAssist;onPress:()=>void;onDismiss:()=>void;tail?:'left'|'center'|'right';above?:boolean;
}){
  return <View testID={`home-assist-${assist.kind}`} style={s.wrap}>
    <View style={s.bubble}>
      <Svg pointerEvents="none" accessible={false} width="100%" height="100%" viewBox="0 0 240 70" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Path d="M24 18 C26 7 42 3 54 9 C65 0 88 0 99 7 C112 2 131 2 142 8 C157 0 182 4 188 16 C203 11 224 18 221 31 C238 33 240 50 225 55 C218 69 194 68 181 61 C164 70 142 66 130 61 C112 68 90 68 77 61 C62 67 38 65 31 58 C11 60 1 46 8 36 C1 25 10 15 24 18 Z" fill="#FFFCFF" fillOpacity={0.72}/>
      </Svg>
      <Pressable testID={assist.kind==='mood'?'home-mood-guide':`home-assist-${assist.kind}-action`} accessibilityRole="button" accessibilityLabel={assist.text.replace('\n','')} onPress={onPress} style={({pressed})=>[s.action,pressed&&s.pressed]}>
        <Text style={s.text}>{assist.text}</Text>
      </Pressable>
      <Pressable testID="home-assist-dismiss" accessibilityRole="button" accessibilityLabel="案内を閉じる" accessibilityHint="今日はこのまま過ごせます" onPress={onDismiss} style={({pressed})=>[s.close,pressed&&s.pressed]}>
        <Icon name="x" size={12} color="#7D7085"/>
      </Pressable>
    </View>
    <Svg pointerEvents="none" accessible={false} width={18} height={16} viewBox="0 0 18 16" style={[s.tail,above&&{bottom:undefined,top:-12,transform:[{rotate:'180deg'}]},tail==='center'?{left:'50%',marginLeft:-9}:tail==='right'?{right:43}:{left:above?14:38}]}><Circle cx={8} cy={4} r={3.5} fill="#FFFCFF" fillOpacity={0.64}/><Circle cx={11} cy={13} r={2} fill="#FFFCFF" fillOpacity={0.5}/></Svg>
  </View>;
}
const s=StyleSheet.create({
  wrap:{width:'100%',maxWidth:240},
  bubble:{minHeight:62,flexDirection:'row',alignItems:'stretch',paddingRight:10},
  action:{flex:1,minWidth:0,minHeight:52,justifyContent:'center',paddingLeft:23,paddingVertical:12},
  text:{fontSize:11.5,lineHeight:18,fontWeight:'500',color:'#4B4054'},
  close:{width:44,minHeight:44,alignItems:'center',justifyContent:'center'},
  pressed:{opacity:.65},tail:{position:'absolute',bottom:-12},
});
