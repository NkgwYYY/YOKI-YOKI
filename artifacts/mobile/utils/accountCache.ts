type Storage={getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<unknown>;removeItem:(key:string)=>Promise<unknown>};
type AccountStorage=Storage&{exclusive?:<T>(work:(storage:Storage)=>Promise<T>)=>Promise<T>};
export const ACCOUNT_OWNER_KEY='@yoki/account-cache-owner/v1';
export const ACCOUNT_SWITCH_KEY='@yoki/account-cache-switch/v1';
const backupKey=(owner:string)=>`@yoki/account-cache/v1/${encodeURIComponent(owner)}`;
type Snapshot=Record<string,string>;

/** A recoverable account switch shares the balance lock, so a timer cannot
 * read or mutate a cache halfway between two owners. Backups remain separate. */
export function createAccountCache(storage:AccountStorage,keys:readonly string[]){
 let tail:Promise<unknown>=Promise.resolve();
 const filter=(data:Record<string,unknown>):Snapshot=>Object.fromEntries(keys.filter(k=>data[k]!=null).map(k=>[k,typeof data[k]==='string'?data[k] as string:JSON.stringify(data[k])]));
 const owner=async(store:Storage)=>await store.getItem(ACCOUNT_OWNER_KEY)??'guest';
 const snapshot=async(store:Storage)=>Object.fromEntries((await Promise.all(keys.map(async k=>[k,await store.getItem(k)] as const))).filter((v):v is readonly [string,string]=>v[1]!==null));
 const apply=async(store:Storage,next:{owner:string;data:Snapshot})=>{
  for(const key of keys){if(key in next.data)await store.setItem(key,next.data[key]);else await store.removeItem(key);}
  await store.setItem(ACCOUNT_OWNER_KEY,next.owner);
  await store.removeItem(ACCOUNT_SWITCH_KEY);
 };
 const recover=async(store:Storage)=>{
  const raw=await store.getItem(ACCOUNT_SWITCH_KEY);if(!raw)return;
  const next=JSON.parse(raw);
  if(next?.version!==1||typeof next.owner!=='string'||!next.owner||!next.data||typeof next.data!=='object'||Array.isArray(next.data)||Object.entries(next.data).some(([k,v])=>!keys.includes(k)||typeof v!=='string'))throw Error('アカウントの保存データを確認できません。データは削除していません。');
  await apply(store,next);
 };
 const exclusive=<T>(work:(store:Storage)=>Promise<T>)=>{
  const run=async(store:Storage)=>{await recover(store);return work(store);};
  const next=tail.then(()=>storage.exclusive?storage.exclusive(run):run(storage));
  tail=next.catch(()=>{});return next;
 };
 const replace=async(store:Storage,nextOwner:string,data:Record<string,unknown>)=>{
  const previousOwner=await owner(store);
  await store.setItem(backupKey(previousOwner),JSON.stringify(await snapshot(store)));
  const next={version:1,owner:nextOwner,data:filter(data)};
  await store.setItem(ACCOUNT_SWITCH_KEY,JSON.stringify(next));
  await apply(store,next);
 };
 return {
  recover:()=>exclusive(async()=>{}),
  owner:()=>exclusive(owner),
  replace:(nextOwner:string,data:Record<string,unknown>)=>exclusive(store=>replace(store,nextOwner,data)),
  switchOwner:(nextOwner:string)=>exclusive(async store=>{
   if(await owner(store)===nextOwner){await store.setItem(ACCOUNT_OWNER_KEY,nextOwner);return;}
   const saved=await store.getItem(backupKey(nextOwner));
   await replace(store,nextOwner,saved?JSON.parse(saved):{});
  }),
  removeOwner:(removedOwner:string)=>exclusive(async store=>{
   if(await owner(store)===removedOwner){const guest=await store.getItem(backupKey('guest'));await replace(store,'guest',guest?JSON.parse(guest):{});}
   await store.removeItem(backupKey(removedOwner));
  }),
 };
}
