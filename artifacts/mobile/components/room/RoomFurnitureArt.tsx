import React from 'react';
import { Image } from 'react-native';
import type { RoomFurniture, RoomFlower, RoomItemKind } from '@/contexts/AppContext';
import { RoomItemPreview as LegacyPreview } from './LegacyFurniture';
const FURNITURE = {
  sofa: require('@/assets/images/room/sofa.png'),
  vanity: require('@/assets/images/room/vanity.png'),
  bookshelf: require('@/assets/images/room/bookshelf.png'),
};
const FLOWERS = {
  pink: require('@/assets/images/room/flower-pink.png'),
  violet: require('@/assets/images/room/flower-violet.png'),
  rainbow: require('@/assets/images/room/flower-rainbow.png'),
};
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
