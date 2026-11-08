import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon, iconSize} from '@/components/ui/Icon';
import {ConditionFace} from './ConditionFace';
import {recordInk, recordMuted, recordWeekday, shortRecordDate, type RecordDay} from './RecordTrend';
import {CONDITION_TITLES, conditionLabel, conditionValue} from '@/utils/conditionTrends';
import {DAY_TYPES, LIFE_METRICS, lifeLabel} from '@/utils/lifeTrends';
import {PATTERNS} from '@/utils/moyamoyaContent';
import type {DailyRecord} from '@/contexts/AppContext';

export function RecordDayDetails({record, date, today, onEdit}: {
  record?: DailyRecord; date: string; today: string; onEdit?: () => void;
}) {
  const activitiesKnown = record?.behaviorsRecorded !== false && (record?.behaviorsRecorded === true || !!record?.behaviors?.length);
  const pattern = record?.moyamoya?.has ? PATTERNS.find(p => p.id === record.moyamoya?.pattern) : undefined;
  return <View testID="record-day-details" style={s.stack}>
    <View style={s.hero}><ConditionFace mood={conditionValue(record, 'mood')} size={64}/><View style={{flex: 1, gap: 4}}><Text style={s.caption}>この日の気分</Text><Text testID="day-detail-mood" style={s.heroValue}>{conditionLabel(record, 'mood')}</Text></View><Text style={s.caption}>{record ? '残してくれた記録' : 'お休みのページ'}</Text></View>
    {!record ? <Text style={s.empty}>この日の記録はありません。{ '\n' }空いた日があっても、自分のペースで。</Text> : <>
      <View style={s.panel}>{(['fatigue', 'worry'] as const).map(key => <Answer key={key} id={'day-detail-' + key} label={CONDITION_TITLES[key]} value={conditionLabel(record, key)}/>)}<Answer id="day-detail-moyamoya" label="モヤモヤ" value={lifeLabel(record, 'moyamoya')}/>{pattern && <Text style={s.pattern}>{pattern.short}</Text>}</View>
      <View style={s.panel}><Text style={s.sectionTitle}>眠りと暮らし</Text>{(['sleep', 'exercise', 'meal', 'social'] as const).map(key => <Answer key={key} id={'day-detail-' + key} label={LIFE_METRICS[key].title} value={lifeLabel(record, key)}/>)}<Answer id="day-detail-day-type" label="どんな日？" value={DAY_TYPES.find(d => d.id === record.dayType)?.label ?? '未記録'}/></View>
      <View style={s.panel}><Text style={s.sectionTitle}>この日の過ごし方</Text>{activitiesKnown && record.behaviors?.length ? <View style={s.tags}>{record.behaviors.map((label, i) => <View key={label + i} style={s.tag}><Text style={s.tagText}>{label}</Text></View>)}</View> : <Text testID="day-detail-activities-empty" style={s.caption}>{activitiesKnown ? '当てはまるものはない' : '未記録'}</Text>}</View>
      {(record.win || record.notes || record.moyamoya?.memo) && <View style={[s.panel, {backgroundColor: '#FAF3E9'}]}><Text style={s.sectionTitle}>残しておいたこと</Text>{record.win && <Text style={s.note}>できたこと　{record.win}</Text>}{record.notes && <Text style={s.note}>{record.notes}</Text>}{record.moyamoya?.memo && <Text style={s.note}>モヤモヤ　{record.moyamoya.memo}</Text>}</View>}
    </>}
    {date === today && onEdit && <Pressable testID="record-day-edit" accessibilityRole="button" onPress={onEdit} style={s.edit}><Icon name="edit-3" size={iconSize.sm} color="#FFF"/><Text style={s.editText}>今日の記録を書き足す</Text></Pressable>}
  </View>;
}
function Answer({id, label, value}: {id: string; label: string; value: string}) {
  return <View style={s.answer}><Text style={s.answerLabel}>{label}</Text><Text testID={id} style={[s.answerValue, value === '未記録' && {color: '#B3A7B8'}]}>{value}</Text></View>;
}

