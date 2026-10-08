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
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
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
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const locked = useRef(false),
    mounted = useRef(true);
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      progress.stopAnimation();
    };
  }, [progress]);
  const animate = (closed: boolean, reduced: boolean) =>
    new Promise<void>((resolve) => {
      Animated.timing(progress, {
        toValue: closed ? 1 : 0,
        duration: reduced ? 0 : closed ? 340 : 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(() => resolve());
    });
  const nextFrame = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  const run = async (
    name: string,
    commit: () => void,
    prepare: () => Promise<unknown>,
    reduced: boolean,
    onError: () => void,
  ) => {
    if (locked.current) return;
    locked.current = true;
    setReduceMotion(reduced);
    progress.setValue(0);
    setLabel(name);
    const ready = Promise.resolve()
      .then(prepare)
      .then(
        () => true,
        () => false,
      );
    try {
      await nextFrame();
      if (!mounted.current) return;
      await animate(true, reduced);
      const ok = await ready;
      if (!mounted.current) return;
      if (ok) {
        commit();
        await nextFrame();
      } else onError();
    } catch {
      if (mounted.current) onError();
    } finally {
      if (mounted.current) {
        await animate(false, reduced);
        if (mounted.current) {
          locked.current = false;
          setLabel(null);
        }
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
          onRequestClose={() => {}}
        >
          <View
            testID="world-transition"
            accessibilityViewIsModal
            style={styles.curtain}
          >
            <Svg
              width={width}
              height={height}
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
          </View>
        </Modal>
      )}
    </TransitionContext.Provider>
  );
}
const styles = StyleSheet.create({
  curtain: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { alignItems: "center", gap: 14 },
  label: { color: "#F4EAFE", fontSize: 14, letterSpacing: 1 },
});
