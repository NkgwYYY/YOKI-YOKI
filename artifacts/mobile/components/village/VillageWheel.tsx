import React, { useEffect, useId, useRef } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
const AG = Animated.createAnimatedComponent(G);
function Cabin({
  angle,
  index,
  occupied,
  id,
}: {
  angle: SharedValue<number>;
  index: number;
  occupied: boolean;
  id: string;
}) {
  const position = useAnimatedProps(() => {
    const a = angle.value + Math.PI / 2 + (index * Math.PI) / 4;
    return {
      transform: `translate(${160 + 110 * Math.cos(a)} ${145 + 110 * Math.sin(a)})`,
    };
  });
  return (
    <AG animatedProps={position}>
      <Path
        d="M -19 12 Q -21 -13 0 -15 Q 21 -13 19 12"
        fill={`url(#${id}glass)`}
        stroke={`url(#${id}brass)`}
        strokeWidth="2.5"
      />
      <Path
        d="M -22 -6 Q 0 -22 22 -6 L 21 -1 Q 0 -11 -21 -1 Z"
        fill={`url(#${id}wood)`}
        stroke="#D5B986"
        strokeWidth="1"
      />
      <Path d="M 0 -15 L 0 -24" stroke="#75542D" strokeWidth="2.5" />
      {occupied && (
        <G>
          <Path
            d="M -8 17 C -14 12 -10 -3 0 -4 C 10 -3 14 12 8 17 Z"
            fill={`url(#${id}shell)`}
          />
          <Circle cx="-3" cy="7" r="1" fill="#283129" />
          <Circle cx="3" cy="7" r="1" fill="#283129" />
          <Path
            d="M -2 11 Q 0 13 2 11 M 0 -1 L -1 1 L 1 2"
            fill="none"
            stroke="#90769F"
            strokeWidth=".8"
          />
        </G>
      )}
      <Path
        d="M -19 12 Q 0 19 19 12 L 17 27 Q 0 33 -17 27 Z"
        fill={`url(#${id}violet)`}
        stroke="#B3915F"
        strokeWidth="1.5"
      />
      <Path
        d="M -14 17 L -12 25 M 14 17 L 12 25 M 0 19 L 0 29"
        stroke="#DFCAA2"
        strokeWidth="1"
        opacity=".7"
      />
      <Circle cx="0" cy="21" r="3" fill="#E5CA85" />
      <Path
        d="M -13 0 L -13 13 M 13 0 L 13 13"
        stroke="#CFB588"
        strokeWidth="1.5"
      />
    </AG>
  );
}
export function VillageWheel({
  width,
  height,
  active,
  reduceMotion,
  riding,
  onFinish,
}: {
  width: number;
  height: number;
  active: boolean;
  reduceMotion: boolean;
  riding: boolean;
  onFinish: () => void;
}) {
  const angle = useSharedValue(0),
    lastRiding = useRef(false),
    done = useRef(onFinish);
  done.current = onFinish;
  const complete = () => done.current();
  useEffect(() => {
    if (riding && !lastRiding.current) angle.value = 0;
    lastRiding.current = riding;
    if (riding && active && !reduceMotion)
      angle.value = withTiming(
        Math.PI * 2,
        {
          duration: Math.max(300, (1 - angle.value / (Math.PI * 2)) * 24000),
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) runOnJS(complete)();
        },
      );
    if (!riding) angle.value = 0;
    return () => cancelAnimation(angle);
  }, [riding, active, reduceMotion, angle]);
  const spin = useAnimatedProps(() => ({
    transform: `rotate(${(angle.value * 180) / Math.PI} 160 145)`,
  }));
  const id = useId().replace(/[^a-z0-9]/gi, "");
  return (
    <View
      testID="village-wheel"
      pointerEvents="none"
      style={{
        position: "absolute",
        left: width * 0.24,
        top: height * 0.065,
        width: width * 0.52,
        height: width * 0.569,
        zIndex: 460,
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 350">
        <Defs>
          <LinearGradient id={`${id}wood`} x1="0" y1="0" x2="1" y2=".4">
            <Stop stopColor="#563925" />
            <Stop offset=".32" stopColor="#B98C50" />
            <Stop offset=".53" stopColor="#E4C08A" />
            <Stop offset=".75" stopColor="#8F602F" />
            <Stop offset="1" stopColor="#593723" />
          </LinearGradient>
          <LinearGradient id={`${id}brass`} x1="0" y1="0" x2="1" y2="1">
            <Stop stopColor="#FFF0BC" />
            <Stop offset=".35" stopColor="#C5A061" />
            <Stop offset=".62" stopColor="#9B723E" />
            <Stop offset="1" stopColor="#F8D991" />
          </LinearGradient>
          <LinearGradient id={`${id}violet`}>
            <Stop stopColor="#796681" />
            <Stop offset=".5" stopColor="#BBA5BB" />
            <Stop offset="1" stopColor="#695578" />
          </LinearGradient>
          <LinearGradient id={`${id}glass`} x1="0" y1="0" x2="1" y2="1">
            <Stop stopColor="#F6DBA766" />
            <Stop offset=".5" stopColor="#ACBCC244" />
            <Stop offset="1" stopColor="#FFF5DA99" />
          </LinearGradient>
          <LinearGradient id={`${id}shell`}>
            <Stop stopColor="#FFFAE8" />
            <Stop offset="1" stopColor="#CBBDAB" />
          </LinearGradient>
        </Defs>
        <Ellipse cx="174" cy="325" rx="113" ry="13" fill="#3F382C26" />
        <Path
          d="M 91 320 L 160 145 L 229 320 M 112 273 L 208 273"
          fill="none"
          stroke="#493628"
          strokeWidth="15"
        />
        <Path
          d="M 88 320 L 157 145 L 226 320 M 109 273 L 205 273"
          fill="none"
          stroke={`url(#${id}wood)`}
          strokeWidth="10"
        />
        <AG animatedProps={spin}>
          <Circle
            cx="166"
            cy="148"
            r="110"
            fill="none"
            stroke="#644936"
            strokeWidth="9"
          />
          <Circle
            cx="160"
            cy="145"
            r="110"
            fill="none"
            stroke={`url(#${id}brass)`}
            strokeWidth="7"
          />
          <Circle
            cx="160"
            cy="145"
            r="101"
            fill="none"
            stroke="#CDB888"
            strokeWidth="1.5"
          />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * Math.PI) / 8;
            return (
              <G key={i}>
                <Path
                  d={`M 160 145 L ${160 + 108 * Math.cos(a)} ${145 + 108 * Math.sin(a)}`}
                  stroke={i % 2 ? "#C5A26A" : "#926C40"}
                  strokeWidth={i % 2 ? 1.5 : 3}
                />
                <Circle
                  cx={160 + 110 * Math.cos(a)}
                  cy={145 + 110 * Math.sin(a)}
                  r="2.5"
                  fill="#FFF4BB"
                />
              </G>
            );
          })}
        </AG>
        {Array.from({ length: 8 }, (_, i) => (
          <Cabin
            key={i}
            angle={angle}
            index={i}
            occupied={riding && i === 0}
            id={id}
          />
        ))}
        <Circle
          cx="160"
          cy="145"
          r="12"
          fill={`url(#${id}brass)`}
          stroke="#705030"
          strokeWidth="2"
        />
        <Circle cx="160" cy="145" r="5" fill="#F4DBA4" />
        <Rect
          x="68"
          y="318"
          width="184"
          height="9"
          rx="3"
          fill={`url(#${id}wood)`}
        />
        <Path
          d="M 121 298 L 121 320 M 199 298 L 199 320 M 122 300 L 137 300 M 184 300 L 198 300"
          stroke="#CFB780"
          strokeWidth="3"
        />
      </Svg>
    </View>
  );
}
