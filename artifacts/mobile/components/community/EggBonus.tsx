import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {useRouter} from 'expo-router';
import {useCommunity} from '@/contexts/CommunityContext';
import {useDailyRewardService} from '@/contexts/DailyAdsContext';
import {WorldPill} from '@/components/world/WorldPill';
import {canBuyPass, adPrivacyOptions} from '@/utils/community/commerce';
import {dailyAdResultMessage} from '@/utils/dailyAdPlacements';
import type {EggReceipt} from '@/utils/eggJob';

export function EggBonus({receipt, onBusy}: {receipt: EggReceipt; onBusy: (busy: boolean) => void}) {
  const {config} = useCommunity(), {service, snapshot} = useDailyRewardService(), router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [received, setReceived] = useState(false);
  const lock = useRef(false), alive = useRef(true), session = useRef(snapshot.sessionKey);
  session.current = snapshot.sessionKey;
  useEffect(() => { alive.current = true; return () => { alive.current = false; onBusy(false); }; }, [onBusy]);
  useEffect(() => { setReceived(false); setMessage(''); }, [receipt.id, snapshot.sessionKey]);
  const pass = snapshot.removePassiveAds;
  if (!config?.enabled || receipt.earned <= 0 || !(snapshot.rewardedAvailable || pass || canBuyPass())) return null;
  const take = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); onBusy(true); setMessage('');
    const started = session.current;
    try {
      const result = await service.watchEgg(receipt.id);
      if (alive.current && started === session.current) {
        setReceived(result.status === 'verified'); setMessage(dailyAdResultMessage(result));
      }
    } finally { lock.current = false; if (alive.current) { setBusy(false); onBusy(false); } }
  };
  const disabled = received || busy || !snapshot.ready || snapshot.remaining===null || snapshot.remaining===0 || snapshot.phase!=='idle';
  return <View testID="egg-job-bonus" style={s.box}>
    <Text style={s.title}>もうひとつ、おまけ</Text>
    <Text style={s.copy}>{pass ? 'パスで広告なし。' : '広告の視聴完了で、'}＋30 pt。1日3回・全画面で共通{snapshot.remaining===null?'':`　あと${snapshot.remaining}回`}</Text>
    <WorldPill label={received?'おまけを受け取りました':busy||snapshot.phase!=='idle'?'おまけを確認しています…':snapshot.remaining===0?'今日のおまけはおしまい':pass?'パスで ＋30 pt を受け取る':'広告を見て ＋30 pt'} icon={received?'check':pass?'gift':'play'} disabled={disabled} onPress={()=>void take()}/>
    <Text style={s.copy}>お給料は受け取り済み。そのまま次の注文にも進めます。</Text>
    {!!message&&<Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
    <View style={s.links}>
      {!!config.passSales&&canBuyPass()&&!pass&&<Pressable accessibilityRole="button" onPress={()=>router.push('/workshop-pass')}><Text style={s.link}>広告なしのおまけパス</Text></Pressable>}
      {snapshot.rewardedAvailable&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void adPrivacyOptions().then(()=>service.refresh()).catch(()=>setMessage('広告設定は現在変更できません。'))}><Text style={s.link}>広告のプライバシー設定</Text></Pressable>}
    </View>
  </View>;
}
const s=StyleSheet.create({box:{gap:10,paddingTop:14,borderTopWidth:1,borderColor:'#C9AF8355'},title:{color:'#F3DFBB',fontSize:14,fontWeight:'600'},copy:{color:'#CDBED5',fontSize:11,lineHeight:18},message:{color:'#F5DDB1',fontSize:12,lineHeight:20},links:{gap:14,paddingTop:3},link:{color:'#D8C3E8',fontSize:11,textDecorationLine:'underline',paddingVertical:6}});
