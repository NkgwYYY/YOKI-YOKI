import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

function Mote({index, active, night}: {index: number; active: boolean; night: boolean}) {
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {phase.setValue(0); return;}
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(index * 370),
      Animated.timing(phase, {toValue: 1, duration: 4800 + index * 330, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(phase, {toValue: 0, duration: 0, useNativeDriver: true}),
    ]));
    loop.start();return () => {loop.stop();phase.setValue(0);};
  }, [active, index, phase]);
  return <Animated.View style={{position: 'absolute', left: `${18 + (index * 17) % 68}%`, top: `${53 + (index * 11) % 35}%`,
    width: night ? 4 : 3, height: night ? 4 : 3, borderRadius: 5, backgroundColor: night ? '#EDE5A6' : '#FFF7D7',
    opacity: active ? phase.interpolate({inputRange: [0, 0.2, 0.65, 1], outputRange: [0, 0.85, 0.55, 0]}) : 0.30,
    transform: [{translateY: phase.interpolate({inputRange: [0, 1], outputRange: [5, -36]})}, {translateX: phase.interpolate({inputRange: [0, 1], outputRange: [0, index % 2 ? -15 : 18]})}]}} />;
}
export function WorldAmbient({active, reduceMotion, night}: {active: boolean; reduceMotion: boolean; night: boolean}) {
  return <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {[0, 1, 2, 3, 4, 5].map(index => <Mote key={index} index={index} active={active && !reduceMotion} night={night} />)}
  </View>;
}
