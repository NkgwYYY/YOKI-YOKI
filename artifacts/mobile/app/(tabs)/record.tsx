import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Analytics } from '@/utils/analytics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp } from '@/contexts/AppContext';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { ACTIVITY_DEFS } from '@/utils/activities';
import BoneCharacter from '@/components/BoneCharacter';

const MOOD_OPTIONS = [
  { value: 1, label: '最悪', icon: 'sad-outline' as const, color: '#EF4444' },
  { value: 2, label: '辛い', icon: 'sad-outline' as const, color: '#FF6B35' },
  { value: 3, label: '普通', icon: 'happy-outline' as const, color: '#FFB800' },
  { value: 4, label: '良い', icon: 'happy-outline' as const, color: '#00C4A7' },
  { value: 5, label: '最高', icon: 'happy-outline' as const, color: '#00D4AA' },
];

const BEHAVIOR_TAGS = [
  '運動した', '読書した', '瞑想した', '日記を書いた',
  '友人と会った', '新しいことに挑戦', 'ゆっくり休んだ',
  '自然を感じた', '好きな音楽を聴いた', '料理をした',
  '人に感謝された', '人に親切にした',
];

// 3-choice condition scales (1..3). Kept tiny so daily input stays light.
const CONDITION_SCALES = [
  {
    key: 'exercise' as const,
    title: '運動',
    icon: 'walk-outline' as const,
    options: ['なし', '軽め', 'しっかり'],
  },
  {
    key: 'meal' as const,
    title: '食事',
    icon: 'restaurant-outline' as const,
    options: ['乱れた', 'ふつう', '整ってた'],
  },
  {
    key: 'social' as const,
    title: '人間関係',
    icon: 'people-outline' as const,
    options: ['しんどい', 'ふつう', '温かい'],
  },
];

