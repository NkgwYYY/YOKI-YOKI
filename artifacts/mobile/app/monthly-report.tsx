import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { toPng } from 'html-to-image';
import { StaticMascot } from '@/components/Mascot';
import type { MascotMood } from '@/utils/mascotUtils';
import { Icon, iconSize } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { buildMonthlyReport, MOOD_LABELS } from '@/utils/monthlyReport';
import { colors, radius, space, typography } from '@/constants/theme';

const REPORT_URL = 'yoki-yoki.replit.app';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const REPORT_MOODS: Record<number, MascotMood> = { 1: 'tired', 2: 'sleepy', 3: 'normal', 4: 'happy', 5: 'excited' };
const REPORT = {
  background: '#F8F4EF',
  card: '#FFFCF8',
  lavender: '#E8DEF8',
  lavenderStrong: '#D8C7F2',
  ink: '#422765',
  muted: '#765E8E',
  pink: '#F5C6DB',
  mint: '#DDF1EA',
} as const;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function moveMonth(key: string, amount: number) {
  const [year, month] = key.split('-').map(Number);
  return monthKey(new Date(year, month - 1 + amount, 1));
}

function Stat({ value, label, compact }: { value: string; label: string; compact?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, compact && styles.statValueCompact]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MonthlyReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { records } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [exporting, setExporting] = useState(false);
  const exportLock = useRef(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const cardRef = useRef<View>(null);
  const shotRef = useRef<any>(null);
  const report = useMemo(() => buildMonthlyReport(records, selectedMonth), [records, selectedMonth]);
  const firstWeekday = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)) - 1, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= report.daysInMonth ? day : null;
  });
  const isCurrentMonth = selectedMonth === monthKey(new Date());

  const exportReport = async () => {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    setExportError(null);
    try {
      if (Platform.OS === 'web') {
        const node = cardRef.current as unknown as HTMLElement | null;
        if (!node) throw new Error('レポートを準備できませんでした');
        const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true, backgroundColor: REPORT.background });
        const anchor = document.createElement('a');
        anchor.download = `yoki-yoki-monthly-report-${selectedMonth}.png`;
        anchor.href = dataUrl;
        anchor.click();
      } else {
        const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'tmpfile' });
        if (!(await Sharing.isAvailableAsync())) throw new Error('この端末では共有を利用できません');
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: '月次レポートを共有' });
      }
    } catch (error) {
      setExportError('画像を作れませんでした。もう一度お試しください。');
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
  };

  const card = (
    <View ref={Platform.OS === 'web' ? cardRef : undefined} collapsable={false} style={styles.reportCard} testID="monthly-report-card">
      <View style={styles.sparkleOne} />
      <View style={styles.sparkleTwo} />
      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.eyebrow}>YOKI YOKI</Text>
          <Text style={styles.reportTitle}>ひと月の思い出</Text>
        </View>
        <View style={styles.monthBadge}><Text style={styles.monthBadgeText}>{report.monthLabel}</Text></View>
      </View>

      <View style={styles.reviewBox}>
        <View style={styles.reviewIcon}><Icon name="heart" size={iconSize.sm} color={REPORT.ink} /></View>
        <Text style={styles.reviewText}>{report.review}</Text>
      </View>

      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>気持ちのカレンダー</Text>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((day, index) => {
            const record = day ? report.recordsByDay[day] : undefined;
            return (
              <View key={index} accessible={!!day}
                accessibilityLabel={day ? `${report.monthLabel}${day}日、${record ? MOOD_LABELS[record.mood] : '記録なし'}` : undefined}
                style={[styles.dayCell, record && styles.dayCellRecorded, !day && styles.dayCellEmpty]}>
                {day ? <>
                  <Text style={styles.dayNumber}>{day}</Text>
                  {record ? <StaticMascot stage="egg" mood={REPORT_MOODS[record.mood] ?? 'normal'} size={25} /> : <View style={styles.emptyDot} />}
                </> : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat value={`${report.recordedDays}日`} label="記録した日" />
        <View style={styles.statDivider} />
        <Stat value={report.mostMoodLabel} label="よく残した気持ち" compact />
        <View style={styles.statDivider} />
        <Stat value={`${report.longestStreak}日`} label="続けて残した日" />
      </View>

      <View style={styles.reportFooter}>
        <View style={styles.logoMark}><Text style={styles.logoMarkText}>Y</Text></View>
        <View style={styles.footerCopy}>
          <Text style={styles.footerMessage}>今月もお疲れさまでした</Text>
          <Text style={styles.footerUrl}>{REPORT_URL}</Text>
        </View>
        <Icon name="star" size={iconSize.lg} color={REPORT.muted} />
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'web' ? space.lg : insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="戻る" style={styles.iconButton} onPress={() => router.back()}>
          <Icon name="chevron-left" size={iconSize.lg} color={colors.foreground} />
        </Pressable>
        <Text style={styles.toolbarTitle}>月次レポート</Text>
        <View style={styles.iconButton} />
      </View>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + space.xxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.monthPicker}>
          <Pressable accessibilityRole="button" accessibilityLabel="前の月" disabled={exporting} style={styles.monthArrow} onPress={() => setSelectedMonth(moveMonth(selectedMonth, -1))}>
            <Icon name="chevron-left" size={iconSize.md} color={REPORT.ink} />
          </Pressable>
          <Text testID="report-selected-month" accessibilityLiveRegion="polite" style={styles.monthPickerText}>{report.monthLabel}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="次の月" disabled={isCurrentMonth || exporting} style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]} onPress={() => setSelectedMonth(moveMonth(selectedMonth, 1))}>
            <Icon name="chevron-right" size={iconSize.md} color={isCurrentMonth ? colors.disabledForeground : REPORT.ink} />
          </Pressable>
        </View>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.shot}>
          {card}
        </ViewShot>
        {exportError && <Text accessibilityRole="alert" style={styles.exportError}>{exportError}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={Platform.OS === 'web' ? '画像を保存する' : '画像をシェアする'}
          disabled={exporting} accessibilityState={{ disabled: exporting, busy: exporting }}
          style={({ pressed }) => [styles.exportButton, pressed && styles.exportButtonPressed]} onPress={exportReport}>
          <Icon name={Platform.OS === 'web' ? 'download' : 'share-2'} size={iconSize.md} color="#FFFFFF" />
          <Text style={styles.exportText}>{exporting ? '画像を作成中…' : Platform.OS === 'web' ? '画像を保存する' : '画像をシェアする'}</Text>
        </Pressable>
        <Text style={styles.exportHint}>カード部分を高画質PNGで保存します</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: REPORT.background },
  toolbar: { minHeight: 52, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarTitle: { ...typography.subhead, color: colors.foreground },
  iconButton: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { alignItems: 'center', paddingHorizontal: space.md, gap: space.md },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  monthArrow: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: REPORT.card, alignItems: 'center', justifyContent: 'center' },
  monthArrowDisabled: { opacity: 0.45 },
  monthPickerText: { ...typography.subhead, minWidth: 120, textAlign: 'center', color: REPORT.ink },
  shot: { width: '100%', maxWidth: 390 },
  reportCard: { width: '100%', minHeight: 690, borderRadius: radius.md, padding: 16, backgroundColor: REPORT.card, borderWidth: 1, borderColor: REPORT.lavenderStrong, overflow: 'hidden' },
  sparkleOne: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: REPORT.pink, opacity: 0.25, top: -38, right: -24 },
  sparkleTwo: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: REPORT.mint, opacity: 0.4, bottom: 74, left: -32 },
  reportHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { ...typography.micro, color: REPORT.muted, letterSpacing: 2.2 },
  reportTitle: { fontFamily: 'Inter_700Bold', fontSize: 23, lineHeight: 29, color: REPORT.ink },
  monthBadge: { backgroundColor: REPORT.lavender, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  monthBadgeText: { ...typography.label, color: REPORT.ink },
  reviewBox: { minHeight: 80, backgroundColor: REPORT.lavender, borderRadius: radius.lg, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reviewIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: REPORT.card, alignItems: 'center', justifyContent: 'center' },
  reviewText: { ...typography.callout, color: REPORT.ink, flex: 1, lineHeight: 21 },
  calendarSection: { marginTop: 15 },
  sectionTitle: { ...typography.label, color: REPORT.ink, marginBottom: 7 },
  weekRow: { flexDirection: 'row' },
  weekday: { width: '14.285%', textAlign: 'center', ...typography.micro, color: REPORT.muted },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  dayCell: { width: '14.285%', height: 43, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 1 },
  dayCellRecorded: { backgroundColor: REPORT.background },
  dayCellEmpty: { opacity: 0 },
  dayNumber: { fontFamily: 'Inter_500Medium', fontSize: 9, lineHeight: 11, color: REPORT.muted },
  emptyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: REPORT.lavenderStrong },
  statsRow: { marginTop: 14, minHeight: 70, borderRadius: radius.lg, backgroundColor: REPORT.background, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 9 },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 25, color: REPORT.ink, textAlign: 'center' },
  statValueCompact: { fontSize: 13, lineHeight: 20 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, color: REPORT.muted, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: REPORT.lavenderStrong, marginVertical: 5 },
  reportFooter: { marginTop: 'auto', minHeight: 50, borderTopWidth: 1, borderTopColor: REPORT.lavenderStrong, flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  logoMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: REPORT.ink, alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { fontFamily: 'Inter_700Bold', fontSize: 17, color: '#FFFFFF' },
  footerCopy: { flex: 1, paddingHorizontal: 10 },
  footerMessage: { ...typography.label, color: REPORT.ink },
  footerUrl: { ...typography.micro, color: REPORT.muted },
  exportButton: { width: '100%', maxWidth: 390, height: 52, borderRadius: radius.lg, backgroundColor: REPORT.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  exportButtonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  exportText: { ...typography.bodyStrong, color: '#FFFFFF' },
  exportHint: { ...typography.caption, color: REPORT.muted, textAlign: 'center' },
  exportError: { ...typography.callout, color: colors.danger, maxWidth: 390 },
});
