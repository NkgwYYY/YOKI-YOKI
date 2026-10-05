import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal,
  ScrollView,
} from 'react-native';
import {
  border,
  colors,
  moodPalette,
  radius,
  space,
  typography,
} from '@/constants/theme';
import { CenterDialog } from '@/components/ui/BottomSheet';
import { DailyRecord } from '@/contexts/AppContext';
import { MascotFace, MoodLevel } from '@/components/MascotFace';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const MOOD_COLORS = moodPalette;

const MOOD_LABELS: Record<number, string> = {
  1: '最悪',
  2: '辛い',
  3: '普通',
  4: '良い',
  5: '最高',
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

  return (
    <>
      <View style={styles.card}>
        {/* 月の移動 */}
        <View style={styles.header}>
          <PressScale
            onPress={prevMonth}
            style={styles.navBtn}
            hitSlop={space.sm}
            accessibilityLabel="前の月"
          >
            <Icon name="chevron-left" size={20} color={colors.primary} />
          </PressScale>
          <Text style={styles.monthLabel}>
            {year}年{month + 1}月
          </Text>
          <PressScale
            onPress={nextMonth}
            style={styles.navBtn}
            hitSlop={space.sm}
            accessibilityLabel="次の月"
          >
            <Icon name="chevron-right" size={20} color={colors.primary} />
          </PressScale>
        </View>

        {/* Month stats */}
        {monthRecords.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipVal}>{monthRecords.length}日</Text>
              <Text style={styles.statChipLbl}>記録</Text>
            </View>
            {avgMood !== null && (
              <View style={styles.statChip}>
                <View style={styles.statChipInline}>
                  <MascotFace mood={Math.round(avgMood) as MoodLevel} size={20} />
                  <Text
                    style={[styles.statChipVal, { color: MOOD_COLORS[Math.round(avgMood)] }]}
                  >
                    {avgMood.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.statChipLbl}>平均気分</Text>
              </View>
            )}
            <View style={styles.statChip}>
              <Text style={styles.statChipVal}>{bestStreak}日</Text>
              <Text style={styles.statChipLbl}>最長継続</Text>
            </View>
          </View>
        )}

        {/* Weekday labels */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text
              key={w}
              style={[styles.weekday, (i === 0 || i === 6) && styles.weekdayEnd]}
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
                <PressScale
                  key={col}
                  style={styles.cell}
                  onPress={() => rec && setSelected(rec)}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      moodColor ? { borderColor: moodColor } : null,
                      isToday && styles.dayCircleToday,
                    ]}
                  >
                    {rec ? (
                      <MascotFace mood={rec.mood as MoodLevel} size={28} />
                    ) : (
                      <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{day}</Text>
                    )}
                  </View>
                  {rec && moodColor && (
                    <Text style={[styles.dayNumSmall, { color: moodColor }]}>{day}</Text>
                  )}
                </PressScale>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          {([1, 2, 3, 4, 5] as MoodLevel[]).map((m) => (
            <View key={m} style={styles.legendItem}>
              <MascotFace mood={m} size={20} />
              <Text style={styles.legendText}>{MOOD_LABELS[m].split(' ')[0]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 選んだ日の詳細 */}
      <CenterDialog visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <View style={styles.detailHeader}>
              <Text style={styles.detailDate}>{selected.date}</Text>
              <PressScale
                onPress={() => setSelected(null)}
                hitSlop={space.sm}
                accessibilityLabel="閉じる"
              >
                <Icon name="x" size={20} color={colors.subtleForeground} />
              </PressScale>
            </View>

            <View style={styles.detailMoodRow}>
              <MascotFace mood={selected.mood as MoodLevel} size={48} />
              <View style={styles.detailMoodCopy}>
                <Text style={[styles.detailMoodLabel, { color: MOOD_COLORS[selected.mood] }]}>
                  {MOOD_LABELS[selected.mood]}
                </Text>
                <Text style={styles.detailSub}>気分スコア {selected.mood}/5</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="moon" size={16} color={colors.subtleForeground} />
              <Text style={styles.detailRowText}>睡眠 {selected.sleepRecorded === false ? '未入力' : `${selected.sleep}時間`}</Text>
            </View>

            {selected.behaviors.length > 0 && (
              <View style={styles.detailRow}>
                <Icon name="check-circle" size={16} color={colors.subtleForeground} />
                <View style={styles.tagWrap}>
                  {selected.behaviors.map((b) => (
                    <View key={b} style={styles.tag}>
                      <Text style={styles.tagText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!selected.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{selected.notes}</Text>
              </View>
            )}
          </>
        )}
      </CenterDialog>
    </>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.lg,
  },

  /* 月の移動 */
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: space.xs },
  monthLabel: { ...typography.heading, color: colors.foreground },

  /* 月の統計 */
  statsRow: { flexDirection: 'row', gap: space.sm },
  statChip: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: 'center',
    backgroundColor: colors.muted,
  },
  statChipInline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  statChipVal: { ...typography.calloutStrong, color: colors.foreground },
  statChipLbl: { ...typography.micro, color: colors.mutedForeground },

  /* グリッド */
  weekRow: { flexDirection: 'row', justifyContent: 'space-around' },
  weekday: {
    ...typography.micro,
    width: CELL_SIZE,
    textAlign: 'center',
    color: colors.mutedForeground,
    marginBottom: space.xs,
  },
  // 土日は色を変えず、少し薄くするだけにする。
  weekdayEnd: { color: colors.subtleForeground },
  cell: { width: CELL_SIZE, alignItems: 'center', marginBottom: space.xs },
  // 記録がある日はボーダーの色だけで気分を示す。塗りは常に同じ。
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted,
    ...border.hairline,
  },
  dayCircleToday: { borderColor: colors.primary },
  dayNum: { ...typography.caption, color: colors.mutedForeground },
  dayNumToday: { color: colors.primary, fontFamily: 'Inter_700Bold' },
  dayNumSmall: { ...typography.micro, marginTop: 1 },

  /* 凡例 */
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: space.md,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legendText: { ...typography.micro, color: colors.mutedForeground },

  /* 日別の詳細 */
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailDate: { ...typography.label, color: colors.mutedForeground },
  detailMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    padding: space.lg,
  },
  detailMoodCopy: { flex: 1 },
  detailMoodLabel: { ...typography.heading },
  detailSub: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  detailRowText: { ...typography.callout, color: colors.foreground },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, flex: 1 },
  tag: {
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  tagText: { ...typography.micro, color: colors.primaryOnSoft },
  notesBox: { borderRadius: radius.md, backgroundColor: colors.muted, padding: space.md },
  notesText: { ...typography.callout, color: colors.foreground },
});
