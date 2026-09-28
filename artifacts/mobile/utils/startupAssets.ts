import { Image as ExpoImage } from 'expo-image';
import {
  Image as NativeImage,
  Platform,
  type ImageSourcePropType,
} from 'react-native';

const STARTUP_IMAGE_MODULES: ImageSourcePropType[] = [
  require('@/assets/images/room/room-night.jpg'),
  require('@/assets/images/yoki_logo.png'),
  require('@/assets/images/egg/normal.png'),
  require('@/assets/images/egg/happy.png'),
  require('@/assets/images/egg/excited.png'),
  require('@/assets/images/egg/grumpy.png'),
  require('@/assets/images/egg/tired.png'),
  require('@/assets/images/egg/sleepy.png'),
  require('@/assets/images/characters/odango.png'),
  require('@/assets/images/characters/happa.png'),
  require('@/assets/images/characters/colorful_happa.png'),
  require('@/assets/images/plant/energy-garden-night.png'),
];

let startupImagePromise: Promise<void> | null = null;

function resolveImageUri(source: ImageSourcePropType): string | null {
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source) {
    return typeof source.uri === 'string' ? source.uri : null;
  }

  const resolver = (NativeImage as typeof NativeImage & {
    resolveAssetSource?: (asset: ImageSourcePropType) => { uri?: string } | undefined;
  }).resolveAssetSource;

  return resolver?.(source)?.uri ?? null;
}

function resolveStartupImageUris(): string[] {
  const bundledUris = STARTUP_IMAGE_MODULES
    .map(resolveImageUri)
    .filter((uri): uri is string => Boolean(uri));


  return [...new Set(bundledUris)];
}

async function cacheImage(uri: string): Promise<void> {
  const [nativeCached, expoCached] = await Promise.all([
    NativeImage.prefetch(uri).catch(() => false),
    ExpoImage.prefetch(uri, { cachePolicy: 'memory-disk' }).catch(() => false),
  ]);

  if (!nativeCached && !expoCached) {
    throw new Error(`画像を読み込めませんでした: ${uri}`);
  }
}

export function preloadStartupImages(): Promise<void> {
  if (!startupImagePromise) {
    const uris = resolveStartupImageUris();
    startupImagePromise = Promise.all(uris.map(cacheImage))
      .then(() => undefined)
      .catch((error) => {
        startupImagePromise = null;
        throw error;
      });
  }

  return startupImagePromise;
}