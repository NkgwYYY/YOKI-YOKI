import React, { useEffect, useRef } from "react";
import { Animated, Image, Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
export const RAMEN_ART = require("@/assets/images/food/ramen-bowl.png");
export function RamenArt({
  size,
  onLoad,
  onError,
}: {
  size: number;
  onLoad?: () => void;
  onError?: () => void;
}) {
  return (
    <Image
      testID="ramen-bowl-art"
      source={RAMEN_ART}
      resizeMode="contain"
      style={{ width: size, height: size }}
      onLoad={onLoad}
      onError={onError}
      accessible={false}
    />
  );
}
export function RamenSteam({
  size,
  active,
  reduceMotion,
}: {
  size: number;
  active: boolean;
  reduceMotion: boolean;
}) {
  const flow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || reduceMotion) return;
    const animation = Animated.loop(
      Animated.timing(flow, {
        toValue: 1,
        duration: 2600,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    animation.start();
    return () => {
      animation.stop();
      flow.setValue(0);
    };
  }, [active, reduceMotion, flow]);
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { alignItems: "center" }]}
    >
      <Animated.View
        style={{
          width: size * 0.58,
          height: size * 0.48,
          top: size * 0.04,
          opacity: reduceMotion
            ? 0.5
            : flow.interpolate({
                inputRange: [0, 0.3, 0.75, 1],
                outputRange: [0.15, 0.75, 0.65, 0],
              }),
          transform: [
            {
              translateY: reduceMotion
                ? -12
                : flow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -size * 0.2],
                  }),
            },
          ],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 180 150">
          <Path
            d="M 35 140 C 7 110 67 94 35 61 C 22 44 41 21 50 9 M 90 140 C 117 109 65 91 92 60 C 108 42 90 23 99 7 M 143 140 C 119 115 164 94 144 68 C 130 47 153 30 158 16"
            fill="none"
            stroke="#FFF8EADD"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
