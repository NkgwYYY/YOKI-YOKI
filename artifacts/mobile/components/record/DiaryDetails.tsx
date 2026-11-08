import React from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import Svg,{Circle,Path} from 'react-native-svg';
import type {DiaryDetails} from '@/utils/exchangeDiary';

const quickBehaviors=['外に出た','運動した','人と話した','ひとりで休んだ','趣味を楽しんだ','ゆっくり休んだ'];
const behaviors=[...quickBehaviors,'運動した','読書した','瞑想した','日記を書いた','友人と会った','新しいことに挑戦','ゆっくり休んだ','自然を感じた','好きな音楽を聴いた','料理をした','人に感謝された','人に親切にした'];
const conditions=[{key:'exercise',label:'運動の量',options:['なし','軽め','しっかり']},{key:'meal',label:'食事',options:['乱れた','ふつう','整ってた']},{key:'social',label:'人間関係',options:['しんどい','ふつう','温かい']}] as const;

/** Concrete optional activities, shared by the quick and detailed journal editors. */
export function DiaryBehaviorTags({value,onChange,disabled=false,compact=false}:{value:string[];onChange:(value:string[])=>void;disabled?:boolean;compact?:boolean}){
 const labels=compact?quickBehaviors:[...new Set([...behaviors,...value])];
 return <View style={s.tags}>{labels.map(label=><Pressable key={label} testID={`${compact?'diary-quick-behavior':'diary-behavior'}-${label}`} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked:value.includes(label)}} disabled={disabled||(!value.includes(label)&&value.length>=30)} onPress={()=>onChange(value.includes(label)?value.filter(v=>v!==label):[...value,label])} style={[s.chip,value.includes(label)&&s.selected]}><Text style={s.text}>{value.includes(label)?'✓ ':''}{label}</Text></Pressable>)}</View>;
}
/** Readable expressions instead of relying on color or weather symbols alone. */
export function DiaryMoodFace({value,size=32}:{value:number;size?:number}){
 const fill=['#E2E5EF','#EBE3EF','#F5E7CB','#F8DFD7','#E6D8F0'][value-1]??'#F5E7CB';
 const mouth=value<=2?'M12 24 Q20 16 28 24':value===3?'M15 23 L25 23':value===4?'M12 21 Q20 29 28 21':'M12 21 Q20 34 28 21 Z';
 return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
  <Circle cx="20" cy="20" r="19" fill={fill}/>
  {value===5?<><Path d="M11 16 Q14 11 17 16 M23 16 Q26 11 29 16" fill="none" stroke="#58445F" strokeWidth="1.8" strokeLinecap="round"/></>:<><Circle cx="14" cy="16" r="1.7" fill="#58445F"/><Circle cx="26" cy="16" r="1.7" fill="#58445F"/></>}
  {value<=2&&<Path d="M10 11 Q14 12 17 9 M23 9 Q26 12 30 11" fill="none" stroke="#58445F" strokeWidth="1.4" strokeLinecap="round"/>}
  <Path d={mouth} fill={value===5?'#84608D':'none'} stroke="#58445F" strokeWidth="1.7" strokeLinecap="round"/>
 </Svg>;
}

