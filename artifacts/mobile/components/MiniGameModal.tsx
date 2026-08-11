import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Dimensions, Platform, Animated as RNAnimated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { COSMIC_SHEET } from '@/constants/cosmicTheme';
import { GameSlot, getSlotConfig } from '@/utils/miniGameUtils';
import { Analytics } from '@/utils/analytics';

const { width: SW, height: SH } = Dimensions.get('window');
const GAME_DURATION = 10; // seconds

/* ── Types ─────────────────────────────────────── */
type Phase = 'intro' | 'playing' | 'result';

interface Reward {
  fp?: number;
  xp?: number;
  message: string;
}

interface Props {
  visible: boolean;
  slot: GameSlot;
  onClose: () => void;
  onReward: (reward: { fp?: number; xp?: number }) => void;
}

/* ── Morning: 朝日タップ ───────────────────────── */
interface TapItem { id: number; x: number; y: number; scale: RNAnimated.Value }

function SunGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<TapItem[]>([]);
  const nextId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const makeItem = (): TapItem => ({
    id: nextId.current++,
    x: 20 + Math.random() * (SW - 120),
    y: 60 + Math.random() * (SH * 0.45),
    scale: new RNAnimated.Value(0),
  });

  useEffect(() => {
    const initial = Array.from({ length: 5 }, makeItem);
    initial.forEach(s => RNAnimated.spring(s.scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start());
    setItems(initial);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  useEffect(() => { if (timeLeft === 0) onFinish(score); }, [timeLeft]);

  const tapItem = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScore(s => s + 1);
    const fresh = makeItem();
    RNAnimated.spring(fresh.scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    setItems(prev => [...prev.filter(s => s.id !== id), fresh]);
  }, []);

  return (
    <View style={s.gameArea}>
      <View style={s.timerRow}>
        <Text style={s.timerText}>⏱ {timeLeft}s</Text>
        <Text style={s.scoreText}>☀️ × {score}</Text>
      </View>
      {items.map(item => (
        <RNAnimated.View key={item.id} style={[s.tapWrap, { left: item.x, top: item.y, transform: [{ scale: item.scale }] }]}>
          <TouchableOpacity onPress={() => tapItem(item.id)} activeOpacity={0.7}>
            <Text style={s.tapEmoji}>☀️</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      ))}
    </View>
  );
}

/* ── Morning variant: 花タップ ─────────────────── */
function FlowerGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<TapItem[]>([]);
  const nextId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const FLOWERS = ['🌸', '🌼', '🌺', '🌻', '🌷'];

  const makeItem = (): TapItem => ({
    id: nextId.current++,
    x: 20 + Math.random() * (SW - 120),
    y: 60 + Math.random() * (SH * 0.45),
    scale: new RNAnimated.Value(0),
  });

  useEffect(() => {
    const initial = Array.from({ length: 4 }, makeItem);
    initial.forEach(s => RNAnimated.spring(s.scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start());
    setItems(initial);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  useEffect(() => { if (timeLeft === 0) onFinish(score); }, [timeLeft]);

  const tapItem = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScore(s => s + 1);
    const fresh = makeItem();
    RNAnimated.spring(fresh.scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
    setItems(prev => [...prev.filter(s => s.id !== id), fresh]);
  }, []);

  return (
    <View style={s.gameArea}>
      <View style={s.timerRow}>
        <Text style={s.timerText}>⏱ {timeLeft}s</Text>
        <Text style={s.scoreText}>🌸 × {score}</Text>
      </View>
      {items.map((item, i) => (
        <RNAnimated.View key={item.id} style={[s.tapWrap, { left: item.x, top: item.y, transform: [{ scale: item.scale }] }]}>
          <TouchableOpacity onPress={() => tapItem(item.id)} activeOpacity={0.7}>
            <Text style={s.tapEmoji}>{FLOWERS[item.id % FLOWERS.length]}</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      ))}
    </View>
  );
}

/* ── Noon: 宝箱ガチャ ────────────────────────── */
const CHEST_PRIZES: Reward[] = [
  { fp: 2, message: '🪙 2pt ゲット！' },
  { fp: 3, message: '🪙 3pt ゲット！' },
  { fp: 5, message: '🪙 5pt ゲット！' },
  { fp: 2, message: '🪙 2pt ゲット！' },
  { xp: 10, message: '✨ XP +10！' },
  { xp: 15, message: '✨ XP +15！ラッキー！' },
];

function ChestGame({ onFinish }: { onFinish: (reward: Reward) => void }) {
  const [opened, setOpened] = useState<number | null>(null);
  const scales = useRef([new RNAnimated.Value(1), new RNAnimated.Value(1), new RNAnimated.Value(1)]).current;

  const pick = (idx: number) => {
    if (opened !== null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    RNAnimated.sequence([
      RNAnimated.timing(scales[idx], { toValue: 1.3, duration: 120, useNativeDriver: true }),
      RNAnimated.spring(scales[idx], { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    setOpened(idx);
    const prize = CHEST_PRIZES[Math.floor(Math.random() * CHEST_PRIZES.length)];
    setTimeout(() => onFinish(prize), 800);
  };

  return (
    <View style={s.chestArea}>
      <Text style={s.chestHint}>どれかな？</Text>
      <View style={s.chestRow}>
        {[0, 1, 2].map(i => (
          <RNAnimated.View key={i} style={{ transform: [{ scale: scales[i] }] }}>
            <TouchableOpacity style={s.chestBtn} onPress={() => pick(i)} activeOpacity={0.7}>
              <Text style={s.chestEmoji}>{opened === i ? '✨' : '🎁'}</Text>
            </TouchableOpacity>
          </RNAnimated.View>
        ))}
      </View>
    </View>
  );
}

/* ── Noon variant: バルーンくじ ─────────────────── */
const BALLOON_COLORS = ['🔴', '🔵', '🟡', '🟢', '🟣'];
const BALLOON_PRIZES: Reward[] = [
  { fp: 2, message: '🎈 2pt ゲット！' },
  { fp: 4, message: '🎈 4pt ゲット！' },
  { fp: 3, message: '🎈 3pt ゲット！' },
  { xp: 12, message: '✨ XP +12！' },
  { fp: 5, message: '🎈 5pt ラッキー！' },
  { xp: 10, message: '✨ XP +10！' },
];

function BalloonGame({ onFinish }: { onFinish: (reward: Reward) => void }) {
  const [popped, setPopped] = useState<number | null>(null);
  const scales = useRef(Array.from({ length: 4 }, () => new RNAnimated.Value(1))).current;

  const pop = (idx: number) => {
    if (popped !== null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    RNAnimated.sequence([
      RNAnimated.timing(scales[idx], { toValue: 1.4, duration: 100, useNativeDriver: true }),
      RNAnimated.timing(scales[idx], { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setPopped(idx);
    const prize = BALLOON_PRIZES[Math.floor(Math.random() * BALLOON_PRIZES.length)];
    setTimeout(() => onFinish(prize), 700);
  };

  return (
    <View style={s.chestArea}>
      <Text style={s.chestHint}>バルーンを選んで！🎈</Text>
      <View style={s.chestRow}>
        {[0, 1, 2, 3].map(i => (
          <RNAnimated.View key={i} style={{ transform: [{ scale: scales[i] }] }}>
            <TouchableOpacity style={s.balloonBtn} onPress={() => pop(i)} activeOpacity={0.7}>
              <Text style={s.balloonEmoji}>{popped === i ? '💥' : BALLOON_COLORS[i]}</Text>
            </TouchableOpacity>
          </RNAnimated.View>
        ))}
      </View>
    </View>
  );
}

/* ── Night: 流れ星 ────────────────────────────── */
interface StarItem { id: number; y: number; x: RNAnimated.Value; opacity: RNAnimated.Value }

function StarGame({ emoji, onFinish }: { emoji: '⭐' | '🌙'; onFinish: (score: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState<StarItem[]>([]);
  const nextId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const starTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speed = emoji === '🌙' ? 3800 : 2800; // 月は少しゆっくり

  const spawnStar = useCallback(() => {
    const id = nextId.current++;
    const x = new RNAnimated.Value(SW + 10);
    const opacity = new RNAnimated.Value(1);
    const y = 60 + Math.random() * (SH * 0.4);
    const star: StarItem = { id, y, x, opacity };
    RNAnimated.timing(x, { toValue: -80, duration: speed + Math.random() * 1200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setStars(prev => prev.filter(s => s.id !== id));
    });
    setStars(prev => [...prev, star]);
  }, []);

  useEffect(() => {
    spawnStar(); spawnStar();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
    }, 1000);
    starTimerRef.current = setInterval(spawnStar, emoji === '🌙' ? 1500 : 1200);
    return () => { clearInterval(timerRef.current!); clearInterval(starTimerRef.current!); };
  }, []);

  useEffect(() => { if (timeLeft === 0) onFinish(score); }, [timeLeft]);

  const tapStar = useCallback((id: number, opacity: RNAnimated.Value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScore(s => s + 1);
    RNAnimated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStars(prev => prev.filter(s => s.id !== id));
    });
  }, []);

  return (
    <View style={s.gameArea}>
      <View style={s.timerRow}>
        <Text style={s.timerText}>⏱ {timeLeft}s</Text>
        <Text style={s.scoreText}>{emoji} × {score}</Text>
      </View>
      {stars.map(star => (
        <RNAnimated.View
          key={star.id}
          style={[s.starWrap, { top: star.y, opacity: star.opacity, transform: [{ translateX: star.x }] }]}
        >
          <TouchableOpacity onPress={() => tapStar(star.id, star.opacity)} activeOpacity={0.7}>
            <Text style={s.starEmoji}>{emoji}</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      ))}
    </View>
  );
}

/* ── Main Modal ─────────────────────────────────── */
type MorningVariant = 'sun' | 'flower';
type NoonVariant = 'chest' | 'balloon';
type NightVariant = 'star' | 'moon';

export function MiniGameModal({ visible, slot, onClose, onReward }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [reward, setReward] = useState<Reward | null>(null);
  const [morningVariant] = useState<MorningVariant>(() => Math.random() < 0.5 ? 'sun' : 'flower');
  const [noonVariant] = useState<NoonVariant>(() => Math.random() < 0.5 ? 'chest' : 'balloon');
  const [nightVariant] = useState<NightVariant>(() => Math.random() < 0.5 ? 'star' : 'moon');
  const cfg = getSlotConfig(slot);

  const introTitle = {
    morning: morningVariant === 'sun' ? '☀️ 朝日を集めよう' : '🌸 花を咲かせよう',
    noon:    noonVariant   === 'chest' ? '🎁 おやつ探し' : '🎈 バルーンくじ',
    night:   nightVariant  === 'star'  ? '⭐ 星集め' : '🌙 月を集めよう',
  }[slot];

  const introDesc = {
    morning: '10秒でタップ！',
    noon:    noonVariant === 'chest' ? '3つの宝箱から1つ選ぼう' : '4つのバルーンから1つ選ぼう',
    night:   '10秒でタップ！',
  }[slot];

  useEffect(() => {
    if (visible) { setPhase('intro'); Analytics.miniGameStarted(slot); }
  }, [visible]);

  const handleMorningFinish = (score: number) => {
    const fp = score >= 8 ? 2 : 1;
    const emoji = morningVariant === 'sun' ? '☀️' : '🌸';
    const r: Reward = { fp, message: `${emoji} ${score}個集めた！🪙 ${fp}pt ゲット！` };
    setReward(r); setPhase('result'); onReward({ fp });
    Analytics.miniGameCompleted('morning', score);
  };

  const handleNoonFinish = (r: Reward) => {
    setReward(r); setPhase('result'); onReward({ fp: r.fp, xp: r.xp });
    Analytics.miniGameCompleted('noon', (r.fp ?? 0) + (r.xp ?? 0));
  };

  const handleNightFinish = (score: number) => {
    const xp = score >= 5 ? 10 : 5;
    const emoji = nightVariant === 'star' ? '⭐' : '🌙';
    const r: Reward = { xp, message: `${emoji} ${score}個集めた！✨ XP +${xp}！` };
    setReward(r); setPhase('result'); onReward({ xp });
    Analytics.miniGameCompleted('night', score);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={phase !== 'playing' ? onClose : undefined} />

        <View style={[s.sheet, { backgroundColor: COSMIC_SHEET }]}>
          {/* Header */}
          <LinearGradient colors={cfg.gradient} style={s.header}>
            <Text style={s.headerEmoji}>{cfg.emoji}</Text>
            <Text style={s.headerTitle}>{introTitle}</Text>
            {phase !== 'playing' && (
              <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* Intro */}
          {phase === 'intro' && (
            <View style={s.body}>
              <Text style={s.descText}>{introDesc}</Text>
              <Text style={s.rewardHint}>{cfg.rewardLabel}</Text>
              <TouchableOpacity
                style={[s.startBtn, { backgroundColor: cfg.color }]}
                onPress={() => setPhase('playing')}
                activeOpacity={0.85}
              >
                <Text style={s.startTxt}>スタート！</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Playing */}
          {phase === 'playing' && (
            <>
              {slot === 'morning' && morningVariant === 'sun'    && <SunGame onFinish={handleMorningFinish} />}
              {slot === 'morning' && morningVariant === 'flower' && <FlowerGame onFinish={handleMorningFinish} />}
              {slot === 'noon'    && noonVariant    === 'chest'   && <ChestGame onFinish={handleNoonFinish} />}
              {slot === 'noon'    && noonVariant    === 'balloon' && <BalloonGame onFinish={handleNoonFinish} />}
              {slot === 'night'   && nightVariant   === 'star'    && <StarGame emoji="⭐" onFinish={handleNightFinish} />}
              {slot === 'night'   && nightVariant   === 'moon'    && <StarGame emoji="🌙" onFinish={handleNightFinish} />}
            </>
          )}

          {/* Result */}
          {phase === 'result' && reward && (
            <View style={s.body}>
              <Text style={s.resultEmoji}>🎉</Text>
              <Text style={s.resultMsg}>{reward.message}</Text>
              {reward.fp  && <Text style={[s.rewardTag, { backgroundColor: '#FFB347' + '30' }]}>🪙 +{reward.fp} pt</Text>}
              {reward.xp  && <Text style={[s.rewardTag, { backgroundColor: '#6366F1' + '30' }]}>✨ +{reward.xp} XP</Text>}
              <Text style={s.seeYouText}>次のプレイも楽しみにね！</Text>
              <TouchableOpacity style={[s.startBtn, { backgroundColor: cfg.color }]} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.startTxt}>とじる</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ── Styles ─────────────────────────────────────── */
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', minHeight: SH * 0.55 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 20, paddingTop: 24,
  },
  headerEmoji: { fontSize: 26 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF', flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  descText: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
  rewardHint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', textAlign: 'center' },
  startBtn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 20, marginTop: 8 },
  startTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFF' },

  // tap games shared
  gameArea: { flex: 1, position: 'relative', minHeight: SH * 0.4 },
  timerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, zIndex: 10,
  },
  timerText: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FF6B35' },
  scoreText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.92)' },
  tapWrap: { position: 'absolute' },
  tapEmoji: { fontSize: 44 },

  // noon chests
  chestArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 20 },
  chestHint: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)' },
  chestRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  chestBtn: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  chestEmoji: { fontSize: 42 },

  // balloon
  balloonBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center' },
  balloonEmoji: { fontSize: 38 },

  // night stars
  starWrap: { position: 'absolute' },
  starEmoji: { fontSize: 40 },

  // result
  resultEmoji: { fontSize: 52 },
  resultMsg: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
  rewardTag: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16, fontSize: 15, fontFamily: 'Inter_700Bold', overflow: 'hidden' },
  seeYouText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' },
});
