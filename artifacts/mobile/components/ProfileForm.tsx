import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { UserProfile } from '@/contexts/AppContext';

const AGE_RANGES = ['10代', '20代', '30代', '40代', '50代', '60代', '70代以上', '回答しない'];
const GENDERS = ['男性', '女性', 'その他', '回答しない'];
const GOALS = [
  '自己肯定感を高めたい',
  'ストレスを減らしたい',
  '睡眠を改善したい',
  '不安を減らしたい',
  '良い習慣を作りたい',
];
const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];
const BLOOD_TYPES = ['A', 'B', 'O', 'AB'];
const CONCERNS = ['仕事', '恋愛', '人間関係', '健康', 'お金', '家族', '将来'];

interface Props {
  initial?: UserProfile | null;
  submitLabel: string;
  onSubmit: (profile: UserProfile) => void;
  submitting?: boolean;
}

export function ProfileForm({ initial, submitLabel, onSubmit, submitting }: Props) {
  const colors = useColors();

  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [ageRange, setAgeRange] = useState(initial?.ageRange ?? '');
  const [gender, setGender] = useState(initial?.gender ?? '');
  const [goal, setGoal] = useState(initial?.goal ?? '');
  const [mbti, setMbti] = useState(initial?.mbti ?? '');
  const [bloodType, setBloodType] = useState(initial?.bloodType ?? '');
  const [occupation, setOccupation] = useState(initial?.occupation ?? '');
  const [concerns, setConcerns] = useState<string[]>(initial?.concerns ?? []);

  const canSubmit = nickname.trim().length > 0 && ageRange !== '' && gender !== '' && !submitting;

  const toggleConcern = (c: string) => {
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      nickname: nickname.trim().slice(0, 20),
      ageRange,
      gender,
      goal: goal || undefined,
      mbti: mbti || undefined,
      bloodType: bloodType || undefined,
      occupation: occupation.trim().slice(0, 30) || undefined,
      concerns: concerns.length > 0 ? concerns : undefined,
    });
  };

  const Chip = ({
    label,
    selected,
    onPress,
  }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.muted,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? '#fff' : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ gap: 16 }}>
      {/* 必須 */}
      <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: 22, backgroundColor: colors.card }]} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>基本情報</Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>ニックネーム *</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
          placeholder="例: ゆき"
          placeholderTextColor={colors.mutedForeground + '99'}
          style={[styles.input, { backgroundColor: '#241C42', color: colors.foreground, borderColor: '#6B58A8' }]}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>年代 *</Text>
        <View style={styles.chipRow}>
          {AGE_RANGES.map((a) => (
            <Chip key={a} label={a} selected={ageRange === a} onPress={() => setAgeRange(a)} />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>性別 *</Text>
        <View style={styles.chipRow}>
          {GENDERS.map((g) => (
            <Chip key={g} label={g} selected={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>
      </View>

      {/* 目標 */}
      <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: 22, backgroundColor: colors.card }]} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🎯 今の目標（任意）</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          AIからのアドバイスがあなたの目標に合わせたものになります
        </Text>
        <View style={styles.chipRow}>
          {GOALS.map((g) => (
            <Chip key={g} label={g} selected={goal === g} onPress={() => setGoal(goal === g ? '' : g)} />
          ))}
        </View>
      </View>

      {/* 任意 */}
      <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: 22, backgroundColor: colors.card }]} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>もっと教えて（任意・スキップOK）</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          参考情報として使います。実際のあなたの記録を優先して分析します
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>MBTI</Text>
        <View style={styles.chipRow}>
          {MBTI_TYPES.map((m) => (
            <Chip key={m} label={m} selected={mbti === m} onPress={() => setMbti(mbti === m ? '' : m)} />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>血液型</Text>
        <View style={styles.chipRow}>
          {BLOOD_TYPES.map((b) => (
            <Chip key={b} label={`${b}型`} selected={bloodType === b} onPress={() => setBloodType(bloodType === b ? '' : b)} />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>職業</Text>
        <TextInput
          value={occupation}
          onChangeText={setOccupation}
          maxLength={30}
          placeholder="例: 会社員、学生、フリーランス"
          placeholderTextColor={colors.mutedForeground + '99'}
          style={[styles.input, { backgroundColor: '#241C42', color: colors.foreground, borderColor: '#6B58A8' }]}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>いま気になっていること</Text>
        <View style={styles.chipRow}>
          {CONCERNS.map((c) => (
            <Chip key={c} label={c} selected={concerns.includes(c)} onPress={() => toggleConcern(c)} />
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.85}
        style={[
          styles.submitBtn,
          { backgroundColor: canSubmit ? colors.primary : colors.muted },
        ]}
      >
        <Text style={[styles.submitText, { color: canSubmit ? '#fff' : colors.mutedForeground }]}>
          {submitting ? '保存中…' : submitLabel}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
        あとからプロフィールでいつでも変更できます
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 20, borderWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 6 },
  input: {
    borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Inter_400Regular', minHeight: 48, width: '100%',
    zIndex: 1, // web: keep the input above the card's absolute-fill gradient
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  submitBtn: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  footerNote: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 8 },
});
