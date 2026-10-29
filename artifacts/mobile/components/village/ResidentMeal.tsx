import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
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
export function ResidentMeal({
  size,
  food,
  progress,
  reduceMotion=false,
  overview=false,
}: {
  size: number;
  food: string;
  progress: SharedValue<number>;
  reduceMotion?: boolean;
  overview?: boolean;
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
    <CareHandArt unit={size*(overview?1.12:.70)} reach={width*3+size*4}/>
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
      {handArt}
      <Animated.View
        testID="meal-morsel" style={[{ position: "absolute", left: 0, top: 0 }, morsel]}
      >
        <Food id={food} size={size * 0.18} />
      </Animated.View>
    </View>
  );
}
