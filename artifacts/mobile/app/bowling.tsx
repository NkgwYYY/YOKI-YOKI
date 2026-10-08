import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from "@/contexts/AppContext";
import { useRoomActivity } from "@/components/room/useRoomActivity";
import { WorldPill } from "@/components/world/WorldPill";
import { SatietyGauge } from "@/components/world/SatietyGauge";
import { useSceneTransition } from "@/components/world/useSceneTransition";
import { BowlingLane } from "@/components/village/BowlingLane";
import {
  BOWLING_DURATION,
  bowlingPlayedToday,
  simulateBowling,
  type BowlingInput,
  type BowlingReceipt,
  type BowlingResult,
} from "@/utils/bowling";
import { getMascotStage } from "@/utils/mascotUtils";
import { getTodayDate } from "@/utils/dateUtils";

export default function BowlingScreen() {
  const router = useRouter(),
    insets = useSafeAreaInsets(),
    window = useWindowDimensions();
  const { active, reduceMotion } = useRoomActivity();
  const { isSignedIn } = useAuth();
  const {
    progress: character,
    mascotName,
    currentSatiety,
    feedState,
    bowlingState,
    playBowling,
    isLoading,
    cloudSynced,
  } = useApp();
  const [today, setToday] = useState(getTodayDate),
    [aim, setAim] = useState(0),
    [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [running, setRunning] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [result, setResult] = useState<BowlingResult | null>(null),
    [receipt, setReceipt] = useState<BowlingReceipt | null>(null);
  const motion = useSharedValue(0),
    latched = useRef(false),
    mounted = useRef(true);
  const attempt = useRef<{ id: string; input: BowlingInput } | null>(null);
  const done = bowlingPlayedToday(bowlingState, today);
  const saved =
    (receipt && receipt.date >= today ? receipt : null) ||
    Object.entries(bowlingState.plays)
      .sort(([a], [b]) => b.localeCompare(a))
      .find(([date]) => date >= today)?.[1];
  const transition = useSceneTransition(reduceMotion, () =>
    setError("場所を切り替えられませんでした。"),
  );
  const disabled =
    saving || running || done || !active || (isLoading || (isSignedIn && !cloudSynced)) || transition.busy;
  useEffect(() => {
    if (active) setToday(getTodayDate());
  }, [active]);
  useEffect(() => {
    if (receipt && receipt.date < today && !running && !saving) {
      setReceipt(null);
      setResult(null);
      motion.value = 0;
    }
  }, [today, receipt, running, saving, motion]);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setToday(getTodayDate()), 30000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!running || !active) {
      cancelAnimation(motion);
      return;
    }
    motion.value = withTiming(
      1,
      {
        duration: reduceMotion ? 900 : BOWLING_DURATION * (1 - motion.value),
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) runOnJS(setRunning)(false);
      },
    );
    return () => cancelAnimation(motion);
  }, [running, active, reduceMotion, motion]);
  const animateReceipt = (value: BowlingReceipt) => {
    setReceipt(value);
    setResult(simulateBowling(value));
    motion.value = 0;
    setRunning(true);
  };
  const throwBall = async (input: BowlingInput) => {
    if (latched.current || disabled) return;
    latched.current = true;
    setSaving(true);
    setError("");
    attempt.current ??= {
      id:
        "bowl:" +
        today +
        ":" +
        Date.now() +
        ":" +
        Math.random().toString(36).slice(2),
      input,
    };
    try {
      const saved = await playBowling(
        attempt.current.id,
        attempt.current.input,
      );
      if (!mounted.current) return;
      if (saved.accepted) {
        animateReceipt(saved.receipt);
        attempt.current = null;
      } else setError("今日はもう遊んだよ。また明日、ころころしよう。");
    } catch {
      if (mounted.current)
        setError("結果を保存できませんでした。同じ投球でもう一度試せます。");
    } finally {
      latched.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const aimFromDrag = (dx: number) => {
    if (!disabled)
      setAim(Math.max(-1, Math.min(1, (dx / Math.max(1, bounds.width)) * 2.4)));
  };
  const release = (dx: number, dy: number) => {
    if (dy < -35)
      void throwBall({
        aim: Math.max(-1, Math.min(1, (dx / Math.max(1, bounds.width)) * 2.4)),
        power: Math.max(
          0.15,
          Math.min(1, -dy / Math.max(90, bounds.height * 0.45)),
        ),
      });
  };
  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(8)
    .onUpdate((e) => runOnJS(aimFromDrag)(e.translationX))
    .onEnd((e) => runOnJS(release)(e.translationX, e.translationY));
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[
        { flexGrow: 1 },
        {
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(14, insets.bottom),
        },
      ]}
    >
      <View style={s.header}>
        <WorldPill
          compact
          icon="arrow-left"
          label="おさんぽへ戻る"
          disabled={saving}
          onPress={() => void transition.run("おさんぽへ", () => router.back())}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>KOROKORO CLUB</Text>
          <Text style={s.title}>ころころボウリング</Text>
        </View>
      </View>
      <View style={s.status}>
        <SatietyGauge value={currentSatiety} />
        <Text style={s.wallet}>{feedState.points} pt</Text>
      </View>
      <Text style={s.rules}>1日1回・1投　 /　 1ピンにつき 5 pt</Text>
      <GestureDetector gesture={gesture}>
        <View
          testID="bowling-play-area"
          style={s.stage}
          onLayout={(e) => setBounds(e.nativeEvent.layout)}
        >
          {bounds.width > 0 && (
            <BowlingLane
              width={bounds.width}
              height={bounds.height}
              stage={getMascotStage(character.level)}
              frames={result?.frames ?? null}
              progress={motion}
              aim={receipt?.aim ?? aim}
            />
          )}
          {running && (
            <View style={s.rolling}>
              <Text style={s.rollingText}>
                {mascotName || "よっきー"}、ころころ…
              </Text>
            </View>
          )}
        </View>
      </GestureDetector>
      <View
        style={[s.controls, window.height < 650 && { paddingTop: 9, gap: 7 }]}
      >
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        {running ? (
          <Text accessibilityLiveRegion="polite" style={s.hint}>
            ピンまで、ころころ。どうなるかな？
          </Text>
        ) : done && saved ? (
          <View testID="bowling-result" style={s.result}>
            <Text accessibilityLiveRegion="polite" style={s.score}>
              {saved.pins === 10 ? "ストライク！" : saved.pins + "本たおしたよ"}
              　+{saved.earned} pt
            </Text>
            <Text style={s.hint}>
              今日の挑戦はおしまい。また明日、遊ぼうね。
            </Text>
            <WorldPill
              testID="bowling-replay"
              icon="play"
              label="今日の投球を見る"
              onPress={() => animateReceipt(saved)}
            />
          </View>
        ) : (
          <>
            <View style={s.aim}>
              <WorldPill
                compact
                icon="chevron-left"
                label="左をねらう"
                disabled={disabled || !!attempt.current}
                onPress={() => setAim((n) => Math.max(-1, n - 0.12))}
              />
              <Text style={s.hint}>
                ねらい：
                {Math.abs(aim) < 0.06 ? "まんなか" : aim < 0 ? "左" : "右"}
              </Text>
              <WorldPill
                compact
                icon="chevron-right"
                label="右をねらう"
                disabled={disabled || !!attempt.current}
                onPress={() => setAim((n) => Math.min(1, n + 0.12))}
              />
            </View>
            <WorldPill
              testID="bowling-throw"
              primary
              icon="arrow-up"
              label={
                saving
                  ? "結果を保存しています…"
                  : attempt.current
                    ? "同じ投球をもう一度保存"
                    : "この方向にころがす"
              }
              disabled={disabled}
              onPress={() => void throwBall({ aim, power: 0.8 })}
            />
            <Text style={s.hint}>キャラを上へスワイプしても投げられます。</Text>
          </>
        )}
      </View>
      {transition.overlay}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F0F9" },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#A08BAD",
    fontWeight: "700",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#604770", marginTop: 4 },
  status: {
    paddingHorizontal: 20,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  wallet: { color: "#806195", fontSize: 13, fontWeight: "700" },
  rules: {
    fontSize: 11,
    color: "#9683A0",
    textAlign: "center",
    marginVertical: 10,
  },
  stage: {
    flex: 1,
    minHeight: 180,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 26,
  },
  controls: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
  },
  aim: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 11, lineHeight: 18, color: "#907B98", textAlign: "center" },
  error: { fontSize: 12, color: "#AD695E", textAlign: "center" },
  result: { alignItems: "center", gap: 9 },
  score: { color: "#80549A", fontSize: 20, fontWeight: "700" },
  rolling: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#FFF9F0ED",
  },
  rollingText: { fontSize: 12, color: "#8A6A9C" },
});
