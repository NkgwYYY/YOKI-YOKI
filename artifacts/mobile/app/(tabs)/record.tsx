import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, typography } from '@/constants/theme';
import { Button, ButtonRow } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { QuickAffirmationRecord } from '@/components/record/QuickAffirmationRecord';
import { MoodRecordSheet } from '@/components/record/MoodRecordSheet';
import { ChecklistSheet } from '@/components/record/ChecklistSheet';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';

export default function RecordScreen() {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F4EF' }}>
      <Screen scroll={true} contentStyle={{ backgroundColor: '#F8F4EF' }}>
        <Button label="部屋へ戻る" icon="chevron-left" variant="ghost" size="sm"
          onPress={() => router.navigate('/(tabs)')} style={{ alignSelf: 'flex-start' }} />
        <View style={styles.header}>
          <Text style={styles.title}>今日のあなたへ</Text>
          <Text style={styles.date}>{formatDateJP(getTodayDate())}</Text>
        </View>
        <QuickAffirmationRecord onComplete={() => router.replace('/(tabs)')} />
        <ButtonRow>
          <Button
            label="くわしく残す"
            variant="secondary"
            size="sm"
            onPress={() => setShowDetails(true)}
            style={styles.grow}
            icon="edit-3"
          />
          <Button
            label="チェックを見る"
            variant="secondary"
            size="sm"
            onPress={() => setShowChecklist(true)}
            style={styles.grow}
            icon="check-square"
          />
        </ButtonRow>
      </Screen>

      <MoodRecordSheet visible={showDetails} onClose={() => setShowDetails(false)} />
      <ChecklistSheet visible={showChecklist} onClose={() => setShowChecklist(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: space.md },
  title: { ...typography.heading, color: colors.foreground, textAlign: 'center' },
  date: { ...typography.callout, color: colors.primary, marginTop: space.xs, textAlign: 'center' },
  grow: { flex: 1 },
});
