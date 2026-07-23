import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, API_BASE } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'expo-router';
import { Mascot } from '@/components/Mascot';
import { Ionicons } from '@expo/vector-icons';

// ── Forgot-password flow ──────────────────────────────────────────────────
type ResetStep = 'email' | 'code';

function ForgotPasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setStep('email'); setEmail(''); setCode(''); setNewPassword('');
    setDevCode(''); setError(''); setDone(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleRequestCode = async () => {
    setError('');
    if (!email.trim()) { setError('メールアドレスを入力してください'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'エラーが発生しました'); return; }
      if (json.devCode) setDevCode(json.devCode);
      setStep('code');
    } catch {
      setError('サーバーに接続できませんでした。\n接続先: ' + API_BASE);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (code.trim().length !== 6) { setError('6桁のコードを入力してください'); return; }
    if (newPassword.length < 6) { setError('パスワードは6文字以上にしてください'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'コードが無効か期限切れです'); return; }
      setDone(true);
    } catch {
      setError('サーバーに接続できませんでした。\n接続先: ' + API_BASE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleClose} />
        <View style={[s.sheet, { paddingBottom: Platform.OS === 'web' ? 32 : insets.bottom + 24 }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>
              {done ? '✅ 変更完了' : step === 'email' ? '🔑 パスワードを再設定' : '📬 コードを入力'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#9E7DD5" />
            </TouchableOpacity>
          </View>

          {done ? (
            /* ── Complete ── */
            <View style={s.doneBox}>
              <Text style={s.doneText}>新しいパスワードでログインしてください</Text>
              <TouchableOpacity style={s.doneBtn} onPress={handleClose}>
                <Text style={s.doneBtnText}>ログイン画面に戻る</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'email' ? (
            /* ── Step 1: email ── */
            <View style={s.sheetBody}>
              <Text style={s.sheetSub}>登録したメールアドレスを入力してください</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="例：hello@example.com"
                placeholderTextColor="#BBA8D8"
                autoCorrect={false}
                autoFocus
              />
              {!!error && <Text style={s.errorText}>{error}</Text>}
              <TouchableOpacity style={s.btn} onPress={handleRequestCode} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>確認コードを送る</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Step 2: code + new password ── */
            <View style={s.sheetBody}>
              {/* Dev helper */}
              {!!devCode && (
                <View style={s.devBox}>
                  <Text style={s.devLabel}>📬 確認コード（開発用表示）</Text>
                  <Text style={s.devCode}>{devCode}</Text>
                  <Text style={s.devNote}>本番環境ではメールで届きます</Text>
                </View>
              )}

              <Text style={s.sheetSub}>{email} に送られたコードを入力</Text>

              <TextInput
                style={[s.input, s.codeInput]}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor="#BBA8D8"
                maxLength={6}
              />

              <Text style={[s.label, { marginTop: 14 }]}>新しいパスワード</Text>
              <TextInput
                style={s.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="6文字以上"
                placeholderTextColor="#BBA8D8"
              />

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity style={s.btn} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>パスワードを変更する</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('email'); setError(''); setDevCode(''); }}>
                <Text style={s.resend}>コードが届かない場合は再送する</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Login / Register screen ───────────────────────────────────────────────
const IS_NETWORK_ERR = (msg: string) =>
  msg.includes('ネットワーク') || msg.includes('Network') || msg.includes('接続');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const { pushDataToCloud } = useApp();
  const router = useRouter();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('メールとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      let result: { error?: string };
      if (tab === 'login') {
        result = await login(email.trim(), password);
      } else {
        result = await register(email.trim(), password);
        if (!result.error) await pushDataToCloud();
      }
      if (result.error) {
        setError(result.error);
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  };

  const isNetErr = IS_NETWORK_ERR(error);

  return (
    <LinearGradient colors={['#F5EEFF', '#E8F4FF']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mascot */}
          <View style={styles.mascotWrap}>
            <Mascot stage="kokoron" mood="happy" size={100} />
            <Text style={styles.title}>メントレ</Text>
            <Text style={styles.subtitle}>データを引き継ぐためにアカウントを作ろう</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {(['login', 'register'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => { setTab(t); setError(''); }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'login' ? 'ログイン' : '新規登録'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
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

            <Text style={[styles.label, { marginTop: 16 }]}>パスワード</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="6文字以上"
              placeholderTextColor="#BBA8D8"
            />

            {!!error && (
              <View style={[styles.errorBox, isNetErr && styles.errorBoxWarn]}>
                <Ionicons
                  name={isNetErr ? 'wifi-outline' : 'alert-circle-outline'}
                  size={16}
                  color={isNetErr ? '#F97316' : '#EF4444'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.errorText, isNetErr && { color: '#F97316' }]}>{error}</Text>
                  {isNetErr && (
                    <Text style={styles.errorSub}>接続先: {API_BASE}</Text>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>{tab === 'login' ? 'ログイン' : 'アカウントを作成'}</Text>
              }
            </TouchableOpacity>

            {tab === 'register' && (
              <Text style={styles.hint}>✅ 今までのデータはそのまま引き継がれます</Text>
            )}

            {tab === 'login' && (
              <TouchableOpacity onPress={() => setShowForgot(true)} style={styles.forgotWrap}>
                <Ionicons name="lock-closed-outline" size={13} color="#9E7DD5" />
                <Text style={styles.forgotText}>パスワードを忘れた場合</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* API URL (always visible for diagnosis) */}
          <View style={styles.apiRow}>
            <Ionicons name="server-outline" size={10} color="#C4B5E8" />
            <Text style={styles.apiUrl} numberOfLines={1}>{API_BASE}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot-password modal — no navigation, no AuthGate involved */}
      <ForgotPasswordModal visible={showForgot} onClose={() => setShowForgot(false)} />
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 24 },
  mascotWrap: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '700', color: '#5A3DAA', marginTop: 8, letterSpacing: 1 },
  subtitle: { fontSize: 13, color: '#9E7DD5', marginTop: 6, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#EDE5F8',
    borderRadius: 14, padding: 4, marginBottom: 28, width: '100%',
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#7C4DCC' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9E7DD5' },
  tabTextActive: { color: '#fff' },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#5A3DAA', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#333', borderWidth: 1.5, borderColor: '#DDD0F5',
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12,
    marginTop: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorBoxWarn: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  errorText: { color: '#EF4444', fontSize: 13, flexShrink: 1 },
  errorSub: { color: '#F97316', fontSize: 10, marginTop: 3 },
  button: {
    backgroundColor: '#7C4DCC', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
    shadowColor: '#7C4DCC', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: '#00C4A7', marginTop: 14, textAlign: 'center', fontWeight: '500' },
  forgotWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16 },
  forgotText: { fontSize: 13, color: '#9E7DD5', fontWeight: '500' },
  apiRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 24, opacity: 0.5 },
  apiUrl: { fontSize: 9, color: '#9E7DD5', flexShrink: 1 },
});

// Sheet styles (for modal)
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 4,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0D0F8', alignSelf: 'center', marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#5A3DAA' },
  sheetSub: { fontSize: 13, color: '#9E7DD5', marginBottom: 14 },
  sheetBody: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#5A3DAA', marginBottom: 6 },
  input: {
    backgroundColor: '#F8F4FF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#333', borderWidth: 1.5, borderColor: '#DDD0F5',
  },
  codeInput: { textAlign: 'center', fontSize: 26, letterSpacing: 10, fontWeight: '700' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 8 },
  btn: {
    backgroundColor: '#7C4DCC', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 16,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resend: { color: '#9E7DD5', fontSize: 13, textAlign: 'center', marginTop: 14 },
  devBox: {
    backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFD166', marginBottom: 12, alignItems: 'center',
  },
  devLabel: { fontSize: 11, color: '#999', marginBottom: 6 },
  devCode: { fontSize: 34, fontWeight: '700', color: '#5A3DAA', letterSpacing: 8 },
  devNote: { fontSize: 10, color: '#BBB', marginTop: 4 },
  doneBox: { alignItems: 'center', paddingVertical: 16, gap: 16 },
  doneText: { fontSize: 14, color: '#7C4DCC', textAlign: 'center' },
  doneBtn: { backgroundColor: '#7C4DCC', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
