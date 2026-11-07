import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Animated, Easing } from 'react-native';
import type { RoomPoint } from '@/utils/roomGeometry';
import { chooseResidentActivity, residentSteps, type ResidentPose, type ResidentRequests } from '@/utils/residentRoutine';

type Props = {
  active: boolean; reduceMotion: boolean; resting: boolean; interacting: boolean;
  meal: number; rest: number; position: Animated.ValueXY; foot: MutableRefObject<RoomPoint>;
};

/** Visual-only routines. Pausing or replaying them can never charge for food a second time. */
export function useResidentRoutine({ active, reduceMotion, resting, interacting, meal, rest, position, foot }: Props) {
  const [pose, setPose] = useState<ResidentPose>('idle');
  const handled = useRef<ResidentRequests>({ meal: 0, rest: 0 });
  const turn = useRef(0);
  useEffect(() => {
    if (!active || interacting) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const requests = { meal, rest };
    const run = () => {
      if (cancelled) return;
      const activity = chooseResidentActivity(requests, handled.current, resting, turn.current);
      // No unprompted wandering when motion is reduced.
      if (reduceMotion && meal <= handled.current.meal && rest <= handled.current.rest && !resting) {
        setPose('idle'); return;
      }
      const steps = residentSteps(activity, foot.current, reduceMotion);
      const advance = (index: number) => {
        if (cancelled) return;
        if (index === steps.length) {
          if (activity === 'meal') { handled.current.meal = meal; setPose('idle'); }
          if (activity === 'bed') handled.current.rest = rest;
          turn.current++;
          timer = setTimeout(run, 9000);
          return;
        }
        const step = steps[index];
        setPose(step.pose);
        if (step.point) {
          Animated.timing(position, { toValue: step.point, duration: step.duration,
            easing: Easing.inOut(Easing.sin), useNativeDriver: false }).start(({ finished }) => {
            if (finished && !cancelled) advance(index + 1);
          });
        } else timer = setTimeout(() => advance(index + 1), step.duration);
      };
      advance(0);
    };
    const requested = meal > handled.current.meal || rest > handled.current.rest || resting;
    // Returning from a gesture leaves a short calm interval before autonomous movement.
    timer = setTimeout(run, requested ? 350 : 6000);
    return () => { cancelled = true; clearTimeout(timer); position.stopAnimation(); };
  }, [active, interacting, meal, rest, resting, reduceMotion, position, foot]);
  return interacting ? 'idle' : pose;
}
