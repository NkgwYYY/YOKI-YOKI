import React,{useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {getTodayDate} from '@/utils/dateUtils';
import {homeBattleEntry} from '@/utils/homeBattleEntry';
import {WorldPill} from '@/components/world/WorldPill';

export function HomeBattleButton({enabled}:{enabled:boolean}){
  const app=useApp(),auth=useAuth(),router=useRouter(),lock=useRef(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const entry=homeBattleEntry(app.getTodayRecord(),getTodayDate());
  const current=useRef({owner:auth.user?.id??'guest',id:entry?.id,enabled});
  current.current={owner:auth.user?.id??'guest',id:entry?.id,enabled};
  if(!entry||app.isLoading||app.storageError||auth.isLoading||(auth.isSignedIn&&!app.cloudSynced))return null;
  const open=async()=>{
    if(lock.current||!enabled)return;
    const starting=current.current;lock.current=true;setBusy(true);setError('');
    try{
      const next=await app.runMoyamoya({kind:'start',id:entry.id});
      if(current.current.owner===starting.owner&&current.current.id===starting.id&&current.current.enabled&&next.encounter.status==='active')router.push({pathname:'/moyamoya-battle',params:{id:next.encounter.id}});
    }catch{if(current.current.owner===starting.owner)setError('開けませんでした。もう一度お試しください。');}
    finally{lock.current=false;setBusy(false);}
  };
  return <View style={{alignItems:'center',gap:5,maxWidth:'100%'}}>
    <WorldPill testID="home-moyamoya-battle" label={busy?'準備しています…':entry.label} icon="cloud" disabled={!enabled||busy} onPress={()=>void open()} style={{borderColor:'#DBCEE4',backgroundColor:'#FBF5FBEF'}}/>
    {!!error&&<Text accessibilityRole="alert" style={{fontSize:11,color:'#984F62',backgroundColor:'#FFF9F0',padding:6,borderRadius:8}}>{error}</Text>}
  </View>;
}
