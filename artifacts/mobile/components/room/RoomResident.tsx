import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { Mascot, StaticMascot } from '@/components/Mascot';
import { getCharacter, type MascotMood, type MascotStage } from '@/utils/mascotUtils';
import { roomWearableFrame } from '@/utils/roomWearable';
import { ROOM_STOPS, safeRoomPoint } from '@/utils/roomGeometry';
import { useResidentRoutine } from './useResidentRoutine';
import { safeWorldPoint, WORLD_PLACES } from '@/utils/worldGeometry';
import type { WorldPeriod } from '@/utils/worldTime';
export type ResidentInteraction = 'greet' | 'pet' | 'space' | 'held' | 'land';

export type ResidentItem = { id: string; uri: string; x: number; y: number; scale: number };
type Props = {
  width: number; height: number; stage: MascotStage; growthSize: number;
  active: boolean; reduceMotion: boolean; resting: boolean; reaction: number; meal: number; rest: number;
  name: string; onPress: () => void; wear?: ResidentItem; effect?: ResidentItem;
  world?: boolean; period?: WorldPeriod; daySeed?: number;
  onInteract?: (interaction: ResidentInteraction) => void; onMealFinished?: () => void;
};

export function RoomResident(props: Props) {
  const { width, height, stage, growthSize, active, reduceMotion, resting, reaction, name, wear, effect } = props;
  const latest = useRef(props); latest.current = props;
  const initial = props.world ? WORLD_PLACES.idle : ROOM_STOPS[0];
  const position = useRef(new Animated.ValueXY(initial)).current;
  const foot = useRef(initial);
  const lift = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const mealNod = useRef(new Animated.Value(0)).current;
  const [depth, setDepth] = useState(640);
  const [held, setHeld] = useState(false);
  const [happy, setHappy] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [touchMood, setTouchMood] = useState<MascotMood | null>(null);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const taps = useRef({count: 0, at: 0});
  const gestureActive = useRef(false);
  const gestureGeneration = useRef(0);
  const lifted = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef(initial);
  const lastReaction = useRef(reaction);
  const size = width * 0.29 * Math.max(0.85, Math.min(1.2, growthSize));
  const pose = useResidentRoutine({ active, reduceMotion, resting, interacting,
    meal: props.meal, rest: props.rest, position, foot, world: props.world, period: props.period, daySeed: props.daySeed, onMealFinished: props.onMealFinished });
  const acknowledge = (pet = false) => {
    const now = Date.now();
    taps.current = {count: now - taps.current.at < 1800 ? taps.current.count + 1 : 1, at: now};
    const kind = pet ? 'pet' : taps.current.count >= 3 ? 'space' : 'greet';
    setTouchMood(kind === 'pet' ? 'happy' : 'normal');
    clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => setTouchMood(null), 2400);
    latest.current.onInteract?.(kind);
    if (!latest.current.reduceMotion) {
      squash.setValue(kind === 'pet' ? 0.5 : 0.25);
      Animated.spring(squash, {toValue: 0, friction: 5, tension: 120, useNativeDriver: false}).start();
    }
  };
  const acknowledgeRef = useRef(acknowledge); acknowledgeRef.current = acknowledge;
  useEffect(() => {
    mealNod.setValue(0);
    if (!active || reduceMotion || interacting || pose !== 'eating') return;
    const nod = Animated.loop(Animated.sequence([
      Animated.timing(mealNod, { toValue: 1, duration: 450, useNativeDriver: false }),
      Animated.timing(mealNod, { toValue: 0, duration: 550, useNativeDriver: false }),
    ]));
    nod.start();
    return () => { nod.stop(); mealNod.setValue(0); };
  }, [active, reduceMotion, interacting, pose, mealNod]);

  useEffect(() => {
    const listener = position.addListener(value => { foot.current = value; setDepth(Math.round(value.y * 1000)); });
    return () => position.removeListener(listener);
  }, [position]);
  useEffect(() => {
    if (!active || interacting || reaction === lastReaction.current) return;
    lastReaction.current = reaction;
    setHappy(true);
    shine.setValue(0);
    if (active && !reduceMotion) {
      Animated.sequence([
        Animated.timing(lift, { toValue: -18, duration: 220, useNativeDriver: false }),
        Animated.timing(lift, { toValue: 0, duration: 280, useNativeDriver: false }),
      ]).start();
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(shine, { toValue: 0, duration: 1600, useNativeDriver: false }),
      ]).start();
    }
    const timer = setTimeout(() => setHappy(false), 2600);
    return () => { clearTimeout(timer); shine.stopAnimation(); lift.stopAnimation(); };
  }, [reaction, active, interacting, reduceMotion, lift, shine]);
  useEffect(() => {
    if (!active) {
      clearTimeout(touchTimer.current); setTouchMood(null);
      clearTimeout(holdTimer.current); position.stopAnimation(); lift.stopAnimation(); squash.stopAnimation(); shine.stopAnimation();
      lift.setValue(0); squash.setValue(0); shine.setValue(0);
      gestureActive.current = false; lifted.current = false; setHeld(false); setHappy(false); setInteracting(false);
    }
    return () => { gestureGeneration.current++; clearTimeout(holdTimer.current); clearTimeout(touchTimer.current); position.stopAnimation(); lift.stopAnimation(); squash.stopAnimation(); shine.stopAnimation(); };
  }, [active, position, lift, squash, shine]);

  const responder = useMemo(() => {
    let moved = false;
    let stroked = false;
    let travel = 0;
    let previousX = 0;
    const release = (cancelled: boolean) => {
      // Native cancellation/background cleanup may already have ended this touch.
      if (!gestureActive.current) return;
      const generation = gestureGeneration.current;
      clearTimeout(holdTimer.current);
      gestureActive.current = false;
      const wasLifted = lifted.current;
      lifted.current = false;
      if (!wasLifted) {
        setInteracting(false);
        if (!cancelled && latest.current.onInteract && (!moved || stroked)) acknowledgeRef.current(stroked);
        else if (!cancelled && !moved) latest.current.onPress();
        return;
      }
      // A bed is a routine-only destination; dropping always returns to clear floor.
      position.setValue((latest.current.world ? safeWorldPoint : safeRoomPoint)(foot.current));
      const land = () => {
        if (generation !== gestureGeneration.current || !latest.current.active) return;
        setHeld(false); setInteracting(false);
        if (!cancelled) latest.current.onInteract?.('land');
        if (!latest.current.active || latest.current.reduceMotion) return;
        squash.setValue(1);
        Animated.spring(squash, { toValue: 0, friction: 5, tension: 130, useNativeDriver: false }).start();
      };
      if (latest.current.reduceMotion) { lift.setValue(0); land(); }
      else Animated.timing(lift, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(({ finished }) => { if (finished) land(); });
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.active,
      onPanResponderGrant: () => {
        // A previous landing must never end a newly started hold or restart its routine.
        gestureGeneration.current++;
        lift.stopAnimation(); squash.stopAnimation();
        lift.setValue(0); squash.setValue(0); setHeld(false);
        moved = false; stroked = false; travel = 0; previousX = 0; setInteracting(true);
        gestureActive.current = true; lifted.current = false;
        position.stopAnimation(); start.current = foot.current;
        holdTimer.current = setTimeout(() => {
          if (!gestureActive.current) return;
          lifted.current = true; setHeld(true);
          latest.current.onInteract?.('held');
          Animated.timing(lift, { toValue: -35, duration: latest.current.reduceMotion ? 0 : 180, useNativeDriver: false }).start();
        }, 260);
      },
      onPanResponderMove: (_, g) => {
        if (!lifted.current) {
          travel += Math.abs(g.dx - previousX); previousX = g.dx;
          if (travel > 42) stroked = true;
          if (Math.abs(g.dx) + Math.abs(g.dy) > 12) { moved = true; clearTimeout(holdTimer.current); }
          return;
        }
        const p = latest.current;
        position.setValue((p.world ? safeWorldPoint : safeRoomPoint)({ x: start.current.x + g.dx / p.width, y: start.current.y + Math.max(0, g.dy) / p.height }));
        lift.setValue(Math.max(-p.height * 0.28, Math.min(-20, g.dy - 35)));
      },
      onPanResponderRelease: () => release(false),
      onPanResponderTerminate: () => release(true),
      onPanResponderTerminationRequest: () => true,
    });
  }, [position, lift, squash]);
  const mood: MascotMood = touchMood ?? (happy || held || pose === 'eating' ? 'happy' : resting || pose === 'sleeping' ? 'sleepy' : 'normal');
  const activityLabel = pose === 'eating' ? 'おやつの時間' : pose === 'sleeping' ? 'ひと休みしています' : pose === 'watching' ? '窓を眺めています' : pose === 'walking' ? '部屋を歩いています' : 'のんびりしています';
  return (
    <Animated.View testID="room-resident" accessibilityRole="button" accessibilityLabel={`${name}${props.world ? 'にふれる' : 'と話す'}。${activityLabel}`}
      accessibilityHint={props.world ? 'タップでごあいさつ。横に撫でると喜びます。長押しで抱っこ。お話しは画面下のボタンから' : 'タップで話す。長押しすると持ち上げられます'} accessible
      accessibilityValue={{ text: activityLabel }}
      onAccessibilityTap={() => props.onInteract ? acknowledgeRef.current() : props.onPress()}
      accessibilityActions={props.world ? [{name: 'activate', label: 'ごあいさつ'}, {name: 'pet', label: 'なでる'}, {name: 'talk', label: 'お話しする'}] : undefined}
      onAccessibilityAction={event => {if (event.nativeEvent.actionName === 'talk') props.onPress(); else if (props.onInteract) acknowledgeRef.current(event.nativeEvent.actionName === 'pet');}}
      {...responder.panHandlers}
      tabIndex={0}
      {...(Platform.OS === 'web' ? { onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); latest.current.onInteract ? acknowledgeRef.current() : latest.current.onPress(); }
      } } : {})}
      style={[s.root, { width: size, height: size, zIndex: held ? 999 : depth,
        left: Animated.subtract(Animated.multiply(position.x, width), size / 2),
        top: Animated.subtract(Animated.multiply(position.y, height), size * 0.92) }]}>
      <View pointerEvents="none" style={s.shadow} />
      <Animated.View pointerEvents="none" style={{ transform: [{ translateY: lift },
        { rotate: mealNod.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '3deg'] }) },
        { scaleX: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.13] }) },
        { scaleY: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.87] }) }] }}>
        {effect && <Image source={{ uri: effect.uri }} style={{ position: 'absolute', width: size * effect.scale * 1.3, height: size * effect.scale * 1.3, left: -size * 0.15 + effect.x, top: -size * 0.15 + effect.y }} resizeMode="contain" />}
        {active && !reduceMotion && !held
          ? <Mascot stage={stage} mood={mood} size={size} preferStatic />
          : <StaticMascot stage={stage} mood={mood} size={size} />}
        {wear && <Image source={{ uri: wear.uri }} resizeMode="contain" style={{ position: 'absolute', ...roomWearableFrame(wear.id, getCharacter(stage).key, size, wear) }} />}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[s.halo, { opacity: shine, transform: [{ scale: shine.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }] }]} />
    </Animated.View>
  );
}
const s = StyleSheet.create({
  root: { position: 'absolute' },
  shadow: { position: 'absolute', left: '20%', bottom: '2%', width: '60%', height: '10%', borderRadius: 100, backgroundColor: '#503521', opacity: 0.24 },
  halo: { position: 'absolute', left: '-10%', top: '-10%', width: '120%', height: '120%', borderRadius: 200, borderWidth: 2, borderColor: '#FFE9AF', backgroundColor: '#FFE9AF33' },
});
