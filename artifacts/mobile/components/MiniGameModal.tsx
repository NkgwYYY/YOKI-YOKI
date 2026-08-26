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
import { SkylineRunGame, SkylineRunResult } from '@/components/SkylineRunGame';

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

function runnerResultToReward(r: SkylineRunResult): { fp: number; xp?: number; stars: number } {
  const ratio = r.totalSparks > 0 ? r.collected / r.totalSparks : 0;
  if (ratio >= 0.8) return { fp: 3, xp: 10, stars: 5 };
  if (ratio >= 0.45) return { fp: 2, xp: 5, stars: 4 };
  return { fp: 1, stars: 3 };
}

type GameChoice = 'menu' | 'rhythm' | 'runner';

export function MiniGameModal({ visible, slot, onClose, onReward }: Props) {
  const cfg = getSlotConfig(slot);
  const { holdLightFlow } = useApp();
  const [playing, setPlaying] = useState(false);
  const [choice, setChoice] = useState<GameChoice>('menu');

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
      setChoice('menu');
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

  const handleRunnerFinish = useCallback((result: SkylineRunResult) => {
    if (rewardedRef.current) return;
    rewardedRef.current = true;
    onReward(runnerResultToReward(result));
    Analytics.miniGameCompleted(slot, result.score);
  }, [onReward, slot]);

  // プレイ中は閉じられない (誤タップで曲が中断しないように)
  const canClose = !playing;
  const header = choice === 'runner'
    ? { emoji: '🌟', title: 'STARLIGHT RUN' }
    : choice === 'rhythm'
      ? { emoji: '🎵', title: 'リズムであそぼう' }
      : { emoji: '✨', title: 'ミニゲーム' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={canClose ? onClose : () => {}}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={canClose ? onClose : undefined} />

        <View style={[s.sheet, choice === 'runner' && s.runnerSheet, { backgroundColor: COSMIC_SHEET }]}>
          <LinearGradient colors={cfg.gradient} style={s.header}>
            <Text style={s.headerEmoji}>{header.emoji}</Text>
            <Text style={s.headerTitle}>{header.title}</Text>
            {canClose && (
              <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {visible && choice === 'menu' && (
            <View style={s.gameList}>
              <Text style={s.listTitle}>今日はどれであそぶ？</Text>
              <Text style={s.listSub}>短い時間でも、ゆっくり楽しめるよ。</Text>
              <TouchableOpacity
                testID="mini-game-rhythm"
                style={s.gameCard}
                onPress={() => { setChoice('rhythm'); setPlaying(false); }}
                activeOpacity={0.86}
              >
                <LinearGradient colors={['#6B4CC5', '#3C8FCE']} style={s.gameCardIcon}>
                  <Text style={s.gameCardEmoji}>🎵</Text>
                </LinearGradient>
                <View style={s.gameCardCopy}>
                  <Text style={s.gameCardTitle}>リズムであそぶ</Text>
                  <Text style={s.gameCardDesc}>音楽に合わせてタップ・ジャンプ</Text>
                </View>
                <Text style={s.gameCardArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="mini-game-runner"
                style={s.gameCard}
                onPress={() => { setChoice('runner'); setPlaying(true); }}
                activeOpacity={0.86}
              >
                <LinearGradient colors={['#9B72CB', '#F49AC2']} style={s.gameCardIcon}>
                  <Text style={s.gameCardEmoji}>🌟</Text>
                </LinearGradient>
                <View style={s.gameCardCopy}>
                  <Text style={s.gameCardTitle}>STARLIGHT RUN</Text>
                  <Text style={s.gameCardDesc}>星の道を走ってキラキラ集め</Text>
                </View>
                <Text style={s.gameCardArrow}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {visible && choice === 'rhythm' && (
            <RhythmGameFlow
              key={flowKey}
              onResult={handleResult}
              onClose={onClose}
              onBackToList={() => { setChoice('menu'); setPlaying(false); }}
              rewardLabel={cfg.rewardLabel}
              onPlayingChange={setPlaying}
            />
          )}

          {visible && choice === 'runner' && (
            <SkylineRunGame
              key={flowKey}
              onFinish={handleRunnerFinish}
              onQuit={() => { setChoice('menu'); setPlaying(false); }}
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
  runnerSheet: { minHeight: SH * 0.9, maxHeight: SH * 0.96 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 20, paddingTop: 24,
  },
  headerEmoji: { fontSize: 26 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF', flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  gameList: { padding: 22, gap: 9 },
  listTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'center', marginTop: 2 },
  listSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 8 },
  gameCard: { minHeight: 76, borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  gameCardIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gameCardEmoji: { fontSize: 27 },
  gameCardCopy: { flex: 1 },
  gameCardTitle: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
  gameCardDesc: { color: 'rgba(255,255,255,0.62)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  gameCardArrow: { color: 'rgba(255,255,255,0.65)', fontSize: 28, fontFamily: 'Inter_400Regular', paddingHorizontal: 4 },
});
