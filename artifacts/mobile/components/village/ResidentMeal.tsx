import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
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
import {mealHandSample} from "@/utils/careHand";
import {CareHandArt} from "@/components/world/CareHandArt";
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
  reduceMotion=false,
}: {
  size: number;
  food: string;
  progress: SharedValue<number>;
  reduceMotion?: boolean;
}) {
  const {width}=useWindowDimensions();
  const hand=useAnimatedStyle(()=>{
    const h=mealHandSample(progress.value);
    return {opacity:h.presence===0?0:1,transform:[
      {translateX:size*(reduceMotion?.62:h.x)+(reduceMotion?0:(1-h.presence)*width*2)},
      {translateY:size*(reduceMotion?.68:h.y)},
    ]};
  });
  const handArt=<Animated.View testID="meal-care-hand" pointerEvents="none" style={[{position:"absolute",left:0,top:0,width:1,height:1},hand]}>
    <CareHandArt unit={size*.70} reach={width*3+size*4}/>
  </Animated.View>;
  const morsel = useAnimatedStyle(() => {
    const m = mealSample(progress.value),h=mealHandSample(progress.value);
    return {
      opacity: m.morsel,
      transform: [
        { translateX: size * ((reduceMotion?.62:h.x)-.09) },
        { translateY: size * ((reduceMotion?.68:h.y)-.09) },
        { scale: 1 - m.flight * 0.35 },
      ],
    };
  });
  if (food === 'ramen') return <View testID="world-food-offering" pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
    <View style={{ position: 'absolute', left: size * .64, top: size * .62 }}><RamenIcon size={size * .58} /></View>
    {handArt}
    <Animated.View testID="meal-morsel" style={[{ position: 'absolute', left: 0, top: 0 }, morsel]}>
      <Svg width={size * .18} height={size * .2} viewBox="0 0 24 28">
        <Path d="M4 2 Q12 8 7 14 T10 25 M10 2 Q18 8 13 14 T16 25 M16 2 Q24 8 19 14 T21 23" fill="none" stroke="#EEC76E" strokeWidth="2.3" strokeLinecap="round"/>
      </Svg>
    </Animated.View>
  </View>;
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
      {handArt}
      <Animated.View
        testID="meal-morsel" style={[{ position: "absolute", left: 0, top: 0 }, morsel]}
      >
        <Food id={food} size={size * 0.18} />
      </Animated.View>
    </View>
  );
}
