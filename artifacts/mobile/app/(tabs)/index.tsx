import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useColorScheme,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { MiniGameModal } from '@/components/MiniGameModal';
import { EvolutionVideoModal } from '@/components/EvolutionVideoModal';
import { getCurrentSlot, getSlotConfig, GameSlot, MAX_PLAYS_PER_SLOT } from '@/utils/miniGameUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { FeedModal } from '@/components/FeedModal';
import { CosmicBackground } from '@/components/CosmicBackground';
import {
  getMascotStage,
  getMascotMood,
  getMascotMessage,
  calcStatus,
  getNextStageLevel,
  getStageColors,
  calcEvolutionType,
  calcDevelopingType,
  EVOLUTION_TYPE_INFO,
  STAGE_LEVEL_MAP,
  getStageName,
  STAGE_COLORS,
  pickIdleBehavior,
  IdleBehavior,
} from '@/utils/mascotUtils';
import { getGreeting, formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { xpToNextLevel, XP_PER_LEVEL } from '@/utils/gameLogic';
import { getAllActivities } from '@/utils/dailyActivity';

/* ── Cosmic theme palette ── */
const C = {
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.55)',
  card: 'rgba(28,18,61,0.55)',
  cardSolid: 'rgba(28,18,61,0.82)',
  border: 'rgba(255,255,255,0.12)',
  pill: 'rgba(28,18,61,0.6)',
  accent: '#B2A4FF',
  glow: 'rgba(155,114,203,0.30)',
  track: 'rgba(255,255,255,0.12)',
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

/* ── Floating glass bubble (speech) ── */
function GlassBubble({ message, onPress }: { message: string; onPress: () => void }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(-10, { duration: 2500 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={style}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.bubble}>
        {/* inner highlight */}
        <View style={styles.bubbleHighlight} />
        <View style={styles.bubbleGlowSpot} />
        <Text style={styles.bubbleText}>{message}</Text>
        <Text style={styles.bubbleHint}>タップで変更</Text>
      </TouchableOpacity>
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
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    progress, records, getTodayRecord, getCompletedCount, getTotalCheckCount,
    mascotName, setMascotName,
    currentSatiety, inactivityHours, feedState,
    miniGameState, completeMiniGame,
  } = useApp();

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

  const [msgIndex, setMsgIndex] = useState(0);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // ── 進化映像モーダル ──
  const [showEvolutionVideo, setShowEvolutionVideo] = useState(false);
  const prevStageRef = React.useRef<string | null>(null);

  useEffect(() => {
    // 初回レンダー時は prevStage を設定するだけ（映像は表示しない）
    if (prevStageRef.current === null) {
      prevStageRef.current = stage;
      return;
    }
    // ステージが上がったときだけ映像を再生
    if (prevStageRef.current !== stage) {
      prevStageRef.current = stage;
      setShowEvolutionVideo(true);
    }
  }, [stage]);

  const handlePet = React.useCallback(() => {
    // アニメーション・ハートのみ — 吹き出しは変えない
  }, []);
  const msgs = React.useMemo(() => {
    const m = getMascotMessage(mood);
    const idleMsg =
      idleBehavior === 'rolling'  ? 'ごろごろ〜♪' :
      idleBehavior === 'sleeping' ? 'zzz…すやすや…' :
      idleBehavior === 'playing'  ? 'あそんでたよ！' :
      m;
    const fixed = [
      idleMsg, m,
      'タップしてみてね！', '一緒に頑張ろう！',
      '今日も来てくれたね♪', 'そばにいるよ〜',
      'なにか話しかけてみて！', 'きょうはどんな日だった？',
    ];
    // 日課メッセージ（全40種）をシャッフルして追加
    const activities = getAllActivities();
    const seed = Date.now() % activities.length;
    const shuffled = [...activities.slice(seed), ...activities.slice(0, seed)];
    return [...fixed, ...shuffled];
  }, [mood, idleBehavior]);
  const currentMsg = msgs[msgIndex % msgs.length];

  const nextStageLevel = getNextStageLevel(progress.level);
  const stageInfo = STAGE_LEVEL_MAP.find((s) => s.stage === stage)!;

  // 進化系統：Lv6以上で確定、Lv3-5は予告表示
  const evolutionType = React.useMemo(
    () => (stage === 'egg' ? null : calcEvolutionType(records, progress.streak)),
    [records, progress.streak, stage],
  );
  const developingType = React.useMemo(
    () => (stage === 'odango' ? calcDevelopingType(records, progress.streak) : null),
    [records, progress.streak, stage],
  );
  const typeInfo = evolutionType && (stage === 'stage3' || stage === 'stage4' || stage === 'stage5')
    ? EVOLUTION_TYPE_INFO[evolutionType]
    : null;
  const devTypeInfo = developingType ? EVOLUTION_TYPE_INFO[developingType] : null;

  const stageColors = getStageColors(stage, evolutionType);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const moodColors = ['', '#EF4444', '#FF6B35', '#FFB800', '#00C4A7', '#00D4AA'];
  const moodLabels = ['', '最悪', '辛い', '普通', '良い', '最高'];

  return (
    <View style={styles.flex}>
      <CosmicBackground />

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
                    {getStageName(stage, evolutionType ?? developingType)}
                  </Text>
                </View>
                {/* 系統バッジ：Lv6以上で確定表示、Lv3-5で予告 */}
                {typeInfo && (
                  <View style={[styles.typePill, { backgroundColor: C.pill, borderColor: C.border }]}>
                    <Text style={styles.typeEmoji}>{typeInfo.emoji}</Text>
                    <Text style={[styles.typeName, { color: C.textSub }]}>
                      {typeInfo.name}
                    </Text>
                  </View>
                )}
                {devTypeInfo && !typeInfo && (
                  <View style={[styles.typePill, { backgroundColor: C.pill, borderColor: C.border }]}>
                    <Text style={styles.typeEmoji}>🔮</Text>
                    <Text style={[styles.typeName, { color: C.textSub }]}>
                      {devTypeInfo.name}になりそう…
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.levelPill, { backgroundColor: C.pill, borderColor: C.border, borderWidth: 1 }]}>
                <Ionicons name="star" size={11} color={C.accent} />
                <Text style={[styles.levelText, { color: C.accent }]}>Lv.{progress.level}</Text>
              </View>
            </View>

            {/* Floating glass bubble */}
            <View style={styles.bubbleWrap}>
              <GlassBubble message={currentMsg} onPress={() => setMsgIndex((i) => i + 1)} />
            </View>

            {/* Mascot with glow */}
            <View style={styles.mascotWrap}>
              <View style={styles.mascotGlow} />
              <Mascot
                stage={stage}
                mood={mood}
                evolutionType={evolutionType}
                size={150}
                idleBehavior={idleBehavior}
                onPress={() => setMsgIndex((i) => i + 1)}
                onPet={handlePet}
              />
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

            {/* Feed button */}
            <TouchableOpacity
              style={[styles.feedBtn, { backgroundColor: '#9B72CB' }]}
              onPress={() => setShowFeedModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.feedBtnEmoji}>🍽️</Text>
              <Text style={styles.feedBtnText}>ごはんをあげる</Text>
              <View style={[styles.feedPtBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.feedPtText}>🪙 {feedState.points}pt</Text>
              </View>
            </TouchableOpacity>

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
              <Text style={[styles.sectionTitle, { color: C.text }]}>今日のパラメータ</Text>
              <Text style={[styles.sectionSub, { color: C.textMuted }]}>
                {todayRecord ? '記録済み' : '未記録'}
              </Text>
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

        {/* ── Stats Row ── */}
        <FadeIn delay={280}>
          <View style={styles.statsRow}>
            {[
              { value: progress.streak,    label: '連続', icon: 'flame',    color: '#FF6FA3' },
              { value: progress.level,     label: 'レベル', icon: 'star',   color: C.accent },
              { value: progress.totalDays, label: '記録日', icon: 'calendar', color: '#80D0C7' },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name={s.icon as any} size={15} color={s.color} />
                <Text style={[styles.statValue, { color: C.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* ── Today Checklist quick-link ── */}
        <FadeIn delay={360}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={() => router.push('/(tabs)/check')}
            activeOpacity={0.82}
          >
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(178,164,255,0.18)' }]}>
              <Ionicons name="checkmark-circle" size={22} color={C.accent} />
            </View>
            <View style={styles.quickText}>
              <Text style={[styles.quickTitle, { color: C.text }]}>今日のチェック</Text>
              <Text style={[styles.quickSub, { color: C.textMuted }]}>
                {completedCount} / {totalCount} 完了・達成で🪙ポイント獲得
              </Text>
            </View>
            <View style={[styles.quickPct, { backgroundColor: 'rgba(178,164,255,0.15)' }]}>
              <Text style={[styles.quickPctText, { color: C.accent }]}>
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
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

        {/* ── Mood quick-link ── */}
        <FadeIn delay={420}>
          {todayRecord ? (
            <View style={[styles.quickCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.quickIcon, { backgroundColor: moodColors[todayRecord.mood] + '22' }]}>
                <Ionicons name="happy-outline" size={22} color={moodColors[todayRecord.mood]} />
              </View>
              <View style={styles.quickText}>
                <Text style={[styles.quickTitle, { color: C.text }]}>今日の気分</Text>
                <Text style={[styles.quickSub, { color: moodColors[todayRecord.mood] }]}>
                  {moodLabels[todayRecord.mood]}
                </Text>
              </View>
              <View style={[styles.doneDot, { backgroundColor: C.accent }]} />
              <Text style={[styles.doneLabel, { color: C.textMuted }]}>記録済</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => router.push('/(tabs)/record')}
              activeOpacity={0.82}
            >
              <View style={[styles.quickIcon, { backgroundColor: 'rgba(255,111,163,0.18)' }]}>
                <Ionicons name="create-outline" size={22} color="#FF6FA3" />
              </View>
              <View style={styles.quickText}>
                <Text style={[styles.quickTitle, { color: C.text }]}>今日の気分を記録</Text>
                <Text style={[styles.quickSub, { color: C.textMuted }]}>
                  記録するとXP + 🪙5pt
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </FadeIn>
      </ScrollView>

      {/* ── Naming Modal ── */}
      <Modal visible={showNameModal} transparent animationType="slide" onRequestClose={() => setShowNameModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowNameModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Mascot stage={stage} mood="happy" size={72} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  {mascotName ? '名前を変更する' : '名前をつけよう！'}
                </Text>
                <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
                  キャラクターに名前をつけてね
                </Text>
              </View>
            </View>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="なまえを入力（例：こころん）"
              placeholderTextColor={colors.mutedForeground}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={12}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (nameInput.trim()) { setMascotName(nameInput.trim()); setShowNameModal(false); }
              }}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {nameInput.length} / 12
            </Text>
            <Text style={[styles.presetLabel, { color: colors.mutedForeground }]}>提案</Text>
            <View style={styles.presetRow}>
              {['こころん', 'みらい', 'ひかり', 'ほのか', 'そら', 'なな'].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: nameInput === n ? colors.primary + '22' : colors.muted,
                      borderColor: nameInput === n ? colors.primary : 'transparent',
                      borderWidth: nameInput === n ? 1.5 : 0,
                    },
                  ]}
                  onPress={() => setNameInput(n)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetText, { color: nameInput === n ? colors.primary : colors.foreground }]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: nameInput.trim() ? colors.primary : colors.muted }]}
              disabled={!nameInput.trim()}
              onPress={() => {
                if (nameInput.trim()) { setMascotName(nameInput.trim()); setShowNameModal(false); }
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.confirmText, { color: nameInput.trim() ? '#FFF' : colors.mutedForeground }]}>
                {nameInput.trim() ? `「${nameInput}」に決める！` : '名前を入力してください'}
              </Text>
            </TouchableOpacity>
            <View style={{ height: Platform.OS === 'web' ? 16 : insets.bottom + 4 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Feed Modal ── */}
      <FeedModal visible={showFeedModal} onClose={() => setShowFeedModal(false)} />

      {/* ── Evolution Video Modal ── */}
      <EvolutionVideoModal
        visible={showEvolutionVideo}
        onClose={() => setShowEvolutionVideo(false)}
      />

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
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    backgroundColor: 'rgba(26,16,53,0.40)',
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

  // Glass bubble
  bubbleWrap: { marginTop: 2, marginBottom: -34, zIndex: 2 },
  bubble: {
    width: 250, height: 250, borderRadius: 125,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  bubbleHighlight: {
    position: 'absolute', top: 14, left: 24,
    width: 150, height: 74,
    borderTopWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 100,
    transform: [{ rotate: '-25deg' }],
  },
  bubbleGlowSpot: {
    position: 'absolute', bottom: 22, right: 22,
    width: 110, height: 48, borderRadius: 60,
    backgroundColor: 'rgba(178,164,255,0.16)',
    transform: [{ rotate: '20deg' }],
  },
  bubbleText: {
    textAlign: 'center', fontSize: 16, lineHeight: 28,
    fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.95)',
    letterSpacing: 1.5, paddingHorizontal: 26,
  },
  bubbleHint: {
    fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 14, letterSpacing: 2,
    fontFamily: 'Inter_400Regular',
  },

  // Mascot glow
  mascotWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  mascotGlow: {
    position: 'absolute', width: 190, height: 190, borderRadius: 95,
    backgroundColor: 'rgba(155,114,203,0.28)',
  },

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
