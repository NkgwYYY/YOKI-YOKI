import { Image, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import type { WorldMapId } from './worldMaps';

// Web uses smaller encodings; native retains its existing JPEG/PNG assets.
const webArt = (web: number, native: number) => Platform.OS === 'web' ? web : native;
export const GARDEN_CROP_ART = webArt(require('@/assets/images/world/garden-crops.webp'), require('@/assets/images/world/garden-crops.png'));
export const VILLAGE_ATLAS = webArt(require('@/assets/images/world/village-atlas.webp'), require('@/assets/images/world/village-atlas.jpg'));
export const MERCHANT_ART = {
  bank: webArt(require('@/assets/images/world/bank-teller.webp'), require('@/assets/images/world/bank-teller.png')),
  shop: webArt(require('@/assets/images/world/homewares-keeper.webp'), require('@/assets/images/world/homewares-keeper.png')),
  ramen: webArt(require('@/assets/images/world/ramen-master.webp'), require('@/assets/images/world/ramen-master.png')),
  tobacco: webArt(require('@/assets/images/world/tobacco-keeper.webp'), require('@/assets/images/world/tobacco-keeper.png')),
  job: webArt(require('@/assets/images/world/egg-artisan.webp'), require('@/assets/images/world/egg-artisan.png')),
  bowling: webArt(require('@/assets/images/world/bowling-attendant.webp'), require('@/assets/images/world/bowling-attendant.png')),
};
export const FORTUNE_CAT_ART = webArt(require('@/assets/images/world/fortune-cat.webp'), require('@/assets/images/world/fortune-cat.png'));
export const HOME_ART={day:require('@/assets/images/world/nook-overview-day.webp'),night:require('@/assets/images/world/nook-overview-night.webp')};
const HOME_WIDE_ART={day:require('@/assets/images/world/nook-wide-day.webp'),night:require('@/assets/images/world/nook-wide-night.webp')};
export function homeOverviewArt(night=false,wide=false){return (wide?HOME_WIDE_ART:HOME_ART)[night?'night':'day'];}
export function prepareHomeOverviewArt(night=false,wide=false):Promise<void>{return prepareImage(homeOverviewArt(night,wide));}
export const HOME_EYE_ART={day:require('@/assets/images/world/nook-eye-day.webp'),night:require('@/assets/images/world/nook-eye-night.webp')};
const HOME_EYE_WIDE_ART={day:require('@/assets/images/world/nook-eye-wide-day.webp'),night:require('@/assets/images/world/nook-eye-wide-night.webp')};
export function homeEyeArt(night=false,wide=false){return (wide?HOME_EYE_WIDE_ART:HOME_EYE_ART)[night?'night':'day'];}
export function prepareHomeEyeArt(night=false,wide=false):Promise<void>{return prepareImage(homeEyeArt(night,wide));}
const EMPTY_HOME_ART={
 overview:{day:require('@/assets/images/world/nook-overview-day-empty.webp'),night:require('@/assets/images/world/nook-overview-night-empty.webp')},
 wide:{day:require('@/assets/images/world/nook-wide-day-empty.webp'),night:require('@/assets/images/world/nook-wide-night-empty.webp')},
 eye:{day:require('@/assets/images/world/nook-eye-day-empty.webp'),night:require('@/assets/images/world/nook-eye-night-empty.webp')},
 eyeWide:{day:require('@/assets/images/world/nook-eye-wide-day-empty.webp'),night:require('@/assets/images/world/nook-eye-wide-night-empty.webp')},
};
const NO_LOUNGE_HOME_ART={
 overview:{day:require('@/assets/images/world/nook-overview-day-no-lounge.webp'),night:require('@/assets/images/world/nook-overview-night-no-lounge.webp')},
 wide:{day:require('@/assets/images/world/nook-wide-day-no-lounge.webp'),night:require('@/assets/images/world/nook-wide-night-no-lounge.webp')},
 eye:{day:require('@/assets/images/world/nook-eye-day-no-lounge.webp'),night:require('@/assets/images/world/nook-eye-night-no-lounge.webp')},
 eyeWide:{day:require('@/assets/images/world/nook-eye-wide-day-no-lounge.webp'),night:require('@/assets/images/world/nook-eye-wide-night-no-lounge.webp')},
};
const NO_CABINET_EYE_ART={day:require('@/assets/images/world/nook-eye-day-no-cabinet.webp'),night:require('@/assets/images/world/nook-eye-night-no-cabinet.webp')};
export function starterRoomArt(night=false,wide=false,eye=false){
 const perspective=eye?(wide?'eyeWide':'eye'):(wide?'wide':'overview');
 return {perspective,empty:EMPTY_HOME_ART[perspective][night?'night':'day'],noLounge:NO_LOUNGE_HOME_ART[perspective][night?'night':'day'],noCabinet:perspective==='eye'?NO_CABINET_EYE_ART[night?'night':'day']:undefined} as const;
}
export const OUTDOOR_ART = {
  grandma: webArt(require('@/assets/images/world/grandmother-garden.webp'), require('@/assets/images/world/grandmother-garden.jpg')),
  bank: webArt(require('@/assets/images/world/village-bank.webp'), require('@/assets/images/world/village-bank.jpg')),
  fortune: webArt(require('@/assets/images/world/village-fortune.webp'), require('@/assets/images/world/village-fortune.jpg')),
  homewares: webArt(require('@/assets/images/world/village-homewares.webp'), require('@/assets/images/world/village-homewares.jpg')),
  workshop: webArt(require('@/assets/images/world/village-workshop.webp'), require('@/assets/images/world/village-workshop.jpg')),
  forest: webArt(require('@/assets/images/world/forest-clearing.webp'), require('@/assets/images/world/forest-clearing.jpg')),
  lake: webArt(require('@/assets/images/world/village-lake.webp'), require('@/assets/images/world/village-lake.jpg')),
  market: webArt(require('@/assets/images/world/village-square.webp'), require('@/assets/images/world/village-square.jpg')),
  onsen: webArt(require('@/assets/images/world/village-onsen.webp'), require('@/assets/images/world/village-onsen.jpg')),
  village: webArt(require('@/assets/images/world/village-neighbors.webp'), require('@/assets/images/world/village-neighbors.jpg')),
  ramen: webArt(require('@/assets/images/world/village-ramen-chuka.webp'), require('@/assets/images/world/village-ramen-chuka.jpg')),
  bowling: webArt(require('@/assets/images/world/village-bowling-long.webp'), require('@/assets/images/world/village-bowling-long.jpg')),
  tobacco: webArt(require('@/assets/images/world/village-tobacco-nook-mobile.webp'), require('@/assets/images/world/village-tobacco-nook.jpg')),
};
export function worldArt(map: WorldMapId, night = false) { return map === 'home' ? HOME_ART[night ? 'night' : 'day'] : OUTDOOR_ART[map]; }
const cached = new Map<string, Promise<void>>();
function prepareImage(source: number): Promise<void> {
  const uri = Asset.fromModule(source).uri;
  let promise = cached.get(uri);
  if (!promise) {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Scene image timed out')), 6000); });
    // Native resolves a boolean; react-native-web resolves void after successful decoding.
    promise = Promise.race([Promise.resolve().then(() => Image.prefetch(uri)).then(ok => { if (ok === false) throw new Error('Scene image unavailable'); }), timeout])
      .finally(() => clearTimeout(timer)).catch(error => { cached.delete(uri); throw error; });
    cached.set(uri, promise);
  }
  return promise;
}

export function prepareVillageAtlas(): Promise<void> { return prepareImage(VILLAGE_ATLAS); }
const scenes = new Map<string, Promise<void>>();
export function prepareWorldArt(map: WorldMapId, night = false): Promise<void> {
  const key = `${map}:${map === 'home' && night}`;
  const existing = scenes.get(key);
  if (existing) return existing;
  const portrait = map === 'bank' ? MERCHANT_ART.bank : map === 'fortune' ? FORTUNE_CAT_ART : map === 'homewares' ? MERCHANT_ART.shop : map === 'workshop' ? MERCHANT_ART.job : map === 'bowling' ? MERCHANT_ART.bowling : map === 'ramen' ? MERCHANT_ART.ramen : map === 'tobacco' ? MERCHANT_ART.tobacco : undefined;
  const sources = [worldArt(map, night), ...(map === 'grandma' ? [GARDEN_CROP_ART] : []), ...(portrait ? [portrait] : [])];
  const promise = Promise.all(sources.map(prepareImage)).then(() => {}).catch(error => { scenes.delete(key); throw error; });
  scenes.set(key, promise);
  return promise;
}
