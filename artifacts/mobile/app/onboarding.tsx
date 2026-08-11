import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp, UserProfile } from '@/contexts/AppContext';
import { ProfileForm } from '@/components/ProfileForm';

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saveProfile } = useApp();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (profile: UserProfile) => {
    setSaving(true);
    try {
      await saveProfile(profile);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 40 : insets.top + 16;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <SkyBackground />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.foreground }]}>はじめまして！</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          あなたのことを少し教えてください。{'\n'}AIがあなたに合わせたサポートをしやすくなります。
        </Text>
        <ProfileForm submitLabel="はじめる" onSubmit={handleSubmit} submitting={saving} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginBottom: 4 },
});
