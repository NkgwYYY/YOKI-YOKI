import React,{useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {StaticMascot} from '@/components/Mascot';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon} from '@/components/ui/Icon';
import {getStageName} from '@/utils/mascotUtils';
import {evolutionOffer,type EvolutionAction,type StoneKind} from '@/utils/evolutionChoice';

export default function EvolutionScreen(){const auth=useAuth();return <EvolutionNotebook key={auth.user?.id??'guest'}/>;}
function EvolutionNotebook(){
 const app=useApp(),auth=useAuth(),router=useRouter(),insets=useSafeAreaInsets();
 const offer=evolutionOffer(app.progress),{choice,next,previous}=offer;
 const [confirm,setConfirm]=useState<EvolutionAction|null>(null),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const lock=useRef(false),owner=auth.user?.id??'guest',currentOwner=useRef(owner);currentOwner.current=owner;
 const blocked=saving||app.isLoading||!!app.storageError||(auth.isSignedIn&&!app.cloudSynced);
 const ask=(kind:EvolutionAction['kind'])=>{setNotice('');setConfirm({kind,stage:choice.stage,revision:choice.revision});};
 const execute=async()=>{
  if(!confirm||lock.current||blocked)return;const forOwner=owner;lock.current=true;setSaving(true);setNotice('');
  try{await app.runEvolution(confirm);if(currentOwner.current===forOwner){setConfirm(null);setNotice(confirm.kind==='decline'?'この姿のままで暮らしていきます。':'姿が変わりました。これからも、よろしくね。');}}
  catch(error){if(currentOwner.current===forOwner)setNotice(error instanceof Error?error.message:'保存できませんでした。');}
  finally{lock.current=false;setSaving(false);}
 };
 const button=(label:string,onPress:()=>void,testID:string,secondary=false,disabled=false)=><Pressable testID={testID} accessibilityRole="button" disabled={disabled||blocked} accessibilityState={{disabled:disabled||blocked}} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,(disabled||blocked)&&s.disabled,pressed&&{opacity:.7}]}><Text style={[s.buttonText,secondary&&s.secondaryText]}>{label}</Text></Pressable>;
 const stoneCard=(kind:StoneKind)=>{
  const evolution=kind==='evolution',name=evolution?'進化の石':'退化の石',target=evolution?next:previous;
  return <View style={s.card} key={kind} testID={`stone-${kind}`}>
   <View style={s.row}><View style={[s.gem,!evolution&&{backgroundColor:'#E5EDF4'}]}><Icon name={evolution?'chevron-up':'chevron-down'} size={27} color="#72548F"/></View><View style={{flex:1,gap:5}}><Text style={s.cardTitle}>{name}</Text><Text style={s.small}>有料オプション・1個で1段階</Text></View></View>
   <Text style={s.body}>{evolution?'次の姿へ、1段階だけ進化できる石です。':'ひとつ前の姿へ、1段階だけ戻せる石です。'}</Text>
   {target&&<View style={s.destination}><Text style={s.body}>{getStageName(choice.stage)}</Text><Icon name="chevron-right" size={16} color="#8B7C96"/><Text style={s.target}>{target.name}</Text></View>}
   <View testID={`stone-coming-soon-${kind}`} style={[s.secondary,{padding:14,borderRadius:16,alignItems:'center'}]}><Text style={s.secondaryText}>近日公開予定</Text></View>
   <Text style={s.small}>現在は購入・使用できません。価格は公開時にお知らせします。</Text>
  </View>;
 };
 const target=confirm?.kind==='regression'?previous:next;
 return <View style={s.root}><ScrollView contentContainerStyle={[s.content,{paddingTop:insets.top+12,paddingBottom:insets.bottom+32}]}>
  <View style={s.header}><Pressable testID="evolution-back" accessibilityRole="button" accessibilityLabel="おうちに戻る" onPress={()=>router.back()} style={s.back}><Icon name="chevron-left" color="#58476B" size={22}/></Pressable><Text style={s.title}>この子の進化</Text><View style={{width:44}}/></View>
  <View style={s.hero}><Text style={s.eyebrow}>いまの姿</Text><StaticMascot stage={choice.stage} mood="normal" size={136}/><Text testID="evolution-current-stage" style={s.stage}>{getStageName(choice.stage)}</Text><Text style={s.body}>{app.mascotName||'よっきー'}の姿を、自分で選べます。</Text></View>
  {offer.free?<View style={s.card} testID="evolution-free-offer"><Text style={s.cardTitle}>次の姿を選べるようになりました</Text><View style={s.next}><StaticMascot stage={next!.stage} mood="normal" size={98}/><View style={{flex:1,gap:6}}><Text style={s.target}>{next!.name}</Text><Text style={s.body}>今の姿のままでいることもできます。</Text></View></View>{button('この姿に進化する（無料）',()=>ask('free'),'evolution-free')}{button('この姿のままにする',()=>ask('decline'),'evolution-decline',true)}<Text style={s.small}>「この姿のままにする」を確定すると、この段階の無料進化は選べなくなります。あとで進化するには、有料の進化の石が必要です。石は近日公開予定のため、公開までは進化できません。</Text>{button('あとで決める',()=>router.back(),'evolution-later',true)}</View>:<View style={s.note}><Text style={s.cardTitle}>{offer.declined?'この姿を選んでいます':next?'次の進化について':'すべての姿に出会いました'}</Text><Text style={s.body}>{offer.declined?'自動では進化しません。進化の石は近日公開予定です。公開までは、この姿で過ごします。':!next?'好きな姿に戻せる退化の石は、近日公開予定です。':offer.remaining>0?`あと${offer.remaining}日会いに来ると、${next.name}への進化を選べます。`:'この段階の無料進化は利用済みです。進化の石は近日公開予定です。'}</Text></View>}
  <Text style={s.section}>姿を変える石</Text><Text style={s.body}>1回で変わるのは1段階だけ。2段階まとめて進化・退化することはできません。</Text>
  {(['evolution','regression'] as const).map(stoneCard)}
  {!!notice&&<Text testID="evolution-notice" accessibilityRole="alert" style={s.notice}>{notice}</Text>}
 </ScrollView>
 {confirm&&<BottomSheet visible onClose={()=>{if(!saving)setConfirm(null);}} title={confirm.kind==='decline'?'この姿のままにしますか？':`${target?.name??''}に変わりますか？`}>
  {confirm.kind==='decline'?<><StaticMascot stage={choice.stage} mood="normal" size={105}/><Text style={s.body}>確定すると、この段階の無料進化は選べなくなります。あとで進化したくなった場合は、有料の「進化の石」が必要です。石は近日公開予定のため、公開までは進化できません。迷っている場合は「戻る」を選び、あとで決められます。</Text></>:<><View style={s.next}><StaticMascot stage={choice.stage} mood="normal" size={92}/><Icon name="chevron-right" size={22} color="#7D668F"/>{target&&<StaticMascot stage={target.stage} mood="normal" size={92}/>}</View><Text style={s.body}>{confirm.kind==='free'?'無料で1段階進化します。':'石を1個使って、1段階だけ姿を変えます。'}日記や家具、思い出はそのまま残ります。</Text></>}
  {!!notice&&<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
  {button(saving?'保存中…':confirm.kind==='decline'?'この姿のままにする（確定）':confirm.kind==='free'?'無料で進化する':'石を1個使う',()=>void execute(),'evolution-confirm')}
  {button('戻る',()=>setConfirm(null),'evolution-confirm-cancel',true)}
 </BottomSheet>}
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#F7F5F1'},content:{paddingHorizontal:20,gap:16,maxWidth:620,width:'100%',alignSelf:'center'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,alignItems:'center',justifyContent:'center'},title:{fontSize:21,fontWeight:'700',color:'#45344F'},hero:{alignItems:'center',gap:9,padding:20,backgroundColor:'#E8EEF8',borderRadius:28},eyebrow:{fontSize:12,color:'#776981',letterSpacing:2},stage:{fontSize:27,fontWeight:'700',color:'#4E3A61'},card:{backgroundColor:'#FFFEFB',borderRadius:24,padding:20,gap:14,borderWidth:1,borderColor:'#E8E0EC'},cardTitle:{fontSize:17,fontWeight:'700',color:'#4D3A5D',lineHeight:25},body:{fontSize:14,lineHeight:23,color:'#665A6D'},small:{fontSize:12,lineHeight:20,color:'#776F7B'},button:{backgroundColor:'#82629F',borderRadius:18,minHeight:52,paddingVertical:14,paddingHorizontal:14,alignItems:'center',justifyContent:'center'},secondary:{backgroundColor:'#F2EDF6',borderWidth:1,borderColor:'#DCCFE7'},buttonText:{fontSize:15,fontWeight:'700',color:'#FFF'},secondaryText:{color:'#6A4B83'},disabled:{opacity:.45},next:{flexDirection:'row',gap:14,alignItems:'center',justifyContent:'center'},target:{fontSize:17,fontWeight:'700',color:'#624B76'},note:{backgroundColor:'#EFEAF5',padding:18,borderRadius:22,gap:8},section:{fontSize:21,fontWeight:'700',color:'#4D3A5D',marginTop:8},row:{flexDirection:'row',gap:14,alignItems:'center'},gem:{width:54,height:54,borderRadius:18,backgroundColor:'#ECE2F5',alignItems:'center',justifyContent:'center'},destination:{flexDirection:'row',gap:9,alignItems:'center',flexWrap:'wrap'},notice:{fontSize:14,lineHeight:23,color:'#775484',padding:12,backgroundColor:'#EEE6F4',borderRadius:12}});
