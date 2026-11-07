/**
 * RHYTHM COPY — キャラクターがリズムを提示 → ユーザーがまねしてタップ。
 * うまく真似できるとキャラクターが嬉しそうに反応する (コール&レスポンス)。
 * 曲は小さめ音量でBGMとして流し、タイミングの土台にする。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Song, PlayResult, Judgment, Difficulty, SCORE_PER } from '@/utils/rhythm/types';
import { getCopyPhrases } from '@/utils/rhythm/charts';
import { useSongClock } from '@/utils/rhythm/useSongClock';
import { withinTimingWindow, noteHasExpired } from '@/utils/rhythm/judgment';
import { getCopyPhase } from '@/utils/rhythm/copyPhase';
import { RhythmMascot, RhythmMascotHandle } from './RhythmMascot';
import { border, colors, gameSurface, judgePalette } from '@/constants/theme';
import { clamp, measuredOr, useMeasuredSize } from '@/utils/rhythm/geometry';

/* COPYは記憶+再現なので判定窓をさらに優しく */
const COPY_PERFECT_MS = 160;
const COPY_GREAT_MS = 280;
const COPY_GOOD_MS = 420;

interface ExpectedTap {
  time: number;      // 曲頭からの期待タップ時刻 (秒)
  judged: boolean;
  judgment?: Judgment;
}

interface PhraseRun {
  presentStart: number;  // 提示開始 (秒)
  respondStart: number;  // 再現開始 (秒)
  respondEnd: number;    // 再現終了 (秒)
  presentBeats: number[]; // 提示演出の絶対時刻
  taps: ExpectedTap[];
}

interface Props {
  song: Song;
  difficulty: Difficulty;
  onFinish: (result: PlayResult) => void;
  onQuit: () => void;
}

