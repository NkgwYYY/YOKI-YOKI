import {useEffect, useRef} from 'react';
import {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';

/** UI-thread motion only; no per-frame React state or animation while off screen. */
export function useResidentIdle({active, reduceMotion, size, tempo, greeting, strength = 1}: {
  active: boolean; reduceMotion: boolean; size: number; tempo: number; greeting: number; strength?: number;
}) {
  const sway = useSharedValue(0), breath = useSharedValue(0), nod = useSharedValue(0);
  const seenGreeting = useRef(greeting);
  useEffect(() => {
    if (active && !reduceMotion) {
      const ease = Easing.inOut(Easing.sin);
      sway.value = withRepeat(withSequence(
        withTiming(1, {duration: tempo, easing: ease}),
        withTiming(-1, {duration: tempo * 2, easing: ease}),
        withTiming(0, {duration: tempo, easing: ease}),
      ), -1);
      breath.value = withRepeat(withSequence(
        withTiming(1, {duration: tempo * .75, easing: ease}),
        withTiming(0, {duration: tempo, easing: ease}),
      ), -1);
    }
    return () => {
      cancelAnimation(sway); cancelAnimation(breath); cancelAnimation(nod);
      sway.value = 0; breath.value = 0; nod.value = 0;
    };
  }, [active, reduceMotion, tempo, sway, breath, nod]);
  useEffect(() => {
    const changed = greeting !== seenGreeting.current;
    seenGreeting.current = greeting;
    if (!changed || !greeting || !active || reduceMotion) return;
    nod.value = withSequence(withTiming(1, {duration: 140}), withTiming(-.45, {duration: 150}), withTiming(0, {duration: 140}));
  }, [greeting, active, reduceMotion, nod]);
  return useAnimatedStyle(() => ({transform: [
    {translateY: (-breath.value * size * .022 + nod.value * size * .025) * strength},
    {rotate: `${(sway.value * 2.2 + nod.value * 5) * strength}deg`},
    {scale: 1 + (breath.value * .009 - nod.value * .02) * strength},
  ]}));
}
