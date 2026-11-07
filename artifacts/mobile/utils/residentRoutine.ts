import type { RoomPoint } from './roomGeometry';

export type ResidentActivity = 'idle' | 'window' | 'bed' | 'meal';
export type ResidentPose = 'idle' | 'walking' | 'watching' | 'sleeping' | 'eating';
export type ResidentRequests = { meal: number; rest: number };
export type ResidentStep = { pose: ResidentPose; duration: number; point?: RoomPoint };

// Bed coordinates are on the painted mattress, not a general drag/drop destination.
export const RESIDENT_PLACES: Record<ResidentActivity, RoomPoint> = {
  idle: { x: 0.48, y: 0.64 }, window: { x: 0.30, y: 0.55 },
  bed: { x: 0.72, y: 0.39 }, meal: { x: 0.60, y: 0.84 },
};
const BED_STEP = { x: 0.60, y: 0.47 };
const BED_AISLE = { x: 0.50, y: 0.55 };
const IDLE_ACTIVITIES: ResidentActivity[] = ['window', 'idle', 'bed', 'idle'];

/** Only successful feeding emits a meal request; this module never changes stored rewards. */
export function chooseResidentActivity(requests: ResidentRequests, handled: ResidentRequests, resting: boolean, turn: number): ResidentActivity {
  if (requests.meal > handled.meal) return 'meal';
  if (requests.rest > handled.rest || resting) return 'bed';
  return IDLE_ACTIVITIES[turn % IDLE_ACTIVITIES.length];
}

export function buildResidentSteps(activity: ResidentActivity, from: RoomPoint): ResidentStep[] {
  const target = RESIDENT_PLACES[activity];
  const steps: ResidentStep[] = [];
  let at = from;
  const walk = (point: RoomPoint) => {
    const distance = Math.hypot(point.x - at.x, point.y - at.y);
    if (distance < 0.01) return;
    steps.push({ pose: 'walking', point, duration: Math.max(450, Math.round(distance * 7000)) });
    at = point;
  };
  if (Math.hypot(target.x - from.x, target.y - from.y) > 0.02) {
    // Always leave the mattress by its near edge before crossing the floor.
    if (from.y < 0.54) { walk(BED_STEP); walk(BED_AISLE); }
    walk({ x: 0.50, y: at.y });
    if (activity === 'bed') { walk(BED_AISLE); walk(BED_STEP); }
    else walk({ x: 0.50, y: target.y });
    walk(target);
  }
  steps.push({
    pose: activity === 'bed' ? 'sleeping' : activity === 'meal' ? 'eating' : activity === 'window' ? 'watching' : 'idle',
    duration: activity === 'bed' ? 12000 : activity === 'meal' ? 3200 : 6500,
  });
  return steps;
}

/** Non-motion alternative: keep the character in place and change only its original expression. */
export function residentSteps(activity: ResidentActivity, from: RoomPoint, reduceMotion: boolean) {
  const steps = buildResidentSteps(activity, from);
  return reduceMotion ? steps.filter(step => !step.point) : steps;
}
