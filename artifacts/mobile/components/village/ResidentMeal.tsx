import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import {
  BerryIcon,
  AppleIcon,
  CandyIcon,
  CakeFoodIcon,
  RamenIcon,
  SpecialFoodIcon,
} from "@/components/ui/Illustrations";
import { mealSample } from "@/utils/residentMeal";
function Food({ id, size }: { id: string; size: number }) {
  const Art =
    {
      berry: BerryIcon,
      apple: AppleIcon,
      candy: CandyIcon,
      cake: CakeFoodIcon,
      ramen: RamenIcon,
      special: SpecialFoodIcon,
    }[id] ?? BerryIcon;
  return <Art size={size} />;
}
function Portion({
  index,
  size,
  food,
  progress,
}: {
  index: number;
  size: number;
  food: string;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: mealSample(progress.value).taken > index ? 0 : 1,
  }));
  return (
    <Animated.View
      testID={`meal-portion-${index}`}
      style={[
        {
          position: "absolute",
          left: size * (0.68 + index * 0.1),
          top: size * 0.71,
        },
        style,
      ]}
    >
      <Food id={food} size={size * 0.18} />
    </Animated.View>
  );
}
export function ResidentMeal({
  size,
  food,
  progress,
}: {
  size: number;
  food: string;
  progress: SharedValue<number>;
}) {
  const morsel = useAnimatedStyle(() => {
    const m = mealSample(progress.value);
    return {
      opacity: m.morsel,
      transform: [
        { translateX: size * (0.83 - 0.3 * m.flight) },
        { translateY: size * (0.74 - 0.15 * m.flight) },
        { scale: 1 - m.flight * 0.35 },
      ],
    };
  });
  return (
    <View
      testID="world-food-offering"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
    >
      <Svg
        width={size * 0.8}
        height={size * 0.38}
        style={{ position: "absolute", left: size * 0.5, top: size * 0.75 }}
        viewBox="0 0 120 55"
      >
        <Defs>
          <LinearGradient id="mealBowl" x1="0" y1="0" x2="0" y2="1">
            <Stop stopColor="#FFF5DB" />
            <Stop offset=".6" stopColor="#CEBFA3" />
            <Stop offset="1" stopColor="#AB9273" />
          </LinearGradient>
        </Defs>
        <Ellipse cx="60" cy="42" rx="50" ry="8" fill="#34291930" />
        <Path
          d="M 7 16 Q 9 47 60 47 Q 111 47 113 16 Z"
          fill="url(#mealBowl)"
          stroke="#AD9675"
        />
        <Ellipse
          cx="60"
          cy="16"
          rx="53"
          ry="13"
          fill="#D5C5A5"
          stroke="#F9EBD0"
          strokeWidth="4"
        />
      </Svg>
      {[0, 1, 2].map((i) => (
        <Portion
          key={i}
          index={i}
          size={size}
          food={food}
          progress={progress}
        />
      ))}
      <Animated.View
        testID="meal-morsel" style={[{ position: "absolute", left: 0, top: 0 }, morsel]}
      >
        <Food id={food} size={size * 0.18} />
      </Animated.View>
    </View>
  );
}
