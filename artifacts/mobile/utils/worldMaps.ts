export type WorldMapId = 'home' | 'forest' | 'lake' | 'market' | 'onsen' | 'village';
export const WORLD_MAPS = [
  {id:'home',name:'おうち',level:1,description:'いつでも帰れる、小さなおうち。'},
  {id:'market',name:'こもれび市場',level:1,description:'ごはんや、暮らしの小さなお買いもの。'},
  {id:'forest',name:'木もれびの森',level:3,description:'葉の音を聞きながら、ゆっくりおさんぽ。'},
  {id:'onsen',name:'森の温泉',level:3,description:'お湯にゆられて、ゆっくりひと休み。'},
  {id:'village',name:'となりの村',level:4,description:'のんびり暮らす、たまごの住人たち。'},
  {id:'lake',name:'星あかりの湖',level:6,description:'観覧車に乗って、いつもの世界を空から。'},
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
  if(map==='onsen')return {minX:.23,maxX:.77,minY:.49,maxY:.81};
  if(map==='market'||map==='village')return {minX:y<.52?.40:.22,maxX:y<.52?.60:.78,minY:.48,maxY:.81};
  return {minX:.23,maxX:.79,minY:.48,maxY:.82};
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
