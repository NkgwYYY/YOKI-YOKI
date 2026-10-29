import React,{useEffect,useRef,useState} from 'react';
import {Linking,StyleSheet,Text,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg,{Circle,Path} from 'react-native-svg';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/Button';
import {PressScale} from '@/components/ui/PressScale';
import {ZODIAC_SIGNS,zodiacSign,zodiacUrl} from '@/utils/zodiac';
import {zodiacKey} from '@/utils/firstSteps';

export function ZodiacFortune(){
 const {user,isLoading,isSignedIn}=useAuth();
 if(isLoading||(isSignedIn&&!user))return <Text style={s.copy}>星座を読み込み中…</Text>;
 const owner=user?.id??'guest';
 return <ZodiacChoice key={owner} owner={owner}/>;
}
function ZodiacChoice({owner}:{owner:string}){
 const key=zodiacKey(owner),[selected,setSelected]=useState<string|null>(null),[ready,setReady]=useState(false),[choosing,setChoosing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;AsyncStorage.getItem(key).then(value=>{if(alive.current)setSelected(zodiacSign(value)?.id??null);}).catch(()=>{if(alive.current)setError('星座を読み込めませんでした。もう一度選んでください。');}).finally(()=>{if(alive.current)setReady(true);});return()=>{alive.current=false;};},[key]);
 const choose=async(id:string)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await AsyncStorage.setItem(key,id);if(alive.current){setSelected(id);setChoosing(false);}}catch{if(alive.current)setError('星座を保存できませんでした。もう一度お試しください。');}finally{lock.current=false;if(alive.current)setBusy(false);}};
 const sign=zodiacSign(selected),url=zodiacUrl(selected);
 const open=()=>{if(!url)return;setError('');void Linking.openURL(url).catch(()=>{if(alive.current)setError('ページを開けませんでした。もう一度お試しください。');});};
 return <View testID="zodiac-fortune" style={{gap:12}}>
  <View style={s.card}><Svg pointerEvents="none" width="84" height="84" viewBox="0 0 84 84" style={s.art} accessible={false}><Path d="M14 60L30 23L56 33L70 12M30 23L63 67" stroke="#B39AC7" strokeWidth="1"/>{[[14,60],[30,23],[56,33],[70,12],[63,67]].map(([x,y])=><Circle key={x} cx={x} cy={y} r="2.5" fill="#EAD3A7"/>)}</Svg>
   <Text style={s.kicker}>12星座占い</Text><Text style={s.title}>{sign?.name??'あなたの星座は？'}</Text><Text style={s.sub}>{sign?sign.dates:'星座を選ぶと、次回からすぐに開けます。'}</Text>
  </View>
  {ready&&(!sign||choosing)?<><View testID="zodiac-picker" style={s.grid}>{ZODIAC_SIGNS.map(item=><PressScale key={item.id} testID={`zodiac-${item.id}`} accessibilityLabel={`${item.name}、${item.dates}`} accessibilityState={{selected:selected===item.id}} disabled={busy} onPress={()=>void choose(item.id)} style={[s.sign,selected===item.id&&s.selected]}><Text style={s.signName}>{item.name}</Text><Text style={s.range}>{item.dates}</Text></PressScale>)}</View>{sign&&<Button label="閉じる" variant="ghost" size="sm" disabled={busy} onPress={()=>setChoosing(false)}/>}</>:ready?<><PressScale testID="zodiac-official-link" accessibilityRole="link" accessibilityLabel={`${sign?.name}の今日の運勢をニフティで開く。外部サイト`} onPress={open} style={s.open}><Text style={s.openText}>今日の運勢を見る ↗</Text></PressScale><Button testID="zodiac-change" label="星座を変更" variant="ghost" size="sm" onPress={()=>setChoosing(true)}/></>:<Text style={s.copy}>星座を読み込み中…</Text>}
  <Text style={s.source}>ニフティ「今日の運勢」の公式ページを開きます。</Text>
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 </View>;
}
const s=StyleSheet.create({card:{padding:20,gap:8,borderRadius:18,backgroundColor:'#30203E',overflow:'hidden'},art:{position:'absolute',right:10,top:14,opacity:.65},kicker:{fontSize:11,letterSpacing:2,color:'#DBC7E6'},title:{fontSize:24,fontWeight:'700',color:'#FFF2DE',paddingRight:45},sub:{fontSize:11,lineHeight:18,color:'#DFD1E4'},copy:{fontSize:12,color:'#6E5B75'},grid:{flexDirection:'row',flexWrap:'wrap',gap:6},sign:{width:'31%',flexGrow:1,minHeight:61,paddingVertical:9,paddingHorizontal:2,alignItems:'center',justifyContent:'center',gap:6,borderWidth:1,borderColor:'#D5C5DA',borderRadius:14,backgroundColor:'#FBF5EC'},selected:{borderColor:'#77568E',backgroundColor:'#E9DFEE'},signName:{fontSize:12,fontWeight:'600',color:'#594268'},range:{fontSize:9,color:'#7D6B85'},open:{minHeight:48,alignItems:'center',justifyContent:'center',padding:10,borderRadius:16,backgroundColor:'#E8DDEE',borderWidth:1,borderColor:'#BEAACB'},openText:{fontSize:14,fontWeight:'700',color:'#594268'},source:{fontSize:10,lineHeight:18,color:'#796B80'},error:{fontSize:12,lineHeight:20,color:'#A34856'}});