export function DiaryDetailsEditor({value,onChange,disabled=false}:{value:DiaryDetails;onChange:(value:DiaryDetails)=>void;disabled?:boolean}){
 const change=(patch:Partial<DiaryDetails>)=>onChange({...value,...patch});
 return <View testID="diary-details-editor" style={s.root}>
  <Text style={s.hint}>答えたいところだけで大丈夫。最後にまとめて保存されます。</Text>
  <View style={s.row}><Text style={s.label}>昨夜の睡眠</Text><Pressable accessibilityRole="checkbox" accessibilityState={{checked:value.sleepRecorded}} disabled={disabled} onPress={()=>change({sleepRecorded:!value.sleepRecorded,sleep:value.sleepRecorded?value.sleep:value.sleep||7})} style={[s.chip,value.sleepRecorded&&s.selected]}><Text style={s.text}>{value.sleepRecorded?'✓ 睡眠時間を残す':'睡眠時間を残す'}</Text></Pressable></View>
  {value.sleepRecorded&&<View style={s.sleepRow}><Pressable accessibilityRole="button" accessibilityLabel="睡眠を30分減らす" disabled={disabled||value.sleep<=0} onPress={()=>change({sleep:Math.max(0,value.sleep-.5)})} style={s.step}><Text style={s.label}>−</Text></Pressable><Text testID="diary-sleep-value" style={s.label}>{value.sleep} 時間</Text><Pressable accessibilityRole="button" accessibilityLabel="睡眠を30分増やす" disabled={disabled||value.sleep>=12} onPress={()=>change({sleep:Math.min(12,value.sleep+.5)})} style={s.step}><Text style={s.label}>＋</Text></Pressable></View>}
  <View style={s.group}><Text style={s.label}>今日はどんな日？</Text><View style={s.row}>{([['work','仕事・学校'],['rest','お休み'],['other','その他']] as const).map(([id,label])=><Pressable key={id} testID={'life-day-'+id} accessibilityRole="button" accessibilityState={{selected:value.dayType===id}} disabled={disabled} onPress={()=>change({dayType:value.dayType===id?undefined:id})} style={[s.choice,value.dayType===id&&s.selected]}><Text style={s.text}>{label}</Text></Pressable>)}</View><Text style={s.hint}>選んだ項目をもう一度押すと未記録に戻せます。</Text></View>
  {conditions.map(c=><View key={c.key} style={s.group}><Text style={s.label}>{c.label}</Text><View style={s.row}>{c.options.map((label,i)=><Pressable key={label} accessibilityRole="button" accessibilityLabel={`${c.label}：${label}`} accessibilityState={{selected:value[c.key]===i+1}} disabled={disabled} onPress={()=>change({[c.key]:value[c.key]===i+1?undefined:i+1})} style={[s.choice,value[c.key]===i+1&&s.selected]}><Text style={s.text}>{label}</Text></Pressable>)}</View></View>)}
  <Text style={s.label}>今日できたこと</Text><TextInput testID="diary-win" accessibilityLabel="今日できたこと" value={value.win??''} onChangeText={win=>change({win})} editable={!disabled} maxLength={60} placeholder="ごはんを食べた、ゆっくり休めた…" placeholderTextColor="#8F7E8B" style={s.input}/>
  <Text style={s.label}>今日ここまでの過ごし方</Text><DiaryBehaviorTags value={value.behaviors} disabled={disabled} onChange={behaviors=>change({behaviors,behaviorsRecorded:behaviors.length>0})}/>
  <View style={s.row}><Pressable testID="life-behaviors-none" accessibilityRole="checkbox" accessibilityState={{checked:value.behaviorsRecorded===true&&!value.behaviors.length}} disabled={disabled} onPress={()=>change({behaviors:[],behaviorsRecorded:true})} style={[s.chip,value.behaviorsRecorded===true&&!value.behaviors.length&&s.selected]}><Text style={s.text}>当てはまるものはない</Text></Pressable><Pressable testID="life-behaviors-clear" accessibilityRole="button" disabled={disabled} onPress={()=>change({behaviors:[],behaviorsRecorded:false})} style={s.chip}><Text style={s.text}>未記録に戻す</Text></Pressable></View>
  <Text style={s.label}>ほかに書いておきたいこと</Text><TextInput testID="diary-detail-notes" accessibilityLabel="詳しい記録のメモ" value={value.notes} onChangeText={notes=>change({notes})} editable={!disabled} multiline maxLength={10000} textAlignVertical="top" placeholder="からだの調子や、覚えておきたいことなど。" placeholderTextColor="#8F7E8B" style={[s.input,{minHeight:100}]}/>
 </View>;
}
export function DiaryDetailsSummary({value}:{value:DiaryDetails}){
 const parts=[value.dayType?({work:'仕事・学校',rest:'お休み',other:'その他'}[value.dayType]):null,value.sleepRecorded?`睡眠 ${value.sleep}時間`:null,...conditions.map(c=>value[c.key]?`${c.label}：${c.options[(value[c.key]??1)-1]}`:null)].filter(Boolean);
 if(!parts.length&&!value.win&&!value.behaviors.length&&!value.notes)return null;
 return <View testID="diary-details-summary" style={s.summary}><Text style={s.label}>この日の詳しい記録</Text>{!!parts.length&&<Text style={s.text}>{parts.join('　／　')}</Text>}{!!value.win&&<Text style={s.text}>できたこと：{value.win}</Text>}{!!value.behaviors.length&&<Text style={s.text}>{value.behaviors.join('・')}</Text>}{value.behaviorsRecorded===true&&!value.behaviors.length&&<Text style={s.text}>過ごし方：当てはまるものはない</Text>}{!!value.notes&&<Text selectable style={s.text}>{value.notes}</Text>}</View>;
}
const s=StyleSheet.create({root:{gap:14},group:{gap:8},row:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},sleepRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:20},label:{fontSize:13,fontWeight:'600',color:'#654E70',lineHeight:21},hint:{fontSize:12,lineHeight:20,color:'#806B7D'},text:{fontSize:13,lineHeight:21,color:'#68546E'},chip:{minHeight:44,paddingHorizontal:10,paddingVertical:10,borderWidth:1,borderColor:'#D7C7D6',borderRadius:18,justifyContent:'center',backgroundColor:'#FFFDF7'},choice:{flex:1,minHeight:44,padding:6,borderWidth:1,borderColor:'#D7C7D6',borderRadius:7,alignItems:'center',justifyContent:'center'},selected:{backgroundColor:'#EEE5F4',borderColor:'#9678A5'},step:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:22,backgroundColor:'#EDE0ED'},input:{fontSize:14,lineHeight:24,color:'#59435E',padding:12,backgroundColor:'#F7EFE6',borderWidth:1,borderColor:'#D8C8D4',borderRadius:7},tags:{flexDirection:'row',flexWrap:'wrap',gap:7},summary:{borderTopWidth:1,borderColor:'#DACAD2',paddingTop:16,gap:8}});
