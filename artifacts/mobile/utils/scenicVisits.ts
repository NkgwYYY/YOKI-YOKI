export type VisitScene='sea'|'meadow'|'night';
export function sceneForVisit(owner:string,date:string,night:boolean):VisitScene|null{
 let hash=2166136261;for(const c of `${owner}:${date}`)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 const value=hash>>>0;
 // Roughly two days in five. Reloads do not reroll the scene.
 if(value%5>1)return null;
 return night?'night':value%2?'sea':'meadow';
}
export function visitReturnKey(owner:string,date:string){return `@yoki/scenic-return/v1/${encodeURIComponent(owner)}/${date}`;}
export const VISIT_NAMES:Record<VisitScene,string>={sea:'海辺',meadow:'花畑',night:'夜景の見える丘'};
export const VISIT_LINES:Record<VisitScene,string>={sea:'海を見にきたよ。一緒に眺めよう。',meadow:'花がいっぱい咲いてたよ。',night:'夜景がきれいだったから、見にきたよ。'};
