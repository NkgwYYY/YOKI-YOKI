import React,{useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {useBattleTrack} from '@/contexts/BattleMusicContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Button} from '@/components/ui/Button';
import {getPattern} from '@/utils/moyamoyaContent';
import {Enemy} from './Enemy';
import {BattleSoundControl} from './BattleSoundControl';
export function HomeEncounter({enabled,onVisible}:{enabled:boolean;onVisible:(visible:boolean)=>void}){
 const app=useApp(),auth=useAuth(),router=useRouter();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false),alive=useRef(true);
 const encounter=app.getTodayRecord()?.moyamoya?.battle;
 const visible=enabled&&!app.isLoading&&!app.storageError&&!auth.isLoading&&(!auth.isSignedIn||app.cloudSynced)&&!!encounter&&['invited','active'].includes(encounter.status);
 useEffect(()=>{onVisible(visible);return()=>onVisible(false);},[visible,onVisible]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useBattleTrack('encounter',visible);
 const act=async(fight:boolean)=>{
  if(lock.current||!encounter)return;lock.current=true;setBusy(true);setError('');
  try{const result=await app.runMoyamoya({kind:fight?'start':'decline',id:encounter.id});if(fight&&alive.current)router.push({pathname:'/moyamoya-battle',params:{id:result.encounter.id}});}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'保存できませんでした。もう一度お試しください。');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 };
 if(!visible||!encounter)return null;
 const pattern=getPattern(encounter.pattern)!;
 return <BottomSheet visible title={`${pattern.name}が現れた！`} subtitle="今日、記録したモヤモヤから生まれた敵" onClose={()=>void act(false)}>
  <View testID="moyamoya-encounter" style={{alignItems:'center',gap:12}}><Enemy pattern={pattern.id} size={155}/><Text style={{fontSize:15,lineHeight:25,color:'#70567E',textAlign:'center'}}>{pattern.short}。{encounter.status==='active'?'続きから、いっしょに向き合う？':'いっしょに、対処法を考えてみる？'}</Text><BattleSoundControl/></View>
  {!!error&&<Text accessibilityRole="alert" style={{color:'#A34D58'}}>{error}</Text>}
  <Button testID="moyamoya-fight" label={busy?'準備しています…':encounter.status==='active'?'続きから戦う':'戦う'} disabled={busy} onPress={()=>void act(true)}/>
  <Button testID="moyamoya-decline" variant="ghost" label="今日はやめとく" disabled={busy} onPress={()=>void act(false)}/>
  <Text style={{fontSize:11,lineHeight:19,color:'#907C98',textAlign:'center'}}>選ぶヒントを試すミニゲームです。今日は休んでも大丈夫。</Text>
 </BottomSheet>;
}
