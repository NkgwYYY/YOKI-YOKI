import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Ellipse, Path } from "react-native-svg";
import { VolumeResident, hasResidentVolume } from "@/components/world/VolumeResident";
import { StaticMascot } from "@/components/Mascot";
import { getStageName, type MascotStage } from "@/utils/mascotUtils";
import { VILLAGERS, type VillagerId } from "@/utils/villageLife";

export function VillageResident({
  stage = "egg",
  size,
  active,
  reduceMotion,
  scarf,
  asleep = false,
}: {
  stage?: MascotStage;
  size: number;
  active: boolean;
  reduceMotion: boolean;
  scarf?: string;
  asleep?: boolean;
}) {
  const zero = useSharedValue(0),
    blink = useSharedValue(0),
    breath = useSharedValue(0);
  useEffect(() => {
    if (active && !reduceMotion) {
      breath.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1900 }),
          withTiming(0, { duration: 2300 }),
        ),
        -1,
      );
      blink.value = withRepeat(
        withDelay(
          3300,
          withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(0, { duration: 130 }),
          ),
        ),
        -1,
      );
    }
    return () => {
      cancelAnimation(breath);
      cancelAnimation(blink);
      breath.value = 0;
      blink.value = 0;
    };
  }, [active, reduceMotion, breath, blink]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { scaleX: 1 + breath.value * 0.012 },
      { scaleY: 1 - breath.value * 0.014 },
    ],
  }));
  return (
    <Animated.View
      style={[{ width: size, height: size }, style]}
      pointerEvents="none"
    >
      {hasResidentVolume(stage) ? <VolumeResident
        stage={stage}
        size={size}
        rx={zero}
        ry={zero}
        rz={zero}
        blink={blink}
        active={active}
        reduceMotion={reduceMotion}
        mood={asleep ? "sleepy" : "happy"}
      /> : <StaticMascot stage={stage} mood={asleep ? "sleepy" : "happy"} size={size} />}
      {scarf && (
        <Svg
          width={size}
          height={size}
          style={StyleSheet.absoluteFill}
          viewBox="0 0 100 100"
        >
          <Path
            d="M 21 67 Q 50 81 79 67 L 76 75 Q 50 87 24 75 Z"
            fill={scarf}
            stroke="#FFFFFF80"
            strokeWidth="1.2"
          />
          <Path
            d="M 64 76 Q 69 86 66 94 L 75 94 L 73 74"
            fill={scarf}
            stroke="#75678566"
            strokeWidth="1"
          />
        </Svg>
      )}
    </Animated.View>
  );
}
export function VillageNeighbors({
  width,
  height,
  active,
  reduceMotion,
  onTalk,
}: {
  width: number;
  height: number;
  active: boolean;
  reduceMotion: boolean;
  onTalk: (id: VillagerId) => void;
}) {
  return (
    <>
      {VILLAGERS.map((n) => (
        <Pressable
          key={n.id}
          testID={`village-neighbor-${n.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${n.name}とお話しする`}
          disabled={!active}
          onPress={() => onTalk(n.id)}
          style={{
            position: "absolute",
            left: width * n.x - width * 0.062,
            top: height * n.y - width * 0.11,
            width: width * 0.124,
            height: width * 0.145,
            zIndex: Math.round(n.y * 1000),
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: width * 0.024,
              width: "95%",
              height: width * 0.018,
              borderRadius: 100,
              backgroundColor: "#322E2B2B",
            }}
          />
          <VillageResident
            stage={n.stage}
            size={width * 0.124}
            active={active}
            reduceMotion={reduceMotion}
            scarf={n.color}
          />
          <Text style={s.name}>{n.name}</Text>
        </Pressable>
      ))}
    </>
  );
}
/** Waterline covers the lower shell; ripples and towel stay anchored to the bather. */
export function BathingEgg({
  stage,
  width,
  height,
  active,
  reduceMotion,
  x = .52, y = .37, label = '温泉',
}: {
  stage: MascotStage;
  width: number;
  height: number;
  active: boolean;
  reduceMotion: boolean;
  x?: number; y?: number; label?: string;
}) {
  const wave = useSharedValue(0),
    size = width * 0.14;
  useEffect(() => {
    if (active && !reduceMotion)
      wave.value = withRepeat(
        withTiming(1, { duration: 3300, easing: Easing.linear }),
        -1,
      );
    return () => cancelAnimation(wave);
  }, [active, reduceMotion, wave]);
  const ripple = useAnimatedStyle(() => ({
    opacity: 0.6 - wave.value * 0.45,
    transform: [{ scale: 1 + wave.value * 0.55 }],
  }));
  return (
    <View
      testID="village-bathing"
      accessibilityLabel={`${getStageName(stage)}が${label}でひと休みしています`}
      style={{
        position: "absolute",
        left: width * x - size,
        top: height * y - size * 0.55,
        width: size * 2,
        height: size,
        zIndex: 820,
      }}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            top: size * 0.64,
            width: size * 2,
            height: size * 0.2,
          },
          ripple,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 30">
          <Ellipse
            cx="100"
            cy="15"
            rx="92"
            ry="11"
            fill="none"
            stroke="#F4E7B3"
            strokeWidth="2"
          />
        </Svg>
      </Animated.View>
      <View
        style={{
          position: "absolute",
          left: size * 0.5,
          top: 0,
          width: size,
          // Keep the eyes and mouth above the water; only the lower shell is submerged.
          height: size * 0.74,
          overflow: "hidden",
        }}
      >
        <VillageResident
          stage={stage}
          size={size}
          active={active}
          reduceMotion={reduceMotion}
          asleep
        />
      </View>
      <View
        style={{
          position: "absolute",
          top: size * 0.065,
          left: size * 0.84,
          width: size * 0.35,
          height: size * 0.1,
          borderRadius: 4,
          backgroundColor: "#DACDE2",
          borderBottomWidth: 2,
          borderColor: "#A899B7",
          transform: [{ rotate: "8deg" }],
        }}
      />
      <Svg
        width={size * 2}
        height={size * 0.25}
        style={{ position: "absolute", top: size * 0.69 }}
        viewBox="0 0 200 25"
      >
        <Ellipse
          cx="100"
          cy="7"
          rx="45"
          ry="5"
          fill="#72AA9850"
          stroke="#F6EDD2B0"
          strokeWidth="1.5"
        />
        <Path
          d="M 25 13 Q 65 20 110 14 Q 140 9 175 15"
          fill="none"
          stroke="#F7E8C975"
          strokeWidth="1"
        />
      </Svg>
    </View>
  );
}
const s = StyleSheet.create({
  name: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#2E4937C9",
    fontSize: 10,
    color: "#FFEDD0",
  },
});
