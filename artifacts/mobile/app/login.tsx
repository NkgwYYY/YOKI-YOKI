import React, { useState, useCallback, useEffect } from 'react';
import { Analytics } from '@/utils/analytics';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useSignIn, useSignUp } from '@clerk/expo';
import { Mascot } from '@/components/Mascot';
import { Ionicons } from '@expo/vector-icons';

function clerkErrorMessage(error: unknown): string {
  const e = error as { errors?: { code?: string; longMessage?: string; message?: string }[] } | null;
  const first = e?.errors?.[0];
  const code = first?.code ?? '';
  const map: Record<string, string> = {
    form_identifier_not_found: 'このメールアドレスは登録されていません',
    form_password_incorrect: 'パスワードが違います',
    form_identifier_exists: 'このメールアドレスはすでに登録されています',
    form_password_pwned: 'このパスワードは流出リストに含まれています。別のパスワードにしてください',
    form_password_length_too_short: 'パスワードが短すぎます（8文字以上にしてください）',
    form_code_incorrect: 'コードが違います',
    verification_expired: 'コードの有効期限が切れました。再送してください',
    session_exists: 'すでにログインしています',
  };
  if (code && map[code]) return map[code];
  // Fallback: translate common English messages from Clerk
  const raw = first?.longMessage || first?.message || '';
  const textMap: [string, string][] = [
    ["couldn't find your account", 'このメールアドレスは登録されていません。「新規登録」からアカウントを作成してください'],
    ['data breach', 'このパスワードは過去に流出したものと一致します。安全のため、別のパスワードにしてください'],
    ['password is incorrect', 'パスワードが違います'],
    ['is taken', 'このメールアドレスはすでに登録されています'],
    ['too many requests', '試行回数が多すぎます。しばらく待ってからお試しください'],
    ['is invalid', '入力内容に誤りがあります。確認してください'],
  ];
  const lower = raw.toLowerCase();
  for (const [en, ja] of textMap) {
    if (lower.includes(en)) return ja;
  }
  // If the message is already Japanese, show it; otherwise show a generic Japanese message
  if (/[ぁ-んァ-ン一-龥]/.test(raw)) return raw;
  return raw
    ? `エラーが発生しました。もう一度お試しください（${raw}）`
    : 'エラーが発生しました。もう一度お試しください';
}

// ── Forgot-password flow (Clerk: email code → new password) ──────────────
type ResetStep = 'email' | 'code';

function ForgotPasswordModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { signIn } = useSignIn();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep('email'); setEmail(''); setCode(''); setNewPassword('');
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleRequestCode = async () => {
    setError('');
    if (!email.trim()) { setError('メールアドレスを入力してください'); return; }
    setLoading(true);
    try {
      const { error: createErr } = await signIn.create({ identifier: email.trim().toLowerCase() });
      if (createErr) { setError(clerkErrorMessage({ errors: [createErr] })); return; }
      const { error: sendErr } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendErr) { setError(clerkErrorMessage({ errors: [sendErr] })); return; }
      setStep('code');
    } catch (e) {
      setError(clerkErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (code.trim().length !== 6) { setError('6桁のコードを入力してください'); return; }
    if (newPassword.length < 8) { setError('パスワードは8文字以上にしてください'); return; }
    setLoading(true);
    try {
      const { error: verifyErr } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyErr) { setError(clerkErrorMessage({ errors: [verifyErr] })); return; }
      const { error: submitErr } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
      if (submitErr) { setError(clerkErrorMessage({ errors: [submitErr] })); return; }
      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: async () => {
            reset();
            onDone();
          },
        });
      } else {
        reset();
        onClose();
      }
    } catch (e) {
      setError(clerkErrorMessage(e));
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
              {step === 'email' ? '🔑 パスワードを再設定' : '📬 コードを入力'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#9E7DD5" />
            </TouchableOpacity>
          </View>

          {step === 'email' ? (
            /* ── Step 1: email ── */
            <View style={s.sheetBody}>
              <Text style={s.sheetSub}>登録したメールアドレスを入力してください。確認コードをメールでお送りします。</Text>
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
                placeholder="8文字以上"
                placeholderTextColor="#BBA8D8"
              />

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity style={s.btn} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>パスワードを変更する</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => signIn.resetPasswordEmailCode.sendCode()}>
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
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, errors: signInErrors, fetchStatus: signInFetch } = useSignIn();
  const { signUp, fetchStatus: signUpFetch } = useSignUp();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const loading = signInFetch === 'fetching' || signUpFetch === 'fetching';

  const goHome = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const finalizeNavigate = useCallback(
    ({ session, decorateUrl }: { session?: { currentTask?: unknown } | null; decorateUrl: (url: string) => string }) => {
      if (session?.currentTask) return;
      const url = decorateUrl('/(tabs)');
      if (url.startsWith('http')) {
        window.location.href = url;
      } else {
        router.replace(url as Href);
      }
    },
    [router],
  );

  // ── Email / password ──
  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('メールとパスワードを入力してください');
      return;
    }
    const emailAddress = email.trim().toLowerCase();

    if (tab === 'login') {
      const { error: err } = await signIn.password({ emailAddress, password });
      if (err) { setError(clerkErrorMessage({ errors: [err] })); return; }
      if (signIn.status === 'complete') {
        Analytics.login();
        await signIn.finalize({ navigate: finalizeNavigate });
      } else {
        setError('ログインを完了できませんでした。もう一度お試しください');
      }
    } else {
      const { error: err } = await signUp.password({ emailAddress, password });
      if (err) { setError(clerkErrorMessage({ errors: [err] })); return; }
      const { error: sendErr } = await signUp.verifications.sendEmailCode();
      if (sendErr) { setError(clerkErrorMessage({ errors: [sendErr] })); return; }
    }
  };

  const handleVerify = async () => {
    setError('');
    if (code.trim().length !== 6) { setError('6桁のコードを入力してください'); return; }
    const { error: err } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (err) { setError(clerkErrorMessage({ errors: [err] })); return; }
    if (signUp.status === 'complete') {
      Analytics.signUp();
      await signUp.finalize({ navigate: finalizeNavigate });
    } else {
      setError('確認を完了できませんでした。もう一度お試しください');
    }
  };

  // ── Sign-up: email verification step ──
  const needsVerification =
    tab === 'register' &&
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0;

  return (
    <LinearGradient colors={['#F5EEFF', '#E8F4FF']} style={[{ flex: 1 }, Platform.OS === 'web' && { minHeight: '100vh' as any }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mascot */}
          <View style={styles.mascotWrap}>
            <Mascot stage="stage3" mood="happy" size={100} />
            <Image
              source={require('@/assets/images/yoki_logo.png')}
              style={styles.titleLogo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>メンタルケア育成アプリ</Text>
            <Text style={[styles.subtitle, { marginTop: 4, fontSize: 12, opacity: 0.6 }]}>データを引き継ぐためにアカウントを作ろう</Text>
          </View>

          {needsVerification ? (
            /* ── Email verification step ── */
            <View style={styles.form}>
              <Text style={styles.verifyTitle}>📬 メールを確認してください</Text>
              <Text style={styles.verifySub}>{email.trim()} に6桁の確認コードを送りました</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor="#BBA8D8"
                maxLength={6}
                autoFocus
              />
              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>確認する</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => signUp.verifications.sendEmailCode()}>
                <Text style={styles.resendText}>コードが届かない場合は再送する</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
                  placeholder="8文字以上"
                  placeholderTextColor="#BBA8D8"
                />

                {!!error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
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

                {/* Required for sign-up flows: Clerk bot protection */}
                <View nativeID="clerk-captcha" />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot-password modal */}
      <ForgotPasswordModal
        visible={showForgot}
        onClose={() => setShowForgot(false)}
        onDone={() => { setShowForgot(false); goHome(); }}
      />
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 24, ...(Platform.OS === 'web' && { maxWidth: 480, width: '100%', alignSelf: 'center' as any }) },
  mascotWrap: { alignItems: 'center', marginBottom: 28 },
  titleLogo: { width: 220, height: 33, marginTop: 12 },
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
  codeInput: { textAlign: 'center', fontSize: 26, letterSpacing: 10, fontWeight: '700' },
  verifyTitle: { fontSize: 17, fontWeight: '700', color: '#5A3DAA', textAlign: 'center', marginBottom: 8 },
  verifySub: { fontSize: 13, color: '#9E7DD5', textAlign: 'center', marginBottom: 16 },
  resendText: { color: '#9E7DD5', fontSize: 13, textAlign: 'center', marginTop: 16 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12,
    marginTop: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#EF4444', fontSize: 13, flexShrink: 1 },
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
});
