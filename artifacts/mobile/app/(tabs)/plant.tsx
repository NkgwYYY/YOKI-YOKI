import React, {useRef, useState} from 'react';
import {StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {getMascotStage} from '@/utils/mascotUtils';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import {EnergyWorld} from '@/components/world/EnergyWorld';
import {Button} from '@/components/ui/Button';
import {getTabBarHeight} from '@/utils/tabLayout';

export default function EnergyChargeScreen() {
  const insets=useSafeAreaInsets();
  const {width,height}=useWindowDimensions();
  const wide=width>height;
  const {active,reduceMotion}=useRoomActivity();
  const {lightEnergy,powerPlant,receiveGardenReward,progress,getTodayRecord}=useApp();
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const [message,setMessage]=useState('');
  const energy=Math.floor(lightEnergy.storedEnergy);
  const reward=energy+powerPlant.ecoPoints;
  const receive = async () => {
    if (lock.current || reward <= 0) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const { received } = await receiveGardenReward();
      setMessage(received > 0 ? `${received}ポイント。次のおやつに使おう。` : '受け取り状況を確認しました。');
    } catch { setMessage('保存が完了しませんでした。もう一度押すと、受け取り状況を確認して再開します。'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={s.root}>
    <EnergyWorld energy={energy} genki={lightEnergy.genki} stage={getMascotStage(progress.level)} mood={(getTodayRecord()?.mood??3)<=2?'sleepy':'happy'} active={active} reduceMotion={reduceMotion}/>
    <View pointerEvents="none" style={[s.header,{top:insets.top+18}]}>
      <Text style={s.title}>ひかりの庭</Text>
      <Text style={s.subtitle}>きょうのひとこまが、この場所を照らす。</Text>
    </View>
    <View style={[s.footer,{left:(width-Math.min(width-48,440))/2,width:Math.min(width-48,440),bottom:getTabBarHeight('',insets.bottom)+8},wide&&{left:width*.65,width:width*.32,bottom:getTabBarHeight('',insets.bottom)+42}]}>
      <Text testID="energy-message" accessibilityLiveRegion="polite" style={s.message}>{message||(reward>0?'この子と育てたひかりを、次のおやつに。':'ここにいる間も、ひかりは少しずつ。')}</Text>
      <Button testID="energy-receive" label={reward>0?`${reward} ポイントを受け取る`:'ひかりが育つのを待とう'} disabled={busy||reward<=0} loading={busy} onPress={receive} style={{backgroundColor:reward>0?'#E7EBCC':'#28453A'}} labelStyle={{color:reward>0?'#344939':'#D0DECB'}} fullWidth/>
    </View>
  </View>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#23382F'},header:{position:'absolute',left:22,right:22},
  title:{fontSize:22,fontWeight:'600',color:'#FFF4DD',letterSpacing:2,textShadowColor:'#193229',textShadowRadius:7},
  subtitle:{fontSize:11,lineHeight:18,color:'#E7EACB',marginTop:8,textShadowColor:'#193229',textShadowRadius:6},
  footer:{position:'absolute',left:24,right:24,gap:10,maxWidth:440,alignSelf:'center'},
  message:{fontSize:12,lineHeight:19,color:'#F0F1D9',textAlign:'center',textShadowColor:'#193229',textShadowRadius:8},
});
