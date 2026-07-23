import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'expo-router';
import { Mascot } from '@/components/Mascot';

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
        // On register, push existing local data to cloud
        if (!result.error) {
          await pushDataToCloud();
        }
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

  return (
    <LinearGradient colors={['#F5EEFF', '#E8F4FF']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

          {/* Tab */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, tab === 'login' && styles.tabActive]}
              onPress={() => { setTab('login'); setError(''); }}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>ログイン</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'register' && styles.tabActive]}
              onPress={() => { setTab('register'); setError(''); }}
            >
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>新規登録</Text>
            </TouchableOpacity>
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

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {tab === 'login' ? 'ログイン' : 'アカウントを作成'}
                </Text>
              )}
            </TouchableOpacity>

            {tab === 'register' && (
              <Text style={styles.hint}>
                ✅ 今までのデータはそのまま引き継がれます
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mascotWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5A3DAA',
    marginTop: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#9E7DD5',
    marginTop: 6,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#EDE5F8',
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#7C4DCC',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9E7DD5',
  },
  tabTextActive: {
    color: '#fff',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A3DAA',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1.5,
    borderColor: '#DDD0F5',
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#7C4DCC',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#7C4DCC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: '#00C4A7',
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});
