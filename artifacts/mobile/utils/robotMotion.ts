/** A quiet serpentine path across the open floor; one owner moves both riders. */
export const ROBOT_ROUTE=[{x:.42,y:.443},{x:.59,y:.444},{x:.60,y:.478},{x:.43,y:.474},{x:.42,y:.507},{x:.62,y:.513},{x:.63,y:.54},{x:.44,y:.54}] as const;
export function robotStep(x:number,y:number,target:number,dt:number,aspect:number,slow=false){
 'worklet';
 const point=ROBOT_ROUTE[target%ROBOT_ROUTE.length];
 const dx=point.x-x,dy=point.y-y,distance=Math.hypot(dx,dy*aspect);
 const travel=Math.max(0,Math.min(.05,dt))*(slow?.025:.052);
 if(distance<=travel)return {x:point.x,y:point.y,target:(target+1)%ROBOT_ROUTE.length};
 const t=distance>0?travel/distance:0;
 return {x:x+dx*t,y:y+dy*t,target};
}
