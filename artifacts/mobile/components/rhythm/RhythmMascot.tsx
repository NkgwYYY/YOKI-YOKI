/**
 * RhythmMascot — 音ゲー共通のキャラリアクション層。
 * 既存の Mascot(Emotionシステム)を「利用するだけ」で、キャラ本体は改変しない。
 * ジャンプ・揺れ・ぷるん着地はラッパー側の Animated 変形
 * (Squash & Stretch と同じ原理: 離陸で伸び、着地で縦圧縮+横膨張→バネで復元)。
 * 曲の雰囲気(BPM/mood)でリアクションの大きさ・速さが変わる。
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated as RNAnimated, View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { useApp } from '@/contexts/AppContext';
import { getMascotStage, MascotMood } from '@/utils/mascotUtils';
import { Judgment, Song } from '@/utils/rhythm/types';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface RhythmMascotHandle {
  /** 判定に応じた標準リアクション (PERFECT→嬉しくジャンプ / GREAT→揺れる / GOOD→少し揺れる / MISS→軽く首を傾げる) */
  react: (j: Judgment) => void;
  /** JUMP用: 判定に応じた高さのジャンプ (perfect=高い / great=普通 / good=少し低い) */
  jump: (j: Judgment) => void;
  /** SWIPE用: 成功方向に身体を軽く揺らす */
  sway: (dir: SwipeDirection) => void;
  /** COPY用: リズム提示の「ぽん」(小さなバウンス) */
  pulse: () => void;
  /** COPY用: うまく真似できたときの嬉しい反応 */
  cheer: () => void;
}

interface Props {
  song: Song;
  size?: number;
}

