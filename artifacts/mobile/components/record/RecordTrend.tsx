import React, {useId, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText} from 'react-native-svg';
import {Icon, iconSize, type IconName} from '@/components/ui/Icon';
import {CONDITION_LABELS, conditionLabel, conditionValue, type ConditionKey} from '@/utils/conditionTrends';
import {LIFE_METRICS, lifeLabel, lifeValue, type LifeMetric} from '@/utils/lifeTrends';
import type {DailyRecord} from '@/contexts/AppContext';

export type RecordDay = {date: string; record?: DailyRecord};
export type RecordMetric = ConditionKey | LifeMetric;
export const recordInk = '#504358';
export const recordMuted = '#817487';
export const RECORD_METRICS: Record<RecordMetric, {title: string; short: string; ink: string; tint: string; icon: IconName}> = {
  mood: {title: '気分', short: '気分', ink: '#8A6A9E', tint: '#F1EAF5', icon: 'smile'},
  fatigue: {title: 'からだの疲れ', short: '疲れ', ink: '#52897D', tint: '#EDF4EF', icon: 'battery'},
  worry: {title: '心配ごと', short: '心配', ink: '#B18A55', tint: '#FAF2E6', icon: 'cloud'},
  moyamoya: {title: 'モヤモヤ', short: 'モヤモヤ', ink: '#AC768C', tint: '#F8ECF0', icon: 'wind'},
  sleep: {...LIFE_METRICS.sleep, short: '睡眠', icon: 'moon'},
  exercise: {...LIFE_METRICS.exercise, short: '運動', icon: 'activity'},
  meal: {...LIFE_METRICS.meal, short: '食事', icon: 'coffee'},
  social: {...LIFE_METRICS.social, short: '人間関係', icon: 'users'},
};
export const isConditionMetric = (metric: RecordMetric): metric is ConditionKey => ['mood', 'fatigue', 'worry'].includes(metric);
export const recordValue = (record: DailyRecord | undefined, metric: RecordMetric) => isConditionMetric(metric) ? conditionValue(record, metric) : lifeValue(record, metric);
export const recordLabel = (record: DailyRecord | undefined, metric: RecordMetric) => isConditionMetric(metric) ? conditionLabel(record, metric) : lifeLabel(record, metric);
export const shortRecordDate = (date: string) => Number(date.slice(5, 7)) + '/' + Number(date.slice(8));
export const recordWeekday = (date: string) => '日月火水木金土'[new Date(date + 'T12:00:00Z').getUTCDay()];

/** One scale at a time. Missing answers break the line, including at both edges. */
export function RecordTrend({days, metric, selected, onSelect}: {
  days: RecordDay[]; metric: RecordMetric; selected: string; onSelect: (date: string) => void;
}) {
  const [width, setWidth] = useState(280);
  const gradient = 'record-fill-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const theme = RECORD_METRICS[metric], left = 49, right = 15, top = 15, bottom = 118, height = 146;
  const max = metric === 'mood' ? 5 : metric === 'sleep' ? 12 : metric === 'moyamoya' ? 1 : 3;
  const min = metric === 'sleep' || metric === 'moyamoya' ? 0 : 1;
  const x = (i: number) => left + i * (width - left - right) / Math.max(1, days.length - 1);
  const y = (v: number) => bottom - (v - min) / (max - min) * (bottom - top);
  const values = days.map(day => recordValue(day.record, metric));
  const selectedIndex = days.findIndex(day => day.date === selected);
  const count = values.filter(v => v !== null).length;
  const ticks = metric === 'mood' ? [5, 3, 1] : metric === 'sleep' ? [12, 6, 0] : metric === 'moyamoya' ? [1, 0] : [3, 2, 1];
  const tickLabel = (v: number) => isConditionMetric(metric) ? CONDITION_LABELS[metric][v] : metric === 'sleep' ? v + 'h' : LIFE_METRICS[metric].labels[v];
  const segments: {path: string; start: number; end: number; count: number}[] = [];
  values.forEach((value, i) => {
    if (value === null) return;
    const previous = segments[segments.length - 1];
    if (i > 0 && values[i - 1] !== null && previous) {
      previous.path += ' L' + x(i) + ' ' + y(value); previous.end = i; previous.count++;
    } else segments.push({path: 'M' + x(i) + ' ' + y(value), start: i, end: i, count: 1});
  });
  const labelIndexes = days.length <= 7 ? days.map((_, i) => i) : [0, 7, 14, 21, days.length - 1];
  const prefix = isConditionMetric(metric) ? 'condition' : 'life';
  return <View testID={prefix + '-trend-card-' + metric}>
    <Pressable testID={prefix + '-chart-' + metric} accessibilityRole="button"
      accessibilityLabel={theme.title + 'の推移。' + shortRecordDate(selected) + 'は' + recordLabel(days[selectedIndex]?.record, metric) + '。前の日・次の日ボタンでも日付を選べます。'}
      onLayout={e => setWidth(Math.max(180, e.nativeEvent.layout.width))}
      onPress={e => {const index = Math.max(0, Math.min(days.length - 1, Math.round((e.nativeEvent.locationX - left) / (width - left - right) * (days.length - 1)))); onSelect(days[index].date);}}
      style={{height}}>
      <Svg width={width} height={height} accessible={false}>
        <Defs><LinearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={theme.ink} stopOpacity=".17"/><Stop offset="1" stopColor={theme.ink} stopOpacity=".015"/></LinearGradient></Defs>
        {ticks.map(v => <React.Fragment key={v}>
          <Line x1={left} x2={width - right} y1={y(v)} y2={y(v)} stroke="#EDE8EE" strokeDasharray="2 5"/>
          <SvgText x={left - 10} y={y(v) + 4} textAnchor="end" fontSize={10} fill={recordMuted}>{tickLabel(v)}</SvgText>
        </React.Fragment>)}
        {selectedIndex >= 0 && <Line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={top} y2={bottom} stroke={theme.ink} strokeOpacity=".22" strokeDasharray="3 4"/>}
        {metric !== 'sleep' && segments.map((segment, i) => <React.Fragment key={i}>
          {segment.count > 1 && <Path d={segment.path + ' L' + x(segment.end) + ' ' + bottom + ' L' + x(segment.start) + ' ' + bottom + ' Z'} fill={'url(#' + gradient + ')'}/>}
          <Path d={segment.path} fill="none" stroke={theme.ink} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round"/>
        </React.Fragment>)}
        {values.map((value, i) => {
          if (value === null) return null;
          const chosen = i === selectedIndex, barWidth = Math.min(19, (width - left - right) / days.length * .55);
          if (metric === 'sleep' && value > 0) return <Rect key={days[i].date} x={x(i) - barWidth / 2} y={y(value)} width={barWidth} height={bottom - y(value)} rx={Math.min(5, barWidth / 2)} fill={theme.ink} opacity={chosen ? 1 : .47}/>;
          return <React.Fragment key={days[i].date}>
            {chosen && <Circle cx={x(i)} cy={y(value)} r={8} fill={theme.ink} opacity=".14"/>}
            <Circle cx={x(i)} cy={y(value)} r={chosen ? 4.2 : days.length > 7 ? 2.2 : 3} fill={chosen ? '#FFFEFC' : theme.ink} stroke={theme.ink} strokeWidth={chosen ? 2.2 : 0}/>
          </React.Fragment>;
        })}
        {labelIndexes.map((i, n) => <SvgText key={i} x={x(i)} y={139} textAnchor={n === 0 ? 'start' : n === labelIndexes.length - 1 ? 'end' : 'middle'} fontSize={10} fill={recordMuted}>{days.length <= 7 ? Number(days[i].date.slice(8)) + '日' : shortRecordDate(days[i].date)}</SvgText>)}
      </Svg>
      {!count && <View pointerEvents="none" style={s.empty}><View style={s.emptyText}><Text style={s.emptyTitle}>まだ、この項目の記録はありません</Text><Text style={s.note}>残した日から、少しずつ見えてきます。</Text></View></View>}
    </Pressable>
  </View>;
}

