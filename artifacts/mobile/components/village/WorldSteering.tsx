import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
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
      <View
        testID="world-steering"
        style={[s.pad, !enabled && { opacity: 0.4 }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="おさんぽの方向"
        accessibilityHint="矢印を押すか、中央をすべらせて歩きます。道しるべで隣の場所へ移動します。"
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
        {([['up',0,-1,'⌃','奥へ'],['down',0,1,'⌄','手前へ'],['left',-1,0,'‹','左へ'],['right',1,0,'›','右へ']] as const).map(([id,x,y,glyph,label])=><Pressable key={id}
          testID={`world-steer-${id}`} accessibilityRole="button" accessibilityLabel={`${label}歩く`} disabled={!enabled}
          onPressIn={()=>{onStart();value.value={x,y};}}
          onPressOut={()=>{value.value={x:0,y:0};}}
          onPress={()=>onStep(x,y)}
          style={[s.arrow,id==='up'?s.up:id==='down'?s.down:id==='left'?s.left:s.right]}>
          <Text style={s.arrowText}>{glyph}</Text>
        </Pressable>)}
        <GestureDetector gesture={gesture} touchAction="none"><View style={s.stick}>
        <Animated.View pointerEvents="none" style={[s.knob, knob]}>
          <View style={s.dot} />
        </Animated.View>
        </View></GestureDetector>
      </View>
  );
}
const s = StyleSheet.create({
  pad: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: "#E3D6EB",
    backgroundColor: "#FFF9ECE6",
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#AD91C1",
    borderWidth: 2,
    borderColor: "#F6ECFC",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#806394",
    shadowRadius: 9,
    shadowOpacity: 0.16,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F8F0FF" },
  stick:{width:40,height:40,alignItems:'center',justifyContent:'center'},
  arrow:{position:'absolute',width:34,height:32,alignItems:'center',justifyContent:'center'},
  arrowText:{color:'#A28BB2',fontSize:24,lineHeight:26},
  up:{top:0,left:35},down:{bottom:0,left:35},left:{left:0,top:35},right:{right:0,top:35},
});
