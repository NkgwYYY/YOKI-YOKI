import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RhythmGameFlow } from '@/components/rhythm/RhythmGameFlow';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { Analytics } from '@/utils/analytics';
import type { GameSlot } from '@/utils/miniGameUtils';
import { type PlayResult, starRating } from '@/utils/rhythm/types';
interface Props {
  visible: boolean; slot: GameSlot; onClose: () => void;
  rewardEnabled?: boolean;
  onReward: (reward: { fp?: number; xp?: number; stars?: number }) => void | Promise<void>;
}
export function MiniGameModal({ visible, slot, onClose, onReward, rewardEnabled = true }: Props) {
  const { holdLightFlow } = useApp();
  const insets = useSafeAreaInsets();
  const rewarded = useRef(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  useEffect(() => {
    if (!visible) return;
    rewarded.current = false; setRewardMessage(''); setEarnedPoints(null); holdLightFlow(true); Analytics.miniGameStarted(slot);
    return () => holdLightFlow(false);
  }, [visible, holdLightFlow, slot]);
  const result = async (r: PlayResult) => {
    if (rewarded.current) return;
    rewarded.current = true;
    const stars = starRating(r);
    try {
      if (rewardEnabled) {
        const fp = stars >= 4 ? 3 : stars === 3 ? 2 : 1;
        await onReward({ fp, stars });
        setEarnedPoints(fp);
        setRewardMessage(`${fp} YOKIポイント。おやつの時間に使えるよ。`);
      } else setRewardMessage('いっしょに音楽を楽しめたね。');
    } catch { setRewardMessage('報酬を保存できませんでした。通信と保存状態を確認してください。'); }
    Analytics.miniGameCompleted(slot, r.score);
  };
  if (!visible) return null;
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}><View><Text style={s.title}>ふたりの音楽室</Text><Text style={s.caption}>{rewardMessage || (rewardEnabled ? '音楽を楽しんで、ごはんのポイントに。' : 'この時間のポイントは受取済み。何度でも遊べます。')}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="音楽を止めて部屋へ戻る" onPress={onClose} style={s.close}><Icon name="x" size={23} color="#786081" /></Pressable>
      </View>
      <RhythmGameFlow earnedPoints={earnedPoints} onResult={result} onClose={onClose} rewardLabel={rewardEnabled ? 'ごはんに使える 1〜3 YOKIポイント' : 'ポイントを使わずに楽しめます'} />
    </View>
  </Modal>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F8F4EF' }, header: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, title: { fontSize: 19, fontWeight: '600', color: '#4B3C52' }, caption: { fontSize: 11, color: '#827287', marginTop: 5, maxWidth: 270, lineHeight: 17 }, close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
