/**
 * 「光が流れる」循環演出
 * 記録・ゲームなどで光エネルギーが増えた瞬間、キャラのあたりから光の粒が
 * 庭園へのぼっていき、「エネルギーチャージされたよ」のバナーを出す軽い演出。
 * 重い描画はせず Reanimated の transform/opacity だけで構成する。
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence,
  Easing, FadeInDown, FadeOut,
} from 'react-native-reanimated';
import { border, colors, elevation, radius, space, typography } from '@/constants/theme';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

const { height: SH, width: SW } = Dimensions.get('window');

function Particle({ delay, xOff, size }: { delay: number; xOff: number; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.12 ? t.value / 0.12 : 1 - Math.max(0, (t.value - 0.7) / 0.3),
    transform: [
      { translateY: -t.value * SH * 0.55 },
      { translateX: Math.sin(t.value * Math.PI * 2) * 18 + xOff },
      { scale: 0.6 + t.value * 0.5 },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.particle,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

interface Props {
  /** 今回増えたエネルギー量(バナー表示用) */
  amount: number;
  /** 演出終了時(自動でも呼ばれる) */
  onDone: () => void;
  /** バナータップでエネルギーチャージ画面へ(任意) */
  onGoPlant?: () => void;
}

export function LightFlowEffect({ amount, onDone, onGoPlant }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* キャラのあたり(画面中央やや下)から立ちのぼる光の粒 */}
      <View style={styles.particleOrigin} pointerEvents="none">
        {[0, 120, 260, 420, 560, 700].map((d, i) => (
          <Particle key={i} delay={d} xOff={(i - 2.5) * 22} size={i % 2 === 0 ? 18 : 13} />
        ))}
      </View>
      {/* バナー: 光→庭園→チャージ */}
      <Animated.View
        entering={FadeInDown.delay(700).springify().damping(14)}
        exiting={FadeOut}
        style={styles.bannerWrap}
      >
        <PressScale
          onPress={() => { if (onGoPlant) { onDone(); onGoPlant(); } }}
          accessibilityLabel={`光エネルギー +${amount}。チャージを見る`}
          style={styles.banner}
        >
          <View style={styles.bannerFlow}>
            <Icon name="feather" size={iconSize.sm} color={colors.primaryOnSoft} />
            <Icon name="arrow-right" size={iconSize.xs} color={colors.subtleForeground} />
            <Icon name="star" size={iconSize.sm} color={colors.primaryOnSoft} />
            <Icon name="arrow-right" size={iconSize.xs} color={colors.subtleForeground} />
            <Icon name="gift" size={iconSize.sm} color={colors.primaryOnSoft} />
          </View>
          <Text style={styles.bannerText}>キミの光がエネルギーになったよ　+{amount}</Text>
          {onGoPlant && (
            <View style={styles.bannerLinkRow}>
              <Text style={styles.bannerLink}>チャージを見る</Text>
              <Icon name="chevron-right" size={iconSize.xs} color={colors.mutedForeground} />
            </View>
          )}
        </PressScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  particleOrigin: {
    position: 'absolute', bottom: SH * 0.32, left: 0, right: 0,
    alignItems: 'center',
  },
  particle: { position: 'absolute', backgroundColor: colors.primary },
  bannerWrap: {
    position: 'absolute',
    top: SH * 0.12,
    left: space.xl,
    right: space.xl,
    alignItems: 'center',
  },
  banner: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    alignItems: 'center',
    gap: space.sm,
    maxWidth: Math.min(360, SW - space.xxl * 2),
    ...elevation.raised,
  },
  bannerFlow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bannerText: { ...typography.calloutStrong, color: colors.foreground, textAlign: 'center' },
  bannerLinkRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  bannerLink: { ...typography.micro, color: colors.mutedForeground },
});
