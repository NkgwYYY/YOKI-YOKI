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
} from 'react-native';
import { MiniGameModal } from '@/components/MiniGameModal';
import { getCurrentSlot, getSlotConfig, GameSlot } from '@/utils/miniGameUtils';
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
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { SpeechBubble } from '@/components/SpeechBubble';
import { FeedModal } from '@/components/FeedModal';
import {
  getMascotStage,
  getMascotMood,
  getMascotMessage,
  calcStatus,
  getNextStageLevel,
  STAGE_LEVEL_MAP,
  STAGE_COLORS,
  pickIdleBehavior,
  IdleBehavior,
} from '@/utils/mascotUtils';
import { getGreeting, formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { xpToNextLevel, XP_PER_LEVEL } from '@/utils/gameLogic';
import { MascotRoomBg } from '@/components/MascotRoomBg';
import { getTodayActivity } from '@/utils/dailyActivity';

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

/* ── RPG status bar row ── */
function StatusBar({
  label, icon, value, color, delay,
}: {
  label: string; icon: string; value: number; color: string; delay: number;
}) {
  const colors = useColors();
  return (
    <View style={styles.statBarRow}>
      <View style={styles.statBarLabelWrap}>
        <Text style={styles.statBarIcon}>{icon}</Text>
        <Text style={[styles.statBarLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <View style={[styles.statBarTrack, { backgroundColor: colors.muted }]}>
        <FillBar pct={value} color={color} delay={delay} />
      </View>
      <Text style={[styles.statBarVal, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

/* ── Satiety bar ── */
function SatietyBar({ satiety, colors }: { satiety: number; colors: ReturnType<typeof useColors> }) {
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
      <View style={[styles.satietyTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.satietyFill, { width: `${satiety}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.satietyLabel, { color: colors.mutedForeground }]}>{label}</Text>
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
    progress, getTodayRecord, getCompletedCount, getTotalCheckCount,
    mascotName, setMascotName,
    currentSatiety, inactivityHours, feedState,
    miniGameState, completeMiniGame,
  } = useApp();

  const [showMiniGame, setShowMiniGame] = useState(false);
  const currentSlot = getCurrentSlot();
  const slotDone = currentSlot ? miniGameState[currentSlot] : true;

  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();

  const stage = getMascotStage(progress.level);
  const mood = getMascotMood(progress, todayRecord, completedCount, totalCount, {
    inactivityHours,
    satiety: currentSatiety,
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
  const todayActivity = React.useMemo(() => getTodayActivity(), []);

  const msgs = React.useMemo(() => {
    const m = getMascotMessage(mood);
    const idleMsg =
      idleBehavior === 'rolling'  ? 'ごろごろ〜♪' :
      idleBehavior === 'sleeping' ? 'zzz…すやすや…' :
      idleBehavior === 'playing'  ? 'あそんでたよ！' :
      m;
    return [idleMsg, m, 'タップしてみてね！', '一緒に頑張ろう！', '今日も来てくれたね♪'];
  }, [mood, idleBehavior]);
  const currentMsg = msgs[msgIndex % msgs.length];

  const nextStageLevel = getNextStageLevel(progress.level);
  const stageInfo = STAGE_LEVEL_MAP.find((s) => s.stage === stage)!;
  const stageColors = STAGE_COLORS[stage];
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bgColors = isDark
    ? (['#0E0A1C', '#130D28'] as const)
    : (['#FAF7FF', '#F0F5FF'] as const);

  const moodColors = ['', '#EF4444', '#FF6B35', '#FFB800', '#00C4A7', '#00D4AA'];
  const moodLabels = ['', '最悪', '辛い', '普通', '良い', '最高'];

  return (
    <View style={styles.flex}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />
      <View style={[styles.orb1, { backgroundColor: stageColors.body + '28' }]} />
      <View style={[styles.orb2, { backgroundColor: colors.secondary + '14' }]} />

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
            {/* ── MENTRE logo ── */}
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{getGreeting()}</Text>
              <View style={styles.logoRow}>
                {/* accent bar */}
                <LinearGradient
                  colors={['#A855F7', '#6366F1']}
                  style={styles.logoBar}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
                <View>
                  <Text style={[styles.logoText, { color: colors.foreground }]}>MENTRE</Text>
                  <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>メンタルトレーニング</Text>
                </View>
              </View>
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                {formatDateJP(getTodayDate())}
              </Text>
            </View>

            {/* ── Streak badge ── */}
            <View style={styles.streakWrap}>
              <LinearGradient
                colors={progress.streak > 0 ? ['#FF6FA3', '#FF9A3C'] : ['#6B7280', '#9CA3AF']}
                style={styles.streakBadge}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.streakFlame}>{progress.streak > 0 ? '🔥' : '💤'}</Text>
                <Text style={styles.streakNum}>{progress.streak}</Text>
                <Text style={styles.streakUnit}>DAY{progress.streak !== 1 ? 'S' : ''}</Text>
              </LinearGradient>
              <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>
                {progress.streak >= 7 ? '🏆 継続中！' : '連続記録'}
              </Text>
            </View>
          </View>
        </FadeIn>

        {/* ── Mascot Card ── */}
        <FadeIn delay={80}>
          <View style={[styles.mascotCard, { borderColor: colors.border, overflow: 'hidden' }]}>
            {/* Room background scene */}
            <MascotRoomBg level={progress.level} streak={progress.streak} totalDays={progress.totalDays} />

            {/* Stage color tint overlay */}
            <LinearGradient
              colors={isDark
                ? ['transparent', stageColors.body + '28', '#0F1030CC']
                : ['transparent', stageColors.body + '18', '#FFFFFFCC']}
              style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
            />

            {/* Stage ribbon */}
            <View style={styles.mascotTopRow}>
              <View style={[styles.stagePill, { backgroundColor: stageColors.body + '44', borderColor: stageColors.accent + '55' }]}>
                <Text style={[styles.stageName, { color: isDark ? stageColors.accent : stageColors.body }]}>
                  {stageInfo.name}
                </Text>
              </View>
              <View style={[styles.levelPill, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="star" size={11} color={colors.primary} />
                <Text style={[styles.levelText, { color: colors.primary }]}>Lv.{progress.level}</Text>
              </View>
            </View>

            {/* Mascot + bubble */}
            <View style={styles.mascotCenter}>
              <SpeechBubble
                message={currentMsg}
                onPress={() => setMsgIndex((i) => i + 1)}
              />
              <Mascot
                stage={stage}
                mood={mood}
                size={150}
                idleBehavior={idleBehavior}
                onPress={() => setMsgIndex((i) => i + 1)}
              />
            </View>

            {/* Name display */}
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => { setNameInput(mascotName); setShowNameModal(true); }}
              activeOpacity={0.75}
            >
              {mascotName ? (
                <>
                  <Text style={[styles.mascotNameText, { color: colors.foreground }]}>
                    {mascotName}
                  </Text>
                  <Ionicons name="pencil" size={13} color={colors.mutedForeground} />
                </>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={15} color={colors.primary} />
                  <Text style={[styles.namePrompt, { color: colors.primary }]}>
                    名前をつけよう！
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Daily activity ── */}
            <View style={[styles.activityRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={styles.activityEmoji}>{todayActivity.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityLabel, { color: colors.mutedForeground }]}>今日のできごと</Text>
                <Text style={[styles.activityText, { color: colors.foreground }]}>{todayActivity.text}</Text>
              </View>
            </View>

            {/* Stage desc */}
            <Text style={[styles.stageDesc, { color: colors.mutedForeground }]}>
              {stageInfo.desc}
            </Text>

            {/* Satiety bar */}
            <SatietyBar satiety={currentSatiety} colors={colors} />

            {/* Feed button */}
            <TouchableOpacity
              style={[styles.feedBtn, { backgroundColor: colors.primary }]}
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
                  <Text style={[styles.evoLabel, { color: colors.mutedForeground }]}>
                    次の進化まで Lv.{nextStageLevel}
                  </Text>
                  <Text style={[styles.evoRemain, { color: colors.primary }]}>
                    あと {nextStageLevel - progress.level} レベル
                  </Text>
                </View>
                <View style={[styles.evoTrack, { backgroundColor: colors.muted }]}>
                  <FillBar
                    pct={Math.min(100, (progress.level / nextStageLevel) * 100)}
                    color={stageColors.accent}
                    delay={600}
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.maxBadge, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="trophy" size={14} color={colors.primary} />
                <Text style={[styles.maxText, { color: colors.primary }]}>最高段階に達しました！</Text>
              </View>
            )}
          </View>
        </FadeIn>

        {/* ── RPG ステータス ── */}
        <FadeIn delay={180}>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>今日のパラメータ</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                {todayRecord ? '記録済み' : '未記録'}
              </Text>
            </View>
            <StatusBar label="元気度" icon="💪" value={status.vitality}  color="#00D4AA" delay={300} />
            <StatusBar label="幸福度" icon="💖" value={status.happiness} color="#FF6FA3" delay={420} />
            <StatusBar label="行動力" icon="⚡" value={status.activity}  color="#FFB347" delay={540} />
            {!todayRecord && (
              <TouchableOpacity
                style={[styles.recordHint, { backgroundColor: colors.muted }]}
                onPress={() => router.push('/(tabs)/record')}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={15} color={colors.primary} />
                <Text style={[styles.recordHintText, { color: colors.mutedForeground }]}>
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
              { value: progress.level,     label: 'レベル', icon: 'star',   color: colors.primary },
              { value: progress.totalDays, label: '記録日', icon: 'calendar', color: colors.accent },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={s.icon as any} size={15} color={s.color} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* ── Today Checklist quick-link ── */}
        <FadeIn delay={360}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/check')}
            activeOpacity={0.82}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            </View>
            <View style={styles.quickText}>
              <Text style={[styles.quickTitle, { color: colors.foreground }]}>今日のチェック</Text>
              <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>
                {completedCount} / {totalCount} 完了・達成で🪙ポイント獲得
              </Text>
            </View>
            <View style={[styles.quickPct, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.quickPctText, { color: colors.primary }]}>
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </FadeIn>

        {/* ── Mini Game Banner ── */}
        {currentSlot && (
          <FadeIn delay={390}>
            {slotDone ? (
              <View style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.6 }]}>
                <View style={[styles.quickIcon, { backgroundColor: colors.muted }]}>
                  <Text style={{ fontSize: 20 }}>{getSlotConfig(currentSlot).emoji}</Text>
                </View>
                <View style={styles.quickText}>
                  <Text style={[styles.quickTitle, { color: colors.foreground }]}>{getSlotConfig(currentSlot).label}</Text>
                  <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>今日はもう遊んだよ！また明日ね ✨</Text>
                </View>
                <View style={[styles.doneDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.doneLabel, { color: colors.mutedForeground }]}>完了</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.miniGameBanner, { borderColor: getSlotConfig(currentSlot).color + '66' }]}
                onPress={() => setShowMiniGame(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.miniGameIconWrap, { backgroundColor: getSlotConfig(currentSlot).color + '22' }]}>
                  <Text style={{ fontSize: 22 }}>{getSlotConfig(currentSlot).emoji}</Text>
                </View>
                <View style={styles.quickText}>
                  <Text style={[styles.quickTitle, { color: colors.foreground }]}>{getSlotConfig(currentSlot).label}</Text>
                  <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>{getSlotConfig(currentSlot).rewardLabel}</Text>
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
            <View style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.quickIcon, { backgroundColor: moodColors[todayRecord.mood] + '22' }]}>
                <Ionicons name="happy-outline" size={22} color={moodColors[todayRecord.mood]} />
              </View>
              <View style={styles.quickText}>
                <Text style={[styles.quickTitle, { color: colors.foreground }]}>今日の気分</Text>
                <Text style={[styles.quickSub, { color: moodColors[todayRecord.mood] }]}>
                  {moodLabels[todayRecord.mood]}
                </Text>
              </View>
              <View style={[styles.doneDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.doneLabel, { color: colors.mutedForeground }]}>記録済</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/record')}
              activeOpacity={0.82}
            >
              <View style={[styles.quickIcon, { backgroundColor: colors.secondary + '22' }]}>
                <Ionicons name="create-outline" size={22} color={colors.secondary} />
              </View>
              <View style={styles.quickText}>
                <Text style={[styles.quickTitle, { color: colors.foreground }]}>今日の気分を記録</Text>
                <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>
                  記録するとXP + 🪙5pt
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
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
  orb1: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -80, right: -90 },
  orb2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: 240, left: -70 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  dateText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },

  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBar: { width: 4, height: 32, borderRadius: 2 },
  logoText: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: 4 },
  logoSub: { fontSize: 9, fontFamily: 'Inter_400Regular', letterSpacing: 1.5, marginTop: 1 },

  // Streak
  streakWrap: { alignItems: 'center', gap: 4 },
  streakBadge: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, minWidth: 72, gap: 0 },
  streakFlame: { fontSize: 18, lineHeight: 22 },
  streakNum: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#FFF', lineHeight: 26 },
  streakUnit: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  streakLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },

  mascotCard: { borderRadius: 26, padding: 20, borderWidth: 1, alignItems: 'center', gap: 10 },
  mascotTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  stagePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  stageName: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  levelText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  mascotCenter: { alignItems: 'center', gap: 6, paddingVertical: 4 },
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
  maxBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
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
    backgroundColor: 'transparent',
  },
  miniGameIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  playBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FFF' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mascotNameText: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  namePrompt: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  activityEmoji: { fontSize: 26 },
  activityLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  activityText:  { fontSize: 13, fontFamily: 'Inter_500Medium' },

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
