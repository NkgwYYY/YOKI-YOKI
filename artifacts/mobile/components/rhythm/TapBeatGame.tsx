import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mascot } from '@/components/Mascot';
import { useApp } from '@/contexts/AppContext';
import { getMascotStage, MascotMood } from '@/utils/mascotUtils';
import {
  Song, Chart, Note, PlayResult, Judgment,
  JUDGE_PERFECT_MS, JUDGE_GREAT_MS, JUDGE_GOOD_MS, SCORE_PER,
} from '@/utils/rhythm/types';
import { useSongClock } from '@/utils/rhythm/useSongClock';
import { border, colors, gameSurface, judgePalette, lanePalette } from '@/constants/theme';
import { Icon, iconSize } from '@/components/ui/Icon';
import { clamp, measuredOr, useMeasuredSize } from '@/utils/rhythm/geometry';

const LANES = 4;
const TRAVEL_S = 1.9;            // ノーツ出現→判定ラインまでの秒数
const NOTE_H = 46;
const LANE_COLORS = lanePalette;

/* MISSでも責めない優しい表示 */
const MISS_LABELS = ['だいじょうぶ', 'つぎいこう', 'どんまい', 'ゆっくりでOK'];
const JUDGE_STYLE: Record<Judgment, { text: string; color: string }> = {
  perfect: { text: 'PERFECT', color: judgePalette.perfect },
  great:   { text: 'GREAT',   color: judgePalette.great },
  good:    { text: 'GOOD',    color: judgePalette.good },
  miss:    { text: '',        color: judgePalette.miss },
};

interface LiveNote extends Note {
  id: number;
  judged: boolean;
}

interface Props {
  song: Song;
  chart: Chart;
  onFinish: (result: PlayResult) => void;
  onQuit: () => void;
}

