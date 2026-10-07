import {mapGroundBounds,type WorldMapId} from './worldMaps';
export type RollingState={x:number;y:number;vx:number;vy:number;hit:boolean};
/** Velocity is in scene widths / second. Vertical projection is converted by
 * aspect, so speed and friction are independent of viewport size / frame rate. */
export function rollStep(state:RollingState,dt:number,aspect:number,map:WorldMapId):RollingState {
  'worklet';
  const delta=Math.min(1/30,Math.max(0,dt)),drag=Math.exp(-1.35*delta);
  let vx=state.vx*drag,vy=state.vy*drag,x=state.x+vx*delta,y=state.y+vy*delta/aspect,hit=false;
  const b=mapGroundBounds(map,y),margin=.018;
  if(y<b.minY+margin){y=b.minY+margin;vy=Math.abs(vy)*.58;hit=true;}
  else if(y>b.maxY-margin){y=b.maxY-margin;vy=-Math.abs(vy)*.58;hit=true;}
  const row=mapGroundBounds(map,y);
  if(x<row.minX+margin){x=row.minX+margin;vx=Math.abs(vx)*.58;hit=true;}
  else if(x>row.maxX-margin){x=row.maxX-margin;vx=-Math.abs(vx)*.58;hit=true;}
  return {x,y,vx,vy,hit};
}