const moodColors = ['#EEE9EF', '#CBC0DE', '#D6CCDF', '#EADFD0', '#D6E5D9', '#EFE1B9'];
export function RecordCalendar({days, selected, onSelect}: {days: RecordDay[]; selected: string; onSelect: (date: string) => void}) {
  const months = [...new Set(days.map(d => d.date.slice(0, 7)))];
  return <View testID="record-calendar" style={s.stack}>
    {months.map(month => {
      const entries = days.filter(d => d.date.startsWith(month));
      const firstDate = new Date(entries[0].date + 'T12:00:00Z').getUTCDay();
      return <View key={month} style={s.calendarMonth}><Text style={s.sectionTitle}>{Number(month.slice(5))}月</Text>
        <View style={s.calendarGrid}>{'日月火水木金土'.split('').map((label, i) => <View key={i} style={s.weekday}><Text style={s.weekdayLabel}>{label}</Text></View>)}
          {Array.from({length: firstDate}, (_, i) => <View key={'blank-' + i} style={s.dayCell}/>)}
          {entries.map(day => {
            const mood = conditionValue(day.record, 'mood'), active = day.date === selected;
            return <Pressable key={day.date} testID={'record-calendar-' + day.date} accessibilityRole="button" accessibilityLabel={shortRecordDate(day.date) + '（' + recordWeekday(day.date) + '） ' + conditionLabel(day.record, 'mood') + 'の記録を見る'} accessibilityState={{selected: active}} onPress={() => onSelect(day.date)} style={s.dayCell}>
              <View style={[s.dayCircle, {backgroundColor: moodColors[mood ?? 0]}, active && s.dayCircleActive]}><Text style={[s.dayNumber, !mood && {color: '#AA9FB0'}, active && {color: '#FFFFFF'}]}>{Number(day.date.slice(8))}</Text></View>
            </Pressable>;
          })}
        </View>
      </View>;
    })}
    <View style={s.legend}>{[1, 2, 3, 4, 5].map(mood => <View key={mood} style={s.legendItem}><View style={[s.legendDot, {backgroundColor: moodColors[mood]}]}/><Text style={s.legendText}>{conditionLabel({mood}, 'mood')}</Text></View>)}</View>
    <Text style={s.calendarFootnote}>薄いグレーは、気分が未記録の日です。</Text>
  </View>;
}
const s = StyleSheet.create({
  stack: {gap: 16}, hero: {flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14, borderRadius: 22, backgroundColor: '#F0E8F4'}, caption: {fontSize: 11, lineHeight: 19, color: recordMuted, flexShrink: 1}, heroValue: {fontSize: 22, lineHeight: 32, fontWeight: '600', color: '#745584'}, empty: {fontSize: 13, lineHeight: 24, color: recordMuted, textAlign: 'center', padding: 24},
  panel: {padding: 16, gap: 12, backgroundColor: '#FFFEFC', borderWidth: 1, borderColor: '#EDE7ED', borderRadius: 19}, sectionTitle: {fontSize: 14, lineHeight: 23, fontWeight: '600', color: recordInk}, answer: {flexDirection: 'row', gap: 16, justifyContent: 'space-between', alignItems: 'center'}, answerLabel: {fontSize: 12, lineHeight: 21, color: '#938399'}, answerValue: {fontSize: 13, lineHeight: 22, fontWeight: '500', color: '#6E5A7A', flexShrink: 1}, pattern: {fontSize: 12, lineHeight: 21, color: '#A47B91', paddingTop: 5, borderTopWidth: 1, borderTopColor: '#F0E8EE'}, tags: {flexDirection: 'row', flexWrap: 'wrap', gap: 7}, tag: {paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#F1EEF4', borderRadius: 13}, tagText: {fontSize: 11, lineHeight: 18, color: '#86708F'}, note: {fontSize: 13, lineHeight: 25, color: '#8B7788'}, edit: {minHeight: 48, padding: 13, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9173A2', borderRadius: 18}, editText: {fontSize: 13, lineHeight: 22, color: '#FFF', fontWeight: '600'},
  calendarMonth: {gap: 11}, calendarGrid: {flexDirection: 'row', flexWrap: 'wrap'}, weekday: {width: '14.2857%', height: 26, alignItems: 'center', justifyContent: 'center'}, weekdayLabel: {fontSize: 10, color: '#A092A6'}, dayCell: {width: '14.2857%', minHeight: 47, alignItems: 'center', justifyContent: 'center'}, dayCircle: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'}, dayCircleActive: {backgroundColor: '#9878A8', borderWidth: 2, borderColor: '#80608F'}, dayNumber: {fontSize: 12, fontWeight: '500', color: '#72637B'}, legend: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 3}, legendItem: {flexDirection: 'row', gap: 4, alignItems: 'center'}, legendDot: {width: 8, height: 8, borderRadius: 4}, legendText: {fontSize: 9, color: recordMuted}, calendarFootnote: {fontSize: 10, lineHeight: 18, color: '#A092A6', textAlign: 'center'},
});
