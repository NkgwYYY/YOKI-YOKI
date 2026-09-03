import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, homePalette, roomPalette } from '@/constants/theme';
import { Icon, iconSize } from '@/components/ui/Icon';
import type { RoomCustomization } from '@/contexts/AppContext';
import type { RoomFlower, RoomFurniture, RoomItemKind } from '@/contexts/AppContext';

interface Props {
  customization: RoomCustomization;
  children: React.ReactNode;
  level?: number;
  streak?: number;
  totalDays?: number;
  mascotName?: string;
  sceneHeight?: number;
  horizontalBleed?: number;
}

function FlowerIllustration({ color }: { color: string }) {
  return (
    <View style={r.flowerWrap}>
      <View style={[r.petal, r.petalTop, { backgroundColor: color }]} />
      <View style={[r.petal, r.petalLeft, { backgroundColor: color }]} />
      <View style={[r.petal, r.petalRight, { backgroundColor: color }]} />
      <View style={[r.petal, r.petalBottomLeft, { backgroundColor: color }]} />
      <View style={[r.petal, r.petalBottomRight, { backgroundColor: color }]} />
      <View style={r.flowerCenter} />
      <View style={r.flowerStem} />
      <View style={r.flowerLeaf} />
      <View style={r.flowerPot} />
    </View>
  );
}

function SofaIllustration({ color }: { color: string }) {
  return (
    <View style={r.sofa}>
      <View style={[r.sofaBack, { backgroundColor: color }]} />
      <View style={[r.sofaArm, r.sofaArmLeft, { backgroundColor: color }]} />
      <View style={[r.sofaArm, r.sofaArmRight, { backgroundColor: color }]} />
      <View style={r.sofaCushions}>
        <View style={r.sofaCushion} />
        <View style={r.sofaCushion} />
      </View>
      <View style={[r.sofaBase, { backgroundColor: color }]} />
      <View style={[r.sofaLeg, r.sofaLegLeft]} />
      <View style={[r.sofaLeg, r.sofaLegRight]} />
    </View>
  );
}

function VanityIllustration() {
  return (
    <View style={r.vanity}>
      <View style={r.vanityMirror}>
        <View style={r.vanityReflection} />
      </View>
      <View style={r.vanityTop} />
      <View style={r.vanityDrawers}>
        <View style={r.vanityDrawer} />
        <View style={r.vanityDrawer} />
      </View>
      <View style={[r.vanityLeg, r.vanityLegLeft]} />
      <View style={[r.vanityLeg, r.vanityLegRight]} />
    </View>
  );
}

function BookshelfIllustration() {
  return (
    <View style={r.bookshelf}>
      <View style={r.bookRow}>
        <View style={[r.book, { height: 22, backgroundColor: roomPalette.sofa }]} />
        <View style={[r.book, { height: 17, backgroundColor: roomPalette.flowerViolet }]} />
        <View style={[r.book, { height: 25, backgroundColor: roomPalette.flowerPink }]} />
      </View>
      <View style={r.shelf} />
      <View style={r.bookRow}>
        <View style={[r.book, { height: 19, backgroundColor: roomPalette.flowerRainbow }]} />
        <View style={[r.book, { height: 24, backgroundColor: roomPalette.vanity }]} />
        <View style={[r.book, { height: 16, backgroundColor: colors.primary }]} />
      </View>
      <View style={r.shelf} />
    </View>
  );
}

export function RoomItemPreview({
  kind,
  id,
}: {
  kind: RoomItemKind;
  id: RoomFurniture | RoomFlower;
}) {
  if (id === 'none') {
    return <View style={r.nonePreview}><Icon name="x" size={iconSize.md} color={colors.subtleForeground} /></View>;
  }
  const flowerColor = id === 'violet'
    ? roomPalette.flowerViolet
    : id === 'rainbow'
      ? roomPalette.flowerRainbow
      : roomPalette.flowerPink;
  return (
    <View style={r.preview}>
      <View style={kind === 'flower' ? r.previewFlowerScale : r.previewFurnitureScale}>
        {kind === 'flower' ? <FlowerIllustration color={flowerColor} /> : null}
        {id === 'sofa' ? <SofaIllustration color={roomPalette.sofa} /> : null}
        {id === 'vanity' ? <VanityIllustration /> : null}
        {id === 'bookshelf' ? <BookshelfIllustration /> : null}
      </View>
    </View>
  );
}

