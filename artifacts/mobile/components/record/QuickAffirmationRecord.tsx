import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  border,
  colors,
  control,
  moodPalette,
  radius,
  space,
  typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Icon, IconBadge, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { useApp } from '@/contexts/AppContext';
import { Analytics } from '@/utils/analytics';
import { getMascotStage } from '@/utils/mascotUtils';
import { Mascot } from '@/components/Mascot';

export const QUICK_ACTIONS: { label: string; icon: IconName }[] = [
  { label: 'ご飯を食べた', icon: 'coffee' },
  { label: '外に出た', icon: 'sun' },
  { label: 'お風呂に入った', icon: 'droplet' },
  { label: '仕事・学校に行った', icon: 'briefcase' },
  { label: 'ちゃんと休んだ', icon: 'moon' },
  { label: 'その他', icon: 'heart' },
];

/**
 * 気分 1〜5。天気のメタファーで 5 段階を表す。顔の絵文字は使わない
 * （3 種類しか作れず、段階が読み取れないため）。色は `moodPalette`。
 */
const MOODS: { value: number; icon: IconName; label: string }[] = [
  { value: 1, icon: 'cloud-lightning', label: 'つらい' },
  { value: 2, icon: 'cloud-rain', label: 'しんどい' },
  { value: 3, icon: 'cloud', label: 'ふつう' },
  { value: 4, icon: 'sunrise', label: 'いい感じ' },
  { value: 5, icon: 'sun', label: 'うれしい' },
];

const CLEAR_SOUND = require('@/assets/sounds/taiko_ka.mp3');

