import {PlushLoading} from './PlushLoading';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import { colors, homePalette, radius, space, typography } from '@/constants/theme';
import { preloadStartupImages } from '@/utils/startupAssets';

export function StartupLoadingOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;
  const attempt = useRef(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  const continueWithoutImage = useCallback(() => {
    // A decorative image must never prevent access to local care and records.
    attempt.current += 1;
    if (continueTimer.current) clearTimeout(continueTimer.current);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    continueTimer.current = null;
    dismissTimer.current = null;
    opacity.stopAnimation();
    setVisible(false);
  }, [opacity]);

  const load = useCallback(() => {
    const currentAttempt = ++attempt.current;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (continueTimer.current) clearTimeout(continueTimer.current);
    dismissTimer.current = null;
    setReady(false);
    setError(false);
    setCanContinue(false);
    opacity.setValue(1);
    continueTimer.current = setTimeout(() => {
      continueTimer.current = null;
      if (attempt.current === currentAttempt) setCanContinue(true);
    }, 2500);

    preloadStartupImages()
      .then(() => {
        if (attempt.current !== currentAttempt) return;
        if (continueTimer.current) clearTimeout(continueTimer.current);
        continueTimer.current = null;
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
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }).start(dismiss);
      })
      .catch(() => {
        if (attempt.current === currentAttempt) {
          if (continueTimer.current) clearTimeout(continueTimer.current);
          continueTimer.current = null;
          setError(true);
          setCanContinue(true);
        }
      });
  }, [opacity]);

  useEffect(() => {
    load();
    return () => {
      attempt.current += 1;
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (continueTimer.current) clearTimeout(continueTimer.current);
      dismissTimer.current = null;
      continueTimer.current = null;
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
      <PlushLoading message={error?'読み込みを再試行できます':canContinue?'読み込みに時間がかかっています':undefined}/>
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

          <Text style={styles.message}>{canContinue ? '画像を待たずに始めることもできます' : ''}</Text>
        </>
      )}
      {canContinue && !ready && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="画像を待たずにはじめる"
          onPress={continueWithoutImage}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>そのままはじめる</Text>
        </Pressable>
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
    backgroundColor: '#211137',
  },
  logo: {
    ...typography.title,
    color: colors.foreground,
    letterSpacing: 1.5,
    marginBottom: space.sm,
  },
  message: {
    ...typography.caption,
    color: '#C2ACD6',
  },
  retryButton: {
    marginTop: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    backgroundColor: '#654283',
  },
  retryText: {
    ...typography.label,
    color: colors.primaryForeground,
  },
});
