import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { backToRoom } from '@/utils/backToRoom';
import { border, colors, control, radius, screenPadding, space, typography } from '@/constants/theme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp, UserProfile } from '@/contexts/AppContext';
import { ProfileForm } from '@/components/ProfileForm';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { DEFAULT_HOME_COMMENT_PREFERENCES, type HomeCommentFrequency, type HomeCommentPreferences } from '@/utils/homeComment';

import { RecordPromptSettings } from '@/components/record/RecordPromptSettings';

const FREQUENCY_OPTIONS: { value: HomeCommentFrequency; label: string; description: string }[] = [
  { value: 'daily', label: '毎日', description: 'その日の最初に、ひとこと話します' },
  { value: 'after_record', label: '記録したあと', description: '記録やチェックをした日に話します' },
  { value: 'quiet', label: '控えめ', description: '3日に1回くらい話します' },
  { value: 'off', label: 'オフ', description: 'ホームのひとことを表示しません' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profile,
    isLoading: profileLoading,
    saveProfile,
    homeCommentPreferences,
    saveHomeCommentPreferences,
  } = useApp();
  const [saving, setSaving] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [preferencesError, setPreferencesError] = useState('');
  const saveBusy = useRef(false);

  const handlePreferences = async (preferences: HomeCommentPreferences) => {
    if (saveBusy.current) return;
    saveBusy.current = true;
    setSavingPreferences(true);
    setPreferencesError('');
    try {
      await saveHomeCommentPreferences(preferences);
    } catch {
      setPreferencesError('設定を保存できませんでした。もう一度選んでください。');
    } finally {
      saveBusy.current = false;
      setSavingPreferences(false);
    }
  };

  const handleSubmit = async (p: UserProfile) => {
    if (saveBusy.current) return;
    saveBusy.current = true;
    setSaving(true);
    setProfileError('');
    try {
      await saveProfile(p);
      backToRoom(router);
    } catch {
      setProfileError('プロフィールを保存できませんでした。入力は残っています。もう一度保存してください。');
    } finally {
      saveBusy.current = false;
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
            onPress={() => backToRoom(router)}
            hitSlop={space.md}
            style={styles.backBtn}
            accessibilityLabel="戻る"
            accessibilityRole="button"
          >
            <Icon name="chevron-left" size={20} color={colors.foreground} />
          </PressScale>
          <Text style={styles.title}>プロフィール</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.subtitle}>
          いつでも変更できます。AIは参考情報として使い、実際の記録を優先します。
        </Text>
        <RecordPromptSettings />
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
                  onPress={() => handlePreferences({
                    ...homeCommentPreferences,
                    frequency: option.value,
                  })}
                  accessibilityLabel={`${option.label}・${option.description}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: saving || savingPreferences }}
                  disabled={saving || savingPreferences}
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
            <Text style={styles.frequencyLabel}>ひとことの位置とサイズ</Text>
            <Text style={styles.frequencyDescription}>
              ホームで吹き出しを長押しすると、上下左右へ移動したりサイズを変えたりできます
            </Text>
            <PressScale
              onPress={() => handlePreferences({
                ...homeCommentPreferences,
                placement: DEFAULT_HOME_COMMENT_PREFERENCES.placement,
                positionX: DEFAULT_HOME_COMMENT_PREFERENCES.positionX,
                positionY: DEFAULT_HOME_COMMENT_PREFERENCES.positionY,
                sizeScale: DEFAULT_HOME_COMMENT_PREFERENCES.sizeScale,
              })}
              accessibilityLabel="ひとことの位置とサイズを元に戻す"
              disabled={saving || savingPreferences}
              style={styles.resetPlacementButton}
            >
              <Icon name="rotate-ccw" size={iconSize.sm} color={colors.primary} />
              <Text style={styles.resetPlacementLabel}>位置とサイズを元に戻す</Text>
            </PressScale>
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
              onValueChange={(includeRecentChat) => handlePreferences({
                ...homeCommentPreferences,
                includeRecentChat,
              })}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={homeCommentPreferences.includeRecentChat ? colors.primary : colors.subtleForeground}
              accessibilityLabel="最近のチャットも参考にする"
              disabled={saving || savingPreferences}
            />
          </View>
        </View>
        {!!preferencesError && <Text accessibilityRole="alert" style={styles.error}>{preferencesError}</Text>}
        {!profileLoading && <ProfileForm initial={profile} submitLabel="保存する" onSubmit={handleSubmit} submitting={saving || savingPreferences} />}
        {!!profileError && <Text accessibilityRole="alert" style={styles.error}>{profileError}</Text>}
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
  title: { ...typography.title, color: colors.foreground, flex: 1, textAlign: 'center' },
  error: { ...typography.callout, color: colors.danger },
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
  resetPlacementButton: {
    minHeight: control.minTouch,
    marginTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  resetPlacementLabel: { ...typography.micro, color: colors.primaryOnSoft },
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
