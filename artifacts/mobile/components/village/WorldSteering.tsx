import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
export function WorldSteering({
  value,
  enabled,
  onStep,
  onStart,
}: {
  value: SharedValue<{ x: number; y: number }>;
  enabled: boolean;
  onStart: () => void;
  onStep: (x: number, y: number) => void;
}) {
  const finger = useSharedValue(false);
  useEffect(() => {
    if (!enabled) {
      value.value = { x: 0, y: 0 };
      finger.value = false;
    }
    return () => {
      value.value = { x: 0, y: 0 };
    };
  }, [enabled, value, finger]);
  const gesture = Gesture.Pan()
    .enabled(enabled)
    .maxPointers(1)
    .minDistance(0)
    .onBegin(() => {
      finger.value = true;
      runOnJS(onStart)();
    })
    .onUpdate((e) => {
      const length = Math.max(28, Math.hypot(e.translationX, e.translationY));
      value.value = { x: e.translationX / length, y: e.translationY / length };
    })
    .onFinalize(() => {
      value.value = { x: 0, y: 0 };
      finger.value = false;
    });
  const knob = useAnimatedStyle(() => ({
    opacity: enabled ? 1 : 0.45,
    transform: [
      { translateX: value.value.x * 24 },
      { translateY: value.value.y * 24 },
      { scale: finger.value ? 1.08 : 1 },
    ],
  }));
  return (
    <GestureDetector gesture={gesture} touchAction="none">
      <View
        testID="world-steering"
        style={[s.pad, !enabled && { opacity: 0.4 }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="おさんぽの方向"
        accessibilityHint="指をすべらせて上下左右に歩きます。離すと止まります。"
        accessibilityState={{ disabled: !enabled }}
        accessibilityActions={[
          { name: "up", label: "奥へ歩く" },
          { name: "down", label: "手前へ歩く" },
          { name: "left", label: "左へ歩く" },
          { name: "right", label: "右へ歩く" },
        ]}
        onAccessibilityAction={(e) => {
          if (enabled) {
            const directions: Record<string, number[]> = {
              up: [0, -1],
              down: [0, 1],
              left: [-1, 0],
              right: [1, 0],
            };
            const d = directions[e.nativeEvent.actionName];
            if (d) onStep(d[0], d[1]);
          }
        }}
        tabIndex={enabled ? 0 : -1}
        {...(Platform.OS === "web"
          ? {
              onKeyDown: (e: React.KeyboardEvent) => {
                const d: Record<string, number[]> = {
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                };
                if (enabled && d[e.key]) {
                  e.preventDefault();
                  onStep(d[e.key][0], d[e.key][1]);
                }
              },
            }
          : {})}
      >
        <Text pointerEvents="none" style={s.up}>
          ⌃
        </Text>
        <Text pointerEvents="none" style={s.down}>
          ⌄
        </Text>
        <Text pointerEvents="none" style={s.left}>
          ‹
        </Text>
        <Text pointerEvents="none" style={s.right}>
          ›
        </Text>
        <Animated.View pointerEvents="none" style={[s.knob, knob]}>
          <View style={s.dot} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
const s = StyleSheet.create({
  pad: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#FFFFFFDD",
    backgroundColor: "#FFF8EEF0",
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#BCA2D0",
    borderWidth: 2,
    borderColor: "#E9D9F2",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#172D22",
    shadowRadius: 9,
    shadowOpacity: 0.25,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F8F0FF" },
  up: { position: "absolute", top: 0, color: "#967AA6", fontSize: 24 },
  down: { position: "absolute", bottom: 0, color: "#967AA6", fontSize: 24 },
  left: { position: "absolute", left: 9, color: "#967AA6", fontSize: 24 },
  right: { position: "absolute", right: 9, color: "#967AA6", fontSize: 24 },
});
