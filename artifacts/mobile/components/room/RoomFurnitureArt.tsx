import React from 'react';
import { Image } from 'react-native';
import type { RoomFurniture, RoomFlower, RoomItemKind } from '@/contexts/AppContext';
import { RoomItemPreview as LegacyPreview } from './LegacyFurniture';
const FURNITURE = {
  sofa: require('@/assets/images/room/sofa.png'),
  vanity: require('@/assets/images/room/vanity.png'),
  bookshelf: require('@/assets/images/room/bookshelf.png'),
};
export function RoomFurnitureArt({ id, size = 60 }: { id: Exclude<RoomFurniture, 'none'>; size?: number }) {
  return <Image source={FURNITURE[id]} resizeMode="contain" style={{ width: size, height: size }} />;
}
export function RoomItemPreview({ kind, id }: { kind: RoomItemKind; id: RoomFurniture | RoomFlower }) {
  if (kind === 'furniture' && (id === 'sofa' || id === 'vanity' || id === 'bookshelf')) return <RoomFurnitureArt id={id} />;
  return <LegacyPreview kind={kind} id={id} />;
}
