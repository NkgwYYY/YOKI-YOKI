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

export function StartupLoadingOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;
  const attempt = useRef(0);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    const currentAttempt = ++attempt.current;
    setError(false);
    opacity.setValue(1);

    preloadStartupImages()
      .then(() => {
        if (attempt.current !== currentAttempt) return;
        Animated.timing(opacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: Platform.OS !== 'web',
        }).start(({ finished }) => {
          if (finished && attempt.current === currentAttempt) {
            setVisible(false);
          }
        });
      })
      .catch(() => {
        if (attempt.current === currentAttempt) setError(true);
      });
  }, [opacity]);

  useEffect(() => {
    load();
    return () => {
      attempt.current += 1;
      opacity.stopAnimation();
    };
  }, [load, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
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