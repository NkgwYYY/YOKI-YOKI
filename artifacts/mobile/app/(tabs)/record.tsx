import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp } from '@/contexts/AppContext';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';
import BoneCharacter from '@/components/BoneCharacter';
import { ChecklistSheet } from '@/components/record/ChecklistSheet';
import { MoodRecordSheet, MOOD_OPTIONS } from '@/components/record/MoodRecordSheet';

/** カード共通ラッパー */
function Card({
  children, onPress, style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
}) {
  const colors = useColors();
  const inner = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      {inner}
    </TouchableOpacity>
  );
}

function CardHeader({ icon, title, tappable }: { icon: string; title: string; tappable?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.cardHeader}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
      {tappable && (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      )}
    </View>
  );
}

export default function RecordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    getTodayRecord, getCompletedCount, getTotalCheckCount,
    progress, lightEnergy,
  } = useApp();

  const [showChecklist, setShowChecklist] = useState(false);
  const [showMoodSheet, setShowMoodSheet] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const todayRecord = getTodayRecord();
  const moodOption = todayRecord ? MOOD_OPTIONS.find(m => m.value === todayRecord.mood) : undefined;
  const completed = getCompletedCount();
  const total = getTotalCheckCount();
  const pct = total > 0 ? completed / total : 0;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleSaved = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 4000);
  };

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
      >
        <Text style={[styles.title, { color: colors.foreground }]}>今日の記録</Text>
        <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
          {formatDateJP(getTodayDate())}
        </Text>

        {/* 今日の気分 */}
        <Card onPress={() => setShowMoodSheet(true)}>
          <CardHeader icon="💭" title="今日の気分" tappable />
          {moodOption ? (
            <View style={styles.moodRow}>
              <View style={[styles.moodBadge, { backgroundColor: moodOption.color + '22' }]}>
                <Ionicons name={moodOption.icon} size={26} color={moodOption.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moodValue, { color: moodOption.color }]}>{moodOption.label}</Text>
                <Text style={[styles.moodSub, { color: colors.mutedForeground }]}>
                  睡眠 {todayRecord!.sleep}時間
                  {todayRecord!.win ? ` ・🏆 ${todayRecord!.win}` : ''}
                </Text>
              </View>
              <Text style={[styles.editHint, { color: colors.mutedForeground }]}>タップで編集</Text>
            </View>
          ) : (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                まだ記録していないよ
              </Text>
              <View style={[styles.ctaBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.ctaText}>記録する</Text>
              </View>
            </View>
          )}
        </Card>

        {/* 今日できたこと */}
        <Card onPress={() => setShowChecklist(true)}>
          <CardHeader icon="✅" title="今日できたこと" tappable />
          <View style={styles.checkRow}>
            <View style={styles.countBadge}>
              <Text style={[styles.countNum, { color: colors.primary }]}>{completed}</Text>
              <Text style={[styles.countSep, { color: colors.mutedForeground }]}>/{total}</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct * 100}%` }]} />
            </View>
          </View>
          <Text style={[styles.checkHint, { color: colors.mutedForeground }]}>
            {completed === total && total > 0
              ? '全て完了！すごい ✨'
              : 'タップしてチェックする'}
          </Text>
        </Card>

        {/* 記録状況 */}
        <Card>
          <CardHeader icon="📊" title="記録状況" />
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>🔥 {progress.streak}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>連続日数</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{progress.totalDays}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>記録した日</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {todayRecord ? '✅' : '−'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>今日の記録</Text>
            </View>
          </View>
        </Card>

        {/* キャラへの影響 */}
        <Card>
          <CardHeader icon="🌟" title="キャラへの影響" />
          <View style={styles.charRow}>
            <BoneCharacter charKey="odango" size={72} animate hop={false} mood={justSaved ? 'happy' : 'normal'} />
            <View style={{ flex: 1, gap: 10 }}>
              <View>
                <View style={styles.gaugeLabelRow}>
                  <Text style={[styles.gaugeLabel, { color: colors.mutedForeground }]}>💪 元気</Text>
                  <Text style={[styles.gaugeValue, { color: colors.foreground }]}>{lightEnergy.genki}</Text>
                </View>
                <View style={[styles.gaugeTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.gaugeFill, { backgroundColor: '#7FDCA4', width: `${lightEnergy.genki}%` }]} />
                </View>
              </View>
              <View>
                <View style={styles.gaugeLabelRow}>
                  <Text style={[styles.gaugeLabel, { color: colors.mutedForeground }]}>✨ 光の力</Text>
                  <Text style={[styles.gaugeValue, { color: colors.foreground }]}>{lightEnergy.lightPower}</Text>
                </View>
                <View style={[styles.gaugeTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.gaugeFill, { backgroundColor: '#FFD86B', width: `${lightEnergy.lightPower}%` }]} />
                </View>
              </View>
            </View>
          </View>
          <Text style={[styles.charHint, { color: justSaved ? colors.primary : colors.mutedForeground }]}>
            {justSaved
              ? 'ありがとう！光が増えたよ ✨'
              : '記録するとキャラが元気になって光が増えるよ'}
          </Text>
        </Card>

        {/* 今日の光エネルギー */}
        <Card>
          <CardHeader icon="⚡" title="今日の光エネルギー" />
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#FFD86B' }]}>{lightEnergy.todayEnergy}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>今日つくった光</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#8AB4FF' }]}>{lightEnergy.storedEnergy}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>蓄電中</Text>
            </View>
          </View>
          <Text style={[styles.charHint, { color: colors.mutedForeground }]}>
            たまった光は発電所で街を明るくするのに使えるよ(準備中)
          </Text>
        </Card>
      </ScrollView>

      <ChecklistSheet visible={showChecklist} onClose={() => setShowChecklist(false)} />
      <MoodRecordSheet
        visible={showMoodSheet}
        onClose={() => setShowMoodSheet(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  dateLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, marginBottom: 4 },
  card: { borderRadius: 22, padding: 18, borderWidth: 1, gap: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moodBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  moodValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  moodSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  editHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  ctaBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  ctaText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  countBadge: { flexDirection: 'row', alignItems: 'baseline' },
  countNum: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  countSep: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  checkHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 32 },
  statValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  charRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gaugeLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  gaugeLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  gaugeValue: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  gaugeTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 4 },
  charHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
