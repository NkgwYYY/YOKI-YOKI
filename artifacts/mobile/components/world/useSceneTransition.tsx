import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Platform, StyleSheet, Text, View } from 'react-native';

/** A short curtain hides asset decoding and repositioning; repeated taps cannot queue trips. */
export function useSceneTransition(reduceMotion: boolean, onError: () => void) {
  const opacity = useRef(new Animated.Value(0)).current;
  const locked = useRef(false);
  const mounted = useRef(true);
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; opacity.stopAnimation(); }; }, [opacity]);
  const fade = (toValue: number) => new Promise<void>(resolve => {
    Animated.timing(opacity, { toValue, duration: reduceMotion ? 0 : toValue ? 140 : 160,
      useNativeDriver: Platform.OS !== 'web' }).start(() => resolve());
  });
  const run = async (name: string, commit: () => void, prepare: () => Promise<unknown> = async () => {}) => {
    if (locked.current) return;
    locked.current = true;
    setLabel(name);
    // Start loading during fade-out, rather than adding an artificial loading delay.
    const ready = Promise.resolve().then(prepare).then(() => true, () => false);
    await fade(1);
    const ok = await ready;
    if (!mounted.current) return;
    if (ok) {
      commit();
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    } else onError();
    if (!mounted.current) return;
    await fade(0);
    if (mounted.current) { locked.current = false; setLabel(null); }
  };
  return { busy: label !== null, run, overlay: label !== null && (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <Animated.View testID="world-transition" accessibilityViewIsModal style={[styles.curtain, { opacity }]}>
        <View style={styles.content}>
          <ActivityIndicator color="#E7D9FB" size="small" animating={!reduceMotion} />
          <Text accessibilityLiveRegion="polite" style={styles.label}>{label}</Text>
        </View>
      </Animated.View>
    </Modal>
  ) };
}
const styles = StyleSheet.create({
  curtain: { flex: 1, backgroundColor: '#211A32', alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 14 },
  label: { color: '#F4EAFE', fontSize: 15, letterSpacing: 1 },
});