const GRASS_TUFTS = [
  { left: -2, scale: 0.82, lean: -4, variant: 0 },
  { left: 1, scale: 1.08, lean: 2, variant: 1 },
  { left: 4, scale: 0.76, lean: -3, variant: 2 },
  { left: 7, scale: 1.18, lean: 4, variant: 1 },
  { left: 10, scale: 0.9, lean: -2, variant: 0 },
  { left: 13, scale: 1.04, lean: 3, variant: 2 },
  { left: 16, scale: 0.72, lean: -5, variant: 1 },
  { left: 19, scale: 1.12, lean: 2, variant: 0 },
  { left: 22, scale: 0.86, lean: -3, variant: 2 },
  { left: 25, scale: 1.2, lean: 4, variant: 1 },
  { left: 29, scale: 0.78, lean: -2, variant: 0 },
  { left: 32, scale: 1.02, lean: 3, variant: 2 },
  { left: 35, scale: 0.92, lean: -4, variant: 1 },
  { left: 38, scale: 1.16, lean: 2, variant: 0 },
  { left: 42, scale: 0.74, lean: -3, variant: 2 },
  { left: 45, scale: 1.1, lean: 5, variant: 1 },
  { left: 48, scale: 0.86, lean: -2, variant: 0 },
  { left: 51, scale: 1.2, lean: 3, variant: 2 },
  { left: 55, scale: 0.78, lean: -4, variant: 1 },
  { left: 58, scale: 1.06, lean: 2, variant: 0 },
  { left: 61, scale: 0.9, lean: -3, variant: 2 },
  { left: 64, scale: 1.18, lean: 4, variant: 1 },
  { left: 68, scale: 0.76, lean: -2, variant: 0 },
  { left: 71, scale: 1.04, lean: 3, variant: 2 },
  { left: 74, scale: 0.88, lean: -5, variant: 1 },
  { left: 77, scale: 1.14, lean: 2, variant: 0 },
  { left: 81, scale: 0.74, lean: -3, variant: 2 },
  { left: 84, scale: 1.2, lean: 4, variant: 1 },
  { left: 87, scale: 0.84, lean: -2, variant: 0 },
  { left: 90, scale: 1.06, lean: 3, variant: 2 },
  { left: 93, scale: 0.78, lean: -4, variant: 1 },
  { left: 96, scale: 1.12, lean: 2, variant: 0 },
  { left: 99, scale: 0.86, lean: -3, variant: 2 },
  { left: 102, scale: 1.02, lean: 4, variant: 1 },
];

function GrassTuft({
  left,
  scale,
  lean,
  variant,
}: {
  left: number;
  scale: number;
  lean: number;
  variant: number;
}) {
  const colors = [homePalette.grassLight, homePalette.groundEdge, homePalette.grassDeep];
  return (
    <View
      pointerEvents="none"
      style={[
        r.grassTuft,
        {
          left: `${left}%`,
          transform: [{ scale }, { rotate: `${lean}deg` }],
        },
      ]}
    >
      <View style={[r.grassBlade, r.grassBladeLeft, { height: variant === 2 ? 8 : 11, backgroundColor: colors[variant] }]} />
      <View style={[r.grassBlade, r.grassBladeCenter, { height: variant === 0 ? 13 : 9, backgroundColor: colors[(variant + 1) % colors.length] }]} />
      <View style={[r.grassBlade, r.grassBladeRight, { height: variant === 1 ? 12 : 8, backgroundColor: colors[(variant + 2) % colors.length] }]} />
    </View>
  );
}

function GroundGradient() {
  return (
    <View style={r.groundWrap} pointerEvents="none">
      <LinearGradient
        colors={[homePalette.groundTop, roomPalette.groundMid, homePalette.groundBottom]}
        locations={[0, 0.36, 1]}
        style={r.groundGradient}
      />
      <View style={r.grassEdge}>
        {GRASS_TUFTS.map((tuft, index) => <GrassTuft key={index} {...tuft} />)}
      </View>
    </View>
  );
}

export function RoomView({ customization, children, sceneHeight = 300, horizontalBleed = 0 }: Props) {
  const flowerColor = customization.flower === 'violet'
    ? roomPalette.flowerViolet
    : customization.flower === 'rainbow'
      ? roomPalette.flowerRainbow
      : roomPalette.flowerPink;

  return (
    <View style={[r.scene, { height: sceneHeight, marginHorizontal: -horizontalBleed }]}>
      <GroundGradient />
      <View style={r.landingShadow} pointerEvents="none" />
      {customization.flower !== 'none' ? (
        <View style={r.flowerPosition}><FlowerIllustration color={flowerColor} /></View>
      ) : null}

      <View style={r.furniturePosition}>
        {customization.furniture === 'sofa' ? <SofaIllustration color={roomPalette.sofa} /> : null}
        {customization.furniture === 'vanity' ? <VanityIllustration /> : null}
        {customization.furniture === 'bookshelf' ? <BookshelfIllustration /> : null}
      </View>

      <View style={r.characterLayer} pointerEvents="box-none">{children}</View>
    </View>
  );
}

