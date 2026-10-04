import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useReducedMotion } from '@/utils/useReducedMotion';

/** Shared by scenes and global feedback: never animate in a hidden/background app. */
export function useAppActivity() {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const state = AppState.addEventListener('change', value => setForeground(value === 'active'));
    const update = () => setVisible(!document.hidden);
    if (Platform.OS === 'web') {
      update();
      document.addEventListener('visibilitychange', update);
    }
    return () => {
      state.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return { active: foreground && visible, reduceMotion };
}

/** Room routines also stop when another navigation screen is focused. */
export function useRoomActivity() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const { active, reduceMotion } = useAppActivity();
  return { active: focused && active, reduceMotion };
}