export function TapBeatGame({ song, chart, onFinish, onQuit }: Props) {
  const clock = useSongClock();
  const { progress } = useApp();
  const mascotStage = getMascotStage(progress.level);
  /* キャラは判定に合わせてリアクション (既存キャラシステムをそのまま利用) */
  const [mascotMood, setMascotMood] = useState<MascotMood>('normal');
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactMascot = useCallback((j: Judgment) => {
    const mood: MascotMood = j === 'perfect' ? 'excited' : j === 'miss' ? 'normal' : 'happy';
    setMascotMood(mood);
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => setMascotMood('normal'), j === 'perfect' ? 900 : 600);
  }, []);
  useEffect(() => () => { if (moodTimerRef.current) clearTimeout(moodTimerRef.current); }, []);
  const [now, setNow] = useState(-3);
  const [started, setStarted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false); // Web自動再生ブロック時
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
  const [rootSize, onRootLayout] = useMeasuredSize();

  // All horizontal coordinates are local to the lane area. The button row has
  // the same inset and four equal columns, so the visible lanes and hit areas
  // cannot drift apart on narrow devices.
  const rootW = measuredOr(rootSize.width, 320);
  // Use a conservative first-frame fallback so compact phones never flash
  // an oversized stage before onLayout reports the real parent height.
  const rootH = measuredOr(rootSize.height, 440);
  const compact = rootH < 500;
  const verticalGap = compact ? 6 : 8;
  const topRowH = compact ? 48 : 56;
  const laneButtonH = compact ? 54 : 62;
  const laneAreaH = clamp(
    rootH - (compact ? 4 : 8) - (compact ? 8 : 14) - topRowH - laneButtonH - 18 - verticalGap * 3,
    180,
    460,
  );
  const hitLineY = laneAreaH - 64;
  const laneContentW = Math.max(1, rootW - 32);
  const laneW = laneContentW / LANES;

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

  const showJudge = (j: Judgment) => {
    judgeKeyRef.current += 1;
    const st = JUDGE_STYLE[j];
    const text = j === 'miss' ? MISS_LABELS[judgeKeyRef.current % MISS_LABELS.length] : st.text;
    setJudge({ text, color: st.color, key: judgeKeyRef.current });
  };

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
    showJudge(j);
    reactMascot(j);
  };

  /* メインループ: 実再生位置基準 */
  useEffect(() => {
    if (!started) return;
    const loop = () => {
      if (finishedRef.current || !mountedRef.current) return;
      const t = clock.getTime();
      setNow(t);
      // 判定猶予を過ぎた未判定ノーツを自動MISS
      for (const n of notesRef.current) {
        if (!n.judged && t - n.time > JUDGE_GOOD_MS / 1000) applyJudgment(n, 'miss');
      }
      // 全ノーツ終了なら早めに締める
      const allDone = notesRef.current.length > 0 && notesRef.current.every(n => n.judged);
      if (allDone || t >= song.duration - 0.2) { finish(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [started]);

  /* 曲ロード & 再生開始 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await clock.load(song.audio, { volume: 1.0 });
      if (cancelled) return;
      clock.setOnFinish(() => finish());
      const ok = await clock.play();
      if (cancelled) return;
      if (ok) {
        startAtRef.current = Date.now();
        setStarted(true);
      } else {
        setNeedsTap(true); // Webの自動再生ブロック → タップで開始
      }
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
    if (ok) {
      setNeedsTap(false);
      startAtRef.current = Date.now();
      setStarted(true);
    }
  }, [clock]);

  const tapLane = useCallback((lane: number) => {
    if (!started || finishedRef.current) return;
    const t = clock.getTime();
    let best: LiveNote | null = null;
    let bestDiff = Infinity;
    for (const n of notesRef.current) {
      if (n.judged || n.lane !== lane) continue;
      const diff = Math.abs(n.time - t) * 1000;
      if (diff <= JUDGE_GOOD_MS && diff < bestDiff) { best = n; bestDiff = diff; }
    }
    if (!best) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return; // 空振りはノーカウント (優しさ)
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
  }, [started, clock]);

  /* 表示するノーツ (画面内のみ) */
  const visible = notesRef.current.filter(
    n => !n.judged && n.time - now < TRAVEL_S && n.time - now > -0.35,
  );
  return (
    <View
      style={[st.root, {
        paddingTop: compact ? 4 : 8,
        paddingBottom: compact ? 8 : 14,
        gap: verticalGap,
      }]}
      onLayout={onRootLayout}
    >
      {/* トップ: スコア/キャラ/コンボ — キャラが判定に合わせてリアクション */}
      <View style={[st.topRow, { minHeight: topRowH }]}>
        <Text style={st.score}>SCORE {score}</Text>
        <View style={st.mascotWrap}>
          <Mascot stage={mascotStage} mood={mascotMood} size={compact ? 46 : 54} />
        </View>
        <Text style={st.combo}>{combo > 1 ? `${combo} COMBO` : ' '}</Text>
      </View>

      {/* レーンエリア */}
      <View style={[st.laneArea, { height: laneAreaH }]}>
        {Array.from({ length: LANES }).map((_, i) => (
          <View key={i} style={[st.laneBg, { left: i * laneW, width: laneW }]} />
        ))}
        {/* 判定ライン */}
        <View style={[st.hitLine, { top: hitLineY }]} />
        {/* ノーツ */}
        {visible.map(n => {
          const y = hitLineY - ((n.time - now) / TRAVEL_S) * hitLineY;
          return (
            <View
              key={n.id}
              style={[st.note, {
                left: n.lane * laneW + 6,
                width: laneW - 12,
                top: y - NOTE_H / 2,
                backgroundColor: LANE_COLORS[n.lane],
              }]}
            />
          );
        })}
        {/* 判定表示 */}
        {judge && (
          <Text key={judge.key} style={[st.judgeTxt, { color: judge.color, top: hitLineY - 74 }]}>
            {judge.text}
          </Text>
        )}
        {needsTap && (
          <Pressable style={st.tapToStart} onPress={startByTap}>
            <Text style={st.tapToStartTxt}>タップしてスタート</Text>
          </Pressable>
        )}
      </View>

      {/* タップボタン (4レーン) */}
      <View style={st.btnRow}>
        {Array.from({ length: LANES }).map((_, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              st.laneBtn,
              { height: laneButtonH },
              { backgroundColor: LANE_COLORS[i] + (pressed ? 'FF' : '55'), borderColor: LANE_COLORS[i] },
            ]}
            onPressIn={() => tapLane(i)}
          >
            <Icon name="music" size={iconSize.md} color={colors.card} />
          </Pressable>
        ))}
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
  laneArea: {
    marginHorizontal: 16, borderRadius: 18, overflow: 'hidden',
    backgroundColor: gameSurface.background,
    borderWidth: 1, borderColor: colors.border,
  },
  laneBg: {
    position: 'absolute', top: 0, bottom: 0,
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  hitLine: {
    position: 'absolute', left: 8, right: 8, height: 3, borderRadius: 2,
    backgroundColor: colors.primary,
  },
  note: {
    position: 'absolute', height: NOTE_H, borderRadius: 14,
  },
  judgeTxt: {
    position: 'absolute', alignSelf: 'center',
    fontSize: 20, fontFamily: 'Inter_700Bold',
  },
  tapToStart: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gameSurface.scrim,
  },
  tapToStartTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primaryForeground },
  btnRow: { flexDirection: 'row', paddingHorizontal: 16 },
  laneBtn: {
    flex: 1, height: 62, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  quitTxt: { textAlign: 'center', fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', paddingTop: 2 },
});