export function RhythmCopyGame({ song, difficulty, onFinish, onQuit }: Props) {
  const clock = useSongClock();
  const mascotRef = useRef<RhythmMascotHandle>(null);
  const [started, setStarted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [phase, setPhase] = useState<'watch' | 'copy' | 'wait'>('wait');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [judge, setJudge] = useState<{ text: string; color: string; key: number } | null>(null);
  const runsRef = useRef<PhraseRun[]>([]);
  const pulsedRef = useRef<Set<string>>(new Set());
  const cheeredRef = useRef<Set<number>>(new Set());
  const countsRef = useRef({ perfect: 0, great: 0, good: 0, miss: 0 });
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const startAtRef = useRef(0);
  const judgeKeyRef = useRef(0);
  const phaseRef = useRef<'watch' | 'copy' | 'wait'>('wait');
  const [rootSize, onRootLayout] = useMeasuredSize();
  const [stageSize, onStageLayout] = useMeasuredSize();

  /* フレーズ定義 → 絶対時刻に展開 */
  useEffect(() => {
    const phrases = getCopyPhrases(song.id, difficulty) ?? [];
    const spb = 60 / song.bpm;
    runsRef.current = phrases.map(ph => {
      const presentStart = song.firstBeat + ph.start * 4 * spb;
      // Match the chart's arithmetic so the first expected tap is not a tiny
      // fraction before the response phase due to floating-point associativity.
      const respondStart = song.firstBeat + (ph.start + ph.len) * 4 * spb;
      return {
        presentStart,
        respondStart,
        respondEnd: respondStart + ph.len * 4 * spb,
        presentBeats: ph.beats.map(b => presentStart + b * spb),
        taps: ph.beats.map(b => ({ time: respondStart + b * spb, judged: false })),
      };
    });
  }, [song, difficulty]);

  const totalNotes = runsRef.current.reduce((s, r) => s + r.taps.length, 0);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clock.stop();
    const c = countsRef.current;
    const total = runsRef.current.reduce((s, r) => s + r.taps.length, 0);
    const result: PlayResult = {
      ...c,
      maxCombo: maxComboRef.current,
      score: scoreRef.current,
      totalNotes: total,
      playTime: Math.round((Date.now() - startAtRef.current) / 1000),
    };
    setTimeout(() => { if (mountedRef.current) onFinish(result); }, 800);
  }, [onFinish, clock]);

  const showJudge = (j: Judgment) => {
    judgeKeyRef.current += 1;
    const map: Record<Judgment, { text: string; color: string }> = {
      perfect: { text: 'ぴったり！', color: judgePalette.perfect },
      great:   { text: 'いいね！',   color: judgePalette.great },
      good:    { text: 'まあまあ',   color: judgePalette.good },
      miss:    { text: 'だいじょうぶ', color: judgePalette.miss },
    };
    setJudge({ ...map[j], key: judgeKeyRef.current });
  };

  const applyJudgment = (tap: ExpectedTap, j: Judgment) => {
    tap.judged = true;
    tap.judgment = j;
    countsRef.current[j] += 1;
    if (j === 'miss') {
      comboRef.current = 0;
    } else {
      scoreRef.current += SCORE_PER[j];
      comboRef.current += 1;
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      setScore(scoreRef.current);
    }
    showJudge(j);
  };

  /* メインループ: 提示演出・フェーズ管理・自動MISS */
  useEffect(() => {
    if (!started) return;
    const loop = () => {
      if (finishedRef.current || !mountedRef.current) return;
      const t = clock.getTime();
      const runs = runsRef.current;

      const { phase: currentPhase, index: currentIdx } = getCopyPhase(runs, t);
      if (currentPhase !== phaseRef.current) { phaseRef.current = currentPhase; setPhase(currentPhase); }
      setPhraseIdx(currentIdx);

      // 提示演出: キャラが「ぽん」とバウンス
      for (let i = 0; i < runs.length; i++) {
        runs[i].presentBeats.forEach((bt, bi) => {
          const key = `${i}-${bi}`;
          if (!pulsedRef.current.has(key) && t >= bt && t < bt + 0.25) {
            pulsedRef.current.add(key);
            mascotRef.current?.pulse();
          }
        });
      }

      // 再現枠を過ぎた未判定タップを自動MISS
      for (const r of runs) {
        for (const tap of r.taps) {
          if (!tap.judged && noteHasExpired(tap.time, t, COPY_GOOD_MS)) applyJudgment(tap, 'miss');
        }
      }

      // フレーズ終了時: 半分以上当てられたら嬉しい反応
      runs.forEach((r, i) => {
        if (!cheeredRef.current.has(i) && t > r.respondEnd + 0.4 && r.taps.every(x => x.judged)) {
          cheeredRef.current.add(i);
          const hits = r.taps.filter(x => x.judgment !== 'miss').length;
          if (hits >= Math.ceil(r.taps.length / 2)) mascotRef.current?.cheer();
        }
      });

      const allDone = runs.length > 0 && runs.every(r => r.taps.every(x => x.judged));
      if (allDone || t >= song.duration - 0.2) { finish(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [started]);

  /* 曲ロード & 再生 (BGMとして小さめ音量) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await clock.load(song.audio, { volume: 0.55 });
      if (cancelled) return;
      clock.setOnFinish(() => finish());
      const ok = await clock.play();
      if (cancelled) return;
      if (ok) { startAtRef.current = Date.now(); setStarted(true); }
      else setNeedsTap(true);
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      finishedRef.current = true;
      clock.setOnFinish(null);
      clock.unload();
    };
  }, []);

  const startByTap = useCallback(async () => {
    const ok = await clock.play();
    if (ok) { setNeedsTap(false); startAtRef.current = Date.now(); setStarted(true); }
  }, [clock]);

  const tap = useCallback(() => {
    if (!started || finishedRef.current) return;
    const t = clock.getTime();
    const active = getCopyPhase(runsRef.current, t);
    if (active.phase !== 'copy') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return; // 提示中のタップはノーカウント
    }
    let best: ExpectedTap | null = null;
    let bestDiff = Infinity;
    for (const et of runsRef.current[active.index].taps) {
      if (et.judged) continue;
      const diff = Math.abs(et.time - t) * 1000;
      if (withinTimingWindow(diff, COPY_GOOD_MS) && diff < bestDiff) { best = et; bestDiff = diff; }
    }
    if (!best) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); return; }
    if (withinTimingWindow(bestDiff, COPY_PERFECT_MS)) {
      applyJudgment(best, 'perfect');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (withinTimingWindow(bestDiff, COPY_GREAT_MS)) {
      applyJudgment(best, 'great');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      applyJudgment(best, 'good');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [started, clock]);

  const phaseLabel = phase === 'watch' ? 'よくきいてね…' : phase === 'copy' ? 'まねしてタップ！' : '…';
  const totalPhrases = runsRef.current.length;
  const rootH = measuredOr(rootSize.height, 440);
  const stageW = measuredOr(stageSize.width, 288);
  const compact = rootH < 500;
  const verticalGap = compact ? 6 : 10;
  const topRowH = compact ? 28 : 32;
  const tapButtonH = compact ? 58 : 74;
  const stageH = clamp(
    rootH - (compact ? 6 : 8) - (compact ? 8 : 14) - topRowH - tapButtonH - 18 - verticalGap * 3,
    180,
    300,
  );
  const mascotSize = Math.min(110, stageW * 0.42, stageH * 0.46);

  return (
    <View
      style={[st.root, {
        paddingTop: compact ? 6 : 8,
        paddingBottom: compact ? 8 : 14,
        gap: verticalGap,
      }]}
      onLayout={onRootLayout}
    >
      <View style={[st.topRow, { minHeight: topRowH }]}>
        <Text style={st.score}>SCORE {score}</Text>
        <Text style={st.phraseCount}>{Math.min(phraseIdx + 1, totalPhrases)}/{totalPhrases}</Text>
      </View>

      <View style={[st.stage, { height: stageH }]} onLayout={onStageLayout}>
        <RhythmMascot ref={mascotRef} song={song} size={mascotSize} />
        <Text style={[st.phaseTxt, phase === 'copy' && st.phaseTxtActive]}>{phaseLabel}</Text>
        {judge && (
          <Text key={judge.key} style={[st.judgeTxt, { color: judge.color }]}>{judge.text}</Text>
        )}
        {needsTap && (
          <Pressable style={st.tapToStart} onPress={startByTap}>
            <Text style={st.tapToStartTxt}>タップしてスタート ▶</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          st.tapBtn,
          { height: tapButtonH },
          phase === 'copy' && st.tapBtnActive,
          pressed && phase === 'copy' && st.tapBtnPressed,
        ]}
        onPressIn={tap}
      >
        <Text style={st.tapBtnTxt}>{phase === 'copy' ? 'タップ！' : 'まってね…'}</Text>
      </Pressable>

      <Pressable onPress={onQuit} hitSlop={8}>
        <Text style={st.quitTxt}>やめる</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, paddingTop: 8, paddingBottom: 14, gap: 10, alignItems: 'stretch', minHeight: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, minHeight: 32 },
  score: { fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground },
  phraseCount: { fontSize: 15, fontFamily: 'Inter_700Bold', color: judgePalette.perfect },
  stage: {
    marginHorizontal: 16, borderRadius: 18,
    backgroundColor: gameSurface.background,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', gap: 14, overflow: 'hidden',
  },
  phaseTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.mutedForeground },
  phaseTxtActive: { color: judgePalette.perfect },
  judgeTxt: { position: 'absolute', top: 18, fontSize: 20, fontFamily: 'Inter_700Bold' },
  tapToStart: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gameSurface.scrim,
  },
  tapToStartTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primaryForeground },
  tapBtn: {
    marginHorizontal: 16, borderRadius: 20,
    backgroundColor: colors.muted, borderWidth: border.width, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tapBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tapBtnPressed: { backgroundColor: 'rgba(124,92,255,0.85)' },
  tapBtnTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primary },
  quitTxt: { textAlign: 'center', fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', paddingTop: 2 },
});
