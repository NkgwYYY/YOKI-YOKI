import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import type { RoomFurniture, RoomFlower, RoomItemKind } from '@/contexts/AppContext';
import { RoomItemPreview as LegacyPreview } from './LegacyFurniture';
const FURNITURE = {
  sofa: require('@/assets/images/room/cozy/sofa.webp'),
  vanity: require('@/assets/images/room/cozy/vanity.webp'),
  bookshelf: require('@/assets/images/room/cozy/bookshelf.webp'),
};
const FLOWERS = {
  pink: require('@/assets/images/room/cozy/flower-pink.webp'),
  violet: require('@/assets/images/room/cozy/flower-violet.webp'),
  rainbow: require('@/assets/images/room/cozy/flower-rainbow.webp'),
};
const DECOR:Record<string,ImageSourcePropType>={
 'catalog-decor-cushion':require('@/assets/images/room/cozy/decor-cushion.webp'),
 'catalog-decor-picture-book':require('@/assets/images/room/cozy/decor-picture-book.webp'),
 'catalog-decor-plant':require('@/assets/images/room/cozy/decor-plant.webp'),
 'catalog-decor-plush':require('@/assets/images/room/cozy/decor-plush.webp'),
 'catalog-decor-small-pet':require('@/assets/images/room/cozy/decor-small-pet.webp'),
};
export const roomFurnitureSource=(id:Exclude<RoomFurniture,'none'>):ImageSourcePropType=>FURNITURE[id];
export const roomFlowerSource=(id:Exclude<RoomFlower,'none'>):ImageSourcePropType=>FLOWERS[id];
export const roomDecorSource=(id:string,uri=''):ImageSourcePropType=>DECOR[id]??{uri};
const FLOWER_NAMES = { pink: 'ローズ', violet: 'バイオレット', rainbow: 'レインボー' };
export function RoomFlowerArt({ id, size = 60, accessible = false }: {
  id: Exclude<RoomFlower, 'none'>; size?: number; accessible?: boolean;
}) {
  return <Image testID={`room-flower-${id}`} source={FLOWERS[id]} resizeMode="contain"
    accessible={accessible} accessibilityLabel={accessible ? `部屋の花：${FLOWER_NAMES[id]}` : undefined}
    style={{ width: size, height: size }} />;
}
export function RoomFurnitureArt({ id, size = 60 }: { id: Exclude<RoomFurniture, 'none'>; size?: number }) {
  return <Image source={FURNITURE[id]} resizeMode="contain" style={{ width: size, height: size }} />;
}
export function RoomItemPreview({ kind, id }: { kind: RoomItemKind; id: RoomFurniture | RoomFlower }) {
  if (kind === 'furniture' && (id === 'sofa' || id === 'vanity' || id === 'bookshelf')) return <RoomFurnitureArt id={id} />;
  if (kind === 'flower' && (id === 'pink' || id === 'violet' || id === 'rainbow')) return <RoomFlowerArt id={id} />;
  return <LegacyPreview kind={kind} id={id} />;
}
