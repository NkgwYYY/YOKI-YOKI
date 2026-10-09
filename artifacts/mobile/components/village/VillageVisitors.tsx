import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';
import type {WorldMapId} from '@/utils/worldMaps';
import {visitorReply, visitorsAt, type VillageVisit} from '@/utils/villageVisitors';
import {VillageResident} from './VillageActors';
import {useResidentIdle} from './useResidentIdle';

const VisitorActor = React.memo(function VisitorActor({visit, size, active, reduceMotion, greeting, onTalk}: {
  visit: VillageVisit; size: number; active: boolean; reduceMotion: boolean; greeting: number; onTalk: () => void;
}) {
  const motion = useResidentIdle({active, reduceMotion, size, tempo: 1800 + visit.lineOffset % 1100, greeting});
  return <Pressable testID={`village-visitor-${visit.visitor.id}`} accessibilityRole="button" accessibilityLabel={`${visit.visitor.name}と話す`} disabled={!active} onPress={onTalk} style={{alignItems: 'center', minWidth: 44, minHeight: 44}}>
    <View pointerEvents="none" style={[s.shadow, {width: size * .64, bottom: 23}]}/>
    <Animated.View pointerEvents="none" style={motion}>
      <VillageResident stage={visit.visitor.stage} size={size} active={active} reduceMotion={reduceMotion} scarf={visit.visitor.color}/>
    </Animated.View>
    <Text style={s.name}>{visit.visitor.name} ···</Text>
  </Pressable>;
});

/** Small in-world conversations. Movement and the scene stay available. */
export function VillageVisitors({map, daySeed, width, height, clearTop, viewportLeft, viewportWidth, active, reduceMotion, onTalk}: {
  map: WorldMapId; daySeed: number; width: number; height: number; clearTop: number; viewportLeft: number; viewportWidth: number;
  active: boolean; reduceMotion: boolean; onTalk: () => void;
}) {
  const visits = useMemo(() => visitorsAt(map, daySeed), [map, daySeed]);
  const [spoken, setSpoken] = useState<{visit: VillageVisit; text: string; turn: number} | null>(null);
  const exchanges = useRef<Record<string, number>>({});
  useEffect(() => {setSpoken(null); exchanges.current = {};}, [map, daySeed]);
  useEffect(() => {if (!active) setSpoken(null);}, [active]);
  useEffect(() => {
    if (!spoken) return;
    const timer = setTimeout(() => setSpoken(null), 8000);
    return () => clearTimeout(timer);
  }, [spoken]);
  const size = width * .145, bubbleWidth = Math.min(272, viewportWidth - 24);
  const talk = (visit: VillageVisit) => {
    const turn = exchanges.current[visit.visitor.id] ?? 0;
    exchanges.current[visit.visitor.id] = turn + 1;
    onTalk();
    setSpoken({visit, text: visitorReply(visit, turn), turn: turn + 1});
  };
  return <>
    {visits.map(visit => <View key={visit.visitor.id} style={{position: 'absolute', left: width * visit.point.x - size / 2, top: height * visit.point.y - size * .91, zIndex: Math.round(visit.point.y * 1000)}}>
      <VisitorActor visit={visit} size={size} active={active} reduceMotion={reduceMotion} greeting={spoken?.visit.visitor.id === visit.visitor.id ? spoken.turn : 0} onTalk={() => talk(visit)}/>
    </View>)}
    {spoken && active && <Pressable testID="village-visitor-dialogue" accessibilityRole="button" accessibilityLabel={`${spoken.visit.visitor.name}：${spoken.text} 会話を閉じる`} onPress={() => setSpoken(null)} style={[s.bubble, {
      width: bubbleWidth,
      left: Math.max(viewportLeft + 12, Math.min(viewportLeft + viewportWidth - bubbleWidth - 12, width * spoken.visit.point.x - bubbleWidth / 2)),
      top: Math.max(clearTop + 6, height * spoken.visit.point.y - size - 98),
    }]}>
      <View style={s.bubbleHeader}><Text style={s.speaker}>{spoken.visit.visitor.name}</Text><Text style={s.close}>×</Text></View>
      <Text accessibilityLiveRegion="polite" style={s.reply}>{spoken.text}</Text>
    </Pressable>}
  </>;
}
const s = StyleSheet.create({
  shadow: {position: 'absolute', height: 8, borderRadius: 50, backgroundColor: '#24162B45'},
  name: {color: '#FFF4DC', backgroundColor: '#302239B8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, marginTop: -3, overflow: 'hidden'},
  bubble: {position: 'absolute', zIndex: 980, borderRadius: 19, backgroundColor: '#FFF8EA', paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: '#E0CCAC', shadowColor: '#251827', shadowOpacity: .18, shadowRadius: 12, shadowOffset: {width: 0, height: 4}},
  bubbleHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  speaker: {color: '#927052', fontSize: 12, fontWeight: '700'},
  close: {color: '#927052', fontSize: 18, lineHeight: 19},
  reply: {color: '#48382E', fontSize: 14, lineHeight: 22},
});