export const RhythmMascot = forwardRef<RhythmMascotHandle, Props>(function RhythmMascot(
  { song, size = 76 }, ref,
) {
  const { progress } = useApp();
  const stage = getMascotStage(progress.level);

  /* 曲の雰囲気 → リアクションの性格
     明るく速い曲 → 大きめ・キビキビ / 落ち着いた曲 → 小さめ・ゆっくり */
  const energetic = song.bpm >= 110;
  const calm = song.bpm < 90;
  const baseMood: MascotMood = calm ? 'normal' : 'happy';
  const jumpH = energetic ? 46 : calm ? 26 : 34;
  const speed = calm ? 1.35 : energetic ? 0.9 : 1.0;

  const [mood, setMood] = useState<MascotMood>(baseMood);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cheerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const setMoodFor = (m: MascotMood, ms: number) => {
    if (!mountedRef.current) return;
    setMood(m);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => { if (mountedRef.current) setMood(baseMood); }, ms);
  };

  const ty = useRef(new RNAnimated.Value(0)).current;
  const tx = useRef(new RNAnimated.Value(0)).current;
  const rot = useRef(new RNAnimated.Value(0)).current; // deg
  const sx = useRef(new RNAnimated.Value(1)).current;
  const sy = useRef(new RNAnimated.Value(1)).current;

  /* アンマウント時: タイマーとアニメーションをすべて解放 */
  useEffect(() => () => {
    mountedRef.current = false;
    if (moodTimer.current) clearTimeout(moodTimer.current);
    if (cheerTimer.current) clearTimeout(cheerTimer.current);
    [ty, tx, rot, sx, sy].forEach(v => v.stopAnimation());
  }, []);

  const t = (v: RNAnimated.Value, toValue: number, duration: number) =>
    RNAnimated.timing(v, { toValue, duration: duration * speed, useNativeDriver: true });
  const spring = (v: RNAnimated.Value, toValue: number) =>
    RNAnimated.spring(v, { toValue, useNativeDriver: true, friction: 4, tension: 90 });

  /** ジャンプ→浮く→着地でぷるん (Squash & Stretch) */
  const doJump = (height: number) => {
    ty.stopAnimation(); sy.stopAnimation(); sx.stopAnimation();
    RNAnimated.sequence([
      // しゃがみ(アンティシペーション)
      RNAnimated.parallel([t(sy, 0.9, 70), t(sx, 1.06, 70)]),
      // 離陸: 縦に伸びる
      RNAnimated.parallel([t(ty, -height, 190), t(sy, 1.06, 120), t(sx, 0.96, 120)]),
      // 滞空→落下
      RNAnimated.parallel([t(ty, 0, 170), t(sy, 1.0, 120), t(sx, 1.0, 120)]),
      // 着地: 縦圧縮 + 横膨張(体積感の維持)
      RNAnimated.parallel([t(sy, 0.8, 80), t(sx, 1.14, 80)]),
      // ぷるんと復元(バネ)
      RNAnimated.parallel([spring(sy, 1), spring(sx, 1)]),
    ]).start();
  };

  /** 揺れ (strength 0-1) */
  const doSwayX = (dx: number, r: number) => {
    tx.stopAnimation(); rot.stopAnimation();
    RNAnimated.sequence([
      RNAnimated.parallel([t(tx, dx, 110), t(rot, r, 110)]),
      RNAnimated.parallel([spring(tx, 0), spring(rot, 0)]),
    ]).start();
  };

  useImperativeHandle(ref, () => ({
    react: (j: Judgment) => {
      if (j === 'perfect') { setMoodFor('excited', 900); doJump(jumpH * 0.65); }
      else if (j === 'great') { setMoodFor('happy', 600); doSwayX(energetic ? 8 : 5, 4); }
      else if (j === 'good') { setMoodFor('happy', 450); doSwayX(energetic ? 5 : 3, 2); }
      else {
        // MISS: 落ち込まない。軽く首を傾げるだけ
        rot.stopAnimation();
        RNAnimated.sequence([t(rot, -7, 160), t(rot, 0, 260)]).start();
      }
    },
    jump: (j: Judgment) => {
      if (j === 'perfect') { setMoodFor('excited', 900); doJump(jumpH); }
      else if (j === 'great') { setMoodFor('happy', 600); doJump(jumpH * 0.7); }
      else if (j === 'good') { setMoodFor('happy', 450); doJump(jumpH * 0.45); }
      else {
        rot.stopAnimation();
        RNAnimated.sequence([t(rot, -7, 160), t(rot, 0, 260)]).start();
      }
    },
    sway: (dir: SwipeDirection) => {
      setMoodFor('happy', 500);
      if (dir === 'left') doSwayX(-12, -6);
      else if (dir === 'right') doSwayX(12, 6);
      else if (dir === 'up') doJump(jumpH * 0.4);
      else {
        // down: ぷにっと沈む
        sy.stopAnimation(); sx.stopAnimation();
        RNAnimated.sequence([
          RNAnimated.parallel([t(sy, 0.88, 90), t(sx, 1.08, 90)]),
          RNAnimated.parallel([spring(sy, 1), spring(sx, 1)]),
        ]).start();
      }
    },
    pulse: () => {
      sy.stopAnimation();
      RNAnimated.sequence([
        RNAnimated.parallel([t(sy, 0.92, 70), t(sx, 1.05, 70)]),
        RNAnimated.parallel([spring(sy, 1), spring(sx, 1)]),
      ]).start();
    },
    cheer: () => {
      setMoodFor('excited', 1400);
      doJump(jumpH * 0.8);
      if (cheerTimer.current) clearTimeout(cheerTimer.current);
      cheerTimer.current = setTimeout(() => { if (mountedRef.current) doJump(jumpH * 0.5); }, 420 * speed);
    },
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
      <RNAnimated.View
        style={{
          transform: [
            { translateY: ty },
            { translateX: tx },
            { rotate: rot.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) },
            { scaleX: sx },
            { scaleY: sy },
          ],
        }}
      >
        <Mascot stage={stage} mood={mood} size={size} />
      </RNAnimated.View>
    </View>
  );
});
