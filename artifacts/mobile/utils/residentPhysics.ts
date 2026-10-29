import {homeMovePoint} from './homeGeometry.ts';
import {mapGroundBounds,type WorldMapId} from './worldMaps';
import {groundRollStep} from './bowling';
export type RollingState={x:number;y:number;vx:number;vy:number;hit:boolean};
/** Velocity is in scene widths / second. Vertical projection is converted by
 * aspect, so speed and friction are independent of viewport size / frame rate. */
export function rollStep(state:RollingState,dt:number,aspect:number,map:WorldMapId):RollingState {
  'worklet';
  if(map==='home'){
    const delta=Math.min(1/30,Math.max(0,dt)),friction=Math.exp(-1.35*delta);
    const vx=state.vx*friction,vy=state.vy*friction;
    const wanted={x:state.x+vx*delta,y:state.y+vy*delta/aspect};
    const point=homeMovePoint(state,wanted),hitX=Math.abs(point.x-wanted.x)>.0001,hitY=Math.abs(point.y-wanted.y)>.0001;
    return {...point,vx:hitX?-vx*.45:vx,vy:hitY?-vy*.45:vy,hit:hitX||hitY};
  }
  const delta=Math.min(1/30,Math.max(0,dt));
  const y=state.y+state.vy*Math.exp(-1.35*delta)*delta/aspect;
  const bounds=mapGroundBounds(map,y);
  const row=mapGroundBounds(map,Math.max(bounds.minY+.018,Math.min(bounds.maxY-.018,y)));
  return groundRollStep(state,dt,aspect,{...bounds,minX:row.minX,maxX:row.maxX});
}
