type Storage={getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<unknown>;removeItem:(key:string)=>Promise<unknown>};
export const ACCOUNT_OWNER_KEY='@yoki/account-cache-owner/v1';
export const ACCOUNT_SWITCH_KEY='@yoki/account-cache-switch/v1';
const backupKey=(owner:string)=>`@yoki/account-cache/v1/${encodeURIComponent(owner)}`;
type Snapshot=Record<string,string>;

/** Local caches belong to one account. A recoverable switch preserves the
 * previous cache before replacing it; neither logout nor a failed pull merges users. */
export function createAccountCache(storage:Storage,keys:readonly string[]){
 let tail:Promise<unknown>=Promise.resolve();
 const filter=(data:Record<string,unknown>):Snapshot=>Object.fromEntries(keys.filter(k=>data[k]!=null).map(k=>[k,typeof data[k]==='string'?data[k] as string:JSON.stringify(data[k])]));
 const owner=async()=>await storage.getItem(ACCOUNT_OWNER_KEY)??'guest';
 const snapshot=async()=>Object.fromEntries((await Promise.all(keys.map(async k=>[k,await storage.getItem(k)] as const))).filter((v):v is readonly [string,string]=>v[1]!==null));
 const apply=async(next:{owner:string;data:Snapshot})=>{
  for(const key of keys){if(key in next.data)await storage.setItem(key,next.data[key]);else await storage.removeItem(key);}
  await storage.setItem(ACCOUNT_OWNER_KEY,next.owner);
  await storage.removeItem(ACCOUNT_SWITCH_KEY);
 };
 const recover=async()=>{
  const raw=await storage.getItem(ACCOUNT_SWITCH_KEY);if(!raw)return;
  const next=JSON.parse(raw);
  if(next?.version!==1||typeof next.owner!=='string'||!next.owner||!next.data||typeof next.data!=='object'||Array.isArray(next.data)||Object.entries(next.data).some(([k,v])=>!keys.includes(k)||typeof v!=='string'))throw Error('アカウントの保存データを確認できません。データは削除していません。');
  await apply(next);
 };
 const exclusive=<T>(work:()=>Promise<T>)=>{const next=tail.then(async()=>{await recover();return work();});tail=next.catch(()=>{});return next;};
 const replace=async(nextOwner:string,data:Record<string,unknown>)=>{
  const previousOwner=await owner();
  await storage.setItem(backupKey(previousOwner),JSON.stringify(await snapshot()));
  const next={version:1,owner:nextOwner,data:filter(data)};
  await storage.setItem(ACCOUNT_SWITCH_KEY,JSON.stringify(next));
  await apply(next);
 };
 return {
  recover:()=>exclusive(async()=>{}),
  owner:()=>exclusive(owner),
  replace:(nextOwner:string,data:Record<string,unknown>)=>exclusive(()=>replace(nextOwner,data)),
  switchOwner:(nextOwner:string)=>exclusive(async()=>{
   if(await owner()===nextOwner){await storage.setItem(ACCOUNT_OWNER_KEY,nextOwner);return;}
   const saved=await storage.getItem(backupKey(nextOwner));
   await replace(nextOwner,saved?JSON.parse(saved):{});
  }),
  removeOwner:(removedOwner:string)=>exclusive(async()=>{
   if(await owner()===removedOwner){const guest=await storage.getItem(backupKey('guest'));await replace('guest',guest?JSON.parse(guest):{});}
   await storage.removeItem(backupKey(removedOwner));
  }),
 };
}