const r = StyleSheet.create({
  scene: {
    alignSelf: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  },
  groundWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 96, zIndex: 0 },
  groundGradient: { ...StyleSheet.absoluteFillObject },
  grassEdge: { position: 'absolute', top: -5, left: 0, right: 0, height: 21 },
  grassTuft: { position: 'absolute', bottom: 0, width: 15, height: 18, transformOrigin: 'bottom center' },
  grassBlade: { position: 'absolute', bottom: 0, width: 3, borderRadius: 3, transformOrigin: 'bottom' },
  grassBladeLeft: { left: 1 },
  grassBladeCenter: { left: 6 },
  grassBladeRight: { left: 11 },
  landingShadow: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 10,
    width: 118,
    height: 19,
    borderRadius: 999,
    backgroundColor: 'rgba(109, 65, 91, 0.18)',
    opacity: 0.8,
    zIndex: 2,
  },
  characterLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 3,
  },
  flowerPosition: { position: 'absolute', left: 8, bottom: 27, zIndex: 1 },
  furniturePosition: { position: 'absolute', right: 3, bottom: 20, zIndex: 1 },
  flowerWrap: { width: 68, height: 112, position: 'relative', alignItems: 'center' },
  petal: { position: 'absolute', width: 25, height: 31, borderRadius: 18, top: 11 },
  petalTop: { left: 22, top: 0 },
  petalLeft: { left: 8, top: 17, transform: [{ rotate: '-48deg' }] },
  petalRight: { right: 7, top: 17, transform: [{ rotate: '48deg' }] },
  petalBottomLeft: { left: 14, top: 31, transform: [{ rotate: '-20deg' }] },
  petalBottomRight: { right: 13, top: 31, transform: [{ rotate: '20deg' }] },
  flowerCenter: { position: 'absolute', left: 26, top: 25, width: 17, height: 17, borderRadius: 10, backgroundColor: '#FFD44F', zIndex: 2 },
  flowerStem: { position: 'absolute', top: 48, width: 6, height: 42, borderRadius: 4, backgroundColor: roomPalette.leaf },
  flowerLeaf: { position: 'absolute', left: 34, top: 63, width: 22, height: 12, borderRadius: 12, backgroundColor: roomPalette.leaf, transform: [{ rotate: '-28deg' }] },
  flowerPot: { position: 'absolute', bottom: 0, width: 42, height: 28, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: roomPalette.vanity },
  sofa: { width: 118, height: 78, position: 'relative' },
  sofaBack: { position: 'absolute', left: 12, right: 12, top: 5, height: 49, borderRadius: 17 },
  sofaArm: { position: 'absolute', top: 35, width: 24, height: 32, borderRadius: 12, zIndex: 2 },
  sofaArmLeft: { left: 0 },
  sofaArmRight: { right: 0 },
  sofaCushions: { position: 'absolute', left: 20, right: 20, top: 34, height: 24, flexDirection: 'row', gap: 3, zIndex: 2 },
  sofaCushion: { flex: 1, borderRadius: 8, backgroundColor: '#FFD6EA', borderWidth: 1, borderColor: '#FFFFFF' },
  sofaBase: { position: 'absolute', left: 9, right: 9, bottom: 9, height: 22, borderRadius: 10 },
  sofaLeg: { position: 'absolute', bottom: 0, width: 7, height: 13, borderRadius: 4, backgroundColor: roomPalette.shelf },
  sofaLegLeft: { left: 20 },
  sofaLegRight: { right: 20 },
  vanity: { width: 94, height: 112, position: 'relative', alignItems: 'center' },
  vanityMirror: { width: 56, height: 60, borderRadius: 28, backgroundColor: roomPalette.vanity, borderWidth: 6, borderColor: roomPalette.vanity, overflow: 'hidden' },
  vanityReflection: { width: 48, height: 50, borderRadius: 25, backgroundColor: '#DDD5FF', transform: [{ translateX: 10 }] },
  vanityTop: { position: 'absolute', top: 57, width: 91, height: 12, borderRadius: 7, backgroundColor: roomPalette.vanity },
  vanityDrawers: { position: 'absolute', top: 67, width: 70, height: 31, flexDirection: 'row', gap: 3 },
  vanityDrawer: { flex: 1, borderRadius: 5, backgroundColor: '#B991DE', borderWidth: 1, borderColor: '#EAD9FA' },
  vanityLeg: { position: 'absolute', bottom: 0, width: 7, height: 19, borderRadius: 4, backgroundColor: roomPalette.shelf },
  vanityLegLeft: { left: 18 },
  vanityLegRight: { right: 18 },
  bookshelf: { width: 90, height: 118, borderRadius: 8, backgroundColor: roomPalette.shelf, padding: 8, justifyContent: 'space-between' },
  bookRow: { height: 34, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 4 },
  book: { width: 12, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  shelf: { height: 7, borderRadius: 4, backgroundColor: '#C99BE5' },
  preview: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewFlowerScale: { width: 68, height: 112, transform: [{ scale: 0.48 }] },
  previewFurnitureScale: { width: 118, height: 118, alignItems: 'center', justifyContent: 'flex-end', transform: [{ scale: 0.47 }] },
  nonePreview: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
});