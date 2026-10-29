import {homeDropPoint,homeRoute,HOME_BED,HOME_IDLE,HOME_WINDOW} from './homeGeometry.ts';
import type { RoomPoint } from './roomGeometry';
import type { ResidentActivity, ResidentStep } from './residentRoutine';
import type { WorldPeriod } from './worldTime';

/** Furniture and walking coordinates for the bounded plush dollhouse illustration. */
export const WORLD_PLACES: Record<ResidentActivity, RoomPoint> = {
  idle: HOME_IDLE, window: HOME_WINDOW,
  bed: HOME_BED, meal: {x: .53, y: .74},
};
/** A keepsake sits at the near edge of the rug; feet stop alongside its base. */
export const WORLD_KEEPSAKE={left:.76,top:.75,scale:.09,depth:800,approach:{x:.66,y:.78}} as const;
export function fitWorld(width: number, height: number) {
  if (width <= 0 || height <= 0) return {width: 0, height: 0, left: 0, top: 0};
  // Landscape pulls the camera back. Portrait fills the display; key props are in the safe centre.
  const wide = width > height;
  const sceneWidth = wide ? Math.min(width * 0.62, height * 1.2) : Math.max(width, height * 2 / 3);
  const sceneHeight = sceneWidth * 1.5;
  return {width: sceneWidth, height: sceneHeight, left: ((wide ? width * 0.62 : width) - sceneWidth) / 2, top: Math.min(0, (height - sceneHeight) * 0.38)};
}
/** Eye-level art keeps the rug under the resident, including wide screens. */
export function fitEyeLevelHome(width:number,height:number){
  if(width<=0||height<=0)return {width:0,height:0,left:0,top:0};
  const aspect=width>height?7/4:4/7;
  const sceneWidth=Math.max(width,height*aspect),sceneHeight=sceneWidth/aspect;
  return {width:sceneWidth,height:sceneHeight,left:(width-sceneWidth)/2,top:(height-sceneHeight)/2};
}
/** One continuous, aspect-preserving scene covers the entire outdoor viewport. */
export function fitOutdoorWorld(width: number, height: number) {
  if (width <= 0 || height <= 0) return {width:0,height:0,left:0,top:0};
  const sceneWidth=Math.max(width,height*2/3),sceneHeight=sceneWidth*1.5;
  return {width:sceneWidth,height:sceneHeight,left:(width-sceneWidth)/2,
    top:Math.max(height-sceneHeight,Math.min(0,height*.55-sceneHeight*.57))};
}
/** Follow only inside the illustration's spare height, so no background edge opens. */
export function outdoorCameraOffset(y:number,height:number,viewportHeight:number,frameTop:number,clearBottom:number) {
  'worklet';
  return Math.max(viewportHeight-height-frameTop,Math.min(-frameTop,Math.min(0,clearBottom-frameTop-y*height)));
}
export function safeWorldPoint(point: RoomPoint): RoomPoint {return worldGroundPoint(point);}
export function worldActivity(period: WorldPeriod, seed: number, turn: number): ResidentActivity {
  const activities: ResidentActivity[] = period === 'night' ? ['bed', 'window', 'idle', 'bed'] : ['window', 'bed', 'idle', 'window'];
  return activities[(seed + turn) % activities.length];
}
export function worldResidentSteps(activity: ResidentActivity, from: RoomPoint, reduceMotion: boolean): ResidentStep[] {
  const pose = activity === 'meal' ? 'eating' : activity === 'bed' ? 'sleeping' : activity === 'window' ? 'watching' : 'idle';
  const final: ResidentStep = {pose, duration: activity === 'meal' ? 3400 : activity === 'bed' ? 14000 : 7000};
  if (reduceMotion || activity === 'meal') return [final];
  const target = WORLD_PLACES[activity];
  if (Math.hypot(target.x - from.x, target.y - from.y) < 0.02) return [final];
  const steps: ResidentStep[] = [];
  let at = from;
  const walk = (point: RoomPoint) => {
    const d = Math.hypot(point.x - at.x, point.y - at.y);
    if (d > 0.012) steps.push({pose: 'walking', point, duration: Math.max(420, Math.round(d * 6500))});
    at = point;
  };
  for(const point of worldWalkingRoute(from,target))walk(point);
  return [...steps, final];
}


/** Clear connected ground, measured against the same illustration (no crossings through furniture/water). */
export const WORLD_TRAIL = {
  room: {label: '部屋', point: {x: .50, y: .68}},
  terrace: {label: 'ラグ', point: {x: .50, y: .74}},
  garden: {label: 'ラグの手前', point: {x: .50, y: .82}},
} as const;
export type WorldDestination = {id: number; point: RoomPoint};

export function worldGroundBounds(y: number) {
  'worklet';
  // Window, table and bed border one connected rug; no travel outside the floor.
  if(y<.51)return {left:.35,right:.60};
  if(y<.61)return {left:.38,right:.61};
  return {left:.35,right:.62};
}
export function worldGroundPoint(point: RoomPoint): RoomPoint {
  'worklet';
  return homeDropPoint(point);
}
export function isWorldGround(point: RoomPoint) {
  const safe = worldGroundPoint(point);
  return Math.abs(safe.x - point.x) < 0.001 && Math.abs(safe.y - point.y) < 0.001;
}
/** Feet anchor the perspective, so holding does not make the body grow toward the camera. */
export function worldResidentScale(y: number) {
  'worklet';
  return y<.45?.94:Math.max(.94,Math.min(1.10,.94+(y-.60)*.55));
}
export function worldCameraOffset(y: number, height: number, viewportHeight = height, frameTop = 0) {
  'worklet';
  if (height <= 0 || viewportHeight <= 0) return 0;
  const follow = -Math.max(0, Math.min(height * 0.13, (y - 0.56) * height * 0.67));
  const desired=Math.min(follow,Math.min(0,viewportHeight-136-frameTop-y*height));
  return Math.max(viewportHeight-height-frameTop,Math.min(-frameTop,desired));
}
/** Deliberate walking speed in scene units; close taps still take time to settle. */
export function worldWalkDuration(from: RoomPoint, to: RoomPoint) {
  return Math.max(450, Math.round(Math.hypot(to.x - from.x, (to.y - from.y) * 1.5) * 10500));
}
export function worldWalkingRoute(from: RoomPoint, target: RoomPoint): RoomPoint[] {
  return homeRoute(from,target);
}
