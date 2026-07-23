import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { DailyRecord } from '@/contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const MOOD_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#FF6B35',
  3: '#FFB800',
  4: '#00C4A7',
  5: '#7C4DCC',
};

const MOOD_LABELS: Record<number, string> = {
  1: '最悪 😢',
  2: '辛い 😞',
  3: '普通 😐',
  4: '良い 😊',
  5: '最高 🌟',
};

const MOOD_EMOJI: Record<number, string> = {
  1: '😢', 2: '😞', 3: '😐', 4: '😊', 5: '🌟',
};

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayYMD() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface Props {
  records: DailyRecord[];
}

export function MoodCalendar({ records }: Props) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selected, setSelected] = useState<DailyRecord | null>(null);

  // Build record map
  const recordMap = new Map<string, DailyRecord>();
  records.forEach((r) => recordMap.set(r.date, r));

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayYMD();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Stat for this month
  const monthRecords = records.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const avgMood = monthRecords.length > 0
    ? (monthRecords.reduce((s, r) => s + r.mood, 0) / monthRecords.length)
    : null;
  const bestStreak = (() => {
    let max = 0, cur = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const k = toYMD(year, month, d);
      if (recordMap.has(k)) { cur++; max = Math.max(max, cur); } else cur = 0;
    }
    return max;
  })();

  const cardBg = isDark ? ['#1A1430', '#0F1030'] as const : ['#FFF', '#F7F0FF'] as const;

  return (
    <>
      <View style={[styles.card, { borderColor: colors.border, overflow: 'hidden' }]}>
        <LinearGradient colors={cardBg} style={[StyleSheet.absoluteFill, { borderRadius: 22 }]} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.foreground }]}>
            {year}年{month + 1}月
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={8}>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Month stats */}
        {monthRecords.length > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statChipVal, { color: colors.foreground }]}>{monthRecords.length}日</Text>
              <Text style={[styles.statChipLbl, { color: colors.mutedForeground }]}>記録</Text>
            </View>
            {avgMood !== null && (
              <View style={[styles.statChip, { backgroundColor: MOOD_COLORS[Math.round(avgMood)] + '22' }]}>
                <Text style={[styles.statChipVal, { color: MOOD_COLORS[Math.round(avgMood)] }]}>
                  {MOOD_EMOJI[Math.round(avgMood)]} {avgMood.toFixed(1)}
                </Text>
                <Text style={[styles.statChipLbl, { color: colors.mutedForeground }]}>平均気分</Text>
              </View>
            )}
            <View style={[styles.statChip, { backgroundColor: '#FF6FA322' }]}>
              <Text style={[styles.statChipVal, { color: '#FF6FA3' }]}>{bestStreak}日</Text>
              <Text style={[styles.statChipLbl, { color: colors.mutedForeground }]}>最長継続</Text>
            </View>
          </View>
        )}

        {/* Weekday labels */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text
              key={w}
              style={[
                styles.weekday,
                { color: i === 0 ? '#EF4444' : i === 6 ? '#7C4DCC' : colors.mutedForeground },
              ]}
            >
              {w}
            </Text>
          ))}
        </View>

        {/* Grid */}
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={styles.weekRow}>
            {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
              if (!day) return <View key={col} style={styles.cell} />;
              const dateStr = toYMD(year, month, day);
              const rec = recordMap.get(dateStr);
              const isToday = dateStr === todayStr;
              const moodColor = rec ? MOOD_COLORS[rec.mood] : null;

              return (
                <TouchableOpacity
                  key={col}
                  style={styles.cell}
                  onPress={() => rec && setSelected(rec)}
                  activeOpacity={rec ? 0.7 : 1}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      moodColor
                        ? { backgroundColor: moodColor + '22', borderColor: moodColor + '80', borderWidth: 1.5 }
                        : { backgroundColor: colors.muted },
                      isToday && styles.todayBorder,
                    ]}
                  >
                    {rec ? (
                      <Text style={styles.moodEmoji}>{MOOD_EMOJI[rec.mood]}</Text>
                    ) : (
                      <Text
                        style={[
                          styles.dayNum,
                          {
                            color: isToday
                              ? colors.primary
                              : col === 0
                              ? '#EF4444'
                              : col === 6
                              ? '#7C4DCC'
                              : colors.mutedForeground,
                            fontWeight: isToday ? '700' : '400',
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    )}
                  </View>
                  {rec && (
                    <Text
                      style={[styles.dayNumSmall, { color: moodColor! }]}
                    >
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          {[1, 2, 3, 4, 5].map((m) => (
            <View key={m} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MOOD_COLORS[m] }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{MOOD_LABELS[m].split(' ')[0]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Day detail modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        >
          {selected && (
            <TouchableOpacity activeOpacity={1} style={[styles.detailCard, { backgroundColor: colors.background }]}>
              <LinearGradient
                colors={[MOOD_COLORS[selected.mood] + '18', colors.background]}
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
              />
              {/* Date & close */}
              <View style={styles.detailHeader}>
                <Text style={[styles.detailDate, { color: colors.mutedForeground }]}>
                  {selected.date}
                </Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close-circle" size={26} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Mood */}
              <View style={[styles.detailMoodRow, { backgroundColor: MOOD_COLORS[selected.mood] + '18' }]}>
                <Text style={styles.detailEmoji}>{MOOD_EMOJI[selected.mood]}</Text>
                <View>
                  <Text style={[styles.detailMoodLabel, { color: MOOD_COLORS[selected.mood] }]}>
                    {MOOD_LABELS[selected.mood]}
                  </Text>
                  <Text style={[styles.detailSub, { color: colors.mutedForeground }]}>気分スコア {selected.mood}/5</Text>
                </View>
              </View>

              {/* Sleep */}
              <View style={styles.detailRow}>
                <Ionicons name="moon-outline" size={18} color={colors.primary} />
                <Text style={[styles.detailRowText, { color: colors.foreground }]}>睡眠 {selected.sleep}時間</Text>
              </View>

              {/* Behaviors */}
              {selected.behaviors.length > 0 && (
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#00C4A7" />
                  <View style={styles.tagWrap}>
                    {selected.behaviors.map((b) => (
                      <View key={b} style={[styles.tag, { backgroundColor: '#00C4A722' }]}>
                        <Text style={[styles.tagText, { color: '#00C4A7' }]}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Notes */}
              {!!selected.notes && (
                <View style={[styles.notesBox, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.notesText, { color: colors.foreground }]}>{selected.notes}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statChipVal: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  statChipLbl: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekday: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  cell: {
    width: CELL_SIZE,
    alignItems: 'center',
    marginBottom: 6,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBorder: {
    borderWidth: 2.5,
    borderColor: '#7C4DCC',
  },
  dayNum: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  dayNumSmall: { fontSize: 9, fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  moodEmoji: { fontSize: 18 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: '#00000050',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailCard: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailDate: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  detailMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  detailEmoji: { fontSize: 36 },
  detailMoodLabel: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  detailSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  detailRowText: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  notesBox: { borderRadius: 12, padding: 12, marginTop: 4 },
  notesText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
