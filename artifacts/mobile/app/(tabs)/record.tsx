import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { QuickAffirmationRecord } from '@/components/record/QuickAffirmationRecord';
import { MoodRecordSheet } from '@/components/record/MoodRecordSheet';
import { ChecklistSheet } from '@/components/record/ChecklistSheet';
import { SkyBackground } from '@/components/SkyBackground';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';

export default function RecordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const topInset = Platform.OS === 'web' ? 79 : insets.top + 12;
  const bottomInset = Platform.OS === 'web' ? 92 : insets.bottom + 58;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <SkyBackground />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>今日のあなたへ</Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDateJP(getTodayDate())}</Text>
        </View>
        <QuickAffirmationRecord onComplete={() => router.replace('/(tabs)')} />
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            onPress={() => setShowDetails(true)}
            style={[styles.secondaryButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Ionicons name="create-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>くわしく残す</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowChecklist(true)}
            style={[styles.secondaryButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>チェックを見る</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MoodRecordSheet visible={showDetails} onClose={() => setShowDetails(false)} />
      <ChecklistSheet visible={showChecklist} onClose={() => setShowChecklist(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 25, fontFamily: 'Inter_700Bold', letterSpacing: -0.7 },
  date: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },
  secondaryActions: { flexDirection: 'row', gap: 9, justifyContent: 'center' },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});