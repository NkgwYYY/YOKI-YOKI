import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Stop room work on navigation, OS backgrounding and hidden browser tabs. */
export function useRoomActivity() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const state = AppState.addEventListener('change', value => setForeground(value === 'active'));
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduceMotion(value); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const update = () => setVisible(!document.hidden);
    if (Platform.OS === 'web') {
      update();
      document.addEventListener('visibilitychange', update);
    }
    return () => {
      alive = false;
      state.remove(); motion.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return { active: focused && foreground && visible, reduceMotion };
}
