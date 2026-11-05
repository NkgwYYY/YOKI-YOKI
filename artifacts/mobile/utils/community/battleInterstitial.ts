import type {AdPause} from './interstitialSession';
export const canShowBattleInterstitial=()=>false;
export function createBattleInterstitial(_id:string,_current:()=>boolean,_pause:()=>AdPause){
  return {preload:async()=>{},showIfReady:async()=>{},dispose:()=>{}};
}
