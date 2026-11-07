import React, {useEffect, useRef, useState} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {useCommunity} from '@/contexts/CommunityContext';
import {useDailyRewardService} from '@/contexts/DailyAdsContext';
import {canShowRewardedAd} from '@/utils/community/commerce';
import {rewardAvailability} from '@/utils/rewardAvailability';
import {FP_PER_MOOD_RECORD} from '@/data/foodItems';
import {DAILY_AD_POINTS, DAILY_AD_LIMIT, type DailyAdEnvironment, type DailyAdPlacement} from '@/utils/dailyAdPlacements';
import {DailyAdRewardButton} from './DailyAdPlacements';
import {WorldPill} from '@/components/world/WorldPill';

/** The points sheet stays informative even when the ad SDK/server is unavailable. */
export function PointsRewardPanel({placement, environment, onNavigate}: {
  placement: DailyAdPlacement; environment: DailyAdEnvironment; onNavigate(): void;
}) {
  const app = useApp(), auth = useAuth(), community = useCommunity(), router = useRouter();
  const {service, snapshot} = useDailyRewardService();
  const [retrying, setRetrying] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; void service.refresh(); return () => {alive.current = false;}; }, [service]);
  const status = rewardAvailability({native: Platform.OS !== 'web',
    loading: app.isLoading || auth.isLoading || app.isCloudSyncing || (!!auth.user && !app.cloudSynced),
    age: app.profile?.ageRange, configured: canShowRewardedAd(), enabled: !!community.config?.enabled,
    ads: !!community.config?.ads, policy: community.config?.rewardPolicy, points: community.config?.bonusPoints,
    serviceReady: snapshot.ready && snapshot.rewardedAvailable});
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try { await community.reloadConfig(); await service.refresh(); } catch { /* Status remains unavailable; no optimistic reward. */ }
    finally { if (alive.current) setRetrying(false); }
  };
  return <View testID="points-reward-panel" style={styles.panel}>
    <Text style={styles.title}>広告でポイントを受け取る</Text>
    {status === 'ready' ? <>
      <Text style={styles.copy}>視聴完了で{DAILY_AD_POINTS}pt。1日{DAILY_AD_LIMIT}回まで、少しずつ貯められます。</Text>
      <DailyAdRewardButton placement={placement} environment={environment}/>
    </> : <>
      <Text testID="points-reward-availability" accessibilityLiveRegion="polite" style={styles.copy}>{
        status === 'web' ? '広告特典はアプリ版で利用できます。' :
        status === 'loading' ? 'データを準備しています。準備ができると広告特典を表示します。' :
        status === 'age-unknown' ? '広告特典は20歳以上が対象です。プロフィールで年代を設定すると利用状況を確認できます。' :
        status === 'age-ineligible' ? '現在のプロフィールでは広告特典をご利用いただけません。' :
        'いまは広告を用意できません。時間をおいて、もう一度お試しください。'
      }</Text>
      {status === 'age-unknown' && <WorldPill label="プロフィールを確認" icon="user" onPress={() => {onNavigate(); router.push('/profile');}}/>}
      {status === 'unavailable' && <WorldPill label={retrying ? '確認しています…' : 'もう一度確認'} icon="refresh-cw" disabled={retrying} onPress={() => void retry()}/>}
    </>}
    <Text style={styles.detail}>視聴は任意です。今日の記録でも1日1回、{FP_PER_MOOD_RECORD}ptを受け取れます。</Text>
  </View>;
}
const styles = StyleSheet.create({
  panel: {padding:16, gap:10, borderRadius:18, backgroundColor:'#F0E8F5', marginVertical:12},
  title: {fontSize:16, lineHeight:24, fontWeight:'600', color:'#65516F'},
  copy: {fontSize:13, lineHeight:22, color:'#65516F'},
  detail: {fontSize:12, lineHeight:20, color:'#7F6D5D'},
});