export function RecordDayNavigation({days, selected, onSelect, metric, onDetails}: {
  days: RecordDay[]; selected: string; onSelect: (date: string) => void; metric: RecordMetric; onDetails?: () => void;
}) {
  const index = days.findIndex(d => d.date === selected), theme = RECORD_METRICS[metric];
  const prefix = isConditionMetric(metric) ? 'condition' : 'life';
  return <View style={[s.navigation, {backgroundColor: theme.tint}]}>
    <Pressable accessibilityRole="button" accessibilityLabel="前の日の記録" disabled={index <= 0} onPress={() => onSelect(days[index - 1].date)} style={[s.arrow, index <= 0 && s.disabled]}><Icon name="chevron-left" size={iconSize.md} color={theme.ink}/></Pressable>
    <Pressable testID="record-selected-day" accessibilityRole="button" accessibilityLabel={shortRecordDate(selected) + 'の詳しい回答を見る'} disabled={!onDetails} onPress={onDetails} style={s.selectedDay}>
      <Text style={s.date}>{shortRecordDate(selected)}（{recordWeekday(selected)}）</Text>
      <Text testID={prefix + '-selected-' + metric} accessibilityLiveRegion="polite" style={[s.value, {color: theme.ink}]}>{recordLabel(days[index]?.record, metric)}</Text>
      {onDetails && <Icon name="chevron-right" size={iconSize.xs} color={theme.ink}/>}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="次の日の記録" disabled={index < 0 || index >= days.length - 1} onPress={() => onSelect(days[index + 1].date)} style={[s.arrow, (index < 0 || index >= days.length - 1) && s.disabled]}><Icon name="chevron-right" size={iconSize.md} color={theme.ink}/></Pressable>
  </View>;
}
const s = StyleSheet.create({
  empty: {...StyleSheet.absoluteFillObject, paddingLeft: 45, justifyContent: 'center', alignItems: 'center'},
  emptyText: {padding: 12, gap: 5, borderRadius: 12, backgroundColor: '#FFFEFCF0'},
  emptyTitle: {fontSize: 12, lineHeight: 20, color: recordInk, textAlign: 'center'}, note: {fontSize: 10, lineHeight: 18, color: recordMuted, textAlign: 'center'},
  navigation: {minHeight: 52, flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 3},
  arrow: {width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center'}, disabled: {opacity: .28},
  selectedDay: {flex: 1, flexDirection: 'row', flexWrap: 'wrap', minHeight: 48, gap: 7, alignItems: 'center', justifyContent: 'center', paddingVertical: 7},
  date: {fontSize: 11, lineHeight: 20, color: '#756879'}, value: {fontSize: 13, lineHeight: 20, fontWeight: '600'},
});
