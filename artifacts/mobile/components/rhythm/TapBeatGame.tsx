import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mascot } from '@/components/Mascot';
import { useApp } from '@/contexts/AppContext';
import { getMascotStage, MascotMood } from '@/utils/mascotUtils';
import {
  Song, Chart, Note, PlayResult, Judgment,
  JUDGE_PERFECT_MS, JUDGE_GREAT_MS, JUDGE_GOOD_MS, SCORE_PER,
} from '@/utils/rhythm/types';
import { useSongClock } from '@/utils/rhythm/useSongClock';

const { width: SW, height: SH } = Dimensions.get('window');

const LANES = 4;
const TRAVEL_S = 1.9;            // ノーツ出現→判定ラインまでの秒数
const NOTE_H = 46;
const LANE_COLORS = ['#FF6B8A', '#FFC75E', '#5EE0B8', '#5EB8FF'];

/* MISSでも責めない優しい表示 */
const MISS_LABELS = ['だいじょうぶ', 'つぎいこう', 'どんまい', 'ゆっくりでOK'];
const JUDGE_STYLE: Record<Judgment, { text: string; color: string }> = {
  perfect: { text: 'PERFECT', color: '#FFD75E' },
  great:   { text: 'GREAT',   color: '#5EE0B8' },
  good:    { text: 'GOOD',    color: '#5EB8FF' },
  miss:    { text: '',        color: '#8A83B8' },
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

  const laneAreaH = Math.min(SH * 0.52, 460);
  const hitLineY = laneAreaH - 64;

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
  const laneW = (SW - 32) / LANES;

  return (
    <View style={st.root}>
      {/* トップ: スコア/キャラ/コンボ — キャラが判定に合わせてリアクション */}
      <View style={st.topRow}>
        <Text style={st.score}>SCORE {score}</Text>
        <View style={st.mascotWrap}>
          <Mascot stage={mascotStage} mood={mascotMood} size={54} />
        </View>
        <Text style={st.combo}>{combo > 1 ? `♪ ${combo}` : ' '}</Text>
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
            <Text style={st.tapToStartTxt}>タップしてスタート ▶</Text>
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
              { backgroundColor: LANE_COLORS[i] + (pressed ? 'FF' : '55'), borderColor: LANE_COLORS[i] },
            ]}
            onPressIn={() => tapLane(i)}
          >
            <Text style={st.laneBtnTxt}>♪</Text>
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
  root: { flex: 1, paddingTop: 8, paddingBottom: 14, gap: 8, alignItems: 'stretch' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, minHeight: 56 },
  mascotWrap: { alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 15, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.92)' },
  combo: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFD75E' },
  laneArea: {
    marginHorizontal: 16, borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  laneBg: {
    position: 'absolute', top: 0, bottom: 0,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)',
  },
  hitLine: {
    position: 'absolute', left: 8, right: 8, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  note: {
    position: 'absolute', height: NOTE_H, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  judgeTxt: {
    position: 'absolute', alignSelf: 'center',
    fontSize: 20, fontFamily: 'Inter_700Bold',
  },
  tapToStart: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10,8,30,0.72)',
  },
  tapToStartTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF' },
  btnRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  laneBtn: {
    flex: 1, height: 62, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  laneBtnTxt: { fontSize: 22, color: '#FFF', fontFamily: 'Inter_700Bold' },
  quitTxt: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter_400Regular', paddingTop: 2 },
});