function Sparkle({ delay, left, top, size }: { delay: number; left: number; top: number; size: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) }),
      ),
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: -18 * progress.value },
      { scale: 0.65 + progress.value * 0.75 },
      { rotate: `${progress.value * 24}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.sparkle, { left, top }, style]}>
      <Icon name="star" size={size} color={colors.primary} />
    </Animated.View>
  );
}

function AffirmationCelebration({
  visible,
  onFinish,
}: {
  visible: boolean;
  onFinish: () => void;
}) {
  const { progress } = useApp();
  const soundRef = useRef<Audio.Sound | null>(null);
  const doneRef = useRef(false);
  const headlineScale = useSharedValue(0.65);
  const headlineOpacity = useSharedValue(0);

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ scale: headlineScale.value }],
  }));

  useEffect(() => {
    if (!visible) return;
    doneRef.current = false;
    headlineScale.value = 0.65;
    headlineOpacity.value = 0;
    headlineOpacity.value = withTiming(1, { duration: 180 });
    headlineScale.value = withSequence(
      withSpring(1.12, { damping: 8, stiffness: 190 }),
      withSpring(1, { damping: 12, stiffness: 160 }),
    );

    let cancelled = false;
    const playSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(CLEAR_SOUND, { volume: 0.28 });
        if (cancelled) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
        if (cancelled) {
          await sound.stopAsync().catch(() => {});
          await sound.unloadAsync().catch(() => {});
        }
      } catch {
        // Browser autoplay restrictions and device sound settings must never block the celebration.
      }
    };
    playSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const timer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onFinish();
      }
    }, 3300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [visible, onFinish]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.celebrationOverlay}>
        {[
          [38, 128, 0, 26],
          [285, 114, 110, 20],
          [24, 382, 280, 18],
          [318, 382, 430, 28],
          [108, 510, 560, 18],
          [255, 530, 690, 24],
        ].map(([left, top, delay, size], index) => (
          <Sparkle
            key={index}
            left={left as number}
            top={top as number}
            delay={delay as number}
            size={size as number}
          />
        ))}
        <View style={styles.celebrationContent} pointerEvents="none">
          <View style={styles.celebrationHalo}>
            <Mascot stage={getMascotStage(progress.level)} mood="excited" size={112} preferStatic />
          </View>
          <Animated.View style={[styles.headlineWrap, headlineStyle]}>
            <Text style={styles.headline}>今日も生きてて</Text>
            <Text style={styles.headline}>えらい！</Text>
          </Animated.View>
          <Text style={styles.celebrationSub}>ひとつできたら、それでじゅうぶん。</Text>
          <Text style={styles.tapHint}>きらきら、届いてるよ</Text>
        </View>
      </View>
    </Modal>
  );
}

interface QuickAffirmationRecordProps {
  onComplete?: () => void;
  onSaveStart?: () => void;
  onSaveFailed?: () => void;
}

export function QuickAffirmationRecord({ onComplete, onSaveStart, onSaveFailed }: QuickAffirmationRecordProps) {
  const { getTodayRecord, holdLightFlow, saveRecord } = useApp();
  const todayRecord = getTodayRecord();
  const [mood, setMood] = useState(todayRecord?.mood ?? 3);
  const [action, setAction] = useState<string | null>(todayRecord?.behaviors[0] ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const holdingLightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    setMood(todayRecord?.mood ?? 3);
    setAction(todayRecord?.behaviors[0] ?? null);
  }, [todayRecord?.id]);

  const releaseLightFlow = useCallback(() => {
    if (!holdingLightRef.current) return;
    holdingLightRef.current = false;
    holdLightFlow(false);
  }, [holdLightFlow]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseLightFlow();
    };
  }, [releaseLightFlow]);

  const finishCelebration = useCallback(() => {
    setCelebrating(false);
    releaseLightFlow();
    onComplete?.();
  }, [onComplete, releaseLightFlow]);

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    onSaveStart?.();
    holdingLightRef.current = true;
    holdLightFlow(true);
    try {
      const previousBehaviors = todayRecord?.behaviors ?? [];
      const behaviors =
        action && action !== '今日は何もできなかった' && !previousBehaviors.includes(action)
          ? [...previousBehaviors, action]
          : previousBehaviors;
      await saveRecord(mood, todayRecord?.sleep ?? 7, behaviors, todayRecord?.notes ?? '', {
        exercise: todayRecord?.exercise,
        meal: todayRecord?.meal,
        social: todayRecord?.social,
        win: todayRecord?.win,
        activities: todayRecord?.activities,
      });
      if (!mountedRef.current) return;
      Analytics.moodRecorded(mood);
      setCelebrating(true);
    } catch {
      releaseLightFlow();
      if (!mountedRef.current) return;
      onSaveFailed?.();
      setSaveError('保存できませんでした。もう一度だけ試してみてね。');
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };

  return (
    <>
      <View style={styles.quickCard}>
        <View style={styles.promptRow}>
          <View>
            <Text style={styles.question}>今日の気分は？</Text>
            <Text style={styles.helper}>どれでも大丈夫だよ</Text>
          </View>
          <IconBadge name="message-square" size="sm" />
        </View>
        <View style={styles.moodGrid}>
          {MOODS.map((option) => {
            const selected = mood === option.value;
            return (
              <PressScale
                key={option.value}
                testID={`quick-mood-${option.value}`}
                accessibilityLabel={`気分：${option.label}`}
                onPress={() => setMood(option.value)}
                accessibilityState={{ selected }}
                style={[styles.moodButton, selected && styles.optionSelected]}
              >
                <Icon
                  name={option.icon}
                  size={iconSize.lg}
                  color={selected ? moodPalette[option.value] : colors.subtleForeground}
                />
                <Text style={[styles.moodText, selected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              </PressScale>
            );
          })}
        </View>

        <View>
          <Text style={styles.question}>今日できたことを1つ選ぼう</Text>
          <Text style={styles.helper}>選べなくても、気分だけでOK</Text>
        </View>
        <View style={styles.actionGrid}>
          {QUICK_ACTIONS.map((item) => {
            const selected = action === item.label;
            return (
              <PressScale
                key={item.label}
                testID={`quick-action-${item.label}`}
                onPress={() => setAction(selected ? null : item.label)}
                accessibilityState={{ selected }}
                style={[styles.actionButton, selected && styles.optionSelected]}
              >
                <Icon
                  name={item.icon}
                  size={iconSize.sm}
                  color={selected ? colors.primaryOnSoft : colors.subtleForeground}
                />
                <Text style={[styles.actionText, selected && styles.optionTextSelected]}>
                  {item.label}
                </Text>
              </PressScale>
            );
          })}
        </View>
        <PressScale
          onPress={() => setAction(action === '今日は何もできなかった' ? null : '今日は何もできなかった')}
          style={styles.nothingButton}
        >
          <Text
            style={[
              styles.nothingText,
              action === '今日は何もできなかった' && styles.nothingTextSelected,
            ]}
          >
            今日は何もできなかった、でもOK
          </Text>
        </PressScale>
        {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
        <Button
          testID="quick-record-save"
          label={isSaving ? '記録してるよ…' : 'これで記録する'}
          icon="check"
          onPress={save}
          loading={isSaving}
          fullWidth
          style={styles.saveButton}
        />
      </View>
      <AffirmationCelebration visible={celebrating} onFinish={finishCelebration} />
    </>
  );
}

const styles = StyleSheet.create({
  quickCard: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.lg,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  question: { ...typography.subhead, color: colors.foreground },
  helper: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },

  /* 選択肢の共通の見せ方 — 選択は「淡い紫の塗り + 1px の紫の枠」だけで示す。
     枠の太さは常に 1 なので、選んでも行の高さが動かない。 */
  optionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  optionTextSelected: { color: colors.primaryOnSoft },

  moodGrid: { flexDirection: 'row', gap: space.sm },
  moodButton: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    ...border.hairline,
  },
  moodText: { ...typography.micro, color: colors.mutedForeground },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actionButton: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: control.minTouch,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    ...border.hairline,
  },
  actionText: {
    ...typography.micro,
    color: colors.mutedForeground,
    textAlign: 'center',
  },

  nothingButton: { alignSelf: 'center', paddingVertical: space.xs, paddingHorizontal: space.sm },
  nothingText: {
    ...typography.caption,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
  nothingTextSelected: { color: colors.primaryOnSoft },
  saveError: { ...typography.caption, color: colors.danger, textAlign: 'center' },

  saveButton: { marginTop: space.xs },

  /* 記録できた瞬間の全画面演出 — 淡い紫一色。発光やぼかしは重ねない。 */
  celebrationOverlay: {
    flex: 1,
    backgroundColor: colors.backgroundSunken,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  celebrationContent: { width: '100%', alignItems: 'center', paddingHorizontal: space.xl },
  celebrationHalo: {
    width: 160,
    height: 160,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...border.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  headlineWrap: { alignItems: 'center' },
  headline: { ...typography.display, color: colors.foreground, textAlign: 'center' },
  celebrationSub: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: space.lg,
  },
  tapHint: { ...typography.caption, color: colors.subtleForeground, marginTop: space.xxxl },
  sparkle: { position: 'absolute' },
});
