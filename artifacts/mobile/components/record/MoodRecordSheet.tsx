import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Analytics } from '@/utils/analytics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
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
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/contexts/AppContext';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

export const MOOD_OPTIONS = [
  { value: 1, label: '最悪', icon: 'cloud-rain' as const, color: moodPalette[1] },
  { value: 2, label: '辛い', icon: 'cloud-rain' as const, color: moodPalette[2] },
  { value: 3, label: '普通', icon: 'sun' as const, color: moodPalette[3] },
  { value: 4, label: '良い', icon: 'sun' as const, color: moodPalette[4] },
  { value: 5, label: '最高', icon: 'sun' as const, color: moodPalette[5] },
];

const BEHAVIOR_TAGS = [
  '運動した', '読書した', '瞑想した', '日記を書いた',
  '友人と会った', '新しいことに挑戦', 'ゆっくり休んだ',
  '自然を感じた', '好きな音楽を聴いた', '料理をした',
  '人に感謝された', '人に親切にした',
];

const CONDITION_SCALES = [
  { key: 'exercise' as const, title: '運動', icon: 'activity' as const, options: ['なし', '軽め', 'しっかり'] },
  { key: 'meal' as const, title: '食事', icon: 'coffee' as const, options: ['乱れた', 'ふつう', '整ってた'] },
  { key: 'social' as const, title: '人間関係', icon: 'users' as const, options: ['しんどい', 'ふつう', '温かい'] },
];

function MoodButton({
  option, selected, onPress,
}: {
  option: (typeof MOOD_OPTIONS)[0];
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.88, { damping: 6, stiffness: 400 }),
      withSpring(1.08, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    onPress();
  };

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <PressScale
        onPress={handlePress}
        accessibilityState={{ selected }}
        accessibilityLabel={`気分：${option.label}`}
        style={[styles.moodBtn, selected && { borderColor: option.color }]}
      >
        <Icon
          name={option.icon}
          size={24}
          color={selected ? option.color : colors.subtleForeground}
        />
        <Text style={[styles.moodLabel, selected && { color: option.color }]}>{option.label}</Text>
      </PressScale>
    </Animated.View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 保存に成功したとき呼ばれる(記録画面の光フィードバック用) */
  onSaved?: () => void;
}

