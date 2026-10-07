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


/** Clear connected ground, measured against the same illustration (no crossings through furniture/water). */
export const WORLD_TRAIL = {
  room: {label: '部屋', point: {x: 0.50, y: 0.47}},
  terrace: {label: 'テラス', point: {x: 0.51, y: 0.535}},
  garden: {label: '小道', point: {x: 0.56, y: 0.755}},
} as const;
export type WorldDestination = {id: number; point: RoomPoint};

export function worldGroundBounds(y: number) {
  'worklet';
  // Centre passage widens onto the lawn, then narrows between the stream and stones.
  if (y < 0.50) return {left: 0.40, right: 0.61};
  if (y < 0.56) return {left: 0.40, right: 0.66};
  if (y < 0.67) return {left: 0.39, right: 0.67};
  return {left: 0.44, right: 0.66};
}
export function worldGroundPoint(point: RoomPoint): RoomPoint {
  'worklet';
  const y = Math.max(0.43, Math.min(0.79, point.y));
  const bounds = worldGroundBounds(y);
  return {x: Math.max(bounds.left, Math.min(bounds.right, point.x)), y};
}
export function isWorldGround(point: RoomPoint) {
  const safe = worldGroundPoint(point);
  return Math.abs(safe.x - point.x) < 0.001 && Math.abs(safe.y - point.y) < 0.001;
}
/** Feet anchor the perspective, so holding does not make the body grow toward the camera. */
export function worldResidentScale(y: number) {
  'worklet';
  return Math.max(0.82, Math.min(1.20, 0.82 + (y - 0.375) * 0.92));
}
export function worldCameraOffset(y: number, height: number, viewportHeight = height, frameTop = 0) {
  'worklet';
  const follow = -Math.max(0, Math.min(height * 0.13, (y - 0.56) * height * 0.67));
  return Math.min(follow, Math.min(0, viewportHeight - 136 - frameTop - y * height));
}
/** Deliberate walking speed in scene units; close taps still take time to settle. */
export function worldWalkDuration(from: RoomPoint, to: RoomPoint) {
  return Math.max(450, Math.round(Math.hypot(to.x - from.x, (to.y - from.y) * 1.5) * 10500));
}
export function worldWalkingRoute(from: RoomPoint, target: RoomPoint): RoomPoint[] {
  const result: RoomPoint[] = [];
  let at = from;
  const add = (point: RoomPoint) => {
    if (Math.hypot(point.x - at.x, point.y - at.y) > 0.004) {result.push(point); at = point;}
  };
  if (from.x > 0.63 && from.y < 0.43) add({x: 0.60, y: 0.435});
  else if (from.y < 0.43) add({x: 0.43, y: 0.435});
  // Centre spine stays clear through all corridor-width changes.
  if (Math.abs(target.y - at.y) > 0.045) {
    add({x: 0.52, y: Math.max(0.435, at.y)});
    add({x: 0.52, y: Math.max(0.435, target.y)});
  }
  if (target.x > 0.63 && target.y < 0.43) add({x: 0.60, y: 0.435});
  add(target);
  return result;
}
