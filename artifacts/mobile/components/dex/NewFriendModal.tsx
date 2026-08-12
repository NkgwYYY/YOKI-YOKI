/**
 * 「新しい仲間が生まれました!」演出モーダル
 * 新キャラ初登場・進化時に AppContext の newEncounters キューから1件ずつ表示する。
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, withDelay, FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/contexts/AppContext';
import { DEX_PROFILES } from '@/data/characterDex';
import { DEX_IMAGES } from '@/components/dex/dexAssets';

function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const op = useSharedValue(0);
  const sc = useSharedValue(0.4);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1, { duration: 600 }), withTiming(0.15, { duration: 800 })),
      -1, true,
    ));
    sc.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1.1, { duration: 700 }), withTiming(0.5, { duration: 700 })),
      -1, true,
    ));
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }] }));
  return (
    <Animated.Text style={[styles.sparkle, { left: x, top: y }, st]}>✦</Animated.Text>
  );
}

export function NewFriendModal() {
  const { newEncounters, dismissNewEncounter } = useApp();
  const charKey = newEncounters[0];

  const charScale = useSharedValue(0.3);
  useEffect(() => {
    if (!charKey) return;
    charScale.value = 0.3;
    charScale.value = withDelay(200, withSpring(1, { damping: 9, stiffness: 120 }));
  }, [charKey]);
  const charStyle = useAnimatedStyle(() => ({ transform: [{ scale: charScale.value }] }));

  if (!charKey) return null;
  const profile = DEX_PROFILES[charKey];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismissNewEncounter}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
          <LinearGradient
            colors={['rgba(52,32,110,0.98)', 'rgba(22,14,52,0.99)']}
            style={StyleSheet.absoluteFill}
          />
          <Sparkle x={24} y={30} delay={0} />
          <Sparkle x={250} y={50} delay={300} />
          <Sparkle x={40} y={190} delay={600} />
          <Sparkle x={240} y={210} delay={150} />
          <Text style={styles.kicker}>✨ NEW FRIEND ✨</Text>
          <Text style={styles.title}>新しい仲間が生まれました!</Text>
          <Animated.View style={[styles.charBox, charStyle]}>
            <Image source={DEX_IMAGES[charKey]} style={styles.charImg} resizeMode="contain" />
          </Animated.View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.quote}>「{profile.quote}」</Text>
          <Text style={styles.note}>図鑑(成長タブ)に記録されたよ</Text>
          <TouchableOpacity style={styles.btn} onPress={dismissNewEncounter} activeOpacity={0.9}>
            <LinearGradient
              colors={['#FFC94D', '#FF9D2E']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              <Text style={styles.btnText}>よろしくね!</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(8,5,20,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  card: {
    width: '100%', maxWidth: 340, borderRadius: 28, padding: 26,
    alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,201,77,0.35)',
  },
  sparkle: { position: 'absolute', fontSize: 16, color: '#FFD86B' },
  kicker: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFD86B', letterSpacing: 2 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginTop: 6, textAlign: 'center' },
  charBox: { width: 150, height: 150, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  charImg: { width: 150, height: 150 },
  name: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginTop: 12 },
  quote: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  note: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 10 },
  btn: { marginTop: 18, borderRadius: 14, overflow: 'hidden', alignSelf: 'stretch' },
  btnGrad: { paddingVertical: 14, alignItems: 'center', borderRadius: 14 },
  btnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#3A2400' },
});
