import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';

function Particle({ delay, index, width, height }: { delay: number; index: number; width: number; height: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);
  return <Animated.View testID="light-flow-particle" style={[styles.particle, {
    width: index % 2 ? 7 : 10, height: index % 2 ? 7 : 10,
    opacity: progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.9, 0] }),
    transform: [
      { translateX: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [(index - 2) * 8, width * 0.12 + index * 5, width * 0.33] }) },
      { translateY: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, -24 - index * 5, height * 0.30] }) },
    ],
  }]} />;
}

type Props = { amount: number; reduceMotion?: boolean; onDone: () => void; onGoPlant?: () => void };

/** A saved-gain event is the sole trigger; loading balances never plays this feedback. */
export function LightFlowEffect({ amount, reduceMotion = false, onDone, onGoPlant }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => done.current(), 4500);
    return () => clearTimeout(timer);
  }, []);
  return <View style={styles.overlay} pointerEvents="box-none" testID="light-flow-feedback">
    {!reduceMotion && <View style={{ position: 'absolute', left: width * 0.5, top: height * 0.60 }} pointerEvents="none">
      {[0, 150, 300, 450, 600].map((delay, index) => <Particle key={index} {...{ delay, index, width, height }} />)}
    </View>}
    <View style={[styles.bannerWrap, { bottom: Math.max(insets.bottom + 74, 104), left: insets.left + 16, right: insets.right + 16 }]} pointerEvents="box-none">
      <Pressable testID="light-flow-garden" accessibilityRole="button"
        accessibilityLabel={`光エネルギー ${amount}が庭に届きました。ひかりの庭を見る`}
        onPress={() => { done.current(); onGoPlant?.(); }} style={styles.banner}>
        <Icon name="star" size={18} color="#F1D49C" />
        <View style={styles.copy}>
          <Text accessibilityLiveRegion="polite" style={styles.title}>あなたのひとこまが、庭の光になったよ。</Text>
          <Text style={styles.link}>ひかりの庭へ</Text>
        </View>
        <Icon name="chevron-right" size={16} color="#F1D49C" />
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  particle: { position: 'absolute', borderRadius: 10, backgroundColor: '#FFE4A0', shadowColor: '#FFD479', shadowRadius: 6, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 } },
  bannerWrap: { position: 'absolute', alignItems: 'center' },
  banner: { maxWidth: 370, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: '#B39978', backgroundColor: '#443445F2' },
  copy: { flexShrink: 1, gap: 3 },
  title: { fontSize: 12, lineHeight: 18, color: '#FFF1D9' },
  link: { fontSize: 11, color: '#D8BDCE' },
});
