import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { border, colors, control, radius, screenPadding, space, typography } from '@/constants/theme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp, UserProfile } from '@/contexts/AppContext';
import { ProfileForm } from '@/components/ProfileForm';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import type { HomeCommentFrequency, HomeCommentPlacement } from '@/utils/homeComment';

const FREQUENCY_OPTIONS: { value: HomeCommentFrequency; label: string; description: string }[] = [
  { value: 'daily', label: '毎日', description: 'その日の最初に、ひとこと話します' },
  { value: 'after_record', label: '記録したあと', description: '記録やチェックをした日に話します' },
  { value: 'quiet', label: '控えめ', description: '3日に1回くらい話します' },
  { value: 'off', label: 'オフ', description: 'ホームのひとことを表示しません' },
];

const PLACEMENT_OPTIONS: { value: HomeCommentPlacement; label: string }[] = [
  { value: 'bottom_left', label: '左' },
  { value: 'bottom_center', label: '中央' },
  { value: 'bottom_right', label: '右' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profile,
    saveProfile,
    homeCommentPreferences,
    saveHomeCommentPreferences,
  } = useApp();
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
        <View style={styles.commentSettings}>
          <View style={styles.settingHeader}>
            <Icon name="message-circle" size={iconSize.sm} color={colors.primary} />
            <View style={styles.settingHeaderCopy}>
              <Text style={styles.settingTitle}>キャラクターからのひとこと</Text>
              <Text style={styles.settingDescription}>話しかけられる頻度を選べます</Text>
            </View>
          </View>
          <View style={styles.frequencyList}>
            {FREQUENCY_OPTIONS.map((option) => {
              const selected = homeCommentPreferences.frequency === option.value;
              return (
                <PressScale
                  key={option.value}
                  onPress={() => saveHomeCommentPreferences({
                    ...homeCommentPreferences,
                    frequency: option.value,
                  })}
                  accessibilityLabel={`${option.label}・${option.description}`}
                  style={[styles.frequencyOption, selected && styles.frequencyOptionSelected]}
                >
                  <View style={styles.frequencyCopy}>
                    <Text style={[styles.frequencyLabel, selected && styles.frequencyLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.frequencyDescription}>{option.description}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </PressScale>
              );
            })}
          </View>
          <View style={styles.placementSetting}>
            <Text style={styles.frequencyLabel}>ひとことの位置</Text>
            <Text style={styles.frequencyDescription}>
              キャラクターの上に重ならないよう表示します
            </Text>
            <View style={styles.placementOptions}>
              {PLACEMENT_OPTIONS.map((option) => {
                const selected = homeCommentPreferences.placement === option.value;
                return (
                  <PressScale
                    key={option.value}
                    onPress={() => saveHomeCommentPreferences({
                      ...homeCommentPreferences,
                      placement: option.value,
                    })}
                    accessibilityLabel={`ひとことを${option.label}に表示`}
                    style={[styles.placementOption, selected && styles.placementOptionSelected]}
                  >
                    <View style={[
                      styles.placementPreview,
                      option.value === 'bottom_left'
                        ? styles.placementPreviewLeft
                        : option.value === 'bottom_right'
                          ? styles.placementPreviewRight
                          : styles.placementPreviewCenter,
                    ]}>
                      <View style={[styles.placementCharacter, selected && styles.placementCharacterSelected]} />
                      <View style={[styles.placementBubble, selected && styles.placementBubbleSelected]} />
                    </View>
                    <Text style={[styles.placementLabel, selected && styles.frequencyLabelSelected]}>
                      {option.label}
                    </Text>
                  </PressScale>
                );
              })}
            </View>
          </View>
          <View style={styles.chatSetting}>
            <View style={styles.chatSettingCopy}>
              <Text style={styles.frequencyLabel}>最近のチャットも参考にする</Text>
              <Text style={styles.frequencyDescription}>
                オフでも今日の記録に合わせて話します
              </Text>
            </View>
            <Switch
              value={homeCommentPreferences.includeRecentChat}
              onValueChange={(includeRecentChat) => saveHomeCommentPreferences({
                ...homeCommentPreferences,
                includeRecentChat,
              })}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={homeCommentPreferences.includeRecentChat ? colors.primary : colors.subtleForeground}
              accessibilityLabel="最近のチャットも参考にする"
            />
          </View>
        </View>
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
  commentSettings: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    ...border.hairline,
  },
  settingHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  settingHeaderCopy: { flex: 1, gap: 2 },
  settingTitle: { ...typography.subhead, color: colors.foreground },
  settingDescription: { ...typography.caption, color: colors.mutedForeground },
  frequencyList: { gap: space.xs },
  frequencyOption: {
    minHeight: control.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  frequencyOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderWidth: border.width,
    borderColor: colors.primary,
  },
  frequencyCopy: { flex: 1, gap: 2 },
  frequencyLabel: { ...typography.calloutStrong, color: colors.foreground },
  frequencyLabelSelected: { color: colors.primaryOnSoft },
  frequencyDescription: { ...typography.micro, color: colors.mutedForeground },
  placementSetting: {
    gap: space.xs,
    paddingTop: space.sm,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
  },
  placementOptions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  placementOption: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    ...border.hairline,
  },
  placementOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  placementPreview: {
    width: '100%',
    height: 42,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  placementPreviewLeft: { alignItems: 'flex-start' },
  placementPreviewCenter: { alignItems: 'center' },
  placementPreviewRight: { alignItems: 'flex-end' },
  placementCharacter: {
    position: 'absolute',
    left: '50%',
    bottom: 13,
    width: 18,
    height: 22,
    marginLeft: -9,
    borderRadius: radius.pill,
    backgroundColor: colors.subtleForeground,
  },
  placementCharacterSelected: { backgroundColor: colors.primary },
  placementBubble: {
    width: 30,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: colors.border,
  },
  placementBubbleSelected: { borderColor: colors.primary },
  placementLabel: { ...typography.micro, color: colors.foreground },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.subtleForeground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  chatSetting: {
    minHeight: control.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.sm,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
  },
  chatSettingCopy: { flex: 1, gap: 2 },
});
