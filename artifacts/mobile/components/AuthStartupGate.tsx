import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClerk } from '@clerk/expo';
import { reloadAppAsync } from 'expo';
import { colors } from '@/constants/theme';

/** Keep account data providers unmounted until the SDK has resolved identity. */
export function AuthStartupGate({ children }: { children: React.ReactNode }) {
  const clerk = useClerk();
  const ready = clerk.loaded && clerk.status !== 'error';
  return ready ? children : <ConnectionPending failed={clerk.status === 'error'} />;
}

function ConnectionPending({ failed }: { failed: boolean }) {
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const active = useRef(false);
  const attempt = useRef(0);
  const retryInFlight = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    active.current = true;
    const deadline = setTimeout(() => setTimedOut(true), 15000);
    return () => {
      active.current = false;
      attempt.current++;
      clearTimeout(deadline);
      if (retryTimer.current !== null) clearTimeout(retryTimer.current);
    };
  }, []);

  const retry = () => {
    if (!active.current || retryInFlight.current) return;
    retryInFlight.current = true;
    const currentAttempt = ++attempt.current;
    setRetrying(true);
    setRetryError(false);
    const finish = (error: boolean) => {
      if (!active.current || currentAttempt !== attempt.current) return;
      attempt.current++;
      if (retryTimer.current !== null) clearTimeout(retryTimer.current);
      retryTimer.current = null;
      retryInFlight.current = false;
      setRetrying(false);
      setRetryError(error);
    };
    // A failed/hung reload must leave an operable recovery screen, and an old
    // completion must not overwrite a later attempt or update an unmounted view.
    retryTimer.current = setTimeout(() => finish(true), 10000);
    void Promise.resolve().then(() => reloadAppAsync()).then(() => finish(false), () => finish(true));
  };

  const showRecovery = failed || timedOut;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.brand}>YOKI YOKI</Text>
          {!showRecovery && <ActivityIndicator color={colors.primary} size="large" />}
          <Text accessibilityRole="header" style={styles.title}>
            {showRecovery ? '接続を確認してください' : '小さな世界を準備しています'}
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {showRecovery
              ? 'アカウントの確認ができませんでした。通信環境を確認して、もう一度お試しください。'
              : 'アカウントを確認しています。もう少しだけお待ちください。'}
          </Text>
          {showRecovery && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="もう一度接続する"
                accessibilityState={{ disabled: retrying, busy: retrying }}
                disabled={retrying}
                onPress={retry}
                style={({ pressed }) => [styles.button, pressed && styles.pressed, retrying && styles.disabled]}
              >
                <Text style={styles.buttonText}>{retrying ? '起動し直しています…' : 'もう一度接続する'}</Text>
              </Pressable>
              {retryError && (
                <Text accessibilityRole="alert" style={styles.message}>
                  起動し直せませんでした。アプリを閉じて、もう一度開いてください。
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, alignItems: 'center', gap: 20 },
  brand: { color: colors.mutedForeground, fontSize: 16, letterSpacing: 3, fontWeight: '700' },
  title: { color: colors.text, fontSize: 22, lineHeight: 32, fontWeight: '600', textAlign: 'center' },
  message: { color: colors.mutedForeground, fontSize: 15, lineHeight: 25, textAlign: 'center' },
  button: { minHeight: 52, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 18, padding: 16, backgroundColor: colors.primary },
  buttonText: { color: colors.primaryForeground, fontSize: 16, fontWeight: '600' },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { opacity: 0.65 },
});
