/**
 * 「光が流れる」循環演出
 * 記録・ゲームなどで光エネルギーが増えた瞬間、キャラのあたりから光の粒が
 * 空(太陽)へのぼっていき、「発電所に届いたよ」のバナーを出す軽い演出。
 * 重い描画はせず Reanimated の transform/opacity だけで構成する。
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence,
  Easing, FadeInDown, FadeOut,
} from 'react-native-reanimated';

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
    <Animated.Text style={[styles.particle, { fontSize: size }, style]}>✦</Animated.Text>
  );
}

interface Props {
  /** 今回増えたエネルギー量(バナー表示用) */
  amount: number;
  /** 演出終了時(自動でも呼ばれる) */
  onDone: () => void;
  /** バナータップで発電所へ(任意) */
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
      {/* バナー: 光→太陽→発電所 */}
      <Animated.View
        entering={FadeInDown.delay(700).springify().damping(14)}
        exiting={FadeOut}
        style={styles.bannerWrap}
      >
        <TouchableOpacity
          activeOpacity={onGoPlant ? 0.85 : 1}
          onPress={() => { if (onGoPlant) { onDone(); onGoPlant(); } }}
          style={styles.banner}
        >
          <Text style={styles.bannerFlow}>✨ → 🌞 → 🏭</Text>
          <Text style={styles.bannerText}>キミの光が発電所に届いたよ! ⚡+{amount}</Text>
          {onGoPlant && <Text style={styles.bannerLink}>発電所を見る ›</Text>}
        </TouchableOpacity>
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
  particle: { position: 'absolute', color: '#FFD86B', textShadowColor: '#FF9D2E', textShadowRadius: 8 },
  bannerWrap: { position: 'absolute', top: SH * 0.12, left: 20, right: 20, alignItems: 'center' },
  banner: {
    backgroundColor: 'rgba(34,22,74,0.94)', borderColor: 'rgba(255,201,77,0.5)', borderWidth: 1,
    borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', gap: 3,
    maxWidth: Math.min(360, SW - 40),
  },
  bannerFlow: { fontSize: 14, letterSpacing: 2 },
  bannerText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FFD86B', textAlign: 'center' },
  bannerLink: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.75)' },
});
