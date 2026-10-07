import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { StaticMascot } from '@/components/Mascot';
import type { ResidentInteraction, ResidentItem } from '@/components/room/RoomResident';
import { getCharacter, type MascotMood, type MascotStage } from '@/utils/mascotUtils';
import { roomWearableFrame } from '@/utils/roomWearable';
import { WORLD_PLACES, worldGroundPoint, worldResidentScale, type WorldDestination } from '@/utils/worldGeometry';
import type { WorldPeriod } from '@/utils/worldTime';
import { useWorldResident } from './useWorldResident';

type Props = {
  width: number; height: number; stage: MascotStage; growthSize: number; mascotName: string;
  active: boolean; reduceMotion: boolean; resting: boolean; reaction: number; meal: number; rest: number;
  period: WorldPeriod; daySeed: number; wear?: ResidentItem; effect?: ResidentItem;
  footY: SharedValue<number>; holding: SharedValue<number>; destination: WorldDestination | null;
  onInteract: (kind: ResidentInteraction) => void; onMealFinished: () => void; onChat: () => void;
};
const SOFT = {mass: 0.7, damping: 10, stiffness: 180};

/** Scene-sized art, one motion owner, no React state or layout update on animation frames. */
export function WorldResident(p: Props) {
  const {width, height, active, reduceMotion, footY: y, holding} = p;
  const x = useSharedValue(WORLD_PLACES.idle.x);
  const lift = useSharedValue(0), jelly = useSharedValue(0), lean = useSharedValue(0);
  const breath = useSharedValue(0), gait = useSharedValue(0), walking = useSharedValue(0);
  const downX = useSharedValue(0), touchMode = useSharedValue(0), blink = useSharedValue(0);
  const startX = useSharedValue(0), startY = useSharedValue(0), petDistance = useSharedValue(0);
  const available = useSharedValue(active);
  const [interacting, setInteracting] = useState(false);
  const [touchMood, setTouchMood] = useState<MascotMood | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(p); latest.current = p;
  const taps = useRef({at: 0, count: 0});
  const reaction = useRef(p.reaction);
  const size = width * 0.135 * Math.max(0.9, Math.min(1.12, p.growthSize));
  const pose = useWorldResident({...p, x, y, walking, interacting});
  useEffect(() => () => {
    available.value = false;
    [x, y, lift, jelly, lean, breath, gait, blink].forEach(value => cancelAnimation(value));
    clearTimeout(moodTimer.current);
  }, [available, x, y, lift, jelly, lean, breath, gait, blink]);
  const notify = useCallback((kind: ResidentInteraction) => {
    if (!latest.current.active) return;
    if (kind === 'greet') {
      const now = Date.now();
      taps.current = {at: now, count: now - taps.current.at < 1800 ? taps.current.count + 1 : 1};
      if (taps.current.count >= 3) kind = 'space';
    }
    setTouchMood(kind === 'space' ? 'normal' : 'happy');
    clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setTouchMood(null), 2300);
    latest.current.onInteract(kind);
  }, []);
  useEffect(() => {
    available.value = active;
    if (!active) {
      cancelAnimation(x); cancelAnimation(y); cancelAnimation(lift); cancelAnimation(jelly); cancelAnimation(lean);
      lift.value = 0; jelly.value = 0; lean.value = 0; holding.value = 0; touchMode.value = 0;
      setInteracting(false); setTouchMood(null); clearTimeout(moodTimer.current);
    }
    return () => {clearTimeout(moodTimer.current);};
  }, [active, available, x, y, lift, jelly, lean, holding, touchMode]);
  useEffect(() => {
    if (!active || reduceMotion) {breath.value = 0; gait.value = 0; return;}
    breath.value = withRepeat(withSequence(withTiming(1, {duration: 2200, easing: Easing.inOut(Easing.sin)}), withTiming(0, {duration: 2400, easing: Easing.inOut(Easing.sin)})), -1);
    if (pose === 'walking') gait.value = withRepeat(withTiming(Math.PI * 2, {duration: 740, easing: Easing.linear}), -1);
    else gait.value = withTiming(0, {duration: 180});
    return () => {cancelAnimation(breath); cancelAnimation(gait);};
  }, [active, reduceMotion, pose, breath, gait]);
  useEffect(() => {
    if (p.reaction === reaction.current || !active || interacting) return;
    reaction.current = p.reaction;
    setTouchMood('happy'); clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setTouchMood(null), 2400);
    if (!reduceMotion) jelly.value = withSequence(withTiming(0.7, {duration: 90}), withSpring(0, SOFT));
  }, [p.reaction, active, interacting, reduceMotion, jelly]);

  const begin = () => {
    'worklet';
    cancelAnimation(x); cancelAnimation(y); cancelAnimation(lift);
    walking.value = 0; holding.value = 0; touchMode.value = 1;
    lift.value = 0; lean.value = 0;
    jelly.value = reduceMotion ? 0 : withTiming(0.65, {duration: 100});
    runOnJS(setInteracting)(true);
  };
  const finishTouch = () => {
    'worklet';
    touchMode.value = 0;
    jelly.value = reduceMotion ? 0 : withSpring(0, SOFT);
    lean.value = reduceMotion ? 0 : withSpring(0, SOFT);
    runOnJS(setInteracting)(false);
  };
  const hold = Gesture.Pan().enabled(active).maxPointers(1).activateAfterLongPress(240)
    .onBegin(begin)
    .onStart(() => {
      if (!available.value) return;
      touchMode.value = 2; holding.value = 1; startX.value = x.value; startY.value = y.value;
      jelly.value = reduceMotion ? 0 : withSpring(-0.65, SOFT);
      lift.value = reduceMotion ? -size * 0.22 : withSpring(-size * 0.55, {damping: 16, stiffness: 180});
      runOnJS(notify)('held');
    })
    .onUpdate(event => {
      if (!available.value || touchMode.value !== 2) return;
      const point = worldGroundPoint({x: startX.value + event.translationX / width, y: startY.value + event.translationY / height});
      x.value = point.x; y.value = point.y;
      if (!reduceMotion) lean.value = withSpring(Math.max(-9, Math.min(9, event.velocityX / 110)), SOFT);
    })
    .onFinalize((_event, success) => {
      if (touchMode.value !== 2) {if (touchMode.value === 1) finishTouch(); return;}
      if (!available.value) return;
      const point = worldGroundPoint({x: x.value, y: y.value});
      x.value = point.x; y.value = point.y;
      touchMode.value = 0;
      lean.value = reduceMotion ? 0 : withSpring(0, SOFT);
      lift.value = withTiming(0, {duration: reduceMotion ? 0 : 240, easing: Easing.in(Easing.quad)}, finished => {
        if (!finished || !available.value) return;
        holding.value = 0;
        jelly.value = reduceMotion ? 0 : withSequence(withTiming(1, {duration: 65}), withSpring(0, SOFT));
        runOnJS(setInteracting)(false);
        if (success) runOnJS(notify)('land');
      });
    });
  const stroke = Gesture.Pan().enabled(active).maxPointers(1).activeOffsetX([-10, 10]).failOffsetY([-18, 18])
    .onStart(() => {
      cancelAnimation(x); cancelAnimation(y); walking.value = 0;
      touchMode.value = 3; downX.value = 0; petDistance.value = 0;
      runOnJS(setInteracting)(true);
    })
    .onUpdate(event => {
      petDistance.value += Math.abs(event.translationX - downX.value); downX.value = event.translationX;
      if (!reduceMotion) {
        jelly.value = withSpring(0.4 + Math.min(0.3, Math.abs(event.velocityX) / 2000), SOFT);
        lean.value = withSpring(Math.max(-6, Math.min(6, event.translationX / 9)), SOFT);
      }
    })
    .onFinalize((_event, success) => {
      if (touchMode.value !== 3) return;
      finishTouch();
      if (success && petDistance.value > 20) runOnJS(notify)('pet');
    });
  const tap = Gesture.Tap().enabled(active).maxDuration(240).maxDistance(10).onEnd((_event, success) => {
    if (!success || !available.value) return;
    finishTouch(); runOnJS(notify)('greet');
  });
  const gesture = Gesture.Race(hold, stroke, tap);
  const rootStyle = useAnimatedStyle(() => ({
    zIndex: holding.value ? 999 : Math.round(y.value * 1000),
    transform: [{translateX: x.value * width - size / 2}, {translateY: y.value * height - size * 0.92}],
  }));
  const perspective = useAnimatedStyle(() => {
    const scale = worldResidentScale(y.value);
    return {transform: [{translateY: (1 - scale) * size * 0.42}, {scale}]};
  });
  const body = useAnimatedStyle(() => {
    const step = walking.value ? Math.sin(gait.value) : 0;
    const sy = 1 - jelly.value * 0.17 - breath.value * 0.014;
    return {transform: [
      {translateY: lift.value + (1 - sy) * size * 0.42 - Math.abs(step) * size * 0.021},
      {rotate: `${lean.value + step * 2.2}deg`},
      {scaleX: 1 + jelly.value * 0.14 + breath.value * 0.011}, {scaleY: sy},
    ]};
  });
  const shadow = useAnimatedStyle(() => {
    const air = Math.min(1, Math.abs(lift.value) / (size * 0.55));
    return {opacity: 1 - air * 0.65, transform: [{scaleX: worldResidentScale(y.value) * (1 + air * 0.45)}, {scaleY: 1 + air * 0.3}]};
  });
  const mood: MascotMood = touchMood ?? (interacting || pose === 'eating' ? 'happy' : p.resting || pose === 'sleeping' ? 'sleepy' : 'normal');
  useEffect(() => {
    blink.value = 0;
    if (!active || reduceMotion || mood !== 'normal') return;
    blink.value = withRepeat(withDelay(4100, withSequence(withTiming(1, {duration: 80}), withTiming(0, {duration: 130}))), -1);
    return () => cancelAnimation(blink);
  }, [active, reduceMotion, mood, blink]);
  const blinkStyle = useAnimatedStyle(() => ({opacity: blink.value}));
  const activity = pose === 'walking' ? 'おさんぽしています' : pose === 'sleeping' ? 'ひと休みしています' : pose === 'eating' ? 'おやつの時間' : pose === 'watching' ? '景色を眺めています' : 'のんびりしています';
  const acknowledge = (kind: ResidentInteraction) => {
    if (!active) return;
    notify(kind);
    if (!reduceMotion) jelly.value = withSequence(withTiming(0.8, {duration: 90}), withSpring(0, SOFT));
  };
  return <GestureDetector gesture={gesture} touchAction="none">
    <Animated.View testID="room-resident" style={[s.root, {width: size, height: size}, rootStyle]} accessible accessibilityRole="button"
      accessibilityLabel={`${p.mascotName}にふれる。${activity}`} accessibilityHint="タップでごあいさつ。横になでると喜びます。長押しで抱っこ。地面やおさんぽ先を選ぶと歩きます"
      accessibilityActions={[{name: 'activate', label: 'ごあいさつ'}, {name: 'pet', label: 'なでる'}, {name: 'talk', label: 'お話しする'}]}
      onAccessibilityAction={e => e.nativeEvent.actionName === 'talk' ? p.onChat() : acknowledge(e.nativeEvent.actionName === 'pet' ? 'pet' : 'greet')}
      onAccessibilityTap={() => acknowledge('greet')} tabIndex={0}
      {...(Platform.OS === 'web' ? {onKeyDown: (e: React.KeyboardEvent) => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); acknowledge('greet');}}} : {})}>
      <Animated.View pointerEvents="none" testID="resident-contact-shadow" style={[s.shadow, {height: size * 0.3}, shadow]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 30">
          <Defs><RadialGradient id="residentGround"><Stop offset="0" stopColor="#34251A" stopOpacity="0.52"/><Stop offset="0.45" stopColor="#493525" stopOpacity="0.22"/><Stop offset="1" stopColor="#493525" stopOpacity="0"/></RadialGradient></Defs>
          <Ellipse cx="57" cy="17" rx="42" ry="10" fill="url(#residentGround)"/>
          <Ellipse cx="50" cy="12" rx="26" ry="4" fill="url(#residentGround)"/>
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={perspective}>
        <Animated.View testID="resident-body" style={body}>
          {p.effect && <Image source={{uri: p.effect.uri}} resizeMode="contain" style={{position: 'absolute', width: size * p.effect.scale * 1.3, height: size * p.effect.scale * 1.3, left: -size * 0.15 + p.effect.x, top: -size * 0.15 + p.effect.y}}/>}
          <StaticMascot stage={p.stage} mood={mood} size={size}/>
          {getCharacter(p.stage).key === 'egg' && <Animated.View style={[StyleSheet.absoluteFill, blinkStyle]}><StaticMascot stage={p.stage} mood="normal" size={size} blink/></Animated.View>}
          <View style={[StyleSheet.absoluteFill, {opacity: p.period === 'night' ? 0.18 : 0.13}]}>
            <StaticMascot stage={p.stage} mood={mood} size={size} tintColor={p.period === 'night' ? '#717CAB' : '#DFB878'}/>
          </View>
          {p.wear && <Image source={{uri: p.wear.uri}} resizeMode="contain" style={{position: 'absolute', ...roomWearableFrame(p.wear.id, getCharacter(p.stage).key, size, p.wear)}}/>}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  </GestureDetector>;
}
const s = StyleSheet.create({root: {position: 'absolute', left: 0, top: 0}, shadow: {position: 'absolute', width: '100%', left: 0, bottom: '-8%'}});
