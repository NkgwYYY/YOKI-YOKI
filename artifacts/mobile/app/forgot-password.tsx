import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '@/contexts/AuthContext';
import { Mascot } from '@/components/Mascot';

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  // dev only: server returns the code so we can display it
  const [devCode, setDevCode] = useState('');

  const handleRequestReset = async () => {
    setError(''); setInfo('');
    if (!email.trim()) { setError('メールアドレスを入力してください'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'エラーが発生しました'); return; }
      if (json.devCode) setDevCode(json.devCode);
      setInfo('確認コードを送りました');
      setStep('reset');
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!code.trim()) { setError('確認コードを入力してください'); return; }
    if (newPassword.length < 6) { setError('パスワードは6文字以上にしてください'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'エラーが発生しました'); return; }
      router.replace('/login');
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#F5EEFF', '#E8F4FF']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#7C4DCC" />
            <Text style={styles.backText}>ログインに戻る</Text>
          </TouchableOpacity>

          <View style={styles.mascotWrap}>
            <Mascot stage="kokoron" mood={step === 'reset' ? 'happy' : 'normal'} size={90} />
            <Text style={styles.title}>パスワードを忘れた？</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? '登録したメールアドレスを入力してください'
                : `${email} に確認コードを送りました`}
            </Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="例：hello@example.com"
                placeholderTextColor="#BBA8D8"
                autoCorrect={false}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={styles.button} onPress={handleRequestReset} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>確認コードを送る</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              {/* Dev helper: show code returned by server */}
              {!!devCode && (
                <View style={styles.devBox}>
                  <Text style={styles.devLabel}>📬 確認コード（開発用表示）</Text>
                  <Text style={styles.devCode}>{devCode}</Text>
                  <Text style={styles.devNote}>※ 本番環境ではメールで届きます</Text>
                </View>
              )}

              <Text style={styles.label}>確認コード（6桁）</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor="#BBA8D8"
                maxLength={6}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>新しいパスワード</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="6文字以上"
                placeholderTextColor="#BBA8D8"
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>パスワードを変更する</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('email'); setError(''); setDevCode(''); }}>
                <Text style={styles.resend}>コードが届かない場合は再送する</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 24 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 16 },
  backText: { color: '#7C4DCC', fontSize: 14, fontFamily: 'Inter_500Medium' },
  mascotWrap: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 22, fontWeight: '700', color: '#5A3DAA', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#9E7DD5', marginTop: 6, textAlign: 'center' },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#5A3DAA', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#333', borderWidth: 1.5, borderColor: '#DDD0F5',
  },
  codeInput: { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: '700' },
  error: { color: '#EF4444', fontSize: 13, marginTop: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#7C4DCC', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
    shadowColor: '#7C4DCC', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resend: { color: '#9E7DD5', fontSize: 13, textAlign: 'center', marginTop: 16 },
  devBox: {
    backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFD166', marginBottom: 20, alignItems: 'center',
  },
  devLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
  devCode: { fontSize: 32, fontWeight: '700', color: '#5A3DAA', letterSpacing: 6 },
  devNote: { fontSize: 10, color: '#AAA', marginTop: 4 },
});
