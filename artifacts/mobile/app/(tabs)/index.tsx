import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { MiniGameModal } from '@/components/MiniGameModal';
import { getCurrentSlot, getSlotConfig, MAX_PLAYS_PER_SLOT } from '@/utils/miniGameUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { StageCharacter } from '@/components/StageCharacter';
import { FeedModal } from '@/components/FeedModal';
import { SkyBackground } from '@/components/SkyBackground';
import {
  getMascotStage,
  getMascotMood,
  getMascotMessage,
  calcStatus,
  getNextStageLevel,
  STAGE_LEVEL_MAP,
  getStageName,
  pickIdleBehavior,
  IdleBehavior,
} from '@/utils/mascotUtils';
import { getGreeting, formatDateJP, getTodayDate, getYesterdayDate } from '@/utils/dateUtils';
import { MAX_GROWTH_SCALE } from '@/utils/growth';
import { plantLevelFor, plantLevelProgress, MAX_PLANT_LEVEL } from '@/utils/powerPlant';
import { Dimensions } from 'react-native';

/* ── サイズ成長の表示ラッパー ──
   GrowthSize(内部の成長値)と ScreenFit(画面に収める調整)を分離。
   更新時は数秒かけてふわっと変化し、派手な演出はしない。 */
function GrowthScaleWrap({ growthSize, baseSize, children }: {
  growthSize: number; baseSize: number; children: React.ReactNode;
}) {
  // ScreenFit: 画面幅の55%を超えない範囲に表示スケールを制限
  const fitCap = Math.min(
    MAX_GROWTH_SCALE,
    (Dimensions.get('window').width * 0.55) / baseSize,
  );
  const displayScale = Math.min(growthSize, fitCap);
  const scale = useSharedValue(displayScale);
  useEffect(() => {
    // ふわっと数秒かけて追従(初回マウント時は即座に反映済み)
    scale.value = withTiming(displayScale, { duration: 4000 });
  }, [displayScale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const HOME_COMMENT_KEY = '@mentore/home_comment_v1';

function chatDateKey(message: { id?: unknown; dateKey?: unknown; timestamp?: unknown }): string | null {
  if (typeof message.dateKey === 'string') return message.dateKey;
  if (typeof message.timestamp === 'string') {
    const date = new Date(message.timestamp);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }
  if (typeof message.id === 'string') {
    const match = message.id.match(/_(\d{10,})$/);
    if (match) {
      const date = new Date(Number(match[1]));
      if (!Number.isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

/* ── Cosmic theme palette ── */
const C = {
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.55)',
  card: 'rgba(84,64,148,0.42)',
  border: 'rgba(255,255,255,0.28)',
  pill: 'rgba(84,64,148,0.48)',
  accent: '#EFE7FF',
  track: 'rgba(255,255,255,0.28)',
  sheet: '#2A1D55',
  input: 'rgba(255,255,255,0.12)',
  primary: '#9B72CB',
};

/* ── Stagger-in wrapper ── */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(18);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 460 }));
    y.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 160 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/* ── Animated fill bar ── */
function FillBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const easeOut = (t: number) => t * (2 - t);
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(pct, { duration: 1000, easing: easeOut }));
  }, [pct]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` as any }));
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: 6 }, style]} />;
}

/* ── 円形ガラスボタン(ラボ風オービットメニュー) ── */
function OrbButton({ pos, emoji, label, sub, onPress }: {
  pos: any; emoji: string; label: string; sub?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.orbBtn, pos]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.orbEmoji}>{emoji}</Text>
      <Text style={styles.orbLabel} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={styles.orbSub} numberOfLines={1}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

/* ── Floating glass bubble (speech) ── */
function GlassBubble({ message }: { message: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(-10, { duration: 2500 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[style, { alignItems: 'center' }]}>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{message}</Text>
      </View>
      {/* キャラに向かうしっぽ(下向き三角) */}
      <View style={styles.bubbleTail} />
    </Animated.View>
  );
}

/* ── RPG status bar row ── */
function StatusBar({
  label, icon, value, color, delay,
}: {
  label: string; icon: string; value: number; color: string; delay: number;
}) {
  return (
    <View style={styles.statBarRow}>
      <View style={styles.statBarLabelWrap}>
        <Text style={styles.statBarIcon}>{icon}</Text>
        <Text style={[styles.statBarLabel, { color: C.textSub }]}>{label}</Text>
      </View>
      <View style={[styles.statBarTrack, { backgroundColor: C.track }]}>
        <FillBar pct={value} color={color} delay={delay} />
      </View>
      <Text style={[styles.statBarVal, { color: C.text }]}>{value}</Text>
    </View>
  );
}

/* ── Satiety bar ── */
function SatietyBar({ satiety }: { satiety: number }) {
  const color =
    satiety >= 70 ? '#00D4AA' :
    satiety >= 40 ? '#FFB347' :
    '#EF4444';
  const label =
    satiety >= 80 ? 'お腹いっぱい' :
    satiety >= 50 ? 'まあまあ' :
    satiety >= 25 ? '空腹気味…' :
    'ぺこぺこ😢';
  return (
    <View style={styles.satietyRow}>
      <Text style={styles.satietyIcon}>🍽️</Text>
      <View style={[styles.satietyTrack, { backgroundColor: C.track }]}>
        <View style={[styles.satietyFill, { width: `${satiety}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.satietyLabel, { color: C.textSub }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    progress, records, getTodayRecord, getCompletedCount, getTotalCheckCount,
    mascotName, setMascotName,
    currentSatiety, inactivityHours, feedState,
    miniGameState, completeMiniGame,
    isLoading, growth,
    checkedState, checklistItems,
    lightEnergy,
  } = useApp();
  // 循環演出(LightFlowEffect)はタブレイアウト側の常駐ホストが表示する

  // ── 今日の自分の一歩(チェックリスト先頭5件) ──
  // 日付が変わった直後の古いチェック状態は「未チェック」として扱う
  const checksAreToday = checkedState.date === getTodayDate();
  const stepItems = checklistItems.slice(0, 5).map((item) => ({
    ...item,
    checked: checksAreToday
      ? (checkedState.items.find((c) => c.id === item.id)?.checked ?? false)
      : false,
  }));
  const stepDone = checksAreToday ? getCompletedCount() : 0;

  // ── 昨日の自分より(記録の充実度を「昨日」と厳密に比較。チェックは含めない) ──
  const recScore = (r?: { behaviors: string[]; activities?: Record<string, number>; notes?: string; win?: string }) =>
    r
      ? r.behaviors.length +
        Object.values(r.activities ?? {}).reduce((s, n) => s + (n || 0), 0) +
        (r.notes ? 1 : 0) + (r.win ? 1 : 0)
      : 0;
  const todayRec = records.find((r) => r.date === getTodayDate());
  const yesterdayRec = records.find((r) => r.date === getYesterdayDate());
  const todayScore = recScore(todayRec);
  const prevScore = recScore(yesterdayRec);
  const hasComparison = !!yesterdayRec && !!todayRec;
  const stepDeltaPct = hasComparison
    ? Math.max(-99, Math.min(99, ((todayScore - prevScore) / Math.max(prevScore, 1)) * 100))
    : 0;

  const [showMiniGame, setShowMiniGame] = useState(false);
  const currentSlot = getCurrentSlot();
  const slotPlays = currentSlot ? (miniGameState[currentSlot] || 0) : MAX_PLAYS_PER_SLOT;
  const slotDone = slotPlays >= MAX_PLAYS_PER_SLOT;

  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();

  const stage = getMascotStage(progress.level);
  // 起動ごとに固定のランダム値でmood揺らぎを決定（renderのたびに変わらない）
  const [moodVariance] = useState(() => Math.random());
  const mood = getMascotMood(progress, todayRecord, completedCount, totalCount, {
    inactivityHours,
    satiety: currentSatiety,
    variance: moodVariance,
  });
  const status = calcStatus(todayRecord, completedCount, totalCount, progress.streak);

  // ③ Random idle behavior on every app open — resets to normal after 4s
  const [idleBehavior, setIdleBehavior] = useState<IdleBehavior>(() => pickIdleBehavior());
  useEffect(() => {
    if (idleBehavior !== 'normal') {
      const t = setTimeout(() => setIdleBehavior('normal'), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  const [showNameModal, setShowNameModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // ── 進化映像モーダル ──
  const prevStageRef = React.useRef<string | null>(null);

  useEffect(() => {
    // データ読込中は判定しない（読込前は stage が 'egg' 扱いになり、
    // 読込完了時に本来のステージへ変わって誤って映像が流れてしまうため）
    if (isLoading) return;
    // 読込完了後の初回は prevStage を設定するだけ（映像は表示しない）
    if (prevStageRef.current === null) {
      prevStageRef.current = stage;
      return;
    }
    if (prevStageRef.current !== stage) {
      prevStageRef.current = stage;
    }
  }, [stage, isLoading]);

  const handlePet = React.useCallback(() => {
    // アニメーション・ハートのみ — 吹き出しは変えない
  }, []);

  /* ── 今日の一言（記録・チャットに関連づけたAIコメント、1日1回生成してキャッシュ） ── */
  const [homeComment, setHomeComment] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { (async () => {
      const today = getTodayDate();
      // 記録の有無が変わったら作り直す（記録後に内容が反映されるように）
      const sig = `${today}|${todayRecord ? 'rec' : 'no'}|${records.length}`;
      try {
        const cachedRaw = await AsyncStorage.getItem(HOME_COMMENT_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { sig: string; text: string };
          if (cached.sig === sig && cached.text) {
            if (!cancelled) setHomeComment(cached.text);
            return;
          }
        }
      } catch {}

      try {
        // 記録コンテキスト（チャットと同じ要約方式）
        const recent = [...records].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
        const avgOf = (nums: number[]) =>
          nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : null;
        const ctxParts: string[] = [];
        if (recent.length) {
          ctxParts.push(`直近${recent.length}日: 平均気分${avgOf(recent.map(r => r.mood))}/5, 平均睡眠${avgOf(recent.map(r => r.sleep))}h`);
        }
        if (todayRecord) {
          ctxParts.push(
            `今日の記録: 気分${todayRecord.mood}/5, 睡眠${todayRecord.sleep}h` +
            (todayRecord.behaviors.length ? `, したこと[${todayRecord.behaviors.join(',')}]` : '') +
            (todayRecord.win ? `, 小さな成功「${todayRecord.win}」` : '')
          );
        }
        const recentWins = recent.map(r => r.win).filter(Boolean).slice(-3);
        if (recentWins.length) ctxParts.push(`最近の小さな成功: ${recentWins.join(' / ')}`);
        if (progress?.streak) ctxParts.push(`連続記録${progress.streak}日目`);

        // 直近チャット抜粋（端末ローカル履歴から）
        let recentChat = '';
        try {
          const raw = await AsyncStorage.getItem('@mentore/chat_history_v1');
          if (raw) {
            const msgs = JSON.parse(raw) as { id?: string; role: string; content: string; dateKey?: string; timestamp?: string }[];
            recentChat = msgs
              .filter(m => chatDateKey(m) === today)
              .slice(-8)
              .map(m => `今日の${m.role === 'user' ? 'ユーザー' : 'マスコット'}: ${String(m.content).slice(0, 80)}`)
              .join('\n');
          }
        } catch {}

        const res = await fetch(`${API_BASE}/home-comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mascotName: mascotName || 'よっきー',
            context: ctxParts.join('\n') || undefined,
            recentChat: recentChat || undefined,
          }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (data.comment && !cancelled) {
          setHomeComment(data.comment);
          AsyncStorage.setItem(HOME_COMMENT_KEY, JSON.stringify({ sig, text: data.comment })).catch(() => {});
        }
      } catch {
        // 失敗時はフォールバック（下のcurrentMsg）を表示したまま
      }
    })(); }, 900);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [records.length, todayRecord?.id]);

  const currentMsg = homeComment ?? getMascotMessage(mood);

  const nextStageLevel = getNextStageLevel(progress.level);
  const stageInfo = STAGE_LEVEL_MAP.find((s) => s.stage === stage)!;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const moodColors = ['', '#EF4444', '#FF6B35', '#FFB800', '#00C4A7', '#00D4AA'];
  const moodLabels = ['', '最悪', '辛い', '普通', '良い', '最高'];

  return (
    <View style={styles.flex}>
      <SkyBackground />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <View style={styles.header}>
            {/* ── YOKI YOKI logo ── */}
            <View>
              <Text style={[styles.greeting, { color: C.textSub }]}>{getGreeting()}</Text>
              <Image
                source={require('@/assets/images/yoki_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={[styles.dateText, { color: C.textSub }]}>
                {formatDateJP(getTodayDate())}
              </Text>
            </View>

            {/* ── Help + Streak badge ── */}
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => router.push('/guide')}
                hitSlop={8}
                activeOpacity={0.8}
                style={[styles.helpBtn, { backgroundColor: C.pill, borderColor: C.border }]}
              >
                <Ionicons name="help-circle-outline" size={20} color={C.textSub} />
                <Text style={[styles.helpText, { color: C.textSub }]}>使い方</Text>
              </TouchableOpacity>
              <View style={styles.streakWrap}>
                <View style={styles.streakCircle}>
                  <View style={styles.streakDashed} />
                  <Text style={styles.streakNum}>{progress.streak}</Text>
                  <Text style={styles.streakUnit}>DAY{progress.streak !== 1 ? 'S' : ''}</Text>
                </View>
                <Text style={[styles.streakLabel, { color: C.textSub }]}>
                  {progress.streak >= 7 ? '🏆 継続中！' : '連続記録'}
                </Text>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ── Cosmic Hero (stage pills / bubble / mascot / name) ── */}
        <FadeIn delay={80}>
          <View style={styles.hero}>
            {/* Stage / type / level pills */}
            <View style={styles.mascotTopRow}>
              <View style={styles.mascotTopLeft}>
                <View style={[styles.stagePill, { backgroundColor: C.pill, borderColor: C.border }]}>
                  <Text style={[styles.stageName, { color: C.text }]}>
                    {getStageName(stage)}
                  </Text>
                </View>
              </View>
              <View style={[styles.levelPill, { backgroundColor: C.pill, borderColor: C.border, borderWidth: 1 }]}>
                <Ionicons name="star" size={11} color={C.accent} />
                <Text style={[styles.levelText, { color: C.accent }]}>Lv.{progress.level}</Text>
              </View>
            </View>

            {/* Floating glass bubble */}
            <View style={styles.bubbleWrap}>
              <GlassBubble message={currentMsg} />
            </View>

            {/* ── キャラ中心の円形メニュー(ラボ風) ── */}
            <View style={styles.orbitStage}>
              {/* Mascot with glow */}
              <View style={styles.mascotWrap}>
                {/* ラボの物理エンジン(掴んで投げる・ぷるん)を埋め込み。
                    Webはiframe、ネイティブはWebView(本番ステージURL)。
                    読み込み失敗時はコンポーネント内でMascotへフォールバック。
                    スケールはステージ側がGrowth Sizeで反映する */}
                <StageCharacter
                  stage={stage}
                  mood={mood}
                  size={150}
                  growthSize={growth.growthSize}
                  idleBehavior={idleBehavior}
                  onPet={handlePet}
                />
              </View>

              {/* 円形ガラスボタン(6個・実データ連動) */}
              <OrbButton pos={styles.orbTL} emoji="💬" label="話しかける"
                onPress={() => router.push('/(tabs)/chat')} />
              <OrbButton pos={styles.orbTR} emoji="✏️" label="今日を記録"
                sub={todayRecord ? '記録済み' : '未記録'}
                onPress={() => router.push('/(tabs)/record')} />
              <OrbButton pos={styles.orbML} emoji="🍽️" label="ごはん"
                sub={`🪙${feedState.points}pt`}
                onPress={() => setShowFeedModal(true)} />
              <OrbButton pos={styles.orbMR} emoji="🎮" label="ミニゲーム"
                sub={slotDone ? 'また後で' : 'あそべるよ'}
                onPress={() => { if (!slotDone) setShowMiniGame(true); }} />
              <OrbButton pos={styles.orbBL} emoji="✅" label="今日の一歩"
                sub={`${stepDone}/${totalCount}`}
                onPress={() => router.push('/(tabs)/record')} />
              <OrbButton pos={styles.orbBR} emoji="🌱" label="成長"
                sub={`Lv.${progress.level}`}
                onPress={() => router.push('/(tabs)/growth')} />
            </View>

            {/* Name display */}
            <TouchableOpacity
              style={[styles.nameRow, { backgroundColor: C.pill, borderColor: C.border, borderWidth: 1 }]}
              onPress={() => { setNameInput(mascotName); setShowNameModal(true); }}
              activeOpacity={0.75}
            >
              {mascotName ? (
                <>
                  <Text style={[styles.mascotNameText, { color: C.text }]}>
                    {mascotName}
                  </Text>
                  <Ionicons name="pencil" size={13} color={C.textMuted} />
                </>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={15} color={C.accent} />
                  <Text style={[styles.namePrompt, { color: C.accent }]}>
                    名前をつけよう！
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Stage desc */}
            <Text style={[styles.stageDesc, { color: C.textMuted }]}>
              {stageInfo.desc}
            </Text>
          </View>
        </FadeIn>

        {/* ── お世話カード（満腹度・ごはん・進化）── */}
        <FadeIn delay={140}>
          <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border, gap: 12 }]}>
            {/* Satiety bar */}
            <SatietyBar satiety={currentSatiety} />

            {/* ごはんは円形メニューの「ごはん」ボタンから(重複ボタンは削除) */}
            {/* XP bar to next evolution */}
            {nextStageLevel ? (
              <View style={styles.evoWrap}>
                <View style={styles.evoRow}>
                  <Text style={[styles.evoLabel, { color: C.textSub }]}>
                    次の進化まで Lv.{nextStageLevel}
                  </Text>
                  <Text style={[styles.evoRemain, { color: C.accent }]}>
                    あと {nextStageLevel - progress.level} レベル
                  </Text>
                </View>
                <View style={[styles.evoTrack, { backgroundColor: C.track }]}>
                  <FillBar
                    pct={Math.min(100, (progress.level / nextStageLevel) * 100)}
                    color={C.accent}
                    delay={600}
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.maxBadge, { backgroundColor: 'rgba(178,164,255,0.16)' }]}>
                <Ionicons name="trophy" size={14} color={C.accent} />
                <Text style={[styles.maxText, { color: C.accent }]}>最高段階に達しました！</Text>
              </View>
            )}
          </View>
        </FadeIn>

        {/* ── RPG ステータス ── */}
        <FadeIn delay={180}>
          <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>今日のわたし</Text>
              {todayRecord ? (
                <View style={[styles.moodChip, { backgroundColor: moodColors[todayRecord.mood] + '26' }]}>
                  <Ionicons name="happy-outline" size={13} color={moodColors[todayRecord.mood]} />
                  <Text style={[styles.moodChipText, { color: moodColors[todayRecord.mood] }]}>
                    気分: {moodLabels[todayRecord.mood]}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.moodChip, { backgroundColor: 'rgba(255,111,163,0.18)' }]}
                  onPress={() => router.push('/(tabs)/record')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={13} color="#FF6FA3" />
                  <Text style={[styles.moodChipText, { color: '#FF6FA3' }]}>未記録・記録する</Text>
                </TouchableOpacity>
              )}
            </View>
            <StatusBar label="元気度" icon="💪" value={status.vitality}  color="#00D4AA" delay={300} />
            <StatusBar label="幸福度" icon="💖" value={status.happiness} color="#FF6FA3" delay={420} />
            <StatusBar label="行動力" icon="⚡" value={status.activity}  color="#FFB347" delay={540} />
            {!todayRecord && (
              <TouchableOpacity
                style={[styles.recordHint, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                onPress={() => router.push('/(tabs)/record')}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={15} color={C.accent} />
                <Text style={[styles.recordHintText, { color: C.textSub }]}>
                  気分を記録するとパラメータが上がります
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeIn>

        {/* ── 光エネルギー → 発電所への循環 ── */}
        <FadeIn delay={280}>
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: C.card, borderColor: 'rgba(255,201,77,0.4)', gap: 10 }]}
            onPress={() => router.push('/(tabs)/plant')}
            activeOpacity={0.85}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: '#FFD86B' }]}>✨ 今日の光エネルギー</Text>
              <View style={styles.plantLinkRow}>
                <Text style={[styles.sectionSub, { color: C.textMuted }]}>発電所へ</Text>
                <Ionicons name="chevron-forward" size={13} color={C.textMuted} />
              </View>
            </View>
            <View style={styles.energyChipsRow}>
              <Text style={[styles.energyChipHome, { color: '#FFC97E' }]}>💪 元気 {lightEnergy.genki}</Text>
              <Text style={[styles.energyChipHome, { color: '#FFE29E' }]}>✨ 光 {lightEnergy.lightPower}</Text>
              <Text style={[styles.energyChipHome, { color: '#8EEFD0' }]}>⚡ 今日 +{lightEnergy.todayEnergy}</Text>
            </View>
            <View style={styles.plantProgressWrap}>
              <View style={styles.evoRow}>
                <Text style={[styles.evoLabel, { color: C.textSub }]}>
                  🏭 発電所 Lv.{plantLevelFor(lightEnergy.totalEnergy)}
                  {plantLevelFor(lightEnergy.totalEnergy) >= MAX_PLANT_LEVEL ? '(MAX)' : ''}
                </Text>
                <Text style={[styles.evoRemain, { color: '#FFD86B' }]}>蓄電 ⚡{lightEnergy.storedEnergy}</Text>
              </View>
              <View style={[styles.evoTrack, { backgroundColor: C.track }]}>
                <FillBar
                  pct={Math.round(plantLevelProgress(lightEnergy.totalEnergy) * 100)}
                  color="#FFD86B"
                  delay={500}
                />
              </View>
            </View>
            <Text style={[styles.cycleHint, { color: C.textMuted }]}>
              あなたが元気になるほど、世界も明るくなる。
            </Text>
          </TouchableOpacity>
        </FadeIn>

        {/* ── 今日の自分の一歩 ── */}
        <FadeIn delay={340}>
          <TouchableOpacity
            style={[styles.stepCard, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={() => router.push('/(tabs)/record')}
            activeOpacity={0.85}
          >
            <View style={styles.stepHeader}>
              <Text style={[styles.stepTitle, { color: C.text }]}>今日の自分の一歩</Text>
              <View style={[styles.stepRing, { borderColor: C.accent }]}>
                <Text style={[styles.stepRingText, { color: C.accent }]}>
                  {stepDone}<Text style={{ fontSize: 10, color: C.textMuted }}>/{totalCount}</Text>
                </Text>
              </View>
            </View>
            {stepItems.map((item) => (
              <View key={item.id} style={styles.stepRow}>
                <Ionicons
                  name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={item.checked ? C.accent : C.textMuted}
                />
                <Text
                  style={[
                    styles.stepText,
                    { color: item.checked ? C.textSub : C.textMuted },
                    item.checked && { textDecorationLine: 'line-through' },
                  ]}
                  numberOfLines={1}
                >
                  {item.text}
                </Text>
              </View>
            ))}
            {/* 昨日の自分より(1行に凝縮) */}
            <View style={styles.deltaFooter}>
              {hasComparison ? (
                <>
                  <Ionicons
                    name={stepDeltaPct >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={stepDeltaPct >= 0 ? '#7FDCA4' : '#FFB86B'}
                  />
                  <Text style={[styles.deltaFooterText, { color: stepDeltaPct >= 0 ? '#7FDCA4' : '#FFB86B' }]}>
                    昨日より {stepDeltaPct >= 0 ? '+' : ''}{stepDeltaPct.toFixed(0)}%
                    {stepDeltaPct >= 0 ? '・ちょっと前進してるよ' : '・ゆっくりでだいじょうぶ'}
                  </Text>
                </>
              ) : (
                <Text style={[styles.deltaFooterText, { color: C.textMuted }]}>
                  {!todayRec ? '今日の記録をつけると、昨日との前進が見えるよ' : '昨日の記録がないから、今日から比べていこう'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </FadeIn>

        {/* ── Mini Game Banner ── */}
        {currentSlot && (
          <FadeIn delay={390}>
            {slotDone ? (
              <View style={[styles.quickCard, { backgroundColor: C.card, borderColor: C.border, opacity: 0.6 }]}>
                <View style={[styles.quickIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <Text style={{ fontSize: 20 }}>{getSlotConfig(currentSlot).emoji}</Text>
                </View>
                <View style={styles.quickText}>
                  <Text style={[styles.quickTitle, { color: C.text }]}>{getSlotConfig(currentSlot).label}</Text>
                  <Text style={[styles.quickSub, { color: C.textMuted }]}>今日のゲームは終わったよ！また明日ね ✨</Text>
                </View>
                <View style={[styles.doneDot, { backgroundColor: C.accent }]} />
                <Text style={[styles.doneLabel, { color: C.textMuted }]}>完了</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.miniGameBanner, { borderColor: getSlotConfig(currentSlot).color + '66', backgroundColor: C.card }]}
                onPress={() => setShowMiniGame(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.miniGameIconWrap, { backgroundColor: getSlotConfig(currentSlot).color + '22' }]}>
                  <Text style={{ fontSize: 22 }}>{getSlotConfig(currentSlot).emoji}</Text>
                </View>
                <View style={styles.quickText}>
                  <Text style={[styles.quickTitle, { color: C.text }]}>{getSlotConfig(currentSlot).label}</Text>
                  <Text style={[styles.quickSub, { color: C.textMuted }]}>
                    {slotPlays > 0 ? `あと1回できるよ！ ` : ''}{getSlotConfig(currentSlot).rewardLabel}
                  </Text>
                </View>
                <View style={[styles.playBtn, { backgroundColor: getSlotConfig(currentSlot).color }]}>
                  <Text style={styles.playBtnText}>あそぶ</Text>
                </View>
              </TouchableOpacity>
            )}
          </FadeIn>
        )}

      </ScrollView>

      {/* ── Naming Modal ── */}
      <Modal visible={showNameModal} transparent animationType="slide" onRequestClose={() => setShowNameModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowNameModal(false)} />
          <View style={[styles.sheet, { backgroundColor: C.sheet }]}>
            <View style={[styles.handle, { backgroundColor: C.border }]} />
            <View style={styles.sheetHeader}>
              <Mascot stage={stage} mood="happy" size={72} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>
                  {mascotName ? '名前を変更する' : '名前をつけよう！'}
                </Text>
                <Text style={[styles.sheetSub, { color: C.textMuted }]}>
                  キャラクターに名前をつけてね
                </Text>
              </View>
            </View>
            <TextInput
              style={[styles.nameInput, { backgroundColor: C.input, color: C.text, borderColor: C.border }]}
              placeholder="なまえを入力（例：こころん）"
              placeholderTextColor={C.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={12}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (nameInput.trim()) { setMascotName(nameInput.trim()); setShowNameModal(false); }
              }}
            />
            <Text style={[styles.charCount, { color: C.textMuted }]}>
              {nameInput.length} / 12
            </Text>
            <Text style={[styles.presetLabel, { color: C.textMuted }]}>提案</Text>
            <View style={styles.presetRow}>
              {['こころん', 'みらい', 'ひかり', 'ほのか', 'そら', 'なな'].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: nameInput === n ? 'rgba(178,164,255,0.18)' : C.input,
                      borderColor: nameInput === n ? C.accent : 'transparent',
                      borderWidth: nameInput === n ? 1.5 : 0,
                    },
                  ]}
                  onPress={() => setNameInput(n)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetText, { color: nameInput === n ? C.accent : C.text }]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: nameInput.trim() ? C.primary : C.input }]}
              disabled={!nameInput.trim()}
              onPress={() => {
                if (nameInput.trim()) { setMascotName(nameInput.trim()); setShowNameModal(false); }
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.confirmText, { color: nameInput.trim() ? '#FFF' : C.textMuted }]}>
                {nameInput.trim() ? `「${nameInput}」に決める！` : '名前を入力してください'}
              </Text>
            </TouchableOpacity>
            <View style={{ height: Platform.OS === 'web' ? 16 : insets.bottom + 4 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Feed Modal ── */}
      <FeedModal visible={showFeedModal} onClose={() => setShowFeedModal(false)} />

      {/* ── Mini Game Modal ── */}
      {currentSlot && (
        <MiniGameModal
          visible={showMiniGame}
          slot={currentSlot}
          onClose={() => setShowMiniGame(false)}
          onReward={(reward) => completeMiniGame(currentSlot, reward)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  dateText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },

  // Logo
  logoImage: { width: 168, height: 25, marginTop: 6, marginBottom: 4 },

  // Streak — circular glass badge "3 DAYS"
  streakWrap: { alignItems: 'center', gap: 4 },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  helpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
  },
  helpText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  streakCircle: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(84,64,148,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  streakDashed: {
    position: 'absolute', top: 3, left: 3, right: 3, bottom: 3,
    borderRadius: 29, borderWidth: 1, borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.30)',
  },
  streakNum: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#FFF', lineHeight: 26 },
  streakUnit: { fontSize: 8, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)', letterSpacing: 2 },
  streakLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },

  // Cosmic hero
  hero: { alignItems: 'center', gap: 10 },
  mascotTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' },
  mascotTopLeft: { flexDirection: 'column', gap: 6, alignItems: 'flex-start' },
  stagePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  stageName: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  typeEmoji: { fontSize: 12 },
  typeName:  { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  levelText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  // Glass bubble(コメントだけの最小限の吹き出し)
  bubbleWrap: { marginTop: 2, marginBottom: 4, zIndex: 2, alignItems: 'center' },
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  bubbleText: {
    textAlign: 'center', fontSize: 13.5, lineHeight: 20,
    fontFamily: 'Inter_600SemiBold', color: '#3A2E6E',
    letterSpacing: 0.4,
  },
  bubbleTail: {
    width: 0, height: 0,
    borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.85)',
    marginTop: -1,
  },

  // Mascot glow
  /* ── 円形メニュー(オービット)── */
  orbitStage: {
    width: '100%',
    height: 372,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbBtn: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(84,64,148,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    zIndex: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  orbEmoji: { fontSize: 20, lineHeight: 24 },
  orbLabel: { fontSize: 9.5, fontWeight: '700', color: '#FFFFFF', marginTop: 1 },
  orbSub: { fontSize: 8.5, color: 'rgba(255,255,255,0.65)', marginTop: 0.5 },
  /* 六角形に均等配置(キャラ中心からの距離感を揃える) */
  orbTL: { top: 22, left: 30 },
  orbTR: { top: 22, right: 30 },
  orbML: { top: 148, left: 6 },
  orbMR: { top: 148, right: 6 },
  orbBL: { bottom: 20, left: 30 },
  orbBR: { bottom: 20, right: 30 },
  // ジャンプ中もオービットボタンの裏へ潜らないよう、キャラを最前面に置く。
  mascotWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 5, elevation: 5 },
  stageDesc: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  satietyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  satietyIcon: { fontSize: 14 },
  satietyTrack: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  satietyFill: { height: '100%', borderRadius: 4 },
  satietyLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', width: 72, textAlign: 'right' },

  feedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18,
    width: '100%', justifyContent: 'center',
  },
  feedBtnEmoji: { fontSize: 18 },
  feedBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },
  feedPtBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  feedPtText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#FFF' },

  evoWrap: { width: '100%', gap: 7 },
  evoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  evoLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  evoRemain: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  evoTrack: { height: 8, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  maxBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, alignSelf: 'center' },
  maxText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  sectionCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sectionSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  moodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  moodChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  plantLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  energyChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  energyChipHome: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  plantProgressWrap: { gap: 4 },
  cycleHint: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  deltaFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 8,
  },
  deltaFooterText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  statBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statBarLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 60 },
  statBarIcon: { fontSize: 13 },
  statBarLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  statBarTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden', position: 'relative' },
  statBarVal: { width: 28, textAlign: 'right', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  recordHint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12 },
  recordHintText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },

  stepCard: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 10 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  stepRing: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stepRingText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deltaValue: { fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  deltaSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  quickCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1 },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickText: { flex: 1, gap: 2 },
  quickTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  quickSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  quickPct: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  quickPctText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  doneDot: { width: 7, height: 7, borderRadius: 3.5 },
  doneLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  miniGameBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    borderRadius: 18, borderWidth: 1.5,
  },
  miniGameIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  playBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FFF' },

  nameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999,
  },
  mascotNameText: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  namePrompt: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },


  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  sheetSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },
  nameInput: { padding: 15, borderRadius: 14, fontSize: 16, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  charCount: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right', marginTop: -8 },
  presetLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  presetText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  confirmBtn: { padding: 17, borderRadius: 16, alignItems: 'center' },
  confirmText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
