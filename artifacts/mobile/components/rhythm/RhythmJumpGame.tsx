/**
 * RHYTHM JUMP — ビートに合わせてタップするとキャラクターがジャンプ。
 * PERFECT=高く / GREAT=普通 / GOOD=少し遅れ気味の低いジャンプ。
 * MISSしても落ち込み演出はなし (優しい世界)。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Song, Chart, Note, PlayResult, Judgment,
  JUDGE_PERFECT_MS, JUDGE_GREAT_MS, JUDGE_GOOD_MS, SCORE_PER,
} from '@/utils/rhythm/types';
import { useSongClock } from '@/utils/rhythm/useSongClock';
import { RhythmMascot, RhythmMascotHandle } from './RhythmMascot';
import { border, colors, gameSurface, judgePalette } from '@/constants/theme';

const { width: SW } = Dimensions.get('window');
const TRAVEL_S = 1.9; // ノーツが右→判定リングまで流れる秒数
const RENDER_FRAME_MS = 1000 / 30;

const MISS_LABELS = ['だいじょうぶ', 'つぎいこう', 'どんまい', 'ゆっくりでOK'];
const JUDGE_STYLE: Record<Judgment, { text: string; color: string }> = {
  perfect: { text: 'PERFECT', color: judgePalette.perfect },
  great:   { text: 'GREAT',   color: judgePalette.great },
  good:    { text: 'GOOD',    color: judgePalette.good },
  miss:    { text: '',        color: judgePalette.miss },
};

interface LiveNote extends Note { id: number; judged: boolean }

interface Props {
  song: Song;
  chart: Chart;
  onFinish: (result: PlayResult) => void;
  onQuit: () => void;
}

export function RhythmJumpGame({ song, chart, onFinish, onQuit }: Props) {
  const clock = useSongClock();
  const mascotRef = useRef<RhythmMascotHandle>(null);
  const [now, setNow] = useState(-3);
  const [started, setStarted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const notesRef = useRef<LiveNote[]>([]);
  const countsRef = useRef({ perfect: 0, great: 0, good: 0, miss: 0 });
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const scoreRef = useRef(0);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [judge, setJudge] = useState<{ text: string; color: string; key: number } | null>(null);
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const startAtRef = useRef(0);
  const judgeKeyRef = useRef(0);
  const lastRenderAtRef = useRef(0);

  useEffect(() => {
    notesRef.current = chart.notes.map((n, i) => ({ ...n, id: i, judged: false }));
  }, [chart]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clock.stop();
    const c = countsRef.current;
    const result: PlayResult = {
      ...c,
      maxCombo: maxComboRef.current,
      score: scoreRef.current,
      totalNotes: notesRef.current.length,
      playTime: Math.round((Date.now() - startAtRef.current) / 1000),
    };
    setTimeout(() => { if (mountedRef.current) onFinish(result); }, 800);
  }, [onFinish, clock]);

  const applyJudgment = (note: LiveNote, j: Judgment) => {
    note.judged = true;
    countsRef.current[j] += 1;
    if (j === 'miss') {
      comboRef.current = 0;
      setCombo(0);
    } else {
      scoreRef.current += SCORE_PER[j];
      comboRef.current += 1;
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      setCombo(comboRef.current);
      setScore(scoreRef.current);
    }
    judgeKeyRef.current += 1;
    const stl = JUDGE_STYLE[j];
    setJudge({
      text: j === 'miss' ? MISS_LABELS[judgeKeyRef.current % MISS_LABELS.length] : stl.text,
      color: stl.color,
      key: judgeKeyRef.current,
    });
    mascotRef.current?.jump(j);
  };

  useEffect(() => {
    if (!started) return;
    const loop = (frameTime: number) => {
      if (finishedRef.current || !mountedRef.current) return;
      const t = clock.getTime();
      if (frameTime - lastRenderAtRef.current >= RENDER_FRAME_MS) {
        lastRenderAtRef.current = frameTime;
        setNow(t);
      }
      for (const n of notesRef.current) {
        if (!n.judged && t - n.time > JUDGE_GOOD_MS / 1000) applyJudgment(n, 'miss');
      }
      const allDone = notesRef.current.length > 0 && notesRef.current.every(n => n.judged);
      if (allDone || t >= song.duration - 0.2) { finish(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    lastRenderAtRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [clock, finish, song.duration, started]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await clock.load(song.audio, { volume: 1.0 });
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
    let best: LiveNote | null = null;
    let bestDiff = Infinity;
    for (const n of notesRef.current) {
      if (n.judged) continue;
      const diff = Math.abs(n.time - t) * 1000;
      if (diff <= JUDGE_GOOD_MS && diff < bestDiff) { best = n; bestDiff = diff; }
    }
    if (!best) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); return; } // 空振りノーカウント
    if (bestDiff <= JUDGE_PERFECT_MS) {
      applyJudgment(best, 'perfect');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (bestDiff <= JUDGE_GREAT_MS) {
      applyJudgment(best, 'great');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      applyJudgment(best, 'good');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [started, clock]);

  /* 右から左へ流れるビート円。判定リングはキャラの足元 */
  const ringX = 74;
  const areaW = SW - 32;
  const visible = notesRef.current.filter(
    n => !n.judged && n.time - now < TRAVEL_S && n.time - now > -0.35,
  );

  return (
    <View style={st.root}>
      <View style={st.topRow}>
        <Text style={st.score}>SCORE {score}</Text>
        <Text style={st.combo}>{combo > 1 ? `${combo} COMBO` : ' '}</Text>
      </View>

      {/* ステージ: キャラ + 流れるビート */}
      <View style={st.stage}>
        <View style={st.mascotArea}>
          <RhythmMascot ref={mascotRef} song={song} size={96} />
          <View style={st.ground} />
        </View>
        <View style={st.beatTrack}>
          {/* 判定リング */}
          <View style={[st.hitRing, { left: ringX - 27 }]} />
          {visible.map(n => {
            const x = ringX + ((n.time - now) / TRAVEL_S) * (areaW - ringX - 20);
            return <View key={n.id} style={[st.beatDot, { left: x - 17 }]} />;
          })}
        </View>
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
        style={({ pressed }) => [st.jumpBtn, pressed && st.jumpBtnPressed]}
        onPressIn={tap}
      >
        <Text style={st.jumpBtnTxt}>ジャンプ！</Text>
      </Pressable>

      <Pressable onPress={onQuit} hitSlop={8}>
        <Text style={st.quitTxt}>やめる</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, paddingTop: 8, paddingBottom: 14, gap: 10, alignItems: 'stretch' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, minHeight: 32 },
  score: { fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground },
  combo: { fontSize: 15, fontFamily: 'Inter_700Bold', color: judgePalette.perfect },
  stage: {
    marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', minHeight: 330,
    backgroundColor: gameSurface.background,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'flex-end', paddingTop: 28, paddingBottom: 16,
  },
  mascotArea: { alignItems: 'flex-start', paddingLeft: 26, marginBottom: 6 },
  ground: {
    width: 96, height: 6, borderRadius: 3, marginTop: 2,
    backgroundColor: colors.borderStrong,
  },
  beatTrack: { height: 54, justifyContent: 'center' },
  hitRing: {
    position: 'absolute', width: 54, height: 54, borderRadius: 27,
    borderWidth: 3, borderColor: colors.borderStrong,
  },
  beatDot: {
    position: 'absolute', width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary, top: 10,
  },
  judgeTxt: {
    position: 'absolute', alignSelf: 'center', top: 30,
    fontSize: 22, fontFamily: 'Inter_700Bold',
  },
  tapToStart: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gameSurface.scrim,
  },
  tapToStartTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primaryForeground },
  jumpBtn: {
    marginHorizontal: 16, height: 68, borderRadius: 20,
    backgroundColor: colors.primarySoft, borderWidth: border.width, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  jumpBtnPressed: { backgroundColor: colors.primary },
  jumpBtnTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primaryForeground },
  quitTxt: { textAlign: 'center', fontSize: 12, color: colors.subtleForeground, fontFamily: 'Inter_400Regular', paddingTop: 2 },
});
