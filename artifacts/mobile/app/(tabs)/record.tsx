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
    <>
      <Screen>
        <View>
          <Text style={styles.title}>今日のあなたへ</Text>
          <Text style={styles.date}>{formatDateJP(getTodayDate())}</Text>
        </View>
        <QuickAffirmationRecord onComplete={() => router.replace('/(tabs)')} />
        <ButtonRow>
          <Button
            label="くわしく残す"
            variant="outline"
            size="sm"
            onPress={() => setShowDetails(true)}
            style={styles.grow}
            icon="edit-3"
          />
          <Button
            label="チェックを見る"
            variant="outline"
            size="sm"
            onPress={() => setShowChecklist(true)}
            style={styles.grow}
            icon="check-square"
          />
        </ButtonRow>
      </Screen>

      <MoodRecordSheet visible={showDetails} onClose={() => setShowDetails(false)} />
      <ChecklistSheet visible={showChecklist} onClose={() => setShowChecklist(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.display, color: colors.foreground },
  date: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  grow: { flex: 1 },
});
