import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { Icon, IconBadge, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { GameSlot, getSlotConfig } from '@/utils/miniGameUtils';
import { useApp } from '@/contexts/AppContext';
import { Analytics } from '@/utils/analytics';
import { PlayResult, starRating } from '@/utils/rhythm/types';
import { RhythmGameFlow } from '@/components/rhythm/RhythmGameFlow';
import { SkylineRunGame, SkylineRunResult } from '@/components/SkylineRunGame';

interface Props {
  visible: boolean;
  slot: GameSlot;
  onClose: () => void;
  onReward: (reward: { fp?: number; xp?: number; stars?: number }) => void;
}

/** リズムゲームの結果 → 報酬 (既存の報酬水準を維持: ごはん 1〜3pt / XP 0〜10)
 *  ミニゲームの報酬はYOKIポイント(fp)と経験値のみ。光エネルギーは日々の記録から生まれる */
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
  const insets = useSafeAreaInsets();
  const [playing, setPlaying] = useState(false);
  const [choice, setChoice] = useState<GameChoice>('menu');
  const [viewportHeight, setViewportHeight] = useState(0);

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
  const header: { icon: IconName; title: string } = choice === 'runner'
    ? { icon: 'star', title: 'STARLIGHT RUN' }
    : choice === 'rhythm'
      ? { icon: 'music', title: 'リズムであそぼう' }
      : { icon: 'play-circle', title: 'ミニゲーム' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={canClose ? onClose : () => {}}>
      <View
        style={s.overlay}
        onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
      >
        <Pressable style={s.backdrop} onPress={canClose ? onClose : undefined} accessibilityLabel="閉じる" />

        <View
          style={[
            s.sheet,
            {
              // Keep the sheet below the notch and reserve the home-indicator area.
              height: viewportHeight
                ? Math.min(
                    viewportHeight - insets.top,
                    viewportHeight * (choice === 'menu' ? 0.62 : choice === 'runner' ? 0.96 : 0.92),
                  )
                : undefined,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={s.header}>
            <Icon name={header.icon} size={iconSize.lg} color={colors.primaryOnSoft} />
            <Text style={s.headerTitle}>{header.title}</Text>
            {canClose && (
              <PressScale style={s.closeBtn} onPress={onClose} accessibilityLabel="閉じる">
                <Icon name="x" size={iconSize.md} color={colors.foreground} />
              </PressScale>
            )}
          </View>

          {visible && choice === 'menu' && (
            <View style={s.gameList}>
              <Text style={s.listTitle}>今日はどれであそぶ？</Text>
              <Text style={s.listSub}>短い時間でも、ゆっくり楽しめるよ。</Text>
              <PressScale
                testID="mini-game-rhythm"
                style={s.gameCard}
                onPress={() => { setChoice('rhythm'); setPlaying(false); }}
              >
                <IconBadge name="music" />
                <View style={s.gameCardCopy}>
                  <Text style={s.gameCardTitle}>リズムであそぶ</Text>
                  <Text style={s.gameCardDesc}>音楽に合わせてタップ・ジャンプ</Text>
                </View>
                <Icon name="chevron-right" size={iconSize.sm} color={colors.subtleForeground} />
              </PressScale>
              <PressScale
                testID="mini-game-runner"
                style={s.gameCard}
                onPress={() => { setChoice('runner'); setPlaying(true); }}
              >
                <IconBadge name="star" />
                <View style={s.gameCardCopy}>
                  <Text style={s.gameCardTitle}>STARLIGHT RUN</Text>
                  <Text style={s.gameCardDesc}>星の道を走ってキラキラ集め</Text>
                </View>
                <Icon name="chevron-right" size={iconSize.sm} color={colors.subtleForeground} />
              </PressScale>
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
    overflow: 'hidden',
    minHeight: 0,
    flexShrink: 1,
  },
  // ヘッダーは下端の 1px だけで本文と区切る。塗りは他の面と同じ白。
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderBottomWidth: border.width,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.heading, color: colors.foreground, flex: 1 },
  closeBtn: {
    width: control.iconSm,
    height: control.iconSm,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gameList: { padding: space.xl, gap: space.sm },
  listTitle: { ...typography.title, color: colors.foreground, textAlign: 'center' },
  listSub: {
    ...typography.caption,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  gameCard: {
    minHeight: 72,
    borderRadius: radius.lg,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    ...border.hairline,
  },
  gameCardCopy: { flex: 1 },
  gameCardTitle: { ...typography.subhead, color: colors.foreground },
  gameCardDesc: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
});
