import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, homePalette } from '@/constants/theme';
import { Icon } from '@/components/ui/Icon';

/**
 * YOKI YOKI の世界観に合わせた、抽象アイコンではない具体的なイラスト群。
 * Pure React Native Views + Feather Icons を組み合わせて描写し、画像リソースに依存しない。
 */

// ----------------------------------------------------------------------
// Home Actions
// ----------------------------------------------------------------------

export function CakeIllustration({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* お皿 */}
      <View style={{ position: 'absolute', bottom: 4, width: size * 0.8, height: size * 0.2, backgroundColor: colors.borderSubtle, borderRadius: size, borderWidth: 1, borderColor: colors.border }} />
      {/* ケーキ本体 */}
      <View style={{ position: 'absolute', bottom: 8, width: size * 0.6, height: size * 0.45, backgroundColor: '#FFF0F5', borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderColor: colors.primarySoft, overflow: 'hidden' }}>
        {/* 中の層 */}
        <View style={{ width: '100%', height: 4, backgroundColor: colors.primary, position: 'absolute', top: '40%', opacity: 0.3 }} />
      </View>
      {/* クリーム */}
      <View style={{ position: 'absolute', top: size * 0.35, width: size * 0.64, height: size * 0.2, backgroundColor: '#FFFFFF', borderRadius: size, borderWidth: 1, borderColor: colors.borderSubtle }}>
        <View style={{ position: 'absolute', bottom: -4, left: 4, width: 12, height: 12, backgroundColor: '#FFFFFF', borderRadius: 6 }} />
        <View style={{ position: 'absolute', bottom: -6, left: 16, width: 14, height: 14, backgroundColor: '#FFFFFF', borderRadius: 7 }} />
        <View style={{ position: 'absolute', bottom: -3, right: 4, width: 10, height: 10, backgroundColor: '#FFFFFF', borderRadius: 5 }} />
      </View>
      {/* いちご */}
      <View style={{ position: 'absolute', top: size * 0.15, width: 12, height: 12, backgroundColor: colors.danger, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }} />
    </View>
  );
}

export function ChatIllustration({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.75, height: size * 0.55, backgroundColor: colors.primary, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="heart" size={16} color="#FFFFFF" />
      </View>
      {/* しっぽ */}
      <View style={{ position: 'absolute', bottom: size * 0.13, left: size * 0.2, width: 12, height: 12, backgroundColor: colors.primary, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: colors.primarySoft, transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

export function GamepadIllustration({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.5, backgroundColor: colors.secondary, borderRadius: 20, borderWidth: 1.5, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        {/* D-Pad */}
        <View style={{ width: 16, height: 16 }}>
          <View style={{ position: 'absolute', top: 5, left: 0, width: 16, height: 6, backgroundColor: colors.subtleForeground, borderRadius: 2 }} />
          <View style={{ position: 'absolute', top: 0, left: 5, width: 6, height: 16, backgroundColor: colors.subtleForeground, borderRadius: 2 }} />
        </View>
        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 4, transform: [{ rotate: '-15deg' }] }}>
          <View style={{ width: 8, height: 8, backgroundColor: colors.success, borderRadius: 4, marginTop: 8 }} />
          <View style={{ width: 8, height: 8, backgroundColor: colors.primary, borderRadius: 4, marginBottom: 8 }} />
        </View>
      </View>
    </View>
  );
}

export function CharacterFacetAura({ width, height }: { width: number; height: number }) {
  return (
    <View pointerEvents="none" style={[styles.facetAura, { width, height, borderRadius: width * 0.48 }]}>
      <LinearGradient
        colors={[homePalette.auraWarm, homePalette.auraCool, homePalette.auraClear]}
        start={{ x: 0.16, y: 0.06 }}
        end={{ x: 0.88, y: 0.94 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.facet, styles.facetTop]} />
      <View style={[styles.facet, styles.facetSide]} />
      <View style={[styles.facet, styles.facetBottom]} />
    </View>
  );
}

export function GameBoardIllustration({
  size = 48,
  tone = 'default',
}: {
  size?: number;
  tone?: 'default' | 'play';
}) {
  const cell = size * 0.16;
  const isPlay = tone === 'play';
  const boardColor = isPlay ? homePalette.playSurface : colors.secondary;
  const boardBorder = isPlay ? homePalette.playIcon : colors.primary;
  const cellAccent = isPlay ? homePalette.playIcon : colors.primary;
  const cellMuted = isPlay ? homePalette.playCell : colors.borderSubtle;
  const markerColor = isPlay ? homePalette.playMarker : colors.success;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.78,
        height: size * 0.78,
        borderRadius: size * 0.15,
        backgroundColor: boardColor,
        borderWidth: 1.5,
        borderColor: boardBorder,
        padding: size * 0.1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: size * 0.045,
        alignContent: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-6deg' }],
      }}>
        {Array.from({ length: 9 }).map((_, index) => (
          <View
            key={index}
            style={{
              width: cell,
              height: cell,
              borderRadius: cell * 0.3,
              backgroundColor: index === 2 || index === 6 ? cellAccent : cellMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        ))}
        <View style={{
          position: 'absolute',
          left: size * 0.23,
          top: size * 0.24,
          width: size * 0.12,
          height: size * 0.12,
          borderRadius: size,
          backgroundColor: markerColor,
          borderWidth: 1,
           borderColor: colors.card,
        }} />
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------
// Food Illustrations
// ----------------------------------------------------------------------

export function BerryIcon({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.5, height: size * 0.5, backgroundColor: colors.danger, borderRadius: size, borderTopLeftRadius: 2, transform: [{ rotate: '45deg' }], borderWidth: 1.5, borderColor: '#FFF' }} />
      <View style={{ position: 'absolute', top: size * 0.15, width: 8, height: 8, borderLeftWidth: 2, borderTopWidth: 2, borderColor: colors.success, borderTopLeftRadius: 4 }} />
    </View>
  );
}

export function AppleIcon({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.55, backgroundColor: colors.danger, borderRadius: size * 0.3, borderWidth: 1.5, borderColor: '#FFF', marginTop: 4 }}>
        <View style={{ position: 'absolute', top: 4, right: 6, width: 8, height: 8, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4 }} />
      </View>
      <View style={{ position: 'absolute', top: size * 0.1, width: 4, height: 10, backgroundColor: '#8B5A2B', borderRadius: 2, transform: [{ rotate: '15deg' }] }} />
      <View style={{ position: 'absolute', top: size * 0.15, left: size * 0.5, width: 10, height: 6, backgroundColor: colors.success, borderTopRightRadius: 6, borderBottomLeftRadius: 6 }} />
    </View>
  );
}

