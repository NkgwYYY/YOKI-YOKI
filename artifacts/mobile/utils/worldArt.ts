import { Image, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import type { WorldMapId } from './worldMaps';

// Web uses smaller encodings; native retains its existing JPEG/PNG assets.
const webArt = (web: number, native: number) => Platform.OS === 'web' ? web : native;
export const VILLAGE_ATLAS = webArt(require('@/assets/images/world/village-atlas.webp'), require('@/assets/images/world/village-atlas.jpg'));
export const MERCHANT_ART = {
  bank: webArt(require('@/assets/images/world/bank-teller.webp'), require('@/assets/images/world/bank-teller.png')),
  shop: webArt(require('@/assets/images/world/homewares-keeper.webp'), require('@/assets/images/world/homewares-keeper.png')),
  food: webArt(require('@/assets/images/world/diner-chef.webp'), require('@/assets/images/world/diner-chef.png')),
  ramen: webArt(require('@/assets/images/world/ramen-master.webp'), require('@/assets/images/world/ramen-master.png')),
  tobacco: webArt(require('@/assets/images/world/tobacco-keeper.webp'), require('@/assets/images/world/tobacco-keeper.png')),
  job: webArt(require('@/assets/images/world/egg-artisan.webp'), require('@/assets/images/world/egg-artisan.png')),
  bowling: webArt(require('@/assets/images/world/bowling-attendant.webp'), require('@/assets/images/world/bowling-attendant.png')),
};
export const FORTUNE_CAT_ART = webArt(require('@/assets/images/world/fortune-cat.webp'), require('@/assets/images/world/fortune-cat.png'));
export const HOME_ART = { day: webArt(require('@/assets/images/world/home-day.webp'), require('@/assets/images/world/home-day.jpg')), night: webArt(require('@/assets/images/world/home-night.webp'), require('@/assets/images/world/home-night.jpg')) };
export const OUTDOOR_ART = {
  bank: webArt(require('@/assets/images/world/village-bank.webp'), require('@/assets/images/world/village-bank.jpg')),
  fortune: webArt(require('@/assets/images/world/village-fortune.webp'), require('@/assets/images/world/village-fortune.jpg')),
  homewares: webArt(require('@/assets/images/world/village-homewares.webp'), require('@/assets/images/world/village-homewares.jpg')),
  diner: webArt(require('@/assets/images/world/village-diner.webp'), require('@/assets/images/world/village-diner.jpg')),
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
  const portrait = map === 'bank' ? MERCHANT_ART.bank : map === 'fortune' ? FORTUNE_CAT_ART : map === 'homewares' ? MERCHANT_ART.shop : map === 'diner' ? MERCHANT_ART.food : map === 'workshop' ? MERCHANT_ART.job : map === 'bowling' ? MERCHANT_ART.bowling : map === 'ramen' ? MERCHANT_ART.ramen : map === 'tobacco' ? MERCHANT_ART.tobacco : undefined;
  const sources = [worldArt(map, night), ...(portrait ? [portrait] : [])];
  const promise = Promise.all(sources.map(prepareImage)).then(() => {}).catch(error => { scenes.delete(key); throw error; });
  scenes.set(key, promise);
  return promise;
}
