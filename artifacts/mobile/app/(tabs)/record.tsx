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
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';

const MOOD_OPTIONS = [
  { value: 1, label: '最悪', icon: 'sad-outline' as const, color: '#EF4444' },
  { value: 2, label: '辛い', icon: 'sad-outline' as const, color: '#FF6B35' },
  { value: 3, label: '普通', icon: 'happy-outline' as const, color: '#FFB800' },
  { value: 4, label: '良い', icon: 'happy-outline' as const, color: '#00B894' },
  { value: 5, label: '最高', icon: 'happy-outline' as const, color: '#00D4AA' },
];

const BEHAVIOR_TAGS = [
  '運動した',
  '読書した',
  '瞑想した',
  '日記を書いた',
  '友人と会った',
  '新しいことに挑戦',
  'ゆっくり休んだ',
  '自然を感じた',
  '好きな音楽を聴いた',
  '料理をした',
];

export default function RecordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveRecord, getTodayRecord } = useApp();

  const todayRecord = getTodayRecord();
  const [mood, setMood] = useState<number>(todayRecord?.mood ?? 3);
  const [sleep, setSleep] = useState<number>(todayRecord?.sleep ?? 7);
  const [behaviors, setBehaviors] = useState<string[]>(todayRecord?.behaviors ?? []);
  const [notes, setNotes] = useState<string>(todayRecord?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (todayRecord) {
      setMood(todayRecord.mood);
      setSleep(todayRecord.sleep);
      setBehaviors(todayRecord.behaviors);
      setNotes(todayRecord.notes);
    }
  }, [todayRecord?.id]);

  const toggleBehavior = (tag: string) => {
    setBehaviors((prev) =>
      prev.includes(tag) ? prev.filter((b) => b !== tag) : [...prev, tag]
    );
  };

  const adjustSleep = (delta: number) => {
    setSleep((prev) => Math.max(0, Math.min(12, Math.round((prev + delta) * 2) / 2)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveRecord(mood, sleep, behaviors, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const selectedMood = MOOD_OPTIONS.find((m) => m.value === mood);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
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
          <Ionicons name="pencil-outline" size={13} color={colors.primary} />
          <Text style={[styles.editBadgeText, { color: colors.primary }]}>
            本日の記録を編集中
          </Text>
        </View>
      )}

      {/* Mood Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>今日の気分</Text>
        <View style={styles.moodRow}>
          {MOOD_OPTIONS.map((option) => {
            const isSelected = mood === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setMood(option.value)}
                activeOpacity={0.8}
                style={[
                  styles.moodBtn,
                  {
                    backgroundColor: isSelected ? option.color + '22' : colors.muted,
                    borderColor: isSelected ? option.color : 'transparent',
                    borderWidth: isSelected ? 2 : 0,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={28}
                  color={isSelected ? option.color : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    { color: isSelected ? option.color : colors.mutedForeground },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedMood && (
          <View style={[styles.moodResult, { backgroundColor: selectedMood.color + '11' }]}>
            <View style={[styles.moodResultDot, { backgroundColor: selectedMood.color }]} />
            <Text style={[styles.moodResultText, { color: selectedMood.color }]}>
              今日の気分は「{selectedMood.label}」
            </Text>
          </View>
        )}
      </View>

      {/* Sleep Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>睡眠時間</Text>
        <View style={styles.sleepRow}>
          <TouchableOpacity
            style={[styles.sleepBtn, { backgroundColor: colors.muted }]}
            onPress={() => adjustSleep(-0.5)}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={22} color={colors.foreground} />
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
            <Ionicons name="add" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={[styles.sleepBarTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.sleepBarFill,
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

      {/* Behavior Tags */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>今日したこと</Text>
        <View style={styles.tagsWrap}>
          {BEHAVIOR_TAGS.map((tag) => {
            const isSelected = behaviors.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleBehavior(tag)}
                activeOpacity={0.8}
                style={[
                  styles.tag,
                  {
                    backgroundColor: isSelected ? colors.primary + '22' : colors.muted,
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderWidth: isSelected ? 1.5 : 0,
                  },
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={13} color={colors.primary} />
                )}
                <Text
                  style={[
                    styles.tagText,
                    { color: isSelected ? colors.primary : colors.foreground },
                  ]}
                >
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

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveBtn,
          { backgroundColor: saved ? colors.primary : isSaving ? colors.muted : colors.primary },
        ]}
        onPress={handleSave}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        <Ionicons
          name={saved ? 'checkmark-circle' : 'save-outline'}
          size={20}
          color={saved ? colors.primaryForeground : isSaving ? colors.mutedForeground : colors.primaryForeground}
        />
        <Text style={[styles.saveBtnText, { color: isSaving ? colors.mutedForeground : colors.primaryForeground }]}>
          {saved ? '保存しました' : isSaving ? '保存中...' : '記録を保存する'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    marginBottom: 4,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  editBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  moodLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  moodResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  moodResultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodResultText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  sleepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  sleepValue: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  sleepUnit: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  sleepBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sleepBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sleepHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  notesInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    minHeight: 100,
    lineHeight: 21,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 16,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
