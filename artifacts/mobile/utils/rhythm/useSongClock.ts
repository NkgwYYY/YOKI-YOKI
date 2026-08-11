import { useCallback, useEffect, useRef } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

/**
 * 曲の実再生位置を基準にしたクロック。
 * expo-av の setOnPlaybackStatusUpdate で positionMillis を受け取り、
 * ステータス間は performance.now() で外挿する (setInterval のみの推定は不可)。
 */
export function useSongClock() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastPosRef = useRef(0);        // ms
  const lastAtRef = useRef(0);         // performance.now() ms
  const playingRef = useRef(false);
  const finishedRef = useRef(false);
  const onFinishRef = useRef<(() => void) | null>(null);

  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  /** 現在の曲位置 (秒)。未再生なら負値。 */
  const getTime = useCallback(() => {
    if (!playingRef.current) return lastPosRef.current / 1000;
    return (lastPosRef.current + (nowMs() - lastAtRef.current)) / 1000;
  }, []);

  const load = useCallback(async (asset: number, opts?: { volume?: number; positionMillis?: number }) => {
    await unload();
    try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }); } catch (_) {}
    const { sound } = await Audio.Sound.createAsync(asset, {
      volume: opts?.volume ?? 1.0,
      positionMillis: opts?.positionMillis ?? 0,
      progressUpdateIntervalMillis: 50,
    });
    finishedRef.current = false;
    lastPosRef.current = opts?.positionMillis ?? 0;
    lastAtRef.current = nowMs();
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      lastPosRef.current = status.positionMillis ?? lastPosRef.current;
      lastAtRef.current = nowMs();
      playingRef.current = !!status.isPlaying;
      if (status.didJustFinish && !finishedRef.current) {
        finishedRef.current = true;
        playingRef.current = false;
        onFinishRef.current?.();
      }
    });
    soundRef.current = sound;
    return sound;
  }, []);

  const play = useCallback(async () => {
    if (!soundRef.current) return false;
    try {
      await soundRef.current.playAsync();
      playingRef.current = true;
      lastAtRef.current = nowMs();
      return true;
    } catch (_) {
      return false; // Webの自動再生ブロック等 → 呼び出し側でユーザー操作時に再試行
    }
  }, []);

  const stop = useCallback(async () => {
    playingRef.current = false;
    try { await soundRef.current?.stopAsync(); } catch (_) {}
  }, []);

  const unload = useCallback(async () => {
    const snd = soundRef.current;
    soundRef.current = null;
    playingRef.current = false;
    if (snd) { try { await snd.unloadAsync(); } catch (_) {} }
  }, []);

  const setOnFinish = useCallback((fn: (() => void) | null) => { onFinishRef.current = fn; }, []);

  useEffect(() => () => { unload(); }, [unload]);

  return { load, play, stop, unload, getTime, setOnFinish };
}
