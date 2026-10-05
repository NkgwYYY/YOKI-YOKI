import type { RoomPoint } from './roomGeometry';
import type { ResidentActivity, ResidentStep } from './residentRoutine';
import type { WorldPeriod } from './worldTime';

/** Coordinates measured in the new 1024×1536 illustration, shared by hit areas and feet. */
export const WORLD_PLACES: Record<ResidentActivity, RoomPoint> = {
  idle: {x: 0.50, y: 0.48}, window: {x: 0.36, y: 0.385},
  bed: {x: 0.72, y: 0.375}, meal: {x: 0.66, y: 0.605},
};
export function fitWorld(width: number, height: number) {
  if (width <= 0 || height <= 0) return {width: 0, height: 0, left: 0, top: 0};
  // Landscape pulls the camera back. Portrait fills the display; key props are in the safe centre.
  const wide = width > height;
  const sceneWidth = wide ? Math.min(width * 0.62, height * 1.2) : Math.max(width, height * 2 / 3);
  const sceneHeight = sceneWidth * 1.5;
  return {width: sceneWidth, height: sceneHeight, left: ((wide ? width * 0.62 : width) - sceneWidth) / 2, top: Math.min(0, (height - sceneHeight) * 0.38)};
}
export function safeWorldPoint(point: RoomPoint): RoomPoint {
  const y = Math.max(0.43, Math.min(0.71, point.y));
  let x = Math.max(0.34, Math.min(0.72, point.x));
  if (y < 0.51) x = Math.max(0.40, Math.min(0.62, x));
  return {x, y};
}
export function worldActivity(period: WorldPeriod, seed: number, turn: number): ResidentActivity {
  const activities: ResidentActivity[] = period === 'night' ? ['bed', 'window', 'idle', 'bed'] : ['window', 'idle', 'idle', 'bed'];
  return activities[(seed + turn) % activities.length];
}
export function worldResidentSteps(activity: ResidentActivity, from: RoomPoint, reduceMotion: boolean): ResidentStep[] {
  const pose = activity === 'meal' ? 'eating' : activity === 'bed' ? 'sleeping' : activity === 'window' ? 'watching' : 'idle';
  const final: ResidentStep = {pose, duration: activity === 'meal' ? 3400 : activity === 'bed' ? 14000 : 7000};
  if (reduceMotion) return [final];
  const target = WORLD_PLACES[activity];
  if (Math.hypot(target.x - from.x, target.y - from.y) < 0.02) return [final];
  const steps: ResidentStep[] = [];
  let at = from;
  const walk = (point: RoomPoint) => {
    const d = Math.hypot(point.x - at.x, point.y - at.y);
    if (d > 0.012) steps.push({pose: 'walking', point, duration: Math.max(420, Math.round(d * 6500))});
    at = point;
  };
  // Move past the foot of the bed before crossing the rug, never through the bed or notebook.
  if (from.x > 0.63 && from.y < 0.43) walk({x: 0.60, y: 0.435});
  walk({x: 0.51, y: Math.max(0.43, at.y)});
  if (activity === 'bed') walk({x: 0.60, y: 0.435});
  else walk({x: 0.51, y: Math.max(0.43, target.y)});
  walk(target);
  return [...steps, final];
}

