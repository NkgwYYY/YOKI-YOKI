export type WorldMapId = 'grandma' | 'home' | 'forest' | 'lake' | 'market' | 'onsen' | 'village' | 'ramen' | 'bowling' | 'tobacco' | 'homewares' | 'workshop' | 'fortune' | 'bank';
export const WORLD_MAPS = [
  {id:'grandma',name:'おばあさんの家',level:1,description:'お茶の湯気と、少しずつ育つ畑。いつでも寄っておいで。'},
  {id:'home',name:'おうち',level:1,description:'いつでも帰れる、小さなおうち。'},
  {id:'market',name:'こもれび広場',level:1,description:'風船の子ども、旅人、あやしい儲け話。ときどき出会いが待っている。'},
  {id:'ramen',name:'もふもふラーメン',level:1,description:'赤い提灯が灯る町中華。もふもふ店長がお出迎え。'},
  {id:'bowling',name:'ころころボウリング',level:1,description:'受付の店員に話しかけて、1日5回までのボウリング。'},
  {id:'tobacco',name:'こかげのタバコ屋',level:1,description:'お店のとなりに、小さな屋外喫煙所。'},
  {id:'homewares',name:'暮らしのお店',level:1,description:'ほうき、リネン、小さな暮らしの道具。'},
  {id:'workshop',name:'ゆでたまご工房',level:1,description:'店長の注文を受けて、ひと鍋ずつ働こう。'},
  {id:'bank',name:'こもれび銀行',level:1,description:'利息がつく村の銀行。好景気、強盗、経営破綻の出来事も。'},
  {id:'fortune',name:'月あかりの占い館',level:1,description:'大きな猫が、血液型とMBTIから今日の運勢を占う。1日1回。'},
  {id:'forest',name:'木もれびの森',level:3,description:'葉の音を聞きながら、ゆっくりおさんぽ。'},
  {id:'onsen',name:'森の温泉',level:3,description:'お湯にゆられて、ゆっくりひと休み。'},
  {id:'village',name:'となりの村',level:4,description:'たまご・もふもふ・はっぱたちの、小さな村。'},
  {id:'lake',name:'星あかりの湖',level:6,description:'観覧車に乗って、いつもの世界を空から。'},
] as const;
// Permanent iOS product restriction; identical for reviewers and all end users.
// Tobacco consumption/rewards are not part of the iOS app (App Review 1.4.3).
export function isMapAvailable(id: WorldMapId, platform: string) { return platform !== 'ios' || id !== 'tobacco'; }
export function initialReleasedMap(id: WorldMapId | undefined, platform: string): WorldMapId {
  return id && isMapAvailable(id, platform) ? id : 'home';
}
export function canVisitMap(id: WorldMapId, level: number, grandmaUnlocked=false, platform='web') {if(!isMapAvailable(id,platform))return false;if(id==='grandma'&&!grandmaUnlocked)return false;const map=WORLD_MAPS.find(map=>map.id===id);return !!map&&level>=map.level;}
export function mapGroundBounds(map: WorldMapId, y: number) {
  'worklet';
  if(map==='grandma')return {minX:.23,maxX:.77,minY:.44,maxY:.82};
  if(map==='bowling')return {minX:.28,maxX:.74,minY:.305,maxY:.77};
  if(map==='home') {
    if(y<.50)return {minX:.40,maxX:.61,minY:.43,maxY:.79};
    if(y<.56)return {minX:.40,maxX:.66,minY:.43,maxY:.79};
    if(y<.67)return {minX:.39,maxX:.67,minY:.43,maxY:.79};
    return {minX:.44,maxX:.66,minY:.43,maxY:.79};
  }
  if(map==='forest')return {minX:y<.52?.43:.36,maxX:y<.52?.61:.66,minY:.44,maxY:.81};
  if(map==='ramen')return {minX:.34,maxX:.68,minY:.47,maxY:.70};
  if(map==='onsen')return {minX:.23,maxX:.77,minY:.49,maxY:.81};
  if(map==='fortune')return {minX:.25,maxX:.75,minY:.615,maxY:.81};
  if(map==='bank')return {minX:.27,maxX:.73,minY:.50,maxY:.81};
  if(map==='tobacco')return {minX:.22,maxX:.78,minY:.55,maxY:.81};
  if(map==='homewares'||map==='workshop')return {minX:.26,maxX:.74,minY:.49,maxY:.81};
  if(map==='market')return {minX:.23,maxX:.77,minY:.46,maxY:.81};
  if(map==='village')return {minX:y<.52?.40:.22,maxX:y<.52?.60:.78,minY:.48,maxY:.81};
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
export function mapStart(map: WorldMapId) {return map==='market'?{x:.55,y:.765}:map==='grandma'?{x:.36,y:.73}:map==='bank'?{x:.60,y:.67}:map==='fortune'?{x:.72,y:.70}:map==='bowling'?{x:.455,y:.715}:map==='home'?{x:.50,y:.48}:map==='ramen'?{x:.63,y:.66}:{x:.52,y:.61};}
export function mapRoute(map: WorldMapId, from:{x:number;y:number}, to:{x:number;y:number}) {
  const target=mapGroundPoint(map,to);
  // Keep the approach clear of the cat and the ramen counter's staff.
  const passage=map==='fortune'?.72:map==='ramen'?.60:.52;
  return [{x:passage,y:from.y},{x:passage,y:target.y},target];
}
