import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon, iconSize} from '@/components/ui/Icon';
import {RecordTrend, RecordDayNavigation, RECORD_METRICS, recordInk, recordMuted, shortRecordDate, type RecordDay} from './RecordTrend';
import {DAY_TYPES, CORE_BEHAVIORS, lifeValue, activityValue, dayTypeValue, type LifeMetric, type LifeRecord} from '@/utils/lifeTrends';
import {PATTERNS} from '@/utils/moyamoyaContent';

type Props = {days: RecordDay[]; selected: string; onSelect: (date: string) => void; onDetails?: () => void};
type Category = 'day-type' | 'activities' | 'moyamoya-patterns';
type Panel = LifeMetric | Category;
const metricChoices = ['sleep', 'meal', 'exercise', 'social'] as const;
const categoryChoices = [{id: 'activities', label: '過ごし方'}, {id: 'day-type', label: 'どんな日？'}, {id: 'moyamoya-patterns', label: 'モヤモヤの内容'}] as const;

/** Optional details are browsed one at a time, not added to the overview's scroll. */
export function DailyLifeCharts(props: Props) {
  const {days, selected, onSelect, onDetails} = props;
  const [panel, setPanel] = useState<Panel>('sleep');
  const isCategory = ['activities', 'day-type', 'moyamoya-patterns'].includes(panel);
  const metric = isCategory ? 'sleep' : panel as LifeMetric;
  return <View testID="daily-life-charts" style={s.stack}>
    <View style={s.tabs}>{metricChoices.map(key => <Pressable key={key} testID={'life-tab-' + key} accessibilityRole="tab" accessibilityState={{selected: panel === key}} onPress={() => setPanel(key)} style={[s.tab, panel === key && s.tabActive]}><Icon name={RECORD_METRICS[key].icon} size={iconSize.sm} color={panel === key ? '#6A877D' : '#A799AC'}/><Text style={[s.tabLabel, panel === key && s.activeText]}>{RECORD_METRICS[key].short}</Text></Pressable>)}</View>
    <View style={s.categoryTabs}>{categoryChoices.map(item => <Pressable key={item.id} testID={'life-tab-' + item.id} accessibilityRole="tab" accessibilityState={{selected: panel === item.id}} onPress={() => setPanel(item.id)} style={[s.categoryTab, panel === item.id && s.tabActive]}><Text style={[s.tabLabel, panel === item.id && s.activeText]}>{item.label}</Text></Pressable>)}</View>
    {!isCategory ? <View testID={'life-trend-' + metric} style={s.metricCard}>
      <View style={s.heading}><Text style={s.title}>{RECORD_METRICS[metric].title}</Text><Text style={s.note}>{days.filter(d => lifeValue(d.record, metric) !== null).length}日分の回答</Text></View>
      <RecordTrend days={days} metric={metric} selected={selected} onSelect={onSelect}/>
      <RecordDayNavigation days={days} metric={metric} selected={selected} onSelect={onSelect} onDetails={onDetails}/>
    </View> : <CategoryProfile key={panel} {...props} category={panel as Category}/>}
    <Text style={s.footnote}>答えなかった項目は、未記録のまま。{ '\n' }選ばなかったことや「0」とは区別しています。</Text>
  </View>;
}
type CategoryRow = {id: string; label: string; value: (record: LifeRecord | undefined) => boolean | null};
function CategoryProfile({days, selected, onSelect, onDetails, category}: Props & {category: Category}) {
  const [all, setAll] = useState(false), [expanded, setExpanded] = useState<string | null>(null);
  const activities = [...new Set<string>([...CORE_BEHAVIORS, ...days.flatMap(d => d.record?.behaviors ?? [])])];
  const rows: CategoryRow[] = category === 'activities' ? activities.map(label => ({id: label, label, value: record => activityValue(record, label)}))
    : category === 'day-type' ? DAY_TYPES.map(day => ({id: day.id, label: day.label, value: record => dayTypeValue(record, day.id)}))
      : PATTERNS.map(pattern => ({id: pattern.id, label: pattern.short, value: record => typeof record?.moyamoya?.has !== 'boolean' ? null : !record.moyamoya.has ? false : record.moyamoya.pattern ? record.moyamoya.pattern === pattern.id : null}));
  const scored = rows.map(row => ({...row, count: days.filter(d => row.value(d.record) === true).length, known: days.filter(d => row.value(d.record) !== null).length})).sort((a, b) => b.count - a.count);
  const hasAnswers = scored.some(row => row.known > 0), visibleRows = all ? scored : scored.slice(0, 6);
  return <View testID={'life-grid-' + category} style={s.stack}>
    <View style={s.heading}><Text style={s.title}>{categoryChoices.find(p => p.id === category)?.label}</Text><Text style={s.note}>選んだ日数</Text></View>
    {!hasAnswers ? <View style={s.empty}><Icon name="book-open" size={iconSize.lg} color="#B09EB9"/><Text style={s.emptyTitle}>この期間の回答は、まだありません</Text><Text style={s.note}>残した回答が、ここに並んでいきます。</Text></View> : visibleRows.map(row => <View key={row.id} style={s.categoryCard}>
      <Pressable testID={'life-row-' + category + '-' + row.id} accessibilityRole="button" accessibilityState={{expanded: expanded === row.id}} accessibilityLabel={row.label + '。' + (row.known ? row.count + '日選択、' + row.known + '日回答。日付を見る' : '未記録')} onPress={() => setExpanded(expanded === row.id ? null : row.id)} style={s.categoryButton}>
        <View style={s.rowCopy}><Text style={s.rowLabel}>{row.label}</Text><View style={s.track}><View style={[s.trackFill, {width: `${row.known ? row.count / row.known * 100 : 0}%`}]}/></View></View>
        <View style={s.numbers}><Text style={s.dayCount}>{row.count}<Text style={s.unit}> 日</Text></Text><Text style={s.denominator}>{row.known}日回答</Text></View><Icon name={expanded === row.id ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color="#A894B2"/>
      </Pressable>
      {expanded === row.id && <View testID={'life-days-' + category + '-' + row.id} style={s.dayPanel}>
        <View style={s.dayGrid}>{days.map(day => {
          const answer = row.value(day.record);
          return <Pressable key={day.date} testID={'life-cell-' + category + '-' + row.id + '-' + day.date} accessibilityRole="button" accessibilityLabel={day.date + '、' + row.label + '、' + (answer === null ? '未記録' : answer ? '選択' : '選択なし')} accessibilityState={{selected: day.date === selected}} onPress={() => {onSelect(day.date); onDetails?.();}} style={[s.day, day.date === selected && s.selectedDay]}><Text style={s.dayLabel}>{shortRecordDate(day.date)}</Text><Text style={[s.dayMark, {color: answer ? '#9473A6' : '#C0B2C9'}]}>{answer === null ? '—' : answer ? '●' : '○'}</Text></Pressable>;
        })}</View><Text style={s.legend}>● 選択　○ 選択なし　— 未記録</Text>
      </View>}
    </View>)}
    {hasAnswers && scored.length > 6 && <Pressable testID="life-categories-more" accessibilityRole="button" accessibilityState={{expanded: all}} onPress={() => setAll(!all)} style={s.more}><Text style={s.moreText}>{all ? '少なく表示' : 'すべての項目を見る'}</Text><Icon name={all ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color="#8A6C9B"/></Pressable>}
  </View>;
}
const s = StyleSheet.create({
  stack: {gap: 15}, tabs: {flexDirection: 'row', gap: 5}, tab: {flex: 1, minHeight: 57, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 15, backgroundColor: '#F2EDF3'}, tabActive: {backgroundColor: '#E6F0E9'}, tabLabel: {fontSize: 11, lineHeight: 18, color: '#A08CA9'}, activeText: {color: '#638374', fontWeight: '600'}, categoryTabs: {flexDirection: 'row', gap: 4, marginTop: -5}, categoryTab: {flex: 1, minHeight: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3},
  metricCard: {padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#E9E2EB', backgroundColor: '#FFFEFC', gap: 15}, heading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8}, title: {fontSize: 14, fontWeight: '600', lineHeight: 23, color: recordInk}, note: {fontSize: 10, lineHeight: 18, color: recordMuted}, footnote: {fontSize: 10, lineHeight: 19, color: '#A397A9', textAlign: 'center'},
  categoryCard: {borderRadius: 17, borderWidth: 1, borderColor: '#E9E2EB', backgroundColor: '#FFFEFC', overflow: 'hidden'}, categoryButton: {padding: 14, gap: 12, flexDirection: 'row', alignItems: 'center', minHeight: 73}, rowCopy: {flex: 1, gap: 9}, rowLabel: {fontSize: 12, lineHeight: 21, color: '#7A6586'}, track: {height: 4, backgroundColor: '#F0EBF2', borderRadius: 4, overflow: 'hidden'}, trackFill: {height: 4, borderRadius: 4, backgroundColor: '#B49CC2'}, numbers: {alignItems: 'flex-end', gap: 2}, dayCount: {fontSize: 20, lineHeight: 25, color: '#886A99', fontWeight: '500'}, unit: {fontSize: 10}, denominator: {fontSize: 9, lineHeight: 16, color: '#A99AAF'}, dayPanel: {backgroundColor: '#FAF7FB', padding: 10, gap: 8}, dayGrid: {flexDirection: 'row', flexWrap: 'wrap'}, day: {width: '20%', minHeight: 51, alignItems: 'center', justifyContent: 'center', borderRadius: 10, gap: 3}, selectedDay: {backgroundColor: '#ECE3F2'}, dayLabel: {fontSize: 9, lineHeight: 16, color: '#AA98B2'}, dayMark: {fontSize: 14, lineHeight: 18}, legend: {fontSize: 9, lineHeight: 17, color: '#A396A9', textAlign: 'center'}, more: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7}, moreText: {fontSize: 11, lineHeight: 20, color: '#8A6C9B'}, empty: {padding: 28, borderRadius: 20, backgroundColor: '#F5F0F7', alignItems: 'center', gap: 10}, emptyTitle: {fontSize: 12, lineHeight: 22, color: '#887393'},
});
