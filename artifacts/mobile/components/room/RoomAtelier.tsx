import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { RoomItemPreview } from '@/components/RoomView';
import { EGG_COMPANION_COST, useApp, type RoomFurniture, type RoomFlower, type RoomItemKind } from '@/contexts/AppContext';
const FURNITURE: { id: RoomFurniture; name: string; cost: number }[] = [
  { id: 'none', name: '置かない', cost: 0 }, { id: 'sofa', name: 'ソファ', cost: 450 },
  { id: 'vanity', name: 'ドレッサー', cost: 650 }, { id: 'bookshelf', name: '本棚', cost: 900 },
];
const FLOWERS: { id: RoomFlower; name: string; cost: number }[] = [
  { id: 'none', name: '置かない', cost: 0 }, { id: 'pink', name: 'ローズ', cost: 250 },
  { id: 'violet', name: 'バイオレット', cost: 350 }, { id: 'rainbow', name: 'レインボー', cost: 550 },
];
export function RoomAtelier({ onClose }: { onClose: () => void }) {
  const { feedState, roomCustomization: room, selectRoomItem, buyRoomItem, companionState, buyEggCompanion } = useApp();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const act = async (task: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await task(); } catch { setMessage('保存できませんでした。もう一度お試しください。'); }
    finally { lock.current = false; setBusy(false); }
  };
  const option = (kind: RoomItemKind, item: (typeof FURNITURE)[number] | (typeof FLOWERS)[number]) => {
    const owned = item.id === 'none' || (kind === 'furniture' ? room.ownedFurniture : room.ownedFlowers).some(id => id === item.id);
    const selected = room[kind] === item.id;
    return <Pressable key={item.id} disabled={busy} accessibilityRole="button" accessibilityLabel={`${item.name} ${selected ? '使用中' : owned ? '選ぶ' : `${item.cost}ポイント`}`}
      accessibilityState={{ selected, disabled: busy }}
      onPress={() => act(async () => {
        if (owned) { const saved = await selectRoomItem(kind, item.id); setMessage(saved ? '部屋の模様替えをしました。' : 'このアイテムはまだ持っていません。'); }
        else { const result = await buyRoomItem(kind, item.id, item.cost); setMessage(result.success ? (kind === 'flower' ? '新しい花を迎えました。' : '新しい家具を迎えました。') : 'ポイントがもう少し必要です。'); }
      })} style={[s.row, selected && { backgroundColor: '#EEE5F2' }]}>
      <RoomItemPreview kind={kind} id={item.id} /><Text style={s.name}>{item.name}</Text><Text>{selected ? '使用中' : owned ? '選ぶ' : `${item.cost} pt`}</Text>
    </Pressable>;
  };
  return <BottomSheet visible onClose={onClose} title="部屋の模様替え" subtitle={`${feedState.points} YOKIポイント`}>
    {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    <Text style={s.title}>家具</Text>{FURNITURE.map(item => option('furniture', item))}
    <Text style={s.title}>花</Text>{FLOWERS.map(item => option('flower', item))}
    <Text style={s.title}>もうひとつのたまご</Text>
    <Button label={companionState.extraEggs > 0 ? '一緒に暮らしています' : `${EGG_COMPANION_COST} pt で迎える`} disabled={busy || companionState.extraEggs > 0 || feedState.points < EGG_COMPANION_COST}
      onPress={() => act(async () => { const result = await buyEggCompanion(); setMessage(result.success ? '新しい仲間がやってきました。' : '今は迎えられませんでした。'); })} />
  </BottomSheet>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, padding: 8, gap: 12, borderRadius: 12 }, name: { flex: 1, color: '#4B3C52' }, title: { fontWeight: '600', fontSize: 16, color: '#4B3C52', marginTop: 18, marginBottom: 8 } });
