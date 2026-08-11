/**
 * BoneCharacter — キャラクターラボの「骨格 + 柔らかい身体(SoftBody)」を
 * React Native (Reanimated) に移植した進化後キャラ表示。
 *
 * 【最重要ルール】元画像 = 正解。
 * 顔パーツ(目・口・頬)は元画像から切り出したPNGを元画像と同じ座標に配置。
 * 表情はスプライト切替と transform のみ。再デザインは一切しない。
 *
 * 【構造】Root(ホップ運動学) → Body(呼吸・微小回転)
 *   → SoftBody(着地時に下端基準で圧縮・横に膨張)
 *     → body画像(顔除去済み・変形を100%受ける)
 *     → FaceComp(骨格補正: 圧縮を平方根だけ受ける = 芯は潰れない)
 *       → 口 → 目 → 頬(頬は常に最前面・形状固定・透明度のみ)
 *
 * 【表情との分離】mood は目・口のスプライトと目の開き・傾きのみに影響し、
 * Body/SoftBody の物理には一切影響しない。
 */
import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
} from 'react-native-reanimated';

import manifest from '../assets/images/characters/bone/manifest.json';
import type { MascotMood } from '../utils/mascotUtils';

export type BoneCharKey = 'odango' | 'happa' | 'colorful_happa';

interface PartBox { x: number; y: number; w: number; h: number }
interface Parts {
  leftEye: PartBox; rightEye: PartBox; mouth: PartBox;
  leftCheek?: PartBox; rightCheek?: PartBox;
  leftEyeHappy?: PartBox; rightEyeHappy?: PartBox;
  mouthSmile?: PartBox; mouthO?: PartBox;
}

const MANIFEST = manifest as unknown as Record<string, Parts>;

/* 元画像切り出しパーツ(静的require必須) */
const SPRITES: Record<BoneCharKey, Record<string, ImageSourcePropType>> = {
  odango: {
    body: require('../assets/images/characters/bone/odango/body.png'),
    leftEye: require('../assets/images/characters/bone/odango/leftEye.png'),
    rightEye: require('../assets/images/characters/bone/odango/rightEye.png'),
    leftEyeHappy: require('../assets/images/characters/bone/odango/leftEyeHappy.png'),
    rightEyeHappy: require('../assets/images/characters/bone/odango/rightEyeHappy.png'),
    mouth: require('../assets/images/characters/bone/odango/mouth.png'),
    mouthSmile: require('../assets/images/characters/bone/odango/mouthSmile.png'),
    leftCheek: require('../assets/images/characters/bone/odango/leftCheek.png'),
    rightCheek: require('../assets/images/characters/bone/odango/rightCheek.png'),
  },
  happa: {
    body: require('../assets/images/characters/bone/happa/body.png'),
    leftEye: require('../assets/images/characters/bone/happa/leftEye.png'),
    rightEye: require('../assets/images/characters/bone/happa/rightEye.png'),
    leftEyeHappy: require('../assets/images/characters/bone/happa/leftEyeHappy.png'),
    rightEyeHappy: require('../assets/images/characters/bone/happa/rightEyeHappy.png'),
    mouth: require('../assets/images/characters/bone/happa/mouth.png'),
    mouthSmile: require('../assets/images/characters/bone/happa/mouthSmile.png'),
    leftCheek: require('../assets/images/characters/bone/happa/leftCheek.png'),
    rightCheek: require('../assets/images/characters/bone/happa/rightCheek.png'),
  },
  colorful_happa: {
    body: require('../assets/images/characters/bone/colorful_happa/body.png'),
    leftEye: require('../assets/images/characters/bone/colorful_happa/leftEye.png'),
    rightEye: require('../assets/images/characters/bone/colorful_happa/rightEye.png'),
    leftEyeHappy: require('../assets/images/characters/bone/colorful_happa/leftEyeHappy.png'),
    rightEyeHappy: require('../assets/images/characters/bone/colorful_happa/rightEyeHappy.png'),
    mouth: require('../assets/images/characters/bone/colorful_happa/mouth.png'),
    mouthSmile: require('../assets/images/characters/bone/colorful_happa/mouthSmile.png'),
    leftCheek: require('../assets/images/characters/bone/colorful_happa/leftCheek.png'),
    rightCheek: require('../assets/images/characters/bone/colorful_happa/rightCheek.png'),
  },
};

