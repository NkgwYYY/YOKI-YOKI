import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export interface MeasuredSize {
  width: number;
  height: number;
}

/** Layout measurements for rhythm stages are deliberately local to the stage. */
export function useMeasuredSize(): [MeasuredSize, (event: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<MeasuredSize>({ width: 0, height: 0 });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize(previous => (
      previous.width === width && previous.height === height ? previous : { width, height }
    ));
  }, []);
  return [size, onLayout];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function measuredOr(value: number, fallback: number): number {
  return value > 0 ? value : fallback;
}