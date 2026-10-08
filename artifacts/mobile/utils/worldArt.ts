import { Image } from 'react-native';
import { Asset } from 'expo-asset';
import type { WorldMapId } from './worldMaps';

export const HOME_ART = { day: require('@/assets/images/world/home-day.jpg'), night: require('@/assets/images/world/home-night.jpg') };
export const OUTDOOR_ART = {
  forest: require('@/assets/images/world/forest-clearing.jpg'),
  lake: require('@/assets/images/world/village-lake.jpg'),
  market: require('@/assets/images/world/village-market.jpg'),
  onsen: require('@/assets/images/world/village-onsen.jpg'),
  village: require('@/assets/images/world/village-neighbors.jpg'),
  ramen: require('@/assets/images/world/village-ramen.jpg'),
  bowling: require('@/assets/images/world/village-bowling-long.jpg'),
};
export function worldArt(map: WorldMapId, night = false) { return map === 'home' ? HOME_ART[night ? 'night' : 'day'] : OUTDOOR_ART[map]; }
const cached = new Map<string, Promise<void>>();
export function prepareWorldArt(map: WorldMapId, night = false): Promise<void> {
  const uri = Asset.fromModule(worldArt(map, night)).uri;
  let promise = cached.get(uri);
  if (!promise) {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Scene image timed out')), 6000); });
    // Native resolves a boolean; react-native-web resolves void after successful decoding.
    promise = Promise.race([Image.prefetch(uri).then(ok => { if (ok === false) throw new Error('Scene image unavailable'); }), timeout])
      .finally(() => clearTimeout(timer)).catch(error => { cached.delete(uri); throw error; });
    cached.set(uri, promise);
  }
  return promise;
}
