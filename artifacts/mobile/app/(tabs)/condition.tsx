import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useFocusEffect, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '@/contexts/AppContext';
import {useAuth} from '@/contexts/AuthContext';
import {BottomSheet} from '@/components/ui/BottomSheet';
import {Icon, iconSize} from '@/components/ui/Icon';
import {ConditionFace} from '@/components/record/ConditionFace';
import {DailyLifeCharts} from '@/components/record/DailyLifeCharts';
import {RecordDayDetails, RecordCalendar} from '@/components/record/RecordDayDetails';
import {RecordTrend, RecordDayNavigation, RECORD_METRICS, recordValue, recordInk, recordMuted, shortRecordDate, recordWeekday, type RecordMetric} from '@/components/record/RecordTrend';
import {conditionDays, conditionValue, conditionLabel} from '@/utils/conditionTrends';
import {lifeLabel} from '@/utils/lifeTrends';
import {getTodayDate} from '@/utils/dateUtils';
import {getTabBarHeight} from '@/utils/tabLayout';

type Sheet = 'day' | 'calendar' | 'life' | 'menu' | null;
const CORE_METRICS: RecordMetric[] = ['mood', 'fatigue', 'worry', 'moyamoya'];
export default function ConditionScreen() {
  const auth = useAuth();
  return <ConditionNotebook key={auth.user?.id ?? 'guest'}/>;
}
function ConditionNotebook() {
  const {records, isLoading, storageError, cloudSynced} = useApp(), auth = useAuth();
  const router = useRouter(), insets = useSafeAreaInsets(), compact = useWindowDimensions().width < 360;
  const [today, setToday] = useState(getTodayDate), [period, setPeriod] = useState(7);
  const [selected, setSelected] = useState(today), [metric, setMetric] = useState<RecordMetric>('mood');
  const [sheet, setSheet] = useState<Sheet>(null);
  useFocusEffect(useCallback(() => {
    const update = () => setToday(getTodayDate()); update();
    const timer = setInterval(update, 30000); return () => clearInterval(timer);
  }, []));
  const days = useMemo(() => conditionDays(records, today, period), [records, today, period]);
  const monthDays = useMemo(() => conditionDays(records, today, 30), [records, today]);
  // Changing range must not leave the selected day outside the visible graph.
  useEffect(() => setSelected(day => day < days[0].date || day > today ? today : day), [days[0].date, today]);
  const current = records.find(r => r.date === today), chosen = days.find(d => d.date === selected)?.record;
  const count = days.filter(d => recordValue(d.record, metric) !== null).length;
  const ready = !isLoading && !storageError && !auth.isLoading && (!auth.isSignedIn || cloudSynced);
  const changePeriod = (length: number) => {
    const first = conditionDays([], today, length)[0].date;
    setPeriod(length);
    setSelected(day => day < first || day > today ? today : day);
  };
  const openEditor = () => {setSheet(null); router.push('/check-in');};
  const route = (destination: '/monthly-report' | '/hints' | '/(tabs)/growth') => {setSheet(null); router.push(destination);};
  const chooseHistory = (date: string) => {setPeriod(30); setSelected(date); setSheet('day');};
  const activities = current?.behaviorsRecorded !== false && current?.behaviors?.length ? current.behaviors : [];
  return <View testID="condition-screen" style={s.root}>
    <ScrollView testID="record-overview-scroll" contentContainerStyle={[s.content, {paddingTop: (Platform.OS === 'web' ? 18 : insets.top) + 14, paddingBottom: getTabBarHeight(Platform.OS, insets.bottom) + 24}]} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={s.headingCopy}><Text style={s.brand}>YOKI YOKI</Text><Text accessibilityRole="header" style={s.title}>きろく</Text></View>
        <Pressable testID="condition-edit" disabled={!ready} accessibilityRole="button" accessibilityLabel="いまのようすを記録" onPress={openEditor} style={({pressed}) => [s.editButton, (!ready || pressed) && s.dim]}><Icon name="edit-3" size={iconSize.sm} color="#7D5E91"/><Text style={s.editText}>記録する</Text></Pressable>
        <Pressable testID="condition-menu" accessibilityRole="button" accessibilityLabel="記録のメニューを開く" onPress={() => setSheet('menu')} style={s.menuButton}><Icon name="more-horizontal" size={iconSize.lg} color={recordMuted}/></Pressable>
      </View>
      <LinearGradient testID="condition-summary" colors={['#F0E8F4', '#F7F0ED']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[s.todayCard, compact && {paddingHorizontal: 14}]}>
        <View style={s.todayTop}><Text style={s.eyebrow}>今日のようす</Text><Text style={s.todayDate}>{shortRecordDate(today)}（{recordWeekday(today)}）</Text></View>
        <View style={s.todayMain}>
          <ConditionFace mood={conditionValue(current, 'mood')} size={compact ? 48 : 60}/>
          <View style={s.moodCopy}><Text style={s.moodCaption}>気分</Text><Text testID="condition-current-mood" style={[s.moodValue, compact && {fontSize: 20}]}>{conditionLabel(current, 'mood')}</Text></View>
          <View style={s.todaySupporting}>
            {(['fatigue', 'worry'] as const).map(key => <View key={key} testID={'condition-card-' + key} style={s.todayMetric}>
              <Icon name={RECORD_METRICS[key].icon} size={iconSize.xs} color={RECORD_METRICS[key].ink}/><Text style={s.metricName}>{key === 'fatigue' ? '疲れ' : '心配'}</Text><Text testID={'condition-current-' + key} style={s.metricValue}>{conditionLabel(current, key)}</Text>
            </View>)}
          </View>
        </View>
      </LinearGradient>
      <View style={s.viewTabs}>
        <View accessibilityRole="tab" accessibilityState={{selected: true}} style={[s.viewTab, s.viewTabActive]}><Icon name="bar-chart-2" size={iconSize.sm} color="#78568B"/><Text style={s.viewTabText}>変化</Text></View>
        <Pressable testID="condition-insights-tab" accessibilityRole="tab" accessibilityState={{selected: false}} onPress={() => router.push('/insights')} style={s.viewTab}><Icon name="sunrise" size={iconSize.sm} color={recordMuted}/><Text style={s.inactiveTabText}>気づき</Text><Icon name="chevron-right" size={iconSize.xs} color="#B7A8BD"/></Pressable>
      </View>
      <View testID="record-focus-card" style={s.focusCard}>
        <View style={s.focusHeading}>
          <View style={s.headingCopy}><Text accessibilityRole="header" style={s.sectionTitle}>ここまでの変化</Text><Text style={s.range}>{shortRecordDate(days[0].date)} — {shortRecordDate(today)}　<Text testID="condition-record-count">{count}日分</Text></Text></View>
          <View style={s.periodPicker}>{[7, 30].map(n => <Pressable key={n} testID={'condition-period-' + n} accessibilityRole="button" accessibilityLabel={n === 7 ? '最近1週間' : '最近1か月'} accessibilityState={{selected: period === n}} onPress={() => changePeriod(n)} style={[s.periodButton, period === n && s.periodActive]}><Text style={[s.periodText, period === n && s.periodTextActive]}>{n === 7 ? '1週間' : '1か月'}</Text></Pressable>)}</View>
        </View>
        <View style={s.metricTabs}>{CORE_METRICS.map(key => {
          const active = metric === key, item = RECORD_METRICS[key];
          return <Pressable key={key} testID={'record-metric-' + key} accessibilityRole="tab" accessibilityLabel={item.title + 'のグラフ'} accessibilityState={{selected: active}} onPress={() => setMetric(key)} style={[s.metricTab, active && {backgroundColor: item.tint, borderColor: item.tint}]}><Text style={[s.metricTabText, active && {color: item.ink, fontWeight: '700'}]}>{item.short}</Text></Pressable>;
        })}</View>
        <RecordTrend days={days} metric={metric} selected={selected} onSelect={setSelected}/>
        <RecordDayNavigation days={days} metric={metric} selected={selected} onSelect={setSelected} onDetails={() => setSheet('day')}/>
        <Text style={s.graphHint}>日付を選ぶと、その日の回答を見られます</Text>
      </View>
      <View style={s.secondaryRow}>
        <Pressable testID="record-life-open" accessibilityRole="button" accessibilityLabel="睡眠と暮らしの変化を見る" onPress={() => setSheet('life')} style={({pressed}) => [s.secondaryCard, {backgroundColor: '#EDF3EF'}, pressed && s.dim]}>
          <View style={s.secondaryTop}><View style={[s.secondaryIcon, {backgroundColor: '#E0EBE4'}]}><Icon name="moon" size={iconSize.md} color="#638879"/></View><Icon name="arrow-up-right" size={iconSize.sm} color="#88A091"/></View>
          <Text style={s.secondaryTitle}>眠りと暮らし</Text><Text numberOfLines={1} style={s.secondaryNote}>{lifeLabel(current, 'sleep') === '未記録' ? '睡眠・食事・過ごし方' : '睡眠 ' + lifeLabel(current, 'sleep') + (activities.length ? '・' + activities[0] : '')}</Text>
        </Pressable>
        <Pressable testID="condition-history" accessibilityRole="button" accessibilityLabel="日ごとの記録を見る" onPress={() => setSheet('calendar')} style={({pressed}) => [s.secondaryCard, {backgroundColor: '#F5EEE5'}, pressed && s.dim]}>
          <View style={s.secondaryTop}><View style={[s.secondaryIcon, {backgroundColor: '#EEE2D2'}]}><Icon name="calendar" size={iconSize.md} color="#A18767"/></View><Icon name="arrow-up-right" size={iconSize.sm} color="#B29B80"/></View>
          <Text style={s.secondaryTitle}>日ごとの記録</Text><Text style={s.secondaryNote}>カレンダーでふりかえる</Text>
        </Pressable>
      </View>
      <Text style={s.footnote}>空白は、未記録の日。自分のペースで大丈夫。</Text>
    </ScrollView>
    {sheet && <BottomSheet visible onClose={() => setSheet(null)} title={sheet === 'life' ? '眠りと暮らし' : sheet === 'calendar' ? '日ごとの記録' : sheet === 'day' ? shortRecordDate(selected) + '（' + recordWeekday(selected) + '）の記録' : '記録のメニュー'} subtitle={sheet === 'calendar' ? '最近30日。日付をタップして、回答をひらく。' : sheet === 'life' ? shortRecordDate(days[0].date) + ' — ' + shortRecordDate(today) : undefined} maxHeightRatio={.9} contentStyle={{gap: 18}}>
      {sheet === 'day' && <RecordDayDetails record={chosen} date={selected} today={today} onEdit={ready ? openEditor : undefined}/>}
      {sheet === 'calendar' && <RecordCalendar days={monthDays} selected={selected} onSelect={chooseHistory}/>}
      {sheet === 'life' && <DailyLifeCharts days={days} selected={selected} onSelect={setSelected} onDetails={() => setSheet('day')}/>}
      {sheet === 'menu' && <View style={{gap: 3}}>
        <MenuRow icon="file-text" title="月のまとめ" note="ひと月の記録を振り返る・画像で保存" onPress={() => route('/monthly-report')}/>
        <MenuRow icon="bookmark" title="自分のヒント帳" note="残しておいた気づきと言葉" onPress={() => route('/hints')}/>
        <MenuRow icon="heart" title="相棒の成長と思い出" note="一緒に過ごした日々を振り返る" onPress={() => route('/(tabs)/growth')}/>
      </View>}
    </BottomSheet>}
  </View>;
}
function MenuRow({icon, title, note, onPress}: {icon: React.ComponentProps<typeof Icon>['name']; title: string; note: string; onPress: () => void}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.menuRow}><Icon name={icon} size={iconSize.lg} color="#8A6A9E"/><View style={{flex: 1, gap: 4}}><Text style={s.sectionTitle}>{title}</Text><Text style={s.secondaryNote}>{note}</Text></View><Icon name="chevron-right" size={iconSize.sm} color={recordMuted}/></Pressable>;
}
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#FAF8F5'}, content: {width: '100%', maxWidth: 580, alignSelf: 'center', paddingHorizontal: 20, gap: 14},
  header: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2}, headingCopy: {flex: 1, gap: 3}, brand: {fontSize: 9, lineHeight: 15, letterSpacing: 2.6, color: '#9A86A4', fontWeight: '600'},
  title: {fontSize: 30, lineHeight: 40, fontWeight: '700', letterSpacing: 1, color: recordInk}, editButton: {minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#EEE6F3', flexDirection: 'row', gap: 7, alignItems: 'center'}, editText: {fontSize: 12, fontWeight: '600', color: '#765788'}, menuButton: {width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center'}, dim: {opacity: .55},
  todayCard: {borderRadius: 26, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 13, gap: 8, borderWidth: 1, borderColor: '#EBE1ED'}, todayTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, eyebrow: {fontSize: 12, lineHeight: 20, color: '#826B8E', fontWeight: '600'}, todayDate: {fontSize: 11, color: '#948198'},
  todayMain: {flexDirection: 'row', alignItems: 'center', gap: 5}, moodCopy: {flex: 1, gap: 2}, moodCaption: {fontSize: 10, lineHeight: 18, color: '#9A87A1'}, moodValue: {fontSize: 22, lineHeight: 32, fontWeight: '600', color: '#654A75'}, todaySupporting: {gap: 10, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#E3D7E7'}, todayMetric: {flexDirection: 'row', alignItems: 'center', gap: 5}, metricName: {fontSize: 11, lineHeight: 18, color: '#917C99'}, metricValue: {fontSize: 12, lineHeight: 18, minWidth: 42, color: '#6D5A77', fontWeight: '500'}, todayBottom: {flexDirection: 'row', gap: 6, alignItems: 'center'}, todayNote: {fontSize: 10, lineHeight: 18, color: '#9B86A2'}, smallDot: {width: 5, height: 5, borderRadius: 3},
  viewTabs: {flexDirection: 'row', gap: 24, alignItems: 'center', marginTop: 2, marginBottom: -9}, viewTab: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4, paddingBottom: 4}, viewTabActive: {borderBottomWidth: 2, borderBottomColor: '#9976AA'}, viewTabText: {fontSize: 14, lineHeight: 22, fontWeight: '700', color: '#78568B'}, inactiveTabText: {fontSize: 14, lineHeight: 22, color: '#87728F'},
  focusCard: {backgroundColor: '#FFFEFC', borderRadius: 25, borderWidth: 1, borderColor: '#EDE7ED', padding: 14, gap: 9, shadowColor: '#735F7D', shadowOpacity: .035, shadowOffset: {width: 0, height: 4}, shadowRadius: 12}, focusHeading: {flexDirection: 'row', alignItems: 'center', gap: 5}, sectionTitle: {fontSize: 15, lineHeight: 23, fontWeight: '600', color: recordInk}, range: {fontSize: 10, lineHeight: 17, color: '#887891'}, periodPicker: {flexDirection: 'row', borderRadius: 18, padding: 3, backgroundColor: '#F4F0F4'}, periodButton: {paddingHorizontal: 10, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 15}, periodActive: {backgroundColor: '#FFFFFF', shadowColor: '#735F7D', shadowOpacity: .07, shadowRadius: 3, shadowOffset: {width: 0, height: 1}}, periodText: {fontSize: 11, color: '#887891'}, periodTextActive: {color: '#795C88', fontWeight: '600'},
  metricTabs: {flexDirection: 'row', gap: 4}, metricTab: {flex: 1, minHeight: 44, paddingHorizontal: 2, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#EEE8EF'}, metricTabText: {fontSize: 12, lineHeight: 19, color: '#84718D'}, graphCaption: {flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center'}, change: {fontSize: 11, lineHeight: 19, flexShrink: 1}, count: {fontSize: 10, lineHeight: 18, color: '#A396A9'}, graphHint: {fontSize: 9, lineHeight: 16, color: '#93829A', textAlign: 'center', marginTop: -5},
  secondaryRow: {flexDirection: 'row', gap: 12}, secondaryCard: {flex: 1, minWidth: 0, borderRadius: 21, padding: 15, gap: 7}, secondaryTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2}, secondaryIcon: {width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center'}, secondaryTitle: {fontSize: 13, fontWeight: '600', lineHeight: 21, color: '#675D6A'}, secondaryNote: {fontSize: 10, lineHeight: 18, color: '#86758C'}, footnote: {fontSize: 10, lineHeight: 18, textAlign: 'center', color: '#8E7E95', marginTop: -3}, menuRow: {minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: '#E9E0E9', paddingVertical: 10},
});
