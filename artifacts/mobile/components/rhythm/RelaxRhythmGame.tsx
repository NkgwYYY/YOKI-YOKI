/**
 * RELAX RHYTHM — 音楽に合わせて広がる円を穏やかにタップする癒やしモード。
 * スコアは控えめ、呼吸をするような体験。判定窓もいちばん優しい。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Song, Chart, Note, PlayResult, Judgment, SCORE_PER,
} from '@/utils/rhythm/types';
import { useSongClock } from '@/utils/rhythm/useSongClock';
import { RhythmMascot, RhythmMascotHandle } from './RhythmMascot';
import { colors, gameSurface, judgePalette } from '@/constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');

/* いちばん優しい判定窓 */
const RELAX_PERFECT_MS = 180;
const RELAX_GREAT_MS = 300;
const RELAX_GOOD_MS = 450;
const APPEAR_S = 2.4; // 円が現れて縮んでいく秒数 (ゆっくり)

/* 癒やし系の言葉 (MISSでも責めない) */
const WORDS: Record<Judgment, { text: string; color: string }> = {
  perfect: { text: 'ぴったり…', color: judgePalette.great },
  great:   { text: 'ゆったり',   color: judgePalette.good },
  good:    { text: 'ふんわり',   color: judgePalette.perfect },
  miss:    { text: 'だいじょうぶ', color: judgePalette.miss },
};

interface LiveNote extends Note { id: number; judged: boolean }

interface Props {
  song: Song;
  chart: Chart;
  onFinish: (result: PlayResult) => void;
  onQuit: () => void;
}

export function RelaxRhythmGame({ song, chart, onFinish, onQuit }: Props) {
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
  const [word, setWord] = useState<{ text: string; color: string; key: number } | null>(null);
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const startAtRef = useRef(0);
  const wordKeyRef = useRef(0);

  const areaW = SW - 32;
  const areaH = Math.min(SH * 0.5, 440);
  /* レーン → 円の位置 (ゆったり4隅+中央寄り) */
  const posFor = (lane: number, id: number) => {
    const spots = [
      { x: areaW * 0.28, y: areaH * 0.3 },
      { x: areaW * 0.72, y: areaH * 0.28 },
      { x: areaW * 0.3, y: areaH * 0.68 },
      { x: areaW * 0.7, y: areaH * 0.66 },
    ];
    const p = spots[lane % 4];
    // 単調にならないよう僅かに揺らす (決定的)
    const jx = ((id * 37) % 21 - 10);
    const jy = ((id * 53) % 21 - 10);
    return { x: p.x + jx, y: p.y + jy };
  };

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
    setTimeout(() => { if (mountedRef.current) onFinish(result); }, 900);
  }, [onFinish, clock]);

  const applyJudgment = (note: LiveNote, j: Judgment) => {
    note.judged = true;
    countsRef.current[j] += 1;
    if (j !== 'miss') {
      scoreRef.current += SCORE_PER[j];
      comboRef.current += 1;
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      mascotRef.current?.pulse();
    } else {
      comboRef.current = 0;
    }
    wordKeyRef.current += 1;
    setWord({ ...WORDS[j], key: wordKeyRef.current });
  };

  useEffect(() => {
    if (!started) return;
    const loop = () => {
      if (finishedRef.current || !mountedRef.current) return;
      const t = clock.getTime();
      setNow(t);
      for (const n of notesRef.current) {
        if (!n.judged && t - n.time > RELAX_GOOD_MS / 1000) applyJudgment(n, 'miss');
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
      await clock.load(song.audio, { volume: 0.85 });
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

  /* どこをタップしてもOK (いちばん近いノーツを判定) — 穏やかさ優先 */
  const tap = useCallback(() => {
    if (!started || finishedRef.current) return;
    const t = clock.getTime();
    let best: LiveNote | null = null;
    let bestDiff = Infinity;
    for (const n of notesRef.current) {
      if (n.judged) continue;
      const diff = Math.abs(n.time - t) * 1000;
      if (diff <= RELAX_GOOD_MS && diff < bestDiff) { best = n; bestDiff = diff; }
    }
    if (!best) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); return; } // 空振りノーカウント
    if (bestDiff <= RELAX_PERFECT_MS) applyJudgment(best, 'perfect');
    else if (bestDiff <= RELAX_GREAT_MS) applyJudgment(best, 'great');
    else applyJudgment(best, 'good');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // 常にそっと
  }, [started, clock]);

  /* 表示: 外側リングが円に向かってゆっくり縮む。重なった瞬間がタイミング */
  const visible = notesRef.current.filter(
    n => !n.judged && n.time - now < APPEAR_S && n.time - now > -0.45,
  );

  return (
    <View style={st.root}>
      <View style={st.topRow}>
        <Text style={st.hint}>ふ〜っと息をして、円がかさなったら そっとタップ</Text>
      </View>

      <Pressable style={[st.area, { height: areaH }]} onPressIn={tap}>
        {visible.map(n => {
          const p = posFor(n.lane, n.id);
          const prog = Math.max(0, Math.min(1, (n.time - now) / APPEAR_S)); // 1→0
          const ringR = 26 + prog * 52;
          const opacity = 0.25 + (1 - prog) * 0.6;
          return (
            <View key={n.id} pointerEvents="none">
              {/* ターゲット円 */}
              <View style={[st.target, { left: p.x - 26, top: p.y - 26, opacity }]} />
              {/* 縮んでいくリング */}
              <View
                style={[st.ring, {
                  left: p.x - ringR, top: p.y - ringR,
                  width: ringR * 2, height: ringR * 2, borderRadius: ringR,
                  opacity: 0.5 + (1 - prog) * 0.4,
                }]}
              />
            </View>
          );
        })}
        {word && (
          <Text key={word.key} style={[st.wordTxt, { color: word.color }]}>{word.text}</Text>
        )}
        {needsTap && (
          <Pressable style={st.tapToStart} onPress={startByTap}>
            <Text style={st.tapToStartTxt}>タップしてスタート ▶</Text>
          </Pressable>
        )}
      </Pressable>

      {/* キャラは静かに寄り添う */}
      <View style={st.mascotRow}>
        <RhythmMascot ref={mascotRef} song={song} size={64} />
      </View>

      <Pressable onPress={onQuit} hitSlop={8}>
        <Text style={st.quitTxt}>やめる</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, paddingTop: 8, paddingBottom: 14, gap: 10, alignItems: 'stretch' },
  topRow: { paddingHorizontal: 20, minHeight: 24, alignItems: 'center' },
  hint: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textAlign: 'center' },
  area: {
    marginHorizontal: 16, borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(120,140,220,0.08)',
    borderWidth: 1, borderColor: colors.border,
  },
  target: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(155,180,255,0.35)',
    borderWidth: 1.5, borderColor: 'rgba(200,215,255,0.7)',
  },
  ring: {
    position: 'absolute', borderWidth: 2, borderColor: 'rgba(190,225,255,0.8)',
  },
  wordTxt: {
    position: 'absolute', alignSelf: 'center', top: 16,
    fontSize: 17, fontFamily: 'Inter_600SemiBold',
  },
  tapToStart: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gameSurface.scrim,
  },
  tapToStartTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primaryForeground },
  mascotRow: { alignItems: 'center' },
  quitTxt: { textAlign: 'center', fontSize: 12, color: colors.subtleForeground, fontFamily: 'Inter_400Regular', paddingTop: 2 },
});
