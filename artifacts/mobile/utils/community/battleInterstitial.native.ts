import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {AppState,Platform} from 'react-native';
import {prepareAds} from './commerce.native';
import {acquireFullscreenAd} from './fullscreenAdLock';
import {createInterstitialSession,reserveBattleAd,type AdPause} from './interstitialSession';
const KEY='@yoki/battle_interstitial_v1';
const unit=()=>Platform.OS==='ios'?Constants.expoConfig?.extra?.yokiInterstitialIosUnit:Constants.expoConfig?.extra?.yokiInterstitialAndroidUnit;
export const canShowBattleInterstitial=()=>Constants.appOwnership!=='expo'&&!!unit()&&Constants.expoConfig?.extra?.yokiAdsConfigured?.[Platform.OS]===true;
export function createBattleInterstitial(id:string,current:()=>boolean,pause:()=>AdPause){
  return createInterstitialSession({
    current:()=>current()&&AppState.currentState==='active'&&canShowBattleInterstitial(),
    acquire:acquireFullscreenAd,
    pause,
    reserve:async()=>{
      const raw=await AsyncStorage.getItem(KEY);
      const next=reserveBattleAd(raw?JSON.parse(raw):[],id,Date.now());
      if(!next)return false;
      await AsyncStorage.setItem(KEY,JSON.stringify(next));return true;
    },
    prepare:async()=>{
      const sdk=await prepareAds();
      const test=__DEV__||Constants.expoConfig?.extra?.yokiBattleAdsTestMode===true;
      const ad=sdk.InterstitialAd.createForAdRequest(test?sdk.TestIds.INTERSTITIAL:unit(),{requestNonPersonalizedAdsOnly:true});
      return {on:(event,listener)=>ad.addAdEventListener({loaded:sdk.AdEventType.LOADED,closed:sdk.AdEventType.CLOSED,error:sdk.AdEventType.ERROR}[event],listener),load:()=>ad.load(),show:()=>ad.show()};
    },
  });
}
