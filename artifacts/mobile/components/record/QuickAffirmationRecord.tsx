import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { useApp } from '@/contexts/AppContext';
import { Analytics } from '@/utils/analytics';
import { getMascotStage } from '@/utils/mascotUtils';
import { Mascot } from '@/components/Mascot';

export const QUICK_ACTIONS = [
  { label: 'ご飯を食べた', icon: 'restaurant-outline' as const },
  { label: '外に出た', icon: 'sunny-outline' as const },
  { label: 'お風呂に入った', icon: 'water-outline' as const },
  { label: '仕事・学校に行った', icon: 'briefcase-outline' as const },
  { label: 'ちゃんと休んだ', icon: 'moon-outline' as const },
  { label: 'その他', icon: 'heart-outline' as const },
] as const;

const MOODS = [
  { value: 1, emoji: '😢', label: 'つらい' },
  { value: 2, emoji: '😞', label: 'しんどい' },
  { value: 3, emoji: '😐', label: 'ふつう' },
  { value: 4, emoji: '🙂', label: 'いい感じ' },
  { value: 5, emoji: '😄', label: 'うれしい' },
] as const;

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
    <Animated.Text style={[styles.sparkle, { left, top, fontSize: size }, style]}>
      ✦
    </Animated.Text>
  );
}

function AffirmationCelebration({
  visible,
  onFinish,
}: {
  visible: boolean;
  onFinish: () => void;
}) {
  const colors = useColors();
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
        <View style={styles.celebrationGlow} pointerEvents="none" />
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
          <View style={[styles.celebrationHalo, { borderColor: colors.secondary + '88' }]}>
            <Mascot stage={getMascotStage(progress.level)} mood="excited" size={118} preferStatic />
          </View>
          <Animated.View style={[styles.headlineWrap, headlineStyle]}>
            <Text style={[styles.headline, { color: colors.foreground }]}>✨ 今日も生きてて</Text>
            <Text style={[styles.headline, { color: colors.foreground }]}>えらい！ ✨</Text>
          </Animated.View>
          <Text style={[styles.celebrationSub, { color: colors.mutedForeground }]}>
            ひとつできたら、それでじゅうぶん。
          </Text>
          <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>きらきら、届いてるよ</Text>
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
  const colors = useColors();
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
      <View style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.promptRow}>
          <View>
            <Text style={[styles.question, { color: colors.foreground }]}>今日の気分は？</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>どれでも大丈夫だよ</Text>
          </View>
          <Text style={styles.promptIcon}>💭</Text>
        </View>
        <View style={styles.moodGrid}>
          {MOODS.map((option) => {
            const selected = mood === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                testID={`quick-mood-${option.value}`}
                accessibilityLabel={`気分：${option.label}`}
                onPress={() => setMood(option.value)}
                style={[
                  styles.moodButton,
                  {
                    backgroundColor: selected ? colors.secondary + '29' : colors.muted,
                    borderColor: selected ? colors.secondary : 'transparent',
                  },
                ]}
              >
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[styles.moodText, { color: selected ? colors.foreground : colors.mutedForeground }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionHeading}>
          <Text style={[styles.question, { color: colors.foreground }]}>今日できたことを1つ選ぼう</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>選べなくても、気分だけでOK</Text>
        </View>
        <View style={styles.actionGrid}>
          {QUICK_ACTIONS.map((item) => {
            const selected = action === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                testID={`quick-action-${item.label}`}
                onPress={() => setAction(selected ? null : item.label)}
                activeOpacity={0.82}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: selected ? colors.primary + '4D' : colors.muted,
                    borderColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Ionicons name={item.icon} size={15} color={selected ? colors.foreground : colors.mutedForeground} />
                <Text style={[styles.actionText, { color: selected ? colors.foreground : colors.mutedForeground }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          onPress={() => setAction(action === '今日は何もできなかった' ? null : '今日は何もできなかった')}
          style={styles.nothingButton}
          activeOpacity={0.8}
        >
          <Text style={[styles.nothingText, { color: action === '今日は何もできなかった' ? colors.secondary : colors.mutedForeground }]}>
            今日は何もできなかった、でもOK
          </Text>
        </TouchableOpacity>
        {saveError ? <Text style={[styles.saveError, { color: colors.destructive }]}>{saveError}</Text> : null}
        <TouchableOpacity
          testID="quick-record-save"
          onPress={save}
          disabled={isSaving}
          activeOpacity={0.88}
          style={[styles.saveButton, { backgroundColor: isSaving ? colors.muted : colors.primary }]}
        >
          <Ionicons name={isSaving ? 'hourglass-outline' : 'sparkles'} size={20} color={colors.primaryForeground} />
          <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
            {isSaving ? '記録してるよ…' : 'これで記録する'}
          </Text>
        </TouchableOpacity>
      </View>
      <AffirmationCelebration visible={celebrating} onFinish={finishCelebration} />
    </>
  );
}

const styles = StyleSheet.create({
  quickCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promptIcon: { fontSize: 24 },
  question: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: -0.2 },
  helper: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  moodGrid: { flexDirection: 'row', gap: 6 },
  moodButton: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  moodEmoji: { fontSize: 22 },
  moodText: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  actionHeading: { marginTop: 1 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  actionButton: {
    width: '31.5%',
    minHeight: 48,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 13,
    borderWidth: 1,
  },
  actionText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  nothingButton: { alignSelf: 'center', paddingVertical: 2, paddingHorizontal: 8 },
  nothingText: { fontSize: 11, fontFamily: 'Inter_500Medium', textDecorationLine: 'underline' },
  saveError: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  saveButton: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9,5,28,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  celebrationGlow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(128,208,199,0.13)',
  },
  celebrationContent: { width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  celebrationHalo: {
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  headlineWrap: { alignItems: 'center' },
  headline: { fontSize: 31, lineHeight: 42, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: -1.1 },
  celebrationSub: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 18 },
  tapHint: { position: 'absolute', bottom: -125, fontSize: 11, fontFamily: 'Inter_400Regular' },
  sparkle: { position: 'absolute', color: '#FFE789', textShadowColor: '#E9A6FF', textShadowRadius: 10 },
});