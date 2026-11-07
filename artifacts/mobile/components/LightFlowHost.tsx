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
import { useAppActivity } from '@/components/room/useRoomActivity';

export function LightFlowHost() {
  const { lightGainEvent } = useApp();
  const router = useRouter();
  const { active, reduceMotion } = useAppActivity();
  // 表示中に次のイベントが来ても失われないよう、キューで順番に再生する。
  // key に seq を使い、イベントごとに演出を確実に再マウントする
  const [queue, setQueue] = useState<{ amount: number; seq: number }[]>([]);
  // マウント時点で既に存在していたイベントは再生しない
  const seenSeqRef = useRef<number>(lightGainEvent?.seq ?? 0);

  useEffect(() => {
    if (!lightGainEvent || lightGainEvent.seq <= seenSeqRef.current) return;
    seenSeqRef.current = lightGainEvent.seq;
    setQueue((q) => [...q, lightGainEvent]);
  }, [lightGainEvent]);

  const current = queue[0];
  if (!current || !active) return null;
  return (
    <LightFlowEffect
      key={current.seq}
      amount={current.amount}
      reduceMotion={reduceMotion}
      onDone={() => setQueue((q) => q[0]?.seq === current.seq ? q.slice(1) : q)}
      onGoPlant={() => router.push('/(tabs)/plant')}
    />
  );
}
