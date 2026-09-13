/**
 * RHYTHM SWIPE — 矢印ノーツが落ちてくるので、タイミングよく同じ方向にスワイプ。
 * 成功するとキャラクターが同じ方向に楽しそうに揺れる。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Song, Chart, Note, PlayResult, Judgment,
  JUDGE_PERFECT_MS, JUDGE_GREAT_MS, JUDGE_GOOD_MS, SCORE_PER,
} from '@/utils/rhythm/types';
import { useSongClock } from '@/utils/rhythm/useSongClock';
import { RhythmMascot, RhythmMascotHandle, SwipeDirection } from './RhythmMascot';
import { border, colors, gameSurface, judgePalette, lanePalette } from '@/constants/theme';
import { clamp, measuredOr, useMeasuredSize } from '@/utils/rhythm/geometry';

const TRAVEL_S = 2.0;

const ARROWS: Record<SwipeDirection, string> = { left: '←', up: '↑', down: '↓', right: '→' };
const DIR_COLORS: Record<SwipeDirection, string> = {
  left: lanePalette[0], up: lanePalette[1], down: lanePalette[2], right: lanePalette[3],
};

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

export function RhythmSwipeGame({ song, chart, onFinish, onQuit }: Props) {
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
  const startedRef = useRef(false);
  const [rootSize, onRootLayout] = useMeasuredSize();
  const rootH = measuredOr(rootSize.height, 440);
  const areaH = clamp(rootH - 185, 210, 380);
  const hitY = areaH - 70;

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
      if (note.direction) mascotRef.current?.sway(note.direction as SwipeDirection);
    }
    if (j === 'miss') mascotRef.current?.react('miss');
    judgeKeyRef.current += 1;
    const stl = JUDGE_STYLE[j];
    setJudge({
      text: j === 'miss' ? MISS_LABELS[judgeKeyRef.current % MISS_LABELS.length] : stl.text,
      color: stl.color,
      key: judgeKeyRef.current,
    });
  };

  useEffect(() => {
    startedRef.current = started;
    if (!started) return;
    const loop = () => {
      if (finishedRef.current || !mountedRef.current) return;
      const t = clock.getTime();
      setNow(t);
      for (const n of notesRef.current) {
        if (!n.judged && t - n.time > JUDGE_GOOD_MS / 1000) applyJudgment(n, 'miss');
      }
      const allDone = notesRef.current.length > 0 && notesRef.current.every(n => n.judged);
      if (allDone || t >= song.duration - 0.2) { finish(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [started]);

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

  const onSwipe = useCallback((dir: SwipeDirection) => {
    if (!startedRef.current || finishedRef.current) return;
    const t = clock.getTime();
    let best: LiveNote | null = null;
    let bestDiff = Infinity;
    for (const n of notesRef.current) {
      if (n.judged) continue;
      const diff = Math.abs(n.time - t) * 1000;
      if (diff <= JUDGE_GOOD_MS && diff < bestDiff) { best = n; bestDiff = diff; }
    }
    if (!best) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); return; } // 空振りノーカウント
    if (best.direction !== dir) {
      // 方向ちがいは優しくMISS扱い (責めないラベル)
      applyJudgment(best, 'miss');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
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
  }, [clock]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
      onPanResponderRelease: (_e, g) => {
        const { dx, dy } = g;
        if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return; // 小さすぎる動きは無視
        const dir: SwipeDirection = Math.abs(dx) >= Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down' : 'up');
        onSwipe(dir);
      },
    }),
  ).current;

  const visible = notesRef.current.filter(
    n => !n.judged && n.time - now < TRAVEL_S && n.time - now > -0.35,
  );

  return (
    <View style={st.root} onLayout={onRootLayout}>
      <View style={st.topRow}>
        <Text style={st.score}>SCORE {score}</Text>
        <View style={st.mascotWrap}>
          <RhythmMascot ref={mascotRef} song={song} size={58} />
        </View>
        <Text style={st.combo}>{combo > 1 ? `${combo} COMBO` : ' '}</Text>
      </View>

      {/* 矢印レーン */}
      {/* The gesture surface is the note surface itself, so the area the user
          sees is exactly the area that receives a swipe. */}
      <View style={[st.noteArea, { height: areaH }]} {...pan.panHandlers}>
        <View style={[st.hitZone, { top: hitY - 30 }]} />
        {visible.map(n => {
          const spawnY = 60;
          const y = hitY - ((n.time - now) / TRAVEL_S) * (hitY - spawnY);
          const dir = (n.direction ?? 'up') as SwipeDirection;
          return (
            <View
              key={n.id}
              style={[st.arrowNote, { top: y - 27, backgroundColor: DIR_COLORS[dir] }]}
            >
              <Text style={st.arrowTxt}>{ARROWS[dir]}</Text>
            </View>
          );
        })}
        {judge && (
          <Text key={judge.key} style={[st.judgeTxt, { color: judge.color, top: hitY - 84 }]}>
            {judge.text}
          </Text>
        )}
        {needsTap && (
          <Pressable style={st.tapToStart} onPress={startByTap}>
            <Text style={st.tapToStartTxt}>タップしてスタート ▶</Text>
          </Pressable>
        )}
        <Text style={st.swipeHint}>ここで やじるしの方向に スワイプ！</Text>
      </View>

      <Pressable onPress={onQuit} hitSlop={8}>
        <Text style={st.quitTxt}>やめる</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, paddingTop: 8, paddingBottom: 14, gap: 8, alignItems: 'stretch', minHeight: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, minHeight: 56 },
  mascotWrap: { alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground },
  combo: { fontSize: 15, fontFamily: 'Inter_700Bold', color: judgePalette.perfect },
  noteArea: {
    marginHorizontal: 16, borderRadius: 18, overflow: 'hidden',
    backgroundColor: gameSurface.background,
    borderWidth: 1, borderColor: colors.border,
  },
  hitZone: {
    position: 'absolute', left: 12, right: 12, height: 60, borderRadius: 16,
    borderWidth: border.width, borderColor: colors.borderStrong, borderStyle: 'dashed',
  },
  arrowNote: {
    position: 'absolute', alignSelf: 'center', width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
  },
  arrowTxt: { fontSize: 26, color: colors.primaryForeground, fontFamily: 'Inter_700Bold' },
  judgeTxt: { position: 'absolute', alignSelf: 'center', fontSize: 20, fontFamily: 'Inter_700Bold' },
  tapToStart: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gameSurface.scrim,
  },
  tapToStartTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primaryForeground },
  swipeHint: {
    position: 'absolute', left: 0, right: 0, top: 10,
    fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textAlign: 'center',
  },
  quitTxt: { textAlign: 'center', fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', paddingTop: 2 },
});
