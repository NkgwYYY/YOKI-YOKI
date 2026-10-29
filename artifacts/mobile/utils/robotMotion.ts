/** A quiet serpentine path across the open floor; one owner moves both riders. */
export const ROBOT_ROUTE=[{x:.42,y:.68},{x:.61,y:.68},{x:.65,y:.73},{x:.40,y:.73},{x:.39,y:.78},{x:.67,y:.78},{x:.68,y:.83},{x:.42,y:.83}] as const;
export function robotStep(x:number,y:number,target:number,dt:number,aspect:number,slow=false){
 'worklet';
 const point=ROBOT_ROUTE[target%ROBOT_ROUTE.length];
 const dx=point.x-x,dy=point.y-y,distance=Math.hypot(dx,dy*aspect);
 const travel=Math.max(0,Math.min(.05,dt))*(slow?.025:.052);
 if(distance<=travel)return {x:point.x,y:point.y,target:(target+1)%ROBOT_ROUTE.length};
 const t=distance>0?travel/distance:0;
 return {x:x+dx*t,y:y+dy*t,target};
}