/** 今日の気分・体調・メモを記録するシート(旧きろくタブのフォームをシート化) */
export function MoodRecordSheet({ visible, onClose, onSaved }: Props) {
  const { saveRecord, getTodayRecord, holdLightFlow } = useApp();

  // シート表示中は光の循環演出を保留(閉じた瞬間にタブ画面上で再生される)
  useEffect(() => {
    if (!visible) return;
    holdLightFlow(true);
    return () => holdLightFlow(false);
  }, [visible, holdLightFlow]);

  const todayRecord = getTodayRecord();
  const [mood, setMood] = useState(todayRecord?.mood ?? 3);
  const [sleep, setSleep] = useState(todayRecord?.sleep ?? 7);
  const [behaviors, setBehaviors] = useState<string[]>(todayRecord?.behaviors ?? []);
  const [notes, setNotes] = useState(todayRecord?.notes ?? '');
  const [exercise, setExercise] = useState<number | undefined>(todayRecord?.exercise);
  const [meal, setMeal] = useState<number | undefined>(todayRecord?.meal);
  const [social, setSocial] = useState<number | undefined>(todayRecord?.social);
  const [win, setWin] = useState(todayRecord?.win ?? '');
  const [activities, setActivities] = useState<Record<string, number>>(todayRecord?.activities ?? {});
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // 保存後の自動クローズ用タイマー。閉じ直し/アンマウント時に必ずキャンセルする
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  useEffect(() => clearCloseTimer, []);

  // シートを開くたびに今日の記録内容へ同期
  useEffect(() => {
    if (visible) {
      clearCloseTimer();
      const r = getTodayRecord();
      setMood(r?.mood ?? 3);
      setSleep(r?.sleep ?? 7);
      setBehaviors(r?.behaviors ?? []);
      setNotes(r?.notes ?? '');
      setExercise(r?.exercise);
      setMeal(r?.meal);
      setSocial(r?.social);
      setWin(r?.win ?? '');
      setActivities(r?.activities ?? {});
      setSaved(false);
    }
  }, [visible]);

  const scaleValues = { exercise, meal, social };
  const scaleSetters = { exercise: setExercise, meal: setMeal, social: setSocial };

  const toggleBehavior = (tag: string) =>
    setBehaviors((prev) => prev.includes(tag) ? prev.filter((b) => b !== tag) : [...prev, tag]);

  const adjustSleep = (delta: number) =>
    setSleep((prev) => Math.max(0, Math.min(12, Math.round((prev + delta) * 2) / 2)));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveRecord(mood, sleep, behaviors, notes, {
        exercise, meal, social, win,
        activities: Object.keys(activities).length > 0 ? activities : undefined,
      });
      Analytics.moodRecorded(mood);
      setSaved(true);
      onSaved?.();
      clearCloseTimer();
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaved(false);
        onClose();
      }, 1200);
    } finally {
      setIsSaving(false);
    }
  };

  const saveScale = useSharedValue(1);
  const handleSavePress = () => {
    saveScale.value = withSequence(
      withSpring(0.95, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    handleSave();
  };
  const saveStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));

  const selectedMood = MOOD_OPTIONS.find((m) => m.value === mood);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="今日の気持ち"
      subtitle={formatDateJP(getTodayDate())}
      maxHeightRatio={0.92}
      contentStyle={styles.content}
    >
      {todayRecord && (
        <View style={styles.editBadge}>
          <Icon name="edit-3" size={12} color={colors.primaryOnSoft} />
          <Text style={styles.editBadgeText}>本日の記録を編集中</Text>
        </View>
      )}

      {/* 気分 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今日の気分</Text>
        <View style={styles.moodRow}>
          {MOOD_OPTIONS.map((option) => (
            <MoodButton
              key={option.value}
              option={option}
              selected={mood === option.value}
              onPress={() => setMood(option.value)}
            />
          ))}
        </View>
        {selectedMood && (
          <View style={styles.moodResult}>
            <View style={[styles.moodResultDot, { backgroundColor: selectedMood.color }]} />
            <Text style={[styles.moodResultText, { color: selectedMood.color }]}>
              今日の気分は「{selectedMood.label}」
            </Text>
          </View>
        )}
      </View>

      {/* 睡眠 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>睡眠時間</Text>
        <View style={styles.sleepRow}>
          <PressScale
            style={styles.stepperBtn}
            onPress={() => adjustSleep(-0.5)}
            accessibilityLabel="睡眠時間を減らす"
          >
            <Icon name="minus" size={20} color={colors.foreground} />
          </PressScale>
          <View style={styles.sleepDisplay}>
            <Text style={styles.sleepValue}>{sleep % 1 === 0 ? sleep : sleep.toFixed(1)}</Text>
            <Text style={styles.sleepUnit}>時間</Text>
          </View>
          <PressScale
            style={styles.stepperBtn}
            onPress={() => adjustSleep(0.5)}
            accessibilityLabel="睡眠時間を増やす"
          >
            <Icon name="plus" size={20} color={colors.foreground} />
          </PressScale>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.trackFill,
              {
                width: `${(sleep / 12) * 100}%`,
                backgroundColor:
                  sleep >= 7 ? colors.success : sleep >= 5 ? colors.warning : colors.danger,
              },
            ]}
          />
        </View>
        <Text style={styles.cardHintCenter}>
          {sleep >= 7
            ? '理想的な睡眠時間です'
            : sleep >= 5
              ? 'もう少し睡眠を取りましょう'
              : '睡眠不足に注意しましょう'}
        </Text>
      </View>

      {/* コンディション */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今日のコンディション</Text>
        {CONDITION_SCALES.map((scale) => {
          const value = scaleValues[scale.key];
          const setValue = scaleSetters[scale.key];
          return (
            <View key={scale.key} style={styles.scaleRow}>
              <View style={styles.scaleLabel}>
                <Icon name={scale.icon} size={16} color={colors.subtleForeground} />
                <Text style={styles.scaleTitle}>{scale.title}</Text>
              </View>
              <View style={styles.scaleOptions}>
                {scale.options.map((label, i) => {
                  const v = i + 1;
                  const sel = value === v;
                  return (
                    <PressScale
                      key={v}
                      onPress={() => setValue(sel ? undefined : v)}
                      accessibilityState={{ selected: sel }}
                      style={[styles.scaleBtn, sel && styles.optionSelected]}
                    >
                      <Text style={[styles.scaleBtnText, sel && styles.optionTextSelected]}>
                        {label}
                      </Text>
                    </PressScale>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* 小さな成功 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今日の小さな成功（任意）</Text>
        <TextInput
          style={styles.input}
          placeholder="例：早起きできた、ありがとうと言えた"
          placeholderTextColor={colors.subtleForeground}
          value={win}
          onChangeText={setWin}
          maxLength={60}
        />
      </View>

      {/* 今日したこと */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今日したこと</Text>
        <View style={styles.tagsWrap}>
          {BEHAVIOR_TAGS.map((tag) => {
            const sel = behaviors.includes(tag);
            return (
              <PressScale
                key={tag}
                onPress={() => toggleBehavior(tag)}
                accessibilityState={{ selected: sel }}
                style={[styles.tag, sel && styles.optionSelected]}
              >
                {sel && <Icon name="check" size={12} color={colors.primaryOnSoft} />}
                <Text style={[styles.tagText, sel && styles.optionTextSelected]}>{tag}</Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      {/* メモ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>メモ（任意）</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="今日の気づき、感情、出来事など..."
          placeholderTextColor={colors.subtleForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <Animated.View style={saveStyle}>
        <Button
          label={saved ? '保存しました' : isSaving ? '保存中…' : '記録を保存する'}
          onPress={handleSavePress}
          disabled={isSaving}
          icon={saved ? 'check-circle' : 'save'}
        />
      </Animated.View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },

  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-start',
  },
  editBadgeText: { ...typography.caption, color: colors.primaryOnSoft },

  card: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  cardTitle: { ...typography.subhead, color: colors.foreground },
  cardHintCenter: { ...typography.caption, color: colors.mutedForeground, textAlign: 'center' },

  /* 選択肢の共通の見せ方。枠の太さは常に 1 なので選んでも行が動かない。 */
  optionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  optionTextSelected: { color: colors.primaryOnSoft },

  /* 気分 */
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  moodBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    minHeight: 64,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    ...border.hairline,
    gap: space.xs,
  },
  moodLabel: { ...typography.micro, color: colors.mutedForeground },
  moodResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  moodResultDot: { width: 8, height: 8, borderRadius: radius.pill },
  moodResultText: { ...typography.calloutStrong },

  /* 睡眠 */
  sleepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperBtn: {
    width: control.minTouch,
    height: control.minTouch,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    ...border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  sleepValue: { ...typography.display, fontSize: 36, lineHeight: 40, color: colors.foreground },
  sleepUnit: { ...typography.callout, color: colors.mutedForeground },
  track: {
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: radius.pill },

  /* コンディション */
  scaleRow: { gap: space.sm },
  scaleLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  scaleTitle: { ...typography.label, color: colors.foreground },
  scaleOptions: { flexDirection: 'row', gap: space.sm },
  scaleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: control.heightSm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    ...border.hairline,
  },
  scaleBtnText: { ...typography.label, color: colors.mutedForeground },

  /* 入力 */
  input: {
    ...typography.body,
    minHeight: control.height,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    ...border.hairlineStrong,
    color: colors.foreground,
  },
  inputMultiline: { minHeight: 96 },

  /* タグ */
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: control.heightSm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    ...border.hairline,
  },
  tagText: { ...typography.label, color: colors.foreground },
});
