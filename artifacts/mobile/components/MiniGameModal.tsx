import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RhythmGameFlow } from '@/components/rhythm/RhythmGameFlow';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { Analytics } from '@/utils/analytics';
import { useReducedMotion } from '@/utils/useReducedMotion';
import type { GameSlot } from '@/utils/miniGameUtils';
import { type PlayResult, starRating } from '@/utils/rhythm/types';
interface Props {
  visible: boolean; slot: GameSlot; onClose: () => void;
  rewardEnabled?: boolean;
  onReward: (reward: { fp: number; stars?: number }, playId: string) => Promise<number>;
}
export function MiniGameModal({ visible, slot, onClose, onReward, rewardEnabled = true }: Props) {
  const { holdLightFlow } = useApp();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const session = useRef(0);
  const rewarded = useRef(false);
  const saving = useRef(false);
  const playId = useRef('');
  const pendingReward = useRef<{ fp: number; stars: number } | null>(null);
  const [rewardFailed, setRewardFailed] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  useEffect(() => {
    ++session.current;
    if (!visible) return;
    rewarded.current = false; saving.current = false; pendingReward.current = null;
    playId.current = `rhythm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setRewardFailed(false); setRewardMessage(''); setEarnedPoints(null); holdLightFlow(true); Analytics.miniGameStarted(slot);
    return () => { ++session.current; holdLightFlow(false); };
  }, [visible, holdLightFlow, slot]);
  const saveReward = async () => {
    if (saving.current || !pendingReward.current) return;
    const startedSession = session.current;
    saving.current = true; setRewardFailed(false);
    try {
      const earned = await onReward(pendingReward.current, playId.current);
      if (session.current !== startedSession) return;
      setEarnedPoints(earned); pendingReward.current = null;
      setRewardMessage(earned > 0 ? `${earned} YOKIポイント。おやつの時間に使えるよ。` : 'いっしょに音楽を楽しめたね。');
    } catch {
      if (session.current !== startedSession) return;
      setRewardFailed(true); setRewardMessage('報酬の保存が完了しませんでした。もう一度確認できます。');
    }
    finally { if (session.current === startedSession) saving.current = false; }
  };
  const result = async (r: PlayResult) => {
    if (rewarded.current) return;
    rewarded.current = true;
    const stars = starRating(r);
    if (rewardEnabled) {
      pendingReward.current = { fp: stars >= 4 ? 3 : stars === 3 ? 2 : 1, stars };
      await saveReward();
    } else setRewardMessage('いっしょに音楽を楽しめたね。');
    Analytics.miniGameCompleted(slot, r.score);
  };
  if (!visible) return null;
  return <Modal visible animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
    <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}><View style={{ flex: 1 }}><Text style={s.title}>ふたりの音楽室</Text><Text style={s.caption}>{rewardMessage || (rewardEnabled ? '音楽を楽しんで、ごはんのポイントに。' : 'この時間のポイントは受取済み。何度でも遊べます。')}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="音楽を止めて部屋へ戻る" onPress={onClose} style={s.close}><Icon name="x" size={23} color="#786081" /></Pressable>
      </View>
      {rewardFailed && <Pressable accessibilityRole="button" onPress={saveReward} style={s.close}><Text>報酬の保存を再試行</Text></Pressable>}
      <RhythmGameFlow earnedPoints={earnedPoints} onResult={result} onClose={onClose} rewardLabel={rewardEnabled ? 'ごはんに使える 1〜3 YOKIポイント' : 'ポイントを使わずに楽しめます'} />
    </View>
  </Modal>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F8F4EF' }, header: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, title: { fontSize: 19, fontWeight: '600', color: '#4B3C52' }, caption: { fontSize: 11, color: '#827287', marginTop: 5, maxWidth: 270, lineHeight: 17 }, close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
