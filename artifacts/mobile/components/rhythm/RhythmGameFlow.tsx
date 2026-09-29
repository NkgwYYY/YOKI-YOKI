import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Mascot } from '@/components/Mascot';
import { useApp } from '@/contexts/AppContext';
import { getMascotStage } from '@/utils/mascotUtils';
import { Song, Difficulty, RhythmMode, PlayResult, starRating } from '@/utils/rhythm/types';
import {
  activityPalette,
  border,
  colors,
  control,
  judgePalette,
  radius,
  space,
  typography,
} from '@/constants/theme';
import { Button, ButtonRow } from '@/components/ui/Button';
import { Icon, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { SONGS } from '@/utils/rhythm/songs';
import { getChart } from '@/utils/rhythm/charts';
import { useSongClock } from '@/utils/rhythm/useSongClock';
import { useAppActivity } from '@/components/room/useRoomActivity';
import { TapBeatGame } from './TapBeatGame';
import { RhythmJumpGame } from './RhythmJumpGame';
import { RhythmSwipeGame } from './RhythmSwipeGame';
import { RhythmCopyGame } from './RhythmCopyGame';
import { RelaxRhythmGame } from './RelaxRhythmGame';

type Step = 'song' | 'mode' | 'difficulty' | 'playing' | 'result';

const MODES: { id: RhythmMode; title: string; icon: IconName; desc: string; ready: boolean }[] = [
  { id: 'tap',   title: 'TAP BEAT',     icon: 'music',          desc: '4レーンをリズムでタップ', ready: true },
  { id: 'jump',  title: 'RHYTHM JUMP',  icon: 'trending-up',    desc: 'ビートに合わせてキャラがジャンプ', ready: true },
  { id: 'swipe', title: 'RHYTHM SWIPE', icon: 'chevrons-right', desc: 'やじるしの方向にスワイプ', ready: true },
  { id: 'copy',  title: 'RHYTHM COPY',  icon: 'repeat',         desc: 'キャラのリズムをまねっこ', ready: true },
  { id: 'relax', title: 'RHYTHM RELAX', icon: 'wind',           desc: 'ひろがる円をゆったりタップ', ready: true },
];

const DIFFS: { id: Difficulty; label: string; color: string; desc: string }[] = [
  { id: 'easy',   label: 'EASY',   color: judgePalette.great, desc: 'ゆったり楽しむ' },
  { id: 'normal', label: 'NORMAL', color: judgePalette.good,  desc: 'リズムに乗る' },
  { id: 'hard',   label: 'HARD',   color: activityPalette.selfCare, desc: 'ノリノリ挑戦' },
];

/** キャラの優しいコメント (高評価/普通/MISS多め) */
function characterComment(r: PlayResult, mode: RhythmMode): string {
  if (mode === 'relax') return 'いっしょにゆったりできて きもちよかった〜';
  const missRate = r.totalNotes > 0 ? r.miss / r.totalNotes : 0;
  const stars = starRating(r);
  if (mode === 'copy' && stars >= 4) return 'まねっこ、ばっちりだったね！うれしい〜！';
  if (stars >= 4) return 'すごい！きみのリズム、キラキラしてたよ〜！';
  if (missRate > 0.4) return 'いっしょに音楽きけてうれしかった〜。またゆっくりやろうね';
  return 'いいかんじ！つぎはもっと息が合いそうだね〜';
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  onResult: (result: PlayResult) => void; // 結果確定時 (報酬付与用) に一度だけ呼ばれる
  onClose: () => void;
  onBackToList?: () => void;
  rewardLabel?: string | null;
  earnedPoints?: number | null;
  onPlayingChange?: (playing: boolean) => void;
}

export function RhythmGameFlow({ onResult, onClose, onBackToList, rewardLabel, earnedPoints, onPlayingChange }: Props) {
  const [step, setStep] = useState<Step>('song');
  const [song, setSong] = useState<Song | null>(null);
  const [mode, setMode] = useState<RhythmMode>('tap');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [result, setResult] = useState<PlayResult | null>(null);
  const { progress } = useApp();
  const router = useRouter();
  const mascotStage = getMascotStage(progress.level);
  const preview = useSongClock();
  const previewIdRef = useRef<string | null>(null);
  const { active } = useAppActivity();
  const activeRef = useRef(active); activeRef.current = active;
  const [interrupted, setInterrupted] = useState(false);

  useEffect(() => { onPlayingChange?.(step === 'playing'); }, [step]);

  /* 曲選択画面以外では試聴を必ず停止 (戻る/閉じる経路も含めて音が残らないように) */
  useEffect(() => {
    if (step !== 'song') stopPreview();
  }, [step]);

  /* 曲カードタップ → 選択 + プレビュー再生 (サビ付近から小さめ音量) */
  const selectSong = useCallback(async (s: Song) => {
    setSong(s);
    if (previewIdRef.current === s.id) return;
    previewIdRef.current = s.id;
    await preview.load(s.audio, { volume: 0.45, positionMillis: Math.floor(s.duration * 0.35 * 1000) });
    if (previewIdRef.current === s.id) await preview.play();
  }, [preview]);

  const stopPreview = useCallback(() => {
    previewIdRef.current = null;
    preview.unload();
  }, [preview]);

  useEffect(() => {
    if (active) return;
    stopPreview();
    if (step === 'playing') {
      setInterrupted(true);
      setStep('difficulty');
    }
  }, [active, step, stopPreview]);

  useEffect(() => () => { stopPreview(); }, []);

  const chart = useMemo(
    () => (song ? getChart(song.id, mode, difficulty) : null),
    [song, mode, difficulty],
  );

  const handleFinish = useCallback((r: PlayResult) => {
    if (!activeRef.current) return;
    setResult(r);
    setStep('result');
    onResult(r);
  }, [onResult]);

  /* ── 曲選択 ── */
  if (step === 'song') {
    return (
      <ScrollView style={st.scroll} contentContainerStyle={st.body}>
        {onBackToList && (
          <PressScale onPress={onBackToList} hitSlop={8} style={st.listBack}>
            <Icon name="chevron-left" size={iconSize.sm} color={colors.mutedForeground} />
            <Text style={st.listBackTxt}>ミニゲーム一覧</Text>
          </PressScale>
        )}
        <Text style={st.stepTitle}>きょくをえらぼう</Text>
        {SONGS.map((s) => (
          <PressScale
            key={s.id}
            onPress={() => selectSong(s)}
            accessibilityState={{ selected: song?.id === s.id }}
            style={[st.songCard, song?.id === s.id && st.songCardSel]}
          >
            {/* 曲の色は左端の細い帯だけで示す */}
            <View style={[st.songAccent, { backgroundColor: s.accent }]} />
            <Icon name={s.icon} size={iconSize.lg} color={s.accent} style={st.songIcon} />
            <View style={st.songCopy}>
              <Text style={st.songTitle}>{s.title}</Text>
              <Text style={st.songMeta}>
                {s.mood}・{fmtTime(s.duration)}・BPM {Math.round(s.bpm)}
              </Text>
            </View>
            {song?.id === s.id && <Text style={st.songPlaying}>試聴中</Text>}
          </PressScale>
        ))}
        <Button
          label="つぎへ"
          disabled={!song}
          fullWidth
          onPress={() => { stopPreview(); setStep('mode'); }}
        />
      </ScrollView>
    );
  }

  /* ── モード選択 ── */
  if (step === 'mode') {
    return (
      <ScrollView style={st.scroll} contentContainerStyle={st.body}>
        <Text style={st.stepTitle}>あそびかたをえらぼう</Text>
        {MODES.map(m => (
          <PressScale
            key={m.id}
            style={[st.modeCard, mode === m.id && m.ready && st.modeCardSel, !m.ready && st.modeCardLocked]}
            disabled={!m.ready}
            onPress={() => setMode(m.id)}
          >
            <Icon
              name={m.ready ? m.icon : 'lock'}
              size={iconSize.lg}
              color={m.ready ? colors.primaryOnSoft : colors.disabledForeground}
            />
            <View style={st.songCopy}>
              <Text style={[st.modeTitle, !m.ready && st.txtDim]}>{m.title}</Text>
              <Text style={[st.modeDesc, !m.ready && st.txtDim]}>{m.desc}</Text>
            </View>
          </PressScale>
        ))}
        <ButtonRow>
          <Button label="もどる" variant="outline" onPress={() => setStep('song')} />
          <Button label="つぎへ" onPress={() => setStep('difficulty')} style={st.grow} />
        </ButtonRow>
      </ScrollView>
    );
  }

  /* ── 難易度選択 ── */
  if (step === 'difficulty') {
    return (
      <ScrollView style={st.scroll} contentContainerStyle={st.body}>
        <Text style={st.stepTitle}>むずかしさをえらぼう</Text>
        {interrupted && <Text accessibilityRole="alert" style={st.subTitle}>演奏を中断しました。もう一度はじめられます。</Text>}
        <Text style={st.subTitle}>{song?.title} / {MODES.find(m => m.id === mode)?.title}</Text>
        {DIFFS.map(d => {
          const c = song ? getChart(song.id, mode, d.id) : null;
          return (
            <PressScale
              key={d.id}
              style={[st.diffCard, { borderColor: d.color }, difficulty === d.id && { backgroundColor: d.color + '18' }]}
              accessibilityState={{ selected: difficulty === d.id }}
              onPress={() => setDifficulty(d.id)}
            >
              <Text style={[st.diffLabel, { color: d.color }]}>{d.label}</Text>
              <Text style={st.diffDesc}>{d.desc}{c ? `・${c.notes.length}ノーツ` : ''}</Text>
            </PressScale>
          );
        })}
        {rewardLabel ? <Text style={st.rewardHint}>{rewardLabel}</Text> : null}
        <ButtonRow>
          <Button label="もどる" variant="outline" onPress={() => setStep('mode')} />
          <Button label="START" icon="play" onPress={() => { setInterrupted(false); setStep('playing'); }} style={st.grow} />
        </ButtonRow>
      </ScrollView>
    );
  }

  /* ── プレイ中 ── */
  if (step === 'playing' && song && chart) {
    const gameProps = { song, chart, onFinish: handleFinish, onQuit: () => setStep('difficulty') };
    if (mode === 'jump') return <RhythmJumpGame {...gameProps} />;
    if (mode === 'swipe') return <RhythmSwipeGame {...gameProps} />;
    if (mode === 'copy') {
      return (
        <RhythmCopyGame
          song={song}
          difficulty={difficulty}
          onFinish={handleFinish}
          onQuit={() => setStep('difficulty')}
        />
      );
    }
    if (mode === 'relax') return <RelaxRhythmGame {...gameProps} />;
    return <TapBeatGame {...gameProps} />;
  }

  /* ── 結果 ── */
  if (step === 'result' && result) {
    const stars = starRating(result);
    const isRelax = mode === 'relax';
    return (
      <ScrollView style={st.scroll} contentContainerStyle={st.body}>
        {isRelax ? (
          <>
            <Text style={st.resultScoreLabel}>おつかれさま</Text>
            <Text style={st.relaxDone}>こころが ととのった</Text>
          </>
        ) : (
          <>
            <Text style={st.resultScoreLabel}>SCORE</Text>
            <Text style={st.resultScore}>{result.score}</Text>
            <View style={st.judgeGrid}>
              <Text style={[st.judgeCell, { color: colors.primary }]}>
                PERFECT {result.perfect}
              </Text>
              <Text style={[st.judgeCell, { color: colors.success }]}>GREAT {result.great}</Text>
              <Text style={[st.judgeCell, { color: activityPalette.journal }]}>
                GOOD {result.good}
              </Text>
              <Text style={[st.judgeCell, { color: colors.mutedForeground }]}>
                MISS {result.miss}
              </Text>
            </View>
            <Text style={st.resultMeta}>MAX COMBO {result.maxCombo}・プレイ時間 {fmtTime(result.playTime)}</Text>
          </>
        )}
        <Text style={st.starsLabel}>今日のリズム</Text>
        <View style={st.starRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon
              key={i}
              name="star"
              size={iconSize.lg}
              color={i < stars ? colors.primary : colors.border}
            />
          ))}
        </View>
        {earnedPoints != null && earnedPoints > 0 ? (
          <View style={st.energyRow}><View style={st.energyChip}>
            <Icon name="coffee" size={iconSize.xs} color={colors.foreground} />
            <Text style={[st.energyChipTxt, { color: colors.foreground }]}>YOKIポイント +{earnedPoints}</Text>
          </View></View>
        ) : null}
        <View style={st.resultMascotRow}>
          <Mascot stage={mascotStage} mood={stars >= 4 ? 'excited' : 'happy'} size={64} />
          <View style={[st.commentBubble, st.commentBubbleInline]}>
            <Text style={st.commentTxt}>{characterComment(result, mode)}</Text>
          </View>
        </View>
        {/* 循環の導線: YOKIポイント → ごはんをあげる(ホームへ) */}
        <Button
          label="部屋に戻って、ひと休み"
          icon="coffee"
          variant="secondary"
          fullWidth
          onPress={() => { onClose(); router.push('/(tabs)'); }}
        />
        <Button label="とじる" variant="outline" fullWidth onPress={onClose} />
      </ScrollView>
    );
  }

  return null;
}

