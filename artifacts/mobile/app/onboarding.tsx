import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, screenPadding, space, typography } from '@/constants/theme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp, UserProfile } from '@/contexts/AppContext';
import { ProfileForm } from '@/components/ProfileForm';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/utils/analytics';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saveProfile } = useApp();
  const { isSignedIn } = useAuth();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSignedIn) Analytics.guestStarted();
  }, [isSignedIn]);

  const handleSubmit = async (profile: UserProfile) => {
    setSaving(true);
    try {
      await saveProfile(profile);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === 'web' ? space.xxl : insets.top + space.lg;

  return (
    <View style={styles.flex}>
      <SkyBackground />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>はじめまして！</Text>
        <Text style={styles.subtitle}>
          あなたのことを少し教えてください。{'\n'}AIがあなたに合わせたサポートをしやすくなります。
        </Text>
        <Text style={styles.localNote}>
          ログインなしで始められます。記録はこの端末に保存され、あとからログインするとバックアップできます。
        </Text>
        <ProfileForm submitLabel="はじめる" onSubmit={handleSubmit} submitting={saving} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: screenPadding,
    gap: space.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  title: { ...typography.display, color: colors.foreground },
  subtitle: { ...typography.body, color: colors.mutedForeground },
  localNote: { ...typography.caption, color: colors.subtleForeground, lineHeight: 20 },
});
