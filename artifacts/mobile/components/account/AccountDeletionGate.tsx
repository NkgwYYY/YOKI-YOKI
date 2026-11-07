import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { reloadAppAsync } from 'expo';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

/** The server has already deleted this account. Finish cleanup without syncing. */
export function AccountDeletionGate() {
  const { deleteAccount } = useAuth();
  const lock = useRef(false);
  const completed = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const finish = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!completed.current) {
        await deleteAccount();
        completed.current = true;
        setDeleted(true);
      }
      await reloadAppAsync();
    } catch {
      setError(completed.current
        ? '削除は完了しています。アプリを開き直してください。'
        : '削除を完了できませんでした。通信環境を確認して、もう一度お試しください。');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.card} testID="account-deletion-gate">
      <Text accessibilityRole="header" style={styles.title}>{deleted ? '削除が完了しました' : 'アカウントの削除を完了しましょう'}</Text>
      <Text style={styles.message}>{deleted ? 'アプリを開き直すと、新しくはじめられます。' : 'クラウドのデータは削除されています。端末に残ったデータとログイン情報の削除を完了してください。'}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button label={busy ? '処理しています…' : deleted ? 'アプリを開き直す' : '削除を完了する'}
        loading={busy} disabled={busy} onPress={finish} testID="complete-account-deletion" />
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F3EA' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, gap: 24 },
  title: { color: '#263E32', fontSize: 22, lineHeight: 32, fontWeight: '700' },
  message: { color: '#526255', fontSize: 15, lineHeight: 24 },
  error: { color: '#963C35', fontSize: 14, lineHeight: 22 },
});
