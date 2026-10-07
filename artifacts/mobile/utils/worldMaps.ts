export type WorldMapId = 'home' | 'forest' | 'lake';
export const WORLD_MAPS = [
  {id:'home',name:'おうち',level:1,description:'いつでも帰れる、小さなおうち。'},
  {id:'forest',name:'木もれびの森',level:3,description:'葉の音を聞きながら、ゆっくりおさんぽ。'},
  {id:'lake',name:'ひと息の湖畔',level:6,description:'水面をながめて、ここでひと息。'},
] as const;
export function canVisitMap(id: WorldMapId, level: number) {return level >= WORLD_MAPS.find(map=>map.id===id)!.level;}
export function mapGroundBounds(map: WorldMapId, y: number) {
  'worklet';
  if(map==='home') {
    if(y<.50)return {minX:.40,maxX:.61,minY:.43,maxY:.79};
    if(y<.56)return {minX:.40,maxX:.66,minY:.43,maxY:.79};
    if(y<.67)return {minX:.39,maxX:.67,minY:.43,maxY:.79};
    return {minX:.44,maxX:.66,minY:.43,maxY:.79};
  }
  if(map==='forest')return {minX:y<.52?.43:.36,maxX:y<.52?.61:.66,minY:.44,maxY:.81};
  return {minX:y<.52?.45:.38,maxX:y<.52?.60:.68,minY:.47,maxY:.82};
}
export function mapGroundPoint(map: WorldMapId, point: {x:number;y:number}) {
  'worklet';
  const b=mapGroundBounds(map,point.y),y=Math.max(b.minY,Math.min(b.maxY,point.y));
  const row=mapGroundBounds(map,y);
  return {x:Math.max(row.minX,Math.min(row.maxX,point.x)),y};
}
export function isMapGround(map: WorldMapId, point: {x:number;y:number}) {
  'worklet';const p=mapGroundPoint(map,point);return Math.abs(p.x-point.x)<.001&&Math.abs(p.y-point.y)<.001;
}
export function mapStart(map: WorldMapId) {return map==='home'?{x:.50,y:.48}:{x:.52,y:.61};}
export function mapRoute(map: WorldMapId, from:{x:number;y:number}, to:{x:number;y:number}) {
  const target=mapGroundPoint(map,to);
  return [{x:.52,y:from.y},{x:.52,y:target.y},target];
}
