import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, space, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { CloudSyncState } from '@/utils/cloudSync';

export function CloudSyncStatus({ state, onRetry }: { state: CloudSyncState; onRetry: () => void }) {
  const busy = state.phase !== 'idle';
  const message = busy
    ? state.phase === 'pull' ? 'アカウントデータを確認しています…' : 'クラウドに保存しています…'
    : state.error === 'push'
      ? '端末には保存されています。クラウドへの保存をもう一度お試しください。'
      : state.error === 'pull' || !state.ready
        ? 'アカウントデータを確認できませんでした。通信環境を確認して、もう一度お試しください。'
        : 'クラウドへの同期が完了しています。';
  return (
    <View style={styles.container} testID="cloud-sync-status">
      <View style={styles.row}>
        {busy ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
      </View>
      {state.error && !busy ? (
        <Button label="同期をもう一度試す" variant="outline" onPress={onRetry} testID="cloud-sync-retry" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.sm, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  message: { ...typography.callout, color: colors.mutedForeground, flexShrink: 1 },
});
