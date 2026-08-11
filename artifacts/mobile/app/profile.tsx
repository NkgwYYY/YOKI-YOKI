import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { CosmicBackground } from '@/components/CosmicBackground';
import { useApp, UserProfile } from '@/contexts/AppContext';
import { ProfileForm } from '@/components/ProfileForm';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, saveProfile } = useApp();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (p: UserProfile) => {
    setSaving(true);
    try {
      await saveProfile(p);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 24 : insets.top + 8;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>プロフィール</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          いつでも変更できます。AIは参考情報として使い、実際の記録を優先します。
        </Text>
        <ProfileForm initial={profile} submitLabel="保存する" onSubmit={handleSubmit} submitting={saving} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
});
