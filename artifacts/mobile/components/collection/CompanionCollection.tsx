import React,{useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useApp} from '@/contexts/AppContext';
import {colors} from '@/constants/theme';
import {PressScale} from '@/components/ui/PressScale';
import {Icon} from '@/components/ui/Icon';
import {KEEPSAKES,bondDescription,type KeepsakeId} from '@/utils/companionCollection';
import {KeepsakeArt} from './KeepsakeArt';
export function CompanionCollection(){
 const {roomCustomization:room,progress,selectKeepsake}=useApp();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const lock=useRef(false);
 const owned=room.keepsakes??[],days=progress.visits?.totalVisits??0;
 const select=async(id:KeepsakeId|'none')=>{
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
  try{await selectKeepsake(id);setMessage(id==='none'?'大切にしまいました。':'お部屋に飾りました。しばらく眺めていると、この子もそばにやってきます。');}
  catch{setMessage('保存できませんでした。もう一度お試しください。');}
  finally{lock.current=false;setBusy(false);}
 };
 return <View testID="companion-collection" style={s.root}>
  <View style={s.intro}><View style={s.badge}><Icon name="heart" size={23} color={colors.primary}/></View><View style={{flex:1}}><Text style={s.eyebrow}>TOGETHER, LITTLE BY LITTLE</Text><Text style={s.title}>ふたりで、{days}日。</Text><Text style={s.copy}>{bondDescription(days)}</Text></View></View>
  <View style={s.heading}><Text style={s.headingText}>暮らしのたからもの</Text><Text style={s.count}>{owned.length} / {KEEPSAKES.length}</Text></View>
  <Text style={s.copy}>街での出会いも、なんでもない日も。手に入れた思い出を、ひとつお部屋に飾れます。</Text>
  {!!message&&<Text accessibilityRole="alert" style={s.message}>{message}</Text>}
  <View style={s.grid}>{KEEPSAKES.map(item=>{
   const unlocked=owned.includes(item.id),selected=room.displayedKeepsake===item.id;
   return <PressScale key={item.id} testID={`keepsake-${item.id}`} disabled={!unlocked||busy} onPress={()=>void select(item.id)} accessibilityLabel={`${item.name}。${unlocked?selected?'飾っています':'お部屋に飾る':item.hint}`} accessibilityState={{disabled:!unlocked||busy,selected}} style={[s.card,selected&&s.selected]}>
    <View style={[s.art,!unlocked&&{opacity:.45}]}><KeepsakeArt id={item.id} size={102}/></View>
    <View style={s.tag}><Icon name={unlocked?selected?'check-circle':'gift':'lock'} size={12} color={colors.primary}/><Text style={s.tagText}>{unlocked?selected?'飾っています':'飾れる思い出':'これからの楽しみ'}</Text></View>
    <Text style={s.itemName}>{item.name}</Text><Text style={s.detail}>{unlocked?item.story:item.hint}</Text>
   </PressScale>;
  })}</View>
  {room.displayedKeepsake&&room.displayedKeepsake!=='none'&&<PressScale testID="keepsake-put-away" disabled={busy} onPress={()=>void select('none')} style={s.putAway}><Text style={s.copy}>いまの飾りをしまう</Text></PressScale>}
  <Text style={s.footnote}>期限はありません。お休みした日があっても、集めたものはずっと残ります。</Text>
 </View>;
}
const s=StyleSheet.create({root:{gap:14},intro:{flexDirection:'row',gap:14,alignItems:'center',padding:18,backgroundColor:colors.muted,borderRadius:24},badge:{width:46,height:46,borderRadius:23,backgroundColor:'#FFF9EC',alignItems:'center',justifyContent:'center'},eyebrow:{fontSize:8,letterSpacing:1.4,color:colors.primary},title:{fontSize:23,fontWeight:'600',color:colors.foreground,marginVertical:7},copy:{fontSize:12,lineHeight:21,color:colors.mutedForeground},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:8},headingText:{fontSize:16,fontWeight:'600',color:colors.foreground},count:{fontSize:12,color:colors.primary},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:12},card:{width:'47.8%',padding:12,borderRadius:22,borderWidth:1,borderColor:colors.border,backgroundColor:'#FFFEFC',alignItems:'center',gap:8},selected:{borderColor:'#AC8BC2',backgroundColor:'#F6EFFB'},art:{alignItems:'center',justifyContent:'center',height:102},tag:{flexDirection:'row',gap:4,alignItems:'center'},tagText:{fontSize:9,color:colors.primary},itemName:{fontSize:12,fontWeight:'600',color:colors.foreground,textAlign:'center',lineHeight:20},detail:{fontSize:11,lineHeight:18,color:colors.mutedForeground,textAlign:'center'},message:{fontSize:12,lineHeight:21,color:colors.primary,padding:12,backgroundColor:colors.primarySoft,borderRadius:14},putAway:{minHeight:44,alignItems:'center',justifyContent:'center'},footnote:{fontSize:11,lineHeight:20,color:colors.mutedForeground,marginBottom:12}});
