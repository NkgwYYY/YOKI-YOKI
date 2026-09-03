import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { UserProfile } from '@/contexts/AppContext';
import { PressScale } from '@/components/ui/PressScale';

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
    <PressScale
      onPress={onPress}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </PressScale>
  );

  return (
    <View style={styles.root}>
      {/* 必須 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>基本情報</Text>

        <Text style={styles.label}>ニックネーム *</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
          placeholder="例: ゆき"
          placeholderTextColor={colors.subtleForeground}
          style={styles.input}
        />

        <Text style={styles.label}>年代 *</Text>
        <View style={styles.chipRow}>
          {AGE_RANGES.map((a) => (
            <Chip key={a} label={a} selected={ageRange === a} onPress={() => setAgeRange(a)} />
          ))}
        </View>

        <Text style={styles.label}>性別 *</Text>
        <View style={styles.chipRow}>
          {GENDERS.map((g) => (
            <Chip key={g} label={g} selected={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>
      </View>

      {/* 目標 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>今の目標（任意）</Text>
        <Text style={styles.hint}>
          AIからのアドバイスがあなたの目標に合わせたものになります
        </Text>
        <View style={styles.chipRow}>
          {GOALS.map((g) => (
            <Chip key={g} label={g} selected={goal === g} onPress={() => setGoal(goal === g ? '' : g)} />
          ))}
        </View>
      </View>

      {/* 任意 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>もっと教えて（任意・スキップOK）</Text>
        <Text style={styles.hint}>
          参考情報として使います。実際のあなたの記録を優先して分析します
        </Text>

        <Text style={styles.label}>MBTI</Text>
        <View style={styles.chipRow}>
          {MBTI_TYPES.map((m) => (
            <Chip key={m} label={m} selected={mbti === m} onPress={() => setMbti(mbti === m ? '' : m)} />
          ))}
        </View>

        <Text style={styles.label}>血液型</Text>
        <View style={styles.chipRow}>
          {BLOOD_TYPES.map((b) => (
            <Chip key={b} label={`${b}型`} selected={bloodType === b} onPress={() => setBloodType(bloodType === b ? '' : b)} />
          ))}
        </View>

        <Text style={styles.label}>職業</Text>
        <TextInput
          value={occupation}
          onChangeText={setOccupation}
          maxLength={30}
          placeholder="例: 会社員、学生、フリーランス"
          placeholderTextColor={colors.subtleForeground}
          style={styles.input}
        />

        <Text style={styles.label}>いま気になっていること</Text>
        <View style={styles.chipRow}>
          {CONCERNS.map((c) => (
            <Chip key={c} label={c} selected={concerns.includes(c)} onPress={() => toggleConcern(c)} />
          ))}
        </View>
      </View>

      <Button
        label={submitLabel}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={submitting}
      />

      <Text style={styles.footerNote}>あとからプロフィールでいつでも変更できます</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  card: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  sectionTitle: { ...typography.subhead, color: colors.foreground },
  hint: { ...typography.caption, color: colors.mutedForeground },
  label: { ...typography.label, color: colors.mutedForeground, marginTop: space.xs },
  input: {
    ...typography.body,
    minHeight: control.height,
    width: '100%',
    backgroundColor: colors.input,
    ...border.hairlineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    color: colors.foreground,
  },

  /* 選択チップ — 選択は淡い紫の面 + 1px の紫の枠 */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: control.heightSm,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    ...border.hairline,
  },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...typography.label, color: colors.foreground },
  chipTextSelected: { color: colors.primaryOnSoft },

  footerNote: { ...typography.caption, color: colors.mutedForeground, textAlign: 'center' },
});