function MoodButton({
  option,
  selected,
  onPress,
}: {
  option: (typeof MOOD_OPTIONS)[0];
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
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
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[
          styles.moodBtn,
          {
            backgroundColor: selected ? option.color + '22' : colors.muted,
            borderColor: selected ? option.color : 'transparent',
            borderWidth: selected ? 2 : 0,
          },
        ]}
      >
        <Ionicons name={option.icon} size={30} color={selected ? option.color : colors.mutedForeground} />
        <Text style={[styles.moodLabel, { color: selected ? option.color : colors.mutedForeground }]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RecordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveRecord, getTodayRecord } = useApp();

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

  useEffect(() => {
    if (todayRecord) {
      setMood(todayRecord.mood);
      setSleep(todayRecord.sleep);
      setBehaviors(todayRecord.behaviors);
      setNotes(todayRecord.notes);
      setExercise(todayRecord.exercise);
      setMeal(todayRecord.meal);
      setSocial(todayRecord.social);
      setWin(todayRecord.win ?? '');
      setActivities(todayRecord.activities ?? {});
    }
  }, [todayRecord?.id]);

  const bumpActivity = (key: string) =>
    setActivities((prev) => ({ ...prev, [key]: Math.min(99, (prev[key] || 0) + 1) }));
  const decActivity = (key: string) =>
    setActivities((prev) => {
      const n = (prev[key] || 0) - 1;
      const next = { ...prev };
      if (n <= 0) delete next[key]; else next[key] = n;
      return next;
    });

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
      setTimeout(() => setSaved(false), 2200);
    } finally {
      setIsSaving(false);
    }
  };

  // Save button animation
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
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <SkyBackground />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.foreground }]}>今日の気持ち</Text>
        <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
          {formatDateJP(getTodayDate())}
        </Text>
        {todayRecord && (
          <View style={[styles.editBadge, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name="pencil-outline" size={12} color={colors.primary} />
            <Text style={[styles.editBadgeText, { color: colors.primary }]}>本日の記録を編集中</Text>
          </View>
        )}

        {/* 今日の記録: やったことカウント */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>やったことを教えてね</Text>
          <Text style={[styles.activityHint, { color: colors.mutedForeground }]}>
            タップで +1(長押しで -1)
          </Text>
          <View style={styles.activityGrid}>
            {ACTIVITY_DEFS.map((a) => {
              const count = activities[a.key] || 0;
              const active = count > 0;
              return (
                <TouchableOpacity
                  key={a.key}
                  onPress={() => bumpActivity(a.key)}
                  onLongPress={() => decActivity(a.key)}
                  activeOpacity={0.8}
                  style={[
                    styles.activityCell,
                    {
                      backgroundColor: active ? a.color + '1E' : colors.muted,
                      borderColor: active ? a.color : 'transparent',
                      borderWidth: active ? 1.5 : 0,
                    },
                  ]}
                >
                  <Ionicons name={a.icon as any} size={26} color={active ? a.color : colors.mutedForeground} />
                  <Text style={[styles.activityLabel, { color: active ? a.color : colors.foreground }]}>
                    {a.label}
                  </Text>
                  {active && (
                    <View style={[styles.activityBadge, { backgroundColor: a.color }]}>
                      <Text style={styles.activityBadgeText}>+{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Mood */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>今日の気分</Text>
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
            <View style={[styles.moodResult, { backgroundColor: selectedMood.color + '15' }]}>
              <View style={[styles.moodResultDot, { backgroundColor: selectedMood.color }]} />
              <Text style={[styles.moodResultText, { color: selectedMood.color }]}>
                今日の気分は「{selectedMood.label}」
              </Text>
            </View>
          )}
        </View>

        {/* Sleep */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>睡眠時間</Text>
          <View style={styles.sleepRow}>
            <TouchableOpacity
              style={[styles.sleepBtn, { backgroundColor: colors.muted }]}
              onPress={() => adjustSleep(-0.5)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.sleepDisplay}>
              <Text style={[styles.sleepValue, { color: colors.foreground }]}>
                {sleep % 1 === 0 ? sleep : sleep.toFixed(1)}
              </Text>
              <Text style={[styles.sleepUnit, { color: colors.mutedForeground }]}>時間</Text>
            </View>
            <TouchableOpacity
              style={[styles.sleepBtn, { backgroundColor: colors.muted }]}
              onPress={() => adjustSleep(0.5)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.sleepTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.sleepFill,
                {
                  width: `${(sleep / 12) * 100}%`,
                  backgroundColor: sleep >= 7 ? colors.primary : sleep >= 5 ? '#FFB800' : '#EF4444',
                },
              ]}
            />
          </View>
          <Text style={[styles.sleepHint, { color: colors.mutedForeground }]}>
            {sleep >= 7 ? '理想的な睡眠時間です' : sleep >= 5 ? 'もう少し睡眠を取りましょう' : '睡眠不足に注意しましょう'}
          </Text>
        </View>

        {/* Condition scales: exercise / meal / relationships */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>今日のコンディション</Text>
          {CONDITION_SCALES.map((scale) => {
            const value = scaleValues[scale.key];
            const setValue = scaleSetters[scale.key];
            return (
              <View key={scale.key} style={styles.scaleRow}>
                <View style={styles.scaleLabel}>
                  <Ionicons name={scale.icon} size={16} color={colors.mutedForeground} />
                  <Text style={[styles.scaleTitle, { color: colors.foreground }]}>{scale.title}</Text>
                </View>
                <View style={styles.scaleOptions}>
                  {scale.options.map((label, i) => {
                    const v = i + 1;
                    const sel = value === v;
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => setValue(sel ? undefined : v)}
                        activeOpacity={0.8}
                        style={[
                          styles.scaleBtn,
                          {
                            backgroundColor: sel ? colors.primary + '22' : colors.muted,
                            borderColor: sel ? colors.primary : 'transparent',
                            borderWidth: sel ? 1.5 : 0,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scaleBtnText,
                            { color: sel ? colors.primary : colors.mutedForeground },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Small win */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>🏆 今日の小さな成功（任意）</Text>
          <TextInput
            style={[
              styles.winInput,
              { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
            ]}
            placeholder="例：早起きできた、ありがとうと言えた"
            placeholderTextColor={colors.mutedForeground}
            value={win}
            onChangeText={setWin}
            maxLength={60}
          />
        </View>

        {/* Behavior Tags */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>今日したこと</Text>
          <View style={styles.tagsWrap}>
            {BEHAVIOR_TAGS.map((tag) => {
              const sel = behaviors.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleBehavior(tag)}
                  activeOpacity={0.8}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: sel ? colors.primary + '22' : colors.muted,
                      borderColor: sel ? colors.primary : 'transparent',
                      borderWidth: sel ? 1.5 : 0,
                    },
                  ]}
                >
                  {sel && <Ionicons name="checkmark" size={12} color={colors.primary} />}
                  <Text style={[styles.tagText, { color: sel ? colors.primary : colors.foreground }]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>メモ（任意）</Text>
          <TextInput
            style={[
              styles.notesInput,
              { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
            ]}
            placeholder="今日の気づき、感情、出来事など..."
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* キャラのひとこと */}
        <View style={styles.mascotRow}>
          <View style={[styles.speechBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.speechText, { color: colors.foreground }]}>
              {saved
                ? 'ばっちりだね!ぼくも成長したよ〜'
                : Object.keys(activities).length > 0
                ? 'いっぱいがんばったね!'
                : '今日はどんな一日だった?'}
            </Text>
            <View style={[styles.speechTail, { backgroundColor: colors.card, borderColor: colors.border }]} />
          </View>
          <BoneCharacter charKey="odango" size={64} animate hop={false} mood={saved ? 'happy' : 'normal'} />
        </View>

        {/* Save button */}
        <Animated.View style={saveStyle}>
          <TouchableOpacity
            onPress={handleSavePress}
            disabled={isSaving}
            activeOpacity={0.9}
            style={styles.saveBtnWrap}
          >
            <LinearGradient
              colors={
                saved
                  ? ([colors.primary, '#64FFDA'] as const)
                  : isSaving
                  ? ([colors.muted, colors.muted] as const)
                  : ([colors.primary, colors.secondary + 'CC'] as const)
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              <Ionicons
                name={saved ? 'checkmark-circle' : 'save-outline'}
                size={20}
                color={isSaving ? colors.mutedForeground : '#FFF'}
              />
              <Text style={[styles.saveBtnText, { color: isSaving ? colors.mutedForeground : '#FFF' }]}>
                {saved ? '保存しました！' : isSaving ? '保存中...' : '記録を保存する'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  dateLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, marginBottom: 2 },
  editBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, alignSelf: 'flex-start',
  },
  editBadgeText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  card: {
    borderRadius: 22, padding: 20, borderWidth: 1, gap: 14, overflow: 'hidden',
  },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, gap: 6, minWidth: 56 },
  moodLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  moodResult: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12 },
  moodResultDot: { width: 8, height: 8, borderRadius: 4 },
  moodResultText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  sleepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  sleepBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  sleepDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  sleepValue: { fontSize: 44, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  sleepUnit: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  sleepTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  sleepFill: { height: '100%', borderRadius: 3 },
  sleepHint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22 },
  tagText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  scaleRow: { gap: 8 },
  scaleLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scaleTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  scaleOptions: { flexDirection: 'row', gap: 8 },
  scaleBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12,
  },
  scaleBtnText: { fontSize: 12.5, fontFamily: 'Inter_500Medium' },
  winInput: {
    padding: 14, borderRadius: 14, fontSize: 14, fontFamily: 'Inter_400Regular', borderWidth: 1,
  },
  notesInput: { padding: 14, borderRadius: 14, fontSize: 14, fontFamily: 'Inter_400Regular', borderWidth: 1, minHeight: 100, lineHeight: 21 },
  saveBtnWrap: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  activityHint: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: -8 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  activityCell: {
    width: '30.5%', flexGrow: 1, aspectRatio: 1.15, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  activityLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  activityBadge: {
    position: 'absolute', top: 6, right: 6, borderRadius: 9,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  activityBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#1A1033' },
  mascotRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 10, paddingRight: 4 },
  speechBubble: {
    flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11,
  },
  speechText: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 19 },
  speechTail: {
    position: 'absolute', right: -5, bottom: 14, width: 10, height: 10,
    transform: [{ rotate: '45deg' }], borderWidth: 1, borderLeftWidth: 0, borderBottomWidth: 0,
  },
});
