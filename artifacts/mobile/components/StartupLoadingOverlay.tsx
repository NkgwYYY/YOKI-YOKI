import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, homePalette, radius, space, typography } from '@/constants/theme';
import { preloadStartupImages } from '@/utils/startupAssets';

const MINIMUM_LOADING_TIME_MS = 2200;

export function StartupLoadingOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;
  const attempt = useRef(0);
  const minimumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    const currentAttempt = ++attempt.current;
    if (minimumTimer.current) clearTimeout(minimumTimer.current);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
    setReady(false);
    setError(false);
    opacity.setValue(1);

    const minimumWait = new Promise<void>((resolve) => {
      minimumTimer.current = setTimeout(() => {
        minimumTimer.current = null;
        resolve();
      }, MINIMUM_LOADING_TIME_MS);
    });

    Promise.all([
      preloadStartupImages(),
      minimumWait,
    ])
      .then(() => {
        if (attempt.current !== currentAttempt) return;
        // Animation completion is cosmetic, not a prerequisite for using HOME.
        setReady(true);
        const dismiss = () => {
          if (attempt.current !== currentAttempt) return;
          if (dismissTimer.current) clearTimeout(dismissTimer.current);
          dismissTimer.current = null;
          setVisible(false);
        };
        dismissTimer.current = setTimeout(dismiss, 500);
        Animated.timing(opacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: Platform.OS !== 'web',
        }).start(dismiss);
      })
      .catch(() => {
        if (attempt.current === currentAttempt) {
          if (minimumTimer.current) clearTimeout(minimumTimer.current);
          minimumTimer.current = null;
          setError(true);
        }
      });
  }, [opacity]);

  useEffect(() => {
    load();
    return () => {
      attempt.current += 1;
      if (minimumTimer.current) clearTimeout(minimumTimer.current);
      minimumTimer.current = null;
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
      opacity.stopAnimation();
    };
  }, [load, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      accessibilityElementsHidden={ready}
      importantForAccessibility={ready ? 'no-hide-descendants' : 'auto'}
      accessibilityLiveRegion="polite"
      style={[styles.overlay, { opacity }]}
    >
      <Text style={styles.logo}>YOKI YOKI</Text>
      {error ? (
        <>
          <Text style={styles.message}>画像の準備に失敗しました</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="画像の読み込みを再試行"
            onPress={load}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>もう一度試す</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="small" color={homePalette.navActive} />
          <Text style={styles.message}>Loading...</Text>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: homePalette.backgroundTop,
  },
  logo: {
    ...typography.title,
    color: colors.foreground,
    letterSpacing: 1.5,
    marginBottom: space.sm,
  },
  message: {
    ...typography.caption,
    color: homePalette.dateText,
  },
  retryButton: {
    marginTop: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  retryText: {
    ...typography.label,
    color: colors.primaryForeground,
  },
});
