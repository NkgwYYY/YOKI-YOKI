/**
 * 「新しい仲間が生まれました!」演出モーダル
 * 新キャラ初登場・進化時に AppContext の newEncounters キューから1件ずつ表示する。
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, withDelay, FadeIn,
} from 'react-native-reanimated';
import {
  border,
  colors,
  control,
  elevation,
  radius,
  space,
  typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Icon, iconSize } from '@/components/ui/Icon';
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
    <Animated.View style={[styles.sparkle, { left: x, top: y }, st]}>
      <Icon name="star" size={iconSize.xs} color={colors.borderStrong} />
    </Animated.View>
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
          <Sparkle x={24} y={30} delay={0} />
          <Sparkle x={250} y={50} delay={300} />
          <Sparkle x={40} y={190} delay={600} />
          <Sparkle x={240} y={210} delay={150} />
          <Text style={styles.kicker}>NEW FRIEND</Text>
          <Text style={styles.title}>新しい仲間が生まれました!</Text>
          <Animated.View style={[styles.charBox, charStyle]}>
            <Image source={DEX_IMAGES[charKey]} style={styles.charImg} resizeMode="contain" />
          </Animated.View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.quote}>「{profile.quote}」</Text>
          <Text style={styles.note}>図鑑(成長タブ)に記録されたよ</Text>
          <Button label="よろしくね！" onPress={dismissNewEncounter} style={styles.btn} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.sheet,
    ...border.hairlineStrong,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    overflow: 'hidden',
    ...elevation.overlay,
  },
  sparkle: { position: 'absolute' },
  kicker: { ...typography.micro, color: colors.primaryOnSoft, letterSpacing: 2 },
  title: {
    ...typography.heading,
    color: colors.foreground,
    marginTop: space.xs,
    textAlign: 'center',
  },
  charBox: {
    width: 144,
    height: 144,
    marginTop: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charImg: { width: 144, height: 144 },
  name: { ...typography.title, color: colors.foreground, marginTop: space.md },
  quote: {
    ...typography.callout,
    color: colors.mutedForeground,
    marginTop: space.xs,
    textAlign: 'center',
  },
  note: { ...typography.micro, color: colors.subtleForeground, marginTop: space.md },
  btn: { marginTop: space.xl, alignSelf: 'stretch', minHeight: control.height },
});
