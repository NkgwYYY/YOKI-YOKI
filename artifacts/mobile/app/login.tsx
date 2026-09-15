import React, { useState, useCallback, useEffect } from 'react';
import { Analytics } from '@/utils/analytics';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal, Image,
} from 'react-native';
import { border, colors, control, radius, screenPadding, space, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { SkyBackground } from '@/components/SkyBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useSignIn, useSignUp } from '@clerk/expo';
import { Mascot } from '@/components/Mascot';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

function clerkErrorMessage(error: unknown): string {
  type ClerkErrorItem = { code?: string; longMessage?: string; message?: string };
  const e = error as ({ errors?: ClerkErrorItem[] } & ClerkErrorItem) | null;
  const first = e?.errors?.[0] ?? e;
  const code = first?.code ?? '';
  const map: Record<string, string> = {
    form_identifier_not_found: 'このメールアドレスは登録されていません',
    form_password_incorrect: 'パスワードが違います',
    form_identifier_exists: 'このメールアドレスはすでに登録されています',
    form_password_pwned: 'このパスワードは流出リストに含まれています。別のパスワードにしてください',
    form_password_length_too_short: 'パスワードが短すぎます（8文字以上にしてください）',
    form_password_not_strong_enough: 'パスワードが簡単すぎます。8文字以上で、英字と数字を組み合わせてください',
    password_not_strong_enough: 'パスワードが簡単すぎます。8文字以上で、英字と数字を組み合わせてください',
    form_password_validation_failed: 'このパスワードは使用できません。8文字以上で、英字と数字を組み合わせてください',
    form_code_incorrect: 'コードが違います',
    verification_expired: 'コードの有効期限が切れました。再送してください',
    session_exists: 'すでにログインしています',
    too_many_requests: '試行回数が多すぎます。しばらく待ってからお試しください',
  };
  if (code && map[code]) return map[code];
  const raw = first?.longMessage || first?.message || '';
  const textMap: [string, string][] = [
    ["couldn't find your account", 'このメールアドレスは登録されていません。「新規登録」からアカウントを作成してください'],
    ['data breach', 'このパスワードは過去に流出したものと一致します。安全のため、別のパスワードにしてください'],
    ['password is incorrect', 'パスワードが違います'],
    ['not strong enough', 'パスワードが簡単すぎます。8文字以上で、英字と数字を組み合わせてください'],
    ['is taken', 'このメールアドレスはすでに登録されています'],
    ['too many requests', '試行回数が多すぎます。しばらく待ってからお試しください'],
    ['network', '通信できませんでした。接続を確認して、もう一度お試しください'],
    ['is invalid', '入力内容に誤りがあります。確認してください'],
  ];
  const lower = raw.toLowerCase();
  for (const [en, ja] of textMap) {
    if (lower.includes(en)) return ja;
  }
  if (/[ぁ-んァ-ン一-龥]/.test(raw)) return raw;
  return raw
    ? `エラーが発生しました。もう一度お試しください（${raw}）`
    : 'エラーが発生しました。もう一度お試しください';
}

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
        <PressScale style={s.overlay} onPress={handleClose} />
        <View style={[s.sheet, { paddingBottom: Platform.OS === 'web' ? 32 : insets.bottom + 24 }]}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>
              {step === 'email' ? 'パスワードを再設定' : 'コードを入力'}
            </Text>
            <PressScale onPress={handleClose} hitSlop={12}>
              <Icon name="x" size={20} color={colors.subtleForeground} />
            </PressScale>
          </View>
          {step === 'email' ? (
            <View style={s.sheetBody}>
              <Text style={s.sheetSub}>登録したメールアドレスを入力してください。確認コードをメールでお送りします。</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="例：hello@example.com"
                placeholderTextColor={colors.subtleForeground}
                autoCorrect={false}
                autoFocus
              />
              {!!error && <Text style={s.errorText}>{error}</Text>}
              <Button
                label="確認コードを送る"
                onPress={handleRequestCode}
                loading={loading}
                fullWidth
                style={s.btn}
              />
            </View>
          ) : (
            <View style={s.sheetBody}>
              <Text style={s.sheetSub}>{email} に送られたコードを入力</Text>
              <TextInput
                style={[s.input, s.codeInput]}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor={colors.subtleForeground}
                maxLength={6}
              />
              <Text style={[s.label, { marginTop: 14 }]}>新しいパスワード</Text>
              <TextInput
                style={s.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="8文字以上"
                placeholderTextColor={colors.subtleForeground}
              />
              {!!error && <Text style={s.errorText}>{error}</Text>}
              <Button
                label="パスワードを変更する"
                onPress={handleReset}
                loading={loading}
                fullWidth
                style={s.btn}
              />
              <PressScale onPress={() => signIn.resetPasswordEmailCode.sendCode()}>
                <Text style={s.resend}>コードが届かない場合は再送する</Text>
              </PressScale>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loading = submitting;

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

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('メールとパスワードを入力してください');
      return;
    }
    if (tab === 'register' && password.length < 8) {
      setError('パスワードは8文字以上で、英字と数字を組み合わせてください');
      return;
    }
    const emailAddress = email.trim().toLowerCase();

    setSubmitting(true);
    try {
      if (tab === 'login') {
        const { error: err } = await signIn.password({ emailAddress, password });
        if (err) { setError(clerkErrorMessage(err)); return; }
        if (signIn.status === 'complete') {
          Analytics.login();
          await signIn.finalize({ navigate: finalizeNavigate });
        } else if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
          const emailCodeFactor = signIn.supportedSecondFactors.find(
            factor => factor.strategy === 'email_code',
          );
          if (emailCodeFactor) {
            const { error: sendErr } = await signIn.mfa.sendEmailCode();
            if (sendErr) { setError(clerkErrorMessage(sendErr)); return; }
            setCode('');
          } else {
            setError('このアカウントでは追加確認が必要です。確認できない場合は、アカウントなしで始められます');
          }
        } else {
          setError('ログインを完了できませんでした。入力内容を確認するか、アカウントなしで始めてください');
        }
      } else {
        const { error: err } = await signUp.password({ emailAddress, password });
        if (err) { setError(clerkErrorMessage(err)); return; }
        const { error: sendErr } = await signUp.verifications.sendEmailCode();
        if (sendErr) { setError(clerkErrorMessage(sendErr)); return; }
      }
    } catch (e) {
      setError(clerkErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginVerify = async () => {
    setError('');
    if (code.trim().length !== 6) { setError('6桁の確認コードを入力してください'); return; }
    setSubmitting(true);
    try {
      const { error: err } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (err) { setError(clerkErrorMessage(err)); return; }
      if (signIn.status === 'complete') {
        Analytics.login();
        await signIn.finalize({ navigate: finalizeNavigate });
      } else {
        setError('本人確認を完了できませんでした。新しいコードを送って、もう一度お試しください');
      }
    } catch (e) {
      setError(clerkErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    if (code.trim().length !== 6) { setError('6桁のコードを入力してください'); return; }
    setSubmitting(true);
    try {
      const { error: err } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (err) { setError(clerkErrorMessage(err)); return; }
      if (signUp.status === 'complete') {
        Analytics.signUp();
        await signUp.finalize({ navigate: finalizeNavigate });
      } else {
        setError('確認を完了できませんでした。もう一度お試しください');
      }
    } catch (e) {
      setError(clerkErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const needsVerification =
    tab === 'register' &&
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0;
  const needsLoginVerification =
    tab === 'login' &&
    (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor');

  return (
    <View style={[styles.root, Platform.OS === 'web' && { minHeight: '100vh' as any }]}>
      <SkyBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mascotWrap}>
            <Mascot stage="stage3" mood="happy" size={120} />
            <Image
              source={require('@/assets/images/yoki_logo.png')}
              style={styles.titleLogo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>小さな夢の、あなたの居場所</Text>
          </View>

          <View style={styles.quickStart}>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel="アカウントなしで始める"
              onPress={() => router.replace('/onboarding')}
              style={styles.guestButton}
            >
              <Text style={styles.guestButtonText}>アカウントなしで始める</Text>
            </PressScale>
            <Text style={styles.guestNote}>登録・メール確認なしで、すぐに利用できます</Text>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>またはアカウントを利用</Text>
              <View style={styles.orLine} />
            </View>
          </View>

          {needsLoginVerification ? (
            <View style={styles.form}>
              <Text style={styles.verifyTitle}>メールを確認してください</Text>
              <Text style={styles.verifySub}>
                新しい端末からのログインを確認するため、メールに送られた6桁のコードを入力してください
              </Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor={colors.subtleForeground}
                maxLength={6}
                autoFocus
              />
              {!!error && (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <Button
                label="確認してログイン"
                onPress={handleLoginVerify}
                loading={loading}
                style={styles.submit}
              />
              <PressScale
                onPress={async () => {
                  setError('');
                  const { error: sendErr } = await signIn.mfa.sendEmailCode();
                  if (sendErr) setError(clerkErrorMessage(sendErr));
                }}
              >
                <Text style={styles.resendText}>コードが届かない場合は再送する</Text>
              </PressScale>
              <PressScale
                onPress={() => {
                  signIn.reset();
                  setCode('');
                  setError('');
                }}
              >
                <Text style={styles.restartText}>メールアドレスの入力へ戻る</Text>
              </PressScale>
            </View>
          ) : needsVerification ? (
            <View style={styles.form}>
              <Text style={styles.verifyTitle}>メールを確認してください</Text>
              <Text style={styles.verifySub}>{email.trim()} に6桁の確認コードを送りました</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor={colors.subtleForeground}
                maxLength={6}
                autoFocus
              />
              {!!error && (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <Button
                label="確認する"
                onPress={handleVerify}
                loading={loading}
                style={styles.submit}
              />
              <PressScale onPress={() => signUp.verifications.sendEmailCode()}>
                <Text style={styles.resendText}>コードが届かない場合は再送する</Text>
              </PressScale>
            </View>
          ) : (
            <>
              <View style={styles.tabRow}>
                {(['login', 'register'] as const).map(t => (
                  <PressScale
                    key={t}
                    style={[styles.tab, tab === t && styles.tabActive]}
                    onPress={() => { setTab(t); setError(''); }}
                  >
                    <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                      {t === 'login' ? 'ログイン' : '新規登録'}
                    </Text>
                  </PressScale>
                ))}
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>メールアドレス</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="例：hello@example.com"
                  placeholderTextColor={colors.subtleForeground}
                  autoCorrect={false}
                />

                <Text style={[styles.label, { marginTop: 16 }]}>パスワード</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="8文字以上"
                  placeholderTextColor={colors.subtleForeground}
                />
                {tab === 'register' && (
                  <Text style={styles.passwordHint}>
                    8文字以上で、推測されにくい英字と数字を組み合わせてください
                  </Text>
                )}

                {!!error && (
                  <View style={styles.errorBox}>
                    <Icon name="alert-circle" size={16} color={colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Button
                  label={tab === 'login' ? 'ログイン' : 'アカウントを作成'}
                  onPress={handleSubmit}
                  loading={loading}
                  style={styles.submit}
                />

                {tab === 'register' && (
                  <Text style={styles.hint}>今までのデータはそのまま引き継がれます</Text>
                )}

                {tab === 'login' && (
                  <PressScale onPress={() => setShowForgot(true)} style={styles.forgotWrap}>
                    <Icon name="lock" size={14} color={colors.mutedForeground} />
                    <Text style={styles.forgotText}>パスワードを忘れた場合</Text>
                  </PressScale>
                )}

                <View nativeID="clerk-captcha" />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={showForgot}
        onClose={() => setShowForgot(false)}
        onDone={() => { setShowForgot(false); goHome(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: {
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    ...(Platform.OS === 'web' && { maxWidth: 480, width: '100%', alignSelf: 'center' as any }),
  },
  mascotWrap: { alignItems: 'center', marginBottom: space.xl },
  titleLogo: { width: 180, height: 40, marginTop: space.md, tintColor: colors.foreground },
  subtitle: {
    ...typography.callout,
    color: colors.primary,
    marginTop: space.sm,
    textAlign: 'center',
  },
  quickStart: { width: '100%', gap: space.sm, marginBottom: space.lg },
  guestButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: control.height,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  guestButtonText: { ...typography.bodyStrong, color: colors.primaryForeground },
  guestNote: { ...typography.caption, color: colors.mutedForeground, textAlign: 'center' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  orLine: { flex: 1, height: border.width, backgroundColor: colors.border },
  orText: { ...typography.caption, color: colors.mutedForeground },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.4)',
    ...border.hairline,
    borderRadius: radius.pill,
    padding: space.xs,
    marginBottom: space.xl,
    width: '100%',
    gap: space.xs,
  },
  tab: {
    flex: 1,
    minHeight: control.heightSm,
    justifyContent: 'center',
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.card, ...border.hairline, borderColor: colors.borderOnFill },
  tabText: { ...typography.label, color: colors.mutedForeground },
  tabTextActive: { color: colors.primary },

  form: { width: '100%', gap: space.sm },
  label: { ...typography.label, color: colors.foreground },
  input: {
    ...typography.body,
    height: control.height,
    backgroundColor: colors.input,
    ...border.hairlineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    color: colors.foreground,
  },
  passwordHint: { ...typography.caption, color: colors.mutedForeground, marginTop: -space.xs },
  codeInput: {
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontFamily: 'Inter_700Bold',
  },
  verifyTitle: { ...typography.heading, color: colors.foreground, textAlign: 'center' },
  verifySub: {
    ...typography.callout,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  resendText: {
    ...typography.callout,
    color: colors.primary,
    textAlign: 'center',
    marginTop: space.lg,
  },
  restartText: {
    ...typography.callout,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: space.sm,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.sm,
  },
  errorText: { ...typography.caption, color: colors.danger, flexShrink: 1 },

  submit: { marginTop: space.lg },
  hint: { ...typography.caption, color: colors.success, marginTop: space.md, textAlign: 'center' },
  forgotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: control.minTouch,
  },
  forgotText: { ...typography.callout, color: colors.mutedForeground },
});

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: space.sm,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { ...typography.heading, color: colors.foreground },
  sheetSub: { ...typography.caption, color: colors.mutedForeground, marginBottom: space.sm },
  sheetBody: { gap: space.sm },
  label: { ...typography.label, color: colors.foreground },
  input: {
    ...typography.body,
    height: control.height,
    backgroundColor: colors.input,
    ...border.hairlineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    color: colors.foreground,
  },
  codeInput: {
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontFamily: 'Inter_700Bold',
  },
  errorText: { ...typography.caption, color: colors.danger, marginTop: space.sm },
  btn: { marginTop: space.lg },
  resend: {
    ...typography.callout,
    color: colors.primary,
    textAlign: 'center',
    marginTop: space.md,
  },
});