export function CandyIcon({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Wrapper */}
      <View style={{ position: 'absolute', width: size * 0.8, height: size * 0.3, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 12, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.primarySoft }} />
        <View style={{ width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderLeftWidth: 12, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: colors.primarySoft }} />
      </View>
      {/* Body */}
      <View style={{ width: size * 0.45, height: size * 0.45, backgroundColor: colors.primary, borderRadius: size, borderWidth: 1.5, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <View style={{ width: size, height: 4, backgroundColor: '#FFF', transform: [{ rotate: '45deg' }] }} />
      </View>
    </View>
  );
}

export function CakeFoodIcon({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.5, backgroundColor: '#FFE4C4', borderBottomLeftRadius: 4, borderBottomRightRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#FFF' }}>
        <View style={{ width: '100%', height: size * 0.15, backgroundColor: '#FFFFFF' }} />
        <View style={{ width: '100%', height: 4, backgroundColor: colors.danger, marginTop: 4 }} />
      </View>
      <View style={{ position: 'absolute', top: size * 0.15, width: 10, height: 10, backgroundColor: colors.danger, borderRadius: 5, borderWidth: 1, borderColor: '#FFF' }} />
    </View>
  );
}

export function RamenIcon({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Bowl */}
      <View style={{ width: size * 0.7, height: size * 0.35, backgroundColor: colors.danger, borderBottomLeftRadius: size * 0.35, borderBottomRightRadius: size * 0.35, borderWidth: 1.5, borderColor: '#FFF', marginTop: 8 }} />
      {/* Noodles & Toppings */}
      <View style={{ position: 'absolute', top: size * 0.3, width: size * 0.6, height: 4, backgroundColor: '#F4D06F', borderRadius: 2 }} />
      <View style={{ position: 'absolute', top: size * 0.25, left: size * 0.25, width: 12, height: 6, backgroundColor: '#FFFFFF', borderRadius: 3 }} />
      <View style={{ position: 'absolute', top: size * 0.2, right: size * 0.3, width: 8, height: 8, backgroundColor: '#8B5A2B', borderRadius: 4 }} />
      {/* Chopsticks */}
      <View style={{ position: 'absolute', top: size * 0.1, right: size * 0.15, width: 2, height: size * 0.4, backgroundColor: '#D2B48C', transform: [{ rotate: '30deg' }] }} />
      <View style={{ position: 'absolute', top: size * 0.1, right: size * 0.2, width: 2, height: size * 0.4, backgroundColor: '#D2B48C', transform: [{ rotate: '30deg' }] }} />
    </View>
  );
}

export function SpecialFoodIcon({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="star" size={size * 0.7} color={colors.primary} />
      <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] }}>
        <Icon name="star" size={size * 0.4} color="#FFFFFF" style={{ position: 'absolute', top: 0, right: 0 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  facetAura: {
    position: 'absolute',
    alignSelf: 'center',
    overflow: 'hidden',
    opacity: 0.85,
  },
  facet: {
    position: 'absolute',
    backgroundColor: homePalette.auraFacet,
    transform: [{ rotate: '28deg' }],
  },
  facetTop: { width: '32%', height: '18%', top: '10%', left: '28%', borderRadius: 8 },
  facetSide: { width: '22%', height: '28%', top: '34%', right: '10%', borderRadius: 8, transform: [{ rotate: '-24deg' }] },
  facetBottom: { width: '38%', height: '14%', bottom: '12%', left: '20%', borderRadius: 8, opacity: 0.6 },
});