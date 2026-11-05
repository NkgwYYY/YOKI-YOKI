let owner:symbol|null=null;
export function acquireFullscreenAd(): (()=>void)|null {
  if(owner)return null;
  const token=Symbol();owner=token;
  return()=>{if(owner===token)owner=null;};
}
