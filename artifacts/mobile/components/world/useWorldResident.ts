import { useEffect, useRef, useState } from 'react';
import { cancelAnimation, Easing, runOnJS, withTiming, type SharedValue } from 'react-native-reanimated';
import { chooseResidentActivity, type ResidentPose } from '@/utils/residentRoutine';
import { WORLD_PLACES, WORLD_TRAIL, worldActivity, worldWalkDuration, worldWalkingRoute, type WorldDestination } from '@/utils/worldGeometry';
import type { RoomPoint } from '@/utils/roomGeometry';
import type { WorldPeriod } from '@/utils/worldTime';

type Props = {
  active: boolean; interacting: boolean; reduceMotion: boolean; resting: boolean;
  meal: number; rest: number; period: WorldPeriod; daySeed: number;
  x: SharedValue<number>; y: SharedValue<number>; walking: SharedValue<number>;
  destination: WorldDestination | null; onMealFinished?: () => void;
};

/** Presentation only: one completion callback, no wallet or persistence writes. */
export function useWorldResident(p: Props) {
  const [pose, setPose] = useState<ResidentPose>('idle');
  const handled = useRef({meal: 0, rest: 0, destination: 0});
  const turn = useRef(0);
  const complete = useRef(p.onMealFinished); complete.current = p.onMealFinished;
  const {active, interacting, reduceMotion, resting, meal, rest, period, daySeed, x, y, walking, destination} = p;
  useEffect(() => {
    if (interacting) setPose('idle');
    if (!active || interacting) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const later = (fn: () => void, delay: number) => {timer = setTimeout(() => {if (alive) fn();}, delay);};
    const walk = (target: RoomPoint, done: () => void) => {
      const route = worldWalkingRoute({x: x.value, y: y.value}, target);
      // Explicit travel is retained with reduced motion, as an immediate reposition.
      if (reduceMotion) {x.value = target.x; y.value = target.y; done(); return;}
      const step = (i: number) => {
        if (!alive) return;
        if (i === route.length) {walking.value = 0; done(); return;}
        setPose('walking'); walking.value = 1;
        const point = route[i];
        const duration = worldWalkDuration({x: x.value, y: y.value}, point);
        const config = {duration, easing: Easing.inOut(Easing.sin)};
        const advance = (finished?: boolean) => { 'worklet'; if (finished) runOnJS(step)(i + 1); };
        // Timing an unchanged axis completes immediately. Wait on the moving axis,
        // otherwise a horizontal leg skips its corner or declares arrival early.
        if (Math.abs(point.x - x.value) > Math.abs(point.y - y.value)) {
          y.value = withTiming(point.y, config);
          x.value = withTiming(point.x, config, advance);
        } else {
          x.value = withTiming(point.x, config);
          y.value = withTiming(point.y, config, advance);
        }
      };
      step(0);
    };
    const run = () => {
      if (!alive) return;
      // A successful food request always wins; interrupted meals resume once.
      const mealPending = meal > handled.current.meal;
      const restPending = rest > handled.current.rest;
      if (!mealPending && !restPending && destination && destination.id > handled.current.destination) {
        handled.current.destination = destination.id;
        walk(destination.point, () => {setPose('idle'); later(run, 18000);});
        return;
      }
      if (reduceMotion && !mealPending && !restPending && !resting) {setPose('idle'); return;}
      const activity = mealPending || restPending || resting
        ? chooseResidentActivity({meal, rest}, handled.current, resting, turn.current)
        : worldActivity(period, daySeed, turn.current);
      // In daylight the resident also visits the terrace/path without a new screen.
      const stroll = !resting && !mealPending && !restPending && period !== 'night' && turn.current % 3 === 2;
      const target = stroll ? WORLD_TRAIL.garden.point : WORLD_PLACES[activity];
      const finish = () => {
        if (!alive) return;
        setPose(stroll ? 'watching' : activity === 'meal' ? 'eating' : activity === 'bed' ? 'sleeping' : activity === 'window' ? 'watching' : 'idle');
        later(() => {
          if (activity === 'meal' && !stroll) {handled.current.meal = meal; complete.current?.();}
          if (activity === 'bed' && !stroll) handled.current.rest = rest;
          turn.current++;
          later(run, 10000);
        }, activity === 'meal' ? 3400 : 12000);
      };
      // Existing reduced-motion meal/rest alternative: expression, no unsolicited travel.
      if (reduceMotion) finish(); else walk(target, finish);
    };
    const requested = meal > handled.current.meal || rest > handled.current.rest || (destination && destination.id > handled.current.destination);
    later(run, requested ? 60 : 6500);
    return () => {alive = false; clearTimeout(timer); cancelAnimation(x); cancelAnimation(y); walking.value = 0;};
  }, [active, interacting, reduceMotion, resting, meal, rest, period, daySeed, x, y, walking, destination]);
  return interacting ? 'idle' : pose;
}
