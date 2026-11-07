import React,{useState} from 'react';
import {Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import {BATTLE_CONTENT_NOTE,BATTLE_SCORING_NOTE,MENTAL_HEALTH_SOURCES,type SourceId} from '@/utils/moyamoyaSources';

export function BattleSources({sourceIds}:{sourceIds:SourceId[]}){
  const [expanded,setExpanded]=useState(false),[error,setError]=useState('');
  const open=async(id:SourceId)=>{
    try{setError('');await Linking.openURL(MENTAL_HEALTH_SOURCES[id].url);}
    catch{setError('参考資料を開けませんでした。通信を確認して、もう一度お試しください。');}
  };
  return <View style={s.root}>
    <Pressable testID="battle-sources-toggle" accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={s.toggle}>
      <Text style={s.label}>{expanded?'−':'＋'} 参考にしたセルフケア</Text>
      <Text style={s.summary}>公開資料にもとづく対処法の練習</Text>
    </Pressable>
    {expanded&&<View testID="battle-sources-panel" style={s.panel}>
      <Text style={s.note}>{BATTLE_CONTENT_NOTE}</Text>
      <Text style={s.note}>{BATTLE_SCORING_NOTE}</Text>
      {sourceIds.map(id=>{const source=MENTAL_HEALTH_SOURCES[id];return <View key={id} style={s.source}>
        <Pressable testID={`battle-source-${id}`} accessibilityRole="link" accessibilityLabel={`${source.publisher}：${source.title}。参考資料を開く`} onPress={()=>void open(id)} style={s.sourceLink}>
          <Text style={s.publisher}>{source.publisher}</Text><Text style={s.link}>{source.title} ↗</Text>
        </Pressable>
        <Text style={s.note}>{source.principle}</Text>
      </View>;})}
      <Text style={s.note}>症状の診断や治療の代わりにはなりません。つらさが続くときは、身近な相談先や専門家を頼ってください。</Text>
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    </View>}
  </View>;
}
const s=StyleSheet.create({root:{borderTopWidth:1,borderColor:'#EEE4F2'},toggle:{minHeight:52,justifyContent:'center',paddingVertical:10,gap:4},label:{fontSize:12,fontWeight:'600',color:'#795989'},summary:{fontSize:10,lineHeight:16,color:'#8C7A94'},panel:{gap:12,paddingBottom:8},note:{fontSize:11,lineHeight:19,color:'#806C89'},source:{gap:4,borderTopWidth:1,borderColor:'#F0E8F3',paddingTop:8},sourceLink:{minHeight:44,justifyContent:'center',gap:4},publisher:{fontSize:11,fontWeight:'700',color:'#795989'},link:{fontSize:11,lineHeight:18,color:'#795989',textDecorationLine:'underline'},error:{fontSize:12,lineHeight:20,color:'#A35263'}});
