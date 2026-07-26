import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp, UserProfile } from '@/contexts/AppContext';
import { ProfileForm } from '@/components/ProfileForm';

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
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

  const bgColors = isDark
    ? (['#0E0A1C', '#130D28'] as const)
    : (['#FAF7FF', '#F0F5FF'] as const);

  const topPad = Platform.OS === 'web' ? 40 : insets.top + 16;

  return (
    <View style={styles.flex}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />
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
