import {mapGroundBounds,type WorldMapId} from './worldMaps';
import {groundRollStep} from './bowling';
export type RollingState={x:number;y:number;vx:number;vy:number;hit:boolean};
/** Velocity is in scene widths / second. Vertical projection is converted by
 * aspect, so speed and friction are independent of viewport size / frame rate. */
export function rollStep(state:RollingState,dt:number,aspect:number,map:WorldMapId):RollingState {
  'worklet';
  const delta=Math.min(1/30,Math.max(0,dt));
  const y=state.y+state.vy*Math.exp(-1.35*delta)*delta/aspect;
  const bounds=mapGroundBounds(map,y);
  const row=mapGroundBounds(map,Math.max(bounds.minY+.018,Math.min(bounds.maxY-.018,y)));
  return groundRollStep(state,dt,aspect,{...bounds,minX:row.minX,maxX:row.maxX});
}
