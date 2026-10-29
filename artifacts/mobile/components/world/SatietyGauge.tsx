import {FeltDecoration} from '@/components/ui/Felt';
import React from "react";
import { StyleSheet, Text, View } from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import { Icon, iconSize } from "@/components/ui/Icon";
export function SatietyGauge({
  value,
  onPress,
  compact = false,
}: {
  value: number;
  onPress?: () => void;
  compact?: boolean;
}) {
  const amount = Math.max(0, Math.min(100, Math.round(value)));
  const label =
    amount < 25
      ? "おなかぺこぺこ"
      : amount < 60
        ? "そろそろごはん"
        : amount < 85
          ? "ほどよく満腹"
          : "おなかいっぱい";
  const color = amount < 25 ? "#D48865" : amount < 60 ? "#C6A154" : "#7A9F85";
  return (
    <Pressable
      testID="home-satiety"
      accessibilityRole={onPress ? "button" : "progressbar"}
      accessibilityLabel={`満腹度${amount}パーセント。${label}`}
      accessibilityValue={{ min: 0, max: 100, now: amount }}
      onPress={onPress}
      style={[s.root,compact&&{minWidth:0,maxWidth:undefined,paddingHorizontal:8,gap:4}]}
    >
      <FeltDecoration radius={18}/><Icon name="coffee" size={compact?iconSize.xs:iconSize.sm} color={color} />
      <View style={s.body}>
        <View style={s.row}>
          {!compact&&<Text style={s.name}>{label}</Text>}
          <Text style={s.number}>満腹 {amount}%</Text>
        </View>
        <View style={s.track}>
          <View
            style={[s.fill, { width: `${amount}%`, backgroundColor: color }]}
          />
        </View>
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  root: {
    minHeight: 44,
    minWidth: 166,
    maxWidth: 260,
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF8EA",
    borderWidth: 1,
    borderColor: "#D7C6AA",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  body: { flex: 1, gap: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 10, color: "#74634F", fontWeight: "600" },
  number: { fontSize: 10, color: "#74634F", fontWeight: "700" },
  track: {
    height: 5,
    borderRadius: 4,
    backgroundColor: "#E8DDCA",
    overflow: "hidden",
  },
  fill: { height: 5, borderRadius: 4 },
});
