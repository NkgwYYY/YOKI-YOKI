import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { hasAiConsent, setAiConsent } from '@/utils/aiConsent';
import { Button } from '@/components/ui/Button';
import { colors, space, typography } from '@/constants/theme';

export default function AiPrivacyScreen() {
  const router = useRouter(), insets = useSafeAreaInsets();
  const owner = useAuth().user?.id ?? 'guest';
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setAllowed(false);
    void hasAiConsent(owner).then(value => { if (current) setAllowed(value); });
    return () => { current = false; };
  }, [owner]);
  const back = () => router.canGoBack() ? router.back() : router.replace('/(tabs)');
  const choose = async (value: boolean) => {
    if (saving) return;
    setSaving(true); setError('');
    try { await setAiConsent(owner, value); setAllowed(value); back(); }
    catch { setError('設定を保存できませんでした。もう一度お試しください。'); }
    finally { setSaving(false); }
  };
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
    <Text accessibilityRole="header" style={styles.title}>AIへの情報送信</Text>
    <Text style={styles.copy}>おはなし、ホームのひとこと、「きづき」にはOpenAIのAIを使います。利用すると、次の情報をYOKI YOKIのサーバー（Replit）を経由してOpenAIに送信し、返答の作成に使います。</Text>
    <View style={styles.box}>
      <Text style={styles.copy}>・入力したメッセージと直近の会話履歴</Text>
      <Text style={styles.copy}>・ニックネーム、年代、性別、目標など、入力したプロフィール</Text>
      <Text style={styles.copy}>・気分、睡眠、行動、メモなどの記録と育成状況。「きづき」では最大1年分の記録を使います。</Text>
    </View>
    <Text style={styles.copy}>必要な情報は機能ごとに異なります。これらの内容を広告へのリクエストに含めることはありません。同意しなくても、記録・育成・ミニゲームは利用できます。</Text>
    <Text style={styles.copy}>同意はプロフィールからいつでも取り消せます。取り消すと、それ以降のAIへの送信を停止します。すでに送信した情報の取り扱いは、各サービスのプライバシーポリシーをご確認ください。</Text>
    <Button label="プライバシーポリシー" variant="outline" onPress={() => { void Linking.openURL('https://yoki-yoki.replit.app/landing/privacy/').catch(() => setError('ページを開けませんでした。')); }} />
    <Button label="OpenAIのプライバシーポリシー" variant="outline" onPress={() => { void Linking.openURL('https://openai.com/policies/privacy-policy/').catch(() => setError('ページを開けませんでした。')); }} />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Button label={allowed ? '同意を取り消す' : '同意してAIを使う'} disabled={saving} loading={saving} onPress={() => choose(!allowed)} />
    <Button label={allowed ? '戻る' : 'AIを使わずに戻る'} variant="outline" disabled={saving} onPress={back} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, gap: space.lg, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { ...typography.title, color: colors.foreground },
  copy: { fontSize: 15, lineHeight: 24, color: colors.foreground },
  box: { padding: 16, gap: 12, backgroundColor: colors.muted, borderRadius: 12 },
  error: { color: colors.danger },
});
