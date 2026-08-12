import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COSMIC_SHEET } from '@/constants/cosmicTheme';
import { GameSlot, getSlotConfig } from '@/utils/miniGameUtils';
import { useApp } from '@/contexts/AppContext';
import { Analytics } from '@/utils/analytics';
import { PlayResult, starRating } from '@/utils/rhythm/types';
import { RhythmGameFlow } from '@/components/rhythm/RhythmGameFlow';

const { height: SH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  slot: GameSlot;
  onClose: () => void;
  onReward: (reward: { fp?: number; xp?: number; stars?: number }) => void;
}

/** リズムゲームの結果 → 報酬 (既存の報酬水準を維持: 🪙1〜3pt / ✨XP 0〜10)
 *  ミニゲームの報酬はごはんポイント(fp)と経験値のみ。光エネルギーは日々の記録から生まれる */
function resultToReward(r: PlayResult): { fp: number; xp?: number; stars: number } {
  const stars = starRating(r);
  if (stars >= 4) return { fp: 3, xp: 10, stars };
  if (stars === 3) return { fp: 2, xp: 5, stars };
  return { fp: 1, stars };
}

export function MiniGameModal({ visible, slot, onClose, onReward }: Props) {
  const cfg = getSlotConfig(slot);
  const { holdLightFlow } = useApp();
  const [playing, setPlaying] = useState(false);

  // モーダル表示中は光の循環演出を保留(閉じた瞬間にタブ画面上で再生される)
  useEffect(() => {
    if (!visible) return;
    holdLightFlow(true);
    return () => holdLightFlow(false);
  }, [visible, holdLightFlow]);
  const [flowKey, setFlowKey] = useState(0);
  const rewardedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      rewardedRef.current = false;
      setPlaying(false);
      setFlowKey(k => k + 1); // 開くたびにフローを最初から
      Analytics.miniGameStarted(slot);
    }
  }, [visible]);

  const handleResult = useCallback((r: PlayResult) => {
    if (rewardedRef.current) return; // 報酬は1プレイ1回だけ
    rewardedRef.current = true;
    onReward(resultToReward(r));
    Analytics.miniGameCompleted(slot, r.score);
  }, [onReward, slot]);

  // プレイ中は閉じられない (誤タップで曲が中断しないように)
  const canClose = !playing;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={canClose ? onClose : () => {}}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={canClose ? onClose : undefined} />

        <View style={[s.sheet, { backgroundColor: COSMIC_SHEET }]}>
          <LinearGradient colors={cfg.gradient} style={s.header}>
            <Text style={s.headerEmoji}>🎵</Text>
            <Text style={s.headerTitle}>リズムであそぼう</Text>
            {canClose && (
              <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {visible && (
            <RhythmGameFlow
              key={flowKey}
              onResult={handleResult}
              onClose={onClose}
              rewardLabel={cfg.rewardLabel}
              onPlayingChange={setPlaying}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    minHeight: SH * 0.62, maxHeight: SH * 0.92,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 20, paddingTop: 24,
  },
  headerEmoji: { fontSize: 26 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF', flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
});
