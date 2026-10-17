import {useEffect, useState} from 'react';
import {Keyboard, useWindowDimensions} from 'react-native';
import {useRoomActivity} from '@/components/room/useRoomActivity';
import type {DailyAdEnvironment} from '@/utils/dailyAdPlacements';

export function useAdEnvironment(obscured = false, interacting = false): DailyAdEnvironment {
  const {active} = useRoomActivity(), {width, height} = useWindowDimensions();
  const [keyboardOpen, setKeyboardOpen] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return {screenActive: active, foreground: active, obscured, interacting, keyboardOpen, width, height};
}