/* キャラクターラボと同じ物理パラメータ(512座標系) */
const PHYSICS = {
  gravity: 2600,
  hopVelocity: 430,          // 待機ホップは控えめ
  maxSquash: 0.40,
  maxStretch: 0.06,
  lateralRatio: 0.6,
  impactSensitivity: 0.00044,
  squashStiffness: 0.14,
  squashDamping: 0.88,
  skeletonRigidity: 0.5,
};

const GROUND_Y = 462; // SoftBody変形の基準(下端=地面)

interface Props {
  charKey: BoneCharKey;
  mood: MascotMood;
  size: number;
  /** 待機ホップの有無 */
  hop?: boolean;
  /** false で物理ループを完全停止(小さいアバター等の負荷対策) */
  animate?: boolean;
}

export default function BoneCharacter({ charKey, mood, size, hop = true, animate = true }: Props) {
  const parts = MANIFEST[charKey];
  const sprites = SPRITES[charKey];
  const k = size / 512;

  const sleepy = mood === 'sleepy' || mood === 'tired';
  const happy = mood === 'happy' || mood === 'excited';
  const grumpy = mood === 'grumpy';

  /* --- 表情(スプライト選択のみ。物理に影響しない) --- */
  // 喜・楽でも目は元画像のまま(笑い目スプライトは使わない)。口だけ笑う
  const eyeL = sprites.leftEye;
  const eyeR = sprites.rightEye;
  const eyeLBox = parts.leftEye;
  const eyeRBox = parts.rightEye;
  const mouthImg = happy && parts.mouthSmile ? sprites.mouthSmile : sprites.mouth;
  const mouthBox = happy && parts.mouthSmile ? parts.mouthSmile : parts.mouth;

  /* --- Physics state (UIスレッド) --- */
  const time = useSharedValue(0);
  const squashC = useSharedValue(0);
  const squashV = useSharedValue(0);
  const airY = useSharedValue(0);
  const airV = useSharedValue(0);
  const inAir = useSharedValue(0);
  const nextHopAt = useSharedValue(4 + Math.random() * 5);
  const nextBlinkAt = useSharedValue(2 + Math.random() * 3);
  const eyeOpen = useSharedValue(1);
  const eyeOpenV = useSharedValue(0);
  /** 目の開きの基準(表情由来)。瞬きはここへ戻る */
  const eyeOpenTarget = useSharedValue(1);
  const breathSpeed = useSharedValue(2);
  const hopEnabled = useSharedValue(hop ? 1 : 0);

  useEffect(() => {
    eyeOpenTarget.value = sleepy ? 0.38 : grumpy ? 0.62 : 1;
    breathSpeed.value = sleepy ? 1.3 : 2;
    hopEnabled.value = hop && !sleepy ? 1 : 0;
  }, [sleepy, grumpy, hop]);

  useFrameCallback((fi) => {
    'worklet';
    const dt = Math.min((fi.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const dtScale = dt * 60;
    time.value += dt;
    const t = time.value;

    // --- ホップ運動学(重力・着地) ---
    if (inAir.value === 1) {
      airV.value += PHYSICS.gravity * dt;
      airY.value += airV.value * dt;
      if (airY.value >= 0) {
        airY.value = 0;
        inAir.value = 0;
        // 着地: 衝撃速度に比例した圧縮(上限つき)をSoftBodyへ
        const impact = Math.min(airV.value * PHYSICS.impactSensitivity, PHYSICS.maxSquash);
        squashV.value += impact;
        airV.value = 0;
        nextHopAt.value = t + 5 + Math.random() * 6;
      }
    } else if (hopEnabled.value === 1 && t >= nextHopAt.value) {
      inAir.value = 1;
      airV.value = -PHYSICS.hopVelocity;
    }

    // --- SoftBody圧縮 Spring/Damper(2〜3回の反発で収束) ---
    const force = (0 - squashC.value) * PHYSICS.squashStiffness * dtScale;
    squashV.value = (squashV.value + force) * Math.pow(PHYSICS.squashDamping, dtScale);
    squashC.value += squashV.value * dtScale;
    if (squashC.value > PHYSICS.maxSquash) {
      squashC.value = PHYSICS.maxSquash;
      if (squashV.value > 0) squashV.value = 0;
    } else if (squashC.value < -PHYSICS.maxStretch) {
      squashC.value = -PHYSICS.maxStretch;
      if (squashV.value < 0) squashV.value = 0;
    }

    // --- 瞬き(表情システム。物理と独立) ---
    if (t >= nextBlinkAt.value) {
      eyeOpen.value = 0.08;
      nextBlinkAt.value = t + 3 + Math.random() * 4;
    }
    const eForce = (eyeOpenTarget.value - eyeOpen.value) * 0.3 * dtScale;
    eyeOpenV.value = (eyeOpenV.value + eForce) * Math.pow(0.6, dtScale);
    eyeOpen.value += eyeOpenV.value * dtScale;
  }, animate);

  /* --- スタイル --- */
  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: airY.value * k }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.sin(time.value * breathSpeed.value) * 4 * k },
      { rotate: `${Math.sin(time.value * 1.3) * 0.6}deg` },
    ],
  }));

  // SoftBody: 下端(地面)基準の圧縮・膨張。ピボットを地面へ移すtranslateサンドイッチ
  const softPivot = (GROUND_Y / 512 - 0.5) * size;
  const softStyle = useAnimatedStyle(() => {
    const c = squashC.value;
    const sy = 1 - c;
    const sx = 1 + c * PHYSICS.lateralRatio;
    return {
      transform: [
        { translateY: softPivot },
        { scaleX: sx },
        { scaleY: sy },
        { translateY: -softPivot },
      ],
    };
  });

  // FaceComp: 骨格補正。顔(芯)は圧縮を平方根しか受けない
  const faceCx = (parts.leftEye.x + parts.rightEye.x + parts.rightEye.w) / 2;
  const faceCy = (parts.leftEye.y + parts.mouth.y + parts.mouth.h) / 2;
  const facePivotX = (faceCx / 512 - 0.5) * size;
  const facePivotY = (faceCy / 512 - 0.5) * size;
  const faceStyle = useAnimatedStyle(() => {
    const c = squashC.value;
    const sy = 1 - c;
    const sx = 1 + c * PHYSICS.lateralRatio;
    const compX = Math.pow(sx, PHYSICS.skeletonRigidity) / sx;
    const compY = Math.pow(sy, PHYSICS.skeletonRigidity) / sy;
    return {
      transform: [
        { translateX: facePivotX },
        { translateY: facePivotY },
        { scaleX: compX },
        { scaleY: compY },
        { translateX: -facePivotX },
        { translateY: -facePivotY },
      ],
    };
  });

  // 目: 瞬き = 縦スケールのみ(引き伸ばしはしない)。怒は傾きのみ
  const eyeTilt = grumpy ? 10 : 0;
  const leftEyeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${eyeTilt}deg` }, { scaleY: eyeOpen.value }],
  }));
  const rightEyeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-eyeTilt}deg` }, { scaleY: eyeOpen.value }],
  }));

  const box = (b: PartBox) => ({
    position: 'absolute' as const,
    left: b.x * k,
    top: b.y * k,
    width: b.w * k,
    height: b.h * k,
  });

  const cheeks = useMemo(() => (
    <>
      {parts.leftCheek && (
        <Image source={sprites.leftCheek} style={box(parts.leftCheek)} resizeMode="stretch" />
      )}
      {parts.rightCheek && (
        <Image source={sprites.rightCheek} style={box(parts.rightCheek)} resizeMode="stretch" />
      )}
    </>
  ), [charKey, size]);

  return (
    <Animated.View style={[{ width: size, height: size }, rootStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, softStyle]}>
          <Image source={sprites.body} style={{ width: size, height: size }} resizeMode="contain" />
          <Animated.View style={[StyleSheet.absoluteFill, faceStyle]}>
            {/* 描画順: 口 → 目 → 頬(頬は常に最前面) */}
            <Image source={mouthImg} style={box(mouthBox)} resizeMode="stretch" />
            <Animated.Image source={eyeL} style={[box(eyeLBox), leftEyeStyle]} resizeMode="stretch" />
            <Animated.Image source={eyeR} style={[box(eyeRBox), rightEyeStyle]} resizeMode="stretch" />
            {cheeks}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
