import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { border, colors, control, radius, screenPadding, space, typography } from '@/constants/theme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp, UserProfile } from '@/contexts/AppContext';
import { ProfileForm } from '@/components/ProfileForm';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

export default function ProfileScreen() {
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

  const topPad = Platform.OS === 'web' ? space.xl : insets.top + space.sm;

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
        <View style={styles.headerRow}>
          <PressScale
            onPress={() => router.back()}
            hitSlop={space.md}
            style={styles.backBtn}
            accessibilityLabel="戻る"
          >
            <Icon name="chevron-left" size={20} color={colors.foreground} />
          </PressScale>
          <Text style={styles.title}>プロフィール</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.subtitle}>
          いつでも変更できます。AIは参考情報として使い、実際の記録を優先します。
        </Text>
        <ProfileForm initial={profile} submitLabel="保存する" onSubmit={handleSubmit} submitting={saving} />
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: control.icon },
  title: { ...typography.title, color: colors.foreground },
  subtitle: { ...typography.callout, color: colors.mutedForeground },
});
