import React, { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Rect,
  Ellipse,
  Circle,
} from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import {
  VolumeResident,
  hasResidentVolume,
} from "@/components/world/VolumeResident";
import { StaticMascot } from "@/components/Mascot";
import type { MascotStage } from "@/utils/mascotUtils";
import { pinPositions, type BowlingFrame } from "@/utils/bowling";

function project(x: number, y: number, width: number, height: number) {
  "worklet";
  const q = Math.max(0, Math.min(1.12, y / 10));
  return {
    x: width * 0.5 + x * width * (0.405 - q * 0.235),
    y: height * (0.91 - q * 0.75),
    scale: 1 - q * 0.52,
  };
}
function Pin({
  index,
  width,
  height,
  frames,
  progress,
}: {
  index: number;
  width: number;
  height: number;
  frames: BowlingFrame[] | null;
  progress: SharedValue<number>;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const initial = pinPositions()[index];
  const style = useAnimatedStyle(() => {
    const f = frames
      ? frames[
          Math.min(
            frames.length - 1,
            Math.floor(progress.value * (frames.length - 1)),
          )
        ]
      : null;
    const p = f?.pins[index] ?? { ...initial, rotation: 0, down: false };
    const at = project(p.x, p.y, width, height),
      size = Math.max(20, width * 0.058);
    return {
      left: at.x - size / 2,
      top: at.y - size * 1.9,
      width: size,
      height: size * 2,
      opacity: p.y > 10.7 ? 0.25 : 1,
      transform: [
        { translateY: p.down ? size * 0.7 : 0 },
        { rotate: p.rotation * (p.x < 0 ? -1 : 1) + "deg" },
      ],
    };
  });
  return (
    <Animated.View testID={"bowling-pin-" + index} style={[s.pin, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 30 60">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2=".2">
            <Stop stopColor="#CFC4DA" />
            <Stop offset=".35" stopColor="#FFFFFF" />
            <Stop offset=".72" stopColor="#FFFDF7" />
            <Stop offset="1" stopColor="#C7B4CD" />
          </LinearGradient>
        </Defs>
        <Ellipse cx="15" cy="57" rx="13" ry="3" fill="#65477535" />
        <Path
          d="M 15 3 C 3 3 6 16 10 21 C 12 25 8 29 5 37 C 0 51 5 57 15 57 C 25 57 30 51 25 37 C 22 29 18 25 20 21 C 24 16 27 3 15 3Z"
          fill={"url(#" + id + ")"}
          stroke="#D2C1DD"
          strokeWidth=".8"
        />
        <Path
          d="M 9 21 Q15 23 21 21 L20 25 Q15 27 10 25 Z M9 28 Q15 30 21 28 L23 32 Q15 35 7 32Z"
          fill="#BC8CC7"
        />
      </Svg>
    </Animated.View>
  );
}
export function BowlingLane({
  width,
  height,
  stage,
  frames,
  progress,
  aim,
}: {
  width: number;
  height: number;
  stage: MascotStage;
  frames: BowlingFrame[] | null;
  progress: SharedValue<number>;
  aim: number;
}) {
  const zero = useSharedValue(0);
  const rx = useDerivedValue(() =>
    frames ? progress.value * Math.PI * 12 : 0,
  );
  const ry = useDerivedValue(() => (frames ? aim * 0.4 : 0));
  const size = Math.min(88, width * 0.205);
  const ballStyle = useAnimatedStyle(() => {
    const f = frames
      ? frames[
          Math.min(
            frames.length - 1,
            Math.floor(progress.value * (frames.length - 1)),
          )
        ]
      : { x: 0, y: 0.1 };
    const at = project(f.x, f.y, width, height);
    return {
      left: at.x - size / 2,
      top: at.y - size * 0.88,
      opacity: f.y > 10.5 ? 0 : 1,
      transform: [{ scale: at.scale }],
    };
  });
  const leafRoll = useAnimatedStyle(() => ({
    transform: [{ rotate: (frames ? progress.value * 1080 : 0) + "deg" }],
  }));
  const aimPoint = project(aim * 1.5, 8, width, height);
  return (
    <View testID="bowling-lane" style={{ width, height, overflow: "hidden" }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="alley-wall" x1="0" y1="0" x2="0" y2="1">
            <Stop stopColor="#D4BFE6" />
            <Stop offset=".4" stopColor="#F5EAF4" />
            <Stop offset="1" stopColor="#CFBCD8" />
          </LinearGradient>
          <LinearGradient id="alley-wood" x1="0" y1="0" x2=".2" y2="1">
            <Stop stopColor="#D8AB7F" />
            <Stop offset=".4" stopColor="#F0CDA0" />
            <Stop offset="1" stopColor="#F9E0B4" />
          </LinearGradient>
          <RadialGradient id="alley-light">
            <Stop stopColor="#FFFCDE" stopOpacity=".8" />
            <Stop offset="1" stopColor="#FFF4EA" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#alley-wall)" />
        {[0.12, 0.5, 0.88].map((x, i) => (
          <Path
            key={i}
            d={
              "M " +
              (width * x - width * 0.09) +
              " " +
              height * 0.28 +
              " V " +
              height * 0.07 +
              " Q " +
              width * x +
              " " +
              -height * 0.03 +
              " " +
              (width * x + width * 0.09) +
              " " +
              height * 0.07 +
              " V " +
              height * 0.28 +
              " Z"
            }
            fill="#E7D6ED"
            stroke="#FDF6FB"
            strokeWidth="5"
          />
        ))}
        <Ellipse
          cx={width * 0.5}
          cy={height * 0.1}
          rx={width * 0.43}
          ry={height * 0.27}
          fill="url(#alley-light)"
        />
        <Path
          d={
            "M " +
            width * 0.32 +
            " " +
            height * 0.15 +
            " L " +
            width * 0.68 +
            " " +
            height * 0.15 +
            " L " +
            width * 0.98 +
            " " +
            height +
            " L " +
            width * 0.02 +
            " " +
            height +
            " Z"
          }
          fill="#A287B4"
        />
        <Path
          d={
            "M " +
            width * 0.34 +
            " " +
            height * 0.15 +
            " L " +
            width * 0.66 +
            " " +
            height * 0.15 +
            " L " +
            width * 0.91 +
            " " +
            height +
            " L " +
            width * 0.09 +
            " " +
            height +
            " Z"
          }
          fill="url(#alley-wood)"
          stroke="#F9EACD"
          strokeWidth="3"
        />
        {Array.from({ length: 13 }, (_, i) => (
          <Path
            key={i}
            d={
              "M " +
              width * (0.34 + (i * 0.32) / 12) +
              " " +
              height * 0.15 +
              " L " +
              width * (0.09 + (i * 0.82) / 12) +
              " " +
              height
            }
            stroke="#B7834D"
            strokeOpacity=".19"
            strokeWidth="1"
          />
        ))}
        {[0.28, 0.44, 0.6, 0.76, 0.91].map((y, i) => (
          <Path
            key={i}
            d={
              "M " +
              width * (0.34 - (y - 0.15) * 0.3) +
              " " +
              height * y +
              " L " +
              width * (0.66 + (y - 0.15) * 0.3) +
              " " +
              height * y
            }
            stroke="#CBA472"
            strokeOpacity=".22"
          />
        ))}
        <Path
          d={
            "M " +
            width * 0.12 +
            " " +
            height * 0.91 +
            " L " +
            width * 0.88 +
            " " +
            height * 0.91
          }
          stroke="#B29ABD"
          strokeWidth="4"
        />
        {[-2, -1, 0, 1, 2].map((i) => (
          <Circle
            key={i}
            cx={width * (0.5 + i * 0.053)}
            cy={height * 0.71}
            r={2}
            fill="#AF7F66"
            opacity=".5"
          />
        ))}
        {!frames && (
          <Path
            d={
              "M " +
              width * 0.5 +
              " " +
              height * 0.78 +
              " Q " +
              width * 0.5 +
              " " +
              height * 0.55 +
              " " +
              aimPoint.x +
              " " +
              aimPoint.y
            }
            stroke="#9A72AF"
            strokeWidth="2.5"
            strokeDasharray="5 8"
            opacity=".8"
          />
        )}
      </Svg>
      {Array.from({ length: 10 }, (_, i) => 9 - i).map((index) => (
        <Pin key={index} {...{ index, width, height, frames, progress }} />
      ))}
      <Animated.View
        testID="bowling-resident"
        pointerEvents="none"
        style={[{ position: "absolute", width: size, height: size }, ballStyle]}
      >
        <View
          style={{
            position: "absolute",
            bottom: 1,
            left: size * 0.14,
            width: size * 0.72,
            height: size * 0.13,
            borderRadius: 50,
            backgroundColor: "#68486233",
          }}
        />
        {hasResidentVolume(stage) ? (
          <VolumeResident
            stage={stage}
            size={size}
            rx={rx}
            ry={ry}
            rz={zero}
            blink={zero}
            mood="happy"
          />
        ) : (
          <Animated.View style={leafRoll}>
            <StaticMascot stage={stage} size={size} mood="happy" />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({ pin: { position: "absolute" } });
