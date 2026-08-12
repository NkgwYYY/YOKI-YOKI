/**
 * 光の循環演出の常駐ホスト。
 * タブレイアウト直下にマウントされ、どのタブにいても
 * ユーザー操作による光エネルギー獲得(lightGainEvent)を演出として表示する。
 * クラウド同期・読込・日付リセットではイベント自体が発行されないため誤演出は起きない。
 */
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { LightFlowEffect } from '@/components/LightFlowEffect';

export function LightFlowHost() {
  const { lightGainEvent } = useApp();
  const router = useRouter();
  const [flow, setFlow] = useState<{ amount: number } | null>(null);
  // マウント時点で既に存在していたイベントは再生しない
  const seenSeqRef = useRef<number>(lightGainEvent?.seq ?? 0);

  useEffect(() => {
    if (!lightGainEvent || lightGainEvent.seq === seenSeqRef.current) return;
    seenSeqRef.current = lightGainEvent.seq;
    setFlow({ amount: lightGainEvent.amount });
  }, [lightGainEvent]);

  if (!flow) return null;
  return (
    <LightFlowEffect
      amount={flow.amount}
      onDone={() => setFlow(null)}
      onGoPlant={() => router.push('/(tabs)/plant')}
    />
  );
}