const st = StyleSheet.create({
  scroll: { flex: 1 },
  body: { padding: space.xl, gap: space.sm, alignItems: 'stretch' },
  stepTitle: { ...typography.heading, color: colors.foreground, textAlign: 'center' },
  grow: { flex: 1 },
  listBack: {
    alignSelf: 'flex-start',
    minHeight: control.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  listBackTxt: { ...typography.label, color: colors.mutedForeground },
  subTitle: { ...typography.label, color: colors.mutedForeground, textAlign: 'center' },

  /* 曲 */
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    padding: space.lg,
    backgroundColor: colors.card,
    ...border.hairline,
    overflow: 'hidden',
  },
  songCardSel: { borderColor: colors.primary },
  songAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  songIcon: { marginLeft: space.xs },
  songCopy: { flex: 1 },
  songTitle: { ...typography.subhead, color: colors.foreground },
  songMeta: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  songPlaying: { ...typography.micro, color: colors.primaryOnSoft },

  /* モード */
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    padding: space.lg,
    backgroundColor: colors.card,
    ...border.hairline,
  },
  modeCardSel: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  modeCardLocked: { opacity: 0.5 },
  modeTitle: { ...typography.subhead, color: colors.foreground },
  modeDesc: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  txtDim: { color: colors.disabledForeground },

  /* 難易度 */
  diffCard: {
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: border.width,
    backgroundColor: colors.card,
  },
  diffLabel: { ...typography.subhead },
  diffDesc: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  rewardHint: { ...typography.caption, color: colors.mutedForeground, textAlign: 'center' },

  /* 結果 */
  resultScoreLabel: { ...typography.label, color: colors.mutedForeground, textAlign: 'center' },
  resultScore: {
    fontSize: 40,
    lineHeight: 48,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    textAlign: 'center',
  },
  judgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.md,
  },
  judgeCell: { ...typography.calloutStrong },
  resultMeta: { ...typography.label, color: colors.mutedForeground, textAlign: 'center' },
  starsLabel: { ...typography.label, color: colors.mutedForeground, textAlign: 'center' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  relaxDone: { ...typography.title, color: colors.success, textAlign: 'center' },
  refreshTag: { ...typography.label, color: colors.success, textAlign: 'center' },
  energyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.sm,
  },
  energyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
  },
  energyChipTxt: { ...typography.label },
  resultMascotRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  commentBubble: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: space.lg,
  },
  commentTxt: { ...typography.body, color: colors.foreground, textAlign: 'center' },
  commentBubbleInline: { flex: 1 },
});
