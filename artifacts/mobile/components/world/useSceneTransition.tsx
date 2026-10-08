import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { performSceneTransition } from "@/utils/sceneTransition";
const ACircle = Animated.createAnimatedComponent(Circle);
type Transition = {
  busy: boolean;
  run: (
    name: string,
    commit: () => void,
    prepare: () => Promise<unknown>,
    reduced: boolean,
    onError: () => void,
  ) => Promise<void>;
};
const TransitionContext = createContext<Transition | null>(null);
export function useSceneTransition(reduceMotion: boolean, onError: () => void) {
  const transition = useContext(TransitionContext);
  if (!transition) throw new Error("SceneTransitionProvider missing");
  return {
    busy: transition.busy,
    overlay: null,
    run: (
      name: string,
      commit: () => void,
      prepare: () => Promise<unknown> = async () => {},
    ) => transition.run(name, commit, prepare, reduceMotion, onError),
  };
}
/** An iris closes from the edges; commit only once the whole scene is covered. */
export function SceneTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [{ width, height }, setBounds] = useState({ width: 1, height: 1 });
  const progress = useRef(new Animated.Value(0)).current;
  const current = useRef<AbortController | null>(null);
  const frames = useRef(new Set<number>());
  const [label, setLabel] = useState<string | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const [covered, setCovered] = useState(false);
  const clearFrames = () => {
    for (const frame of frames.current) cancelAnimationFrame(frame);
    frames.current.clear();
  };
  const cancel = () => {
    current.current?.abort();
    current.current = null;
    progress.stopAnimation();
    clearFrames();
    setLabel(null);
  };
  useEffect(() => {
    return () => {
      current.current?.abort();
      current.current = null;
      progress.stopAnimation();
      clearFrames();
    };
  }, [progress]);
  const animate = (closed: boolean, reduced: boolean) =>
    new Promise<void>((resolve) => {
      Animated.timing(progress, {
        toValue: closed ? 1 : 0,
        duration: reduced ? 0 : closed ? 220 : 280,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(() => resolve());
    });
  const nextFrame = () => new Promise<void>(resolve => {
    const first = requestAnimationFrame(() => {
      frames.current.delete(first);
      const second = requestAnimationFrame(() => {
        frames.current.delete(second);
        resolve();
      });
      frames.current.add(second);
    });
    frames.current.add(first);
  });
  const run = async (
    name: string,
    commit: () => void,
    prepare: () => Promise<unknown>,
    reduced: boolean,
    onError: () => void,
  ) => {
    if (current.current) return;
    const controller = new AbortController();
    current.current = controller;
    setReduceMotion(reduced);
    progress.setValue(0);
    setCovered(false);
    setCanCancel(false);
    setLabel(name);
    const cancelTimer = setTimeout(() => {
      if (current.current === controller) setCanCancel(true);
    }, 1200);
    try {
      await performSceneTransition({
        prepare,
        paint: nextFrame,
        close: () => animate(true, reduced),
        cover: () => {
          progress.stopAnimation();
          progress.setValue(1);
          setCovered(true);
        },
        commit,
        onError,
        open: () => {
          setCovered(false);
          return animate(false, reduced);
        },
      }, controller.signal);
    } finally {
      clearTimeout(cancelTimer);
      controller.abort();
      // An old cancelled trip must never dismiss or unlock a newer one.
      if (current.current === controller) {
        current.current = null;
        progress.stopAnimation();
        clearFrames();
        setLabel(null);
      }
    }
  };
  const radius = Math.hypot(width, height) / 2 + 3;
  // A thick ring leaves a circular transparent centre, without platform-specific masks.
  const ringRadius = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [radius * 2, radius],
  });
  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.94, 1],
    outputRange: [0, 0, 1],
  });
  return (
    <TransitionContext.Provider value={{ busy: label !== null, run }}>
      {children}
      {label !== null && (
        <Modal
          transparent
          visible
          animationType="none"
          statusBarTranslucent
          onRequestClose={cancel}
        >
          <View
            testID="world-transition"
            accessibilityViewIsModal
            onAccessibilityEscape={cancel}
            onLayout={event => {
              const { width, height } = event.nativeEvent.layout;
              if (width > 0 && height > 0) setBounds(previous =>
                previous.width === width && previous.height === height ? previous : { width, height });
            }}
            style={styles.curtain}
          >
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
              accessible={false}
            >
              <ACircle
                cx={width / 2}
                cy={height / 2}
                r={ringRadius}
                stroke="#17121F"
                strokeWidth={radius * 2 + 1}
                fill="none"
              />
            </Svg>
            {covered && <View pointerEvents="none" style={styles.closed} />}
            <Animated.View style={[styles.content, { opacity: labelOpacity }]}>
              <ActivityIndicator
                color="#D9C5F1"
                size="small"
                animating={!reduceMotion}
              />
              <Text accessibilityLiveRegion="polite" style={styles.label}>
                {label}
              </Text>
            </Animated.View>
            {canCancel && <Pressable testID="world-transition-cancel" accessibilityRole="button"
              onPress={cancel} style={styles.cancel}>
              <Text style={styles.cancelText}>いったん閉じる</Text>
            </Pressable>}
          </View>
        </Modal>
      )}
    </TransitionContext.Provider>
  );
}
const styles = StyleSheet.create({
  curtain: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  closed: { ...StyleSheet.absoluteFillObject, backgroundColor: "#17121F" },
  content: { alignItems: "center", gap: 14 },
  label: { color: "#F4EAFE", fontSize: 14, letterSpacing: 1 },
  cancel: { position: "absolute", bottom: "18%", minHeight: 48, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 24, backgroundColor: "#F4EAFE" },
  cancelText: { color: "#493457", fontSize: 14, fontWeight: "600" },
});
