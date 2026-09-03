import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  FlatList, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Analytics } from '@/utils/analytics';
import { RestEventModal } from '@/components/RestEventModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring, withDelay,
} from 'react-native-reanimated';
import { border, colors, control, radius, screenPadding, space, typography } from '@/constants/theme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp } from '@/contexts/AppContext';
import { profileToContext } from '@/utils/profileContext';
import { Mascot } from '@/components/Mascot';
import { getMascotStage, getMascotMood } from '@/utils/mascotUtils';
import { formatDateJP, getTodayDate, getYesterdayDate } from '@/utils/dateUtils';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 64 : 0;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dateKey: string;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function messageDateFromId(id: unknown): Date | null {
  if (typeof id !== 'string') return null;
  const match = id.match(/_(\d{10,})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStoredMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== 'object') return null;
  const message = raw as Partial<Message>;
  if (
    typeof message.id !== 'string'
    || (message.role !== 'user' && message.role !== 'assistant')
    || typeof message.content !== 'string'
  ) return null;
  const idDate = messageDateFromId(message.id);
  const timestampDate = message.timestamp ? new Date(message.timestamp) : idDate;
  const validDate = timestampDate && !Number.isNaN(timestampDate.getTime()) ? timestampDate : new Date();
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp && !Number.isNaN(new Date(message.timestamp).getTime())
      ? message.timestamp
      : validDate.toISOString(),
    dateKey: typeof message.dateKey === 'string' ? message.dateKey : localDateKey(validDate),
  };
}

function newMessage(id: string, role: Message['role'], content: string): Message {
  const now = new Date();
  return { id, role, content, timestamp: now.toISOString(), dateKey: localDateKey(now) };
}

function messageDateLabel(dateKey: string): string {
  if (dateKey === getTodayDate()) return '今日';
  if (dateKey === getYesterdayDate()) return '昨日';
  return formatDateJP(dateKey);
}

function TypingDots() {
  const d0 = useSharedValue(0);
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);

  useEffect(() => {
    const anim = (v: typeof d0, delay: number) => {
      v.value = withDelay(delay,
        withRepeat(withSequence(
          withTiming(-5, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ), -1, false)
      );
    };
    anim(d0, 0);
    anim(d1, 160);
    anim(d2, 320);
  }, []);

  const s0 = useAnimatedStyle(() => ({ transform: [{ translateY: d0.value }] }));
  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: d1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: d2.value }] }));

  return (
    <View style={dotStyles.row}>
      <Animated.View style={[dotStyles.dot, s0]} />
      <Animated.View style={[dotStyles.dot, s1]} />
      <Animated.View style={[dotStyles.dot, s2]} />
    </View>
  );
}
const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs, alignItems: 'center', padding: space.xs },
  dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.subtleForeground },
});

function MessageBubble({ msg, mascotStage, mascotMood }: {
  msg: Message;
  mascotStage: ReturnType<typeof getMascotStage>;
  mascotMood: ReturnType<typeof getMascotMood>;
}) {
  const isUser = msg.role === 'user';
  const opacity = useSharedValue(0);
  const ty = useSharedValue(10);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 260 });
    ty.value = withSpring(0, { damping: 20, stiffness: 220 });
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  if (isUser) {
    return (
      <Animated.View style={[bubbleStyles.rowUser, style]}>
        <View style={bubbleStyles.bubbleUser}>
          <Text style={bubbleStyles.userText}>{msg.content}</Text>
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[bubbleStyles.rowMascot, style]}>
      <View style={bubbleStyles.avatar}>
        <Mascot stage={mascotStage} mood={mascotMood} size={42} />
      </View>
      <View style={bubbleStyles.bubbleMascot}>
        <Text style={bubbleStyles.mascotText}>{msg.content}</Text>
      </View>
    </Animated.View>
  );
}

function DateDivider({ dateKey }: { dateKey: string }) {
  return (
    <View style={bubbleStyles.dateDivider}>
      <View style={bubbleStyles.dateLine} />
      <Text style={bubbleStyles.dateText}>{messageDateLabel(dateKey)}</Text>
      <View style={bubbleStyles.dateLine} />
    </View>
  );
}
const bubbleStyles = StyleSheet.create({
  rowUser: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: screenPadding },
  rowMascot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: screenPadding,
  },
  avatar: { flexShrink: 0 },
  bubbleUser: {
    maxWidth: '76%',
    padding: space.md,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  userText: { ...typography.body, color: colors.primaryForeground },
  bubbleMascot: {
    maxWidth: '76%',
    padding: space.md,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: colors.card,
    ...border.hairline,
  },
  mascotText: { ...typography.body, color: colors.foreground },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: screenPadding,
  },
  dateLine: { height: border.width, flex: 1, backgroundColor: colors.border },
  dateText: { ...typography.micro, color: colors.mutedForeground },
});

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale style={chipStyles.chip} onPress={onPress}>
      <Text style={chipStyles.text}>{label}</Text>
    </PressScale>
  );
}
const chipStyles = StyleSheet.create({
  chip: {
    minHeight: control.heightSm,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...border.hairlineStrong,
  },
  text: { ...typography.label, color: colors.foreground },
});

const CHAT_HISTORY_KEY = '@mentore/chat_history_v1';
const MAX_STORED = 60;
const MAX_CONTEXT = 20;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { progress, records, mascotName, getTodayRecord, getCompletedCount, getTotalCheckCount,
          currentSatiety, inactivityHours, profile } = useApp();

  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();
  const mascotStage = getMascotStage(progress.level);
  const mascotMood = getMascotMood(progress, todayRecord, completedCount, totalCount, {
    inactivityHours, satiety: currentSatiety,
  });
  const displayName = mascotName || 'こころん';
  const welcomeMsg = newMessage('welcome', 'assistant', `やあ！${displayName}だよ。なんでも話しかけてね！`);

  const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRestEvent, setShowRestEvent] = useState(false);
  const listRef = useRef<FlatList>(null);
  const sendScale = useSharedValue(1);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (raw) {
          const stored = (JSON.parse(raw) as unknown[])
            .map(normalizeStoredMessage)
            .filter((message): message is Message => message !== null)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          if (stored.length > 0) {
            setMessages([welcomeMsg, ...stored]);
          }
        }
      } catch { /* use default */ }
      setHistoryLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    const toSave = messages.filter(m => m.id !== 'welcome').slice(-MAX_STORED);
    AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toSave)).catch(() => {});
  }, [messages, historyLoaded]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
    setMessages([{ ...welcomeMsg, content: `また話しかけてね！${displayName}はいつでもここにいるよ` }]);
  }, [displayName]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput('');

    const userMsg = newMessage(`u_${Date.now()}`, 'user', msg);
    const next = [...messages, userMsg];
    setMessages(next);
    scrollToBottom();
    setIsLoading(true);

    sendScale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );

    try {
      const history = next
        .filter(m => m.id !== 'welcome')
        .slice(-MAX_CONTEXT)
        .map(m => ({ role: m.role, content: m.content, dateKey: m.dateKey }));

      const recent = [...records].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
      const todayRec = getTodayRecord();
      const avgOf = (nums: number[]) =>
        nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : null;
      const ctxParts: string[] = [];
      const profileLine = profileToContext(profile);
      if (profileLine) ctxParts.push(`ユーザーのプロフィール: ${profileLine}`);
      if (recent.length) {
        ctxParts.push(`直近${recent.length}日: 平均気分${avgOf(recent.map(r => r.mood))}/5, 平均睡眠${avgOf(recent.map(r => r.sleep))}h`);
      }
      if (todayRec) {
        ctxParts.push(
          `今日の記録: 気分${todayRec.mood}/5, 睡眠${todayRec.sleep}h` +
          (todayRec.behaviors.length ? `, したこと[${todayRec.behaviors.join(',')}]` : '') +
          (todayRec.win ? `, 小さな成功「${todayRec.win}」` : '')
        );
      }
      const recentWins = recent.map(r => r.win).filter(Boolean).slice(-3);
      if (recentWins.length) ctxParts.push(`最近の小さな成功: ${recentWins.join(' / ')}`);
      if (progress?.streak) ctxParts.push(`連続記録${progress.streak}日目`);

      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          mascotName: displayName,
          mascotStage,
          todayDate: getTodayDate(),
          context: ctxParts.join('\n') || undefined,
        }),
      });
      const data = await res.json();
      const assistantMsg = newMessage(`a_${Date.now()}`, 'assistant', data.content || 'うん、聞いてるよ！');
      setMessages(prev => [...prev, assistantMsg]);
      Analytics.chatMessageSent();
      if (data.restEvent) {
        setTimeout(() => setShowRestEvent(true), 1200);
      }
    } catch {
      setMessages(prev => [...prev, newMessage(
        `err_${Date.now()}`,
        'assistant',
        'ごめん、うまく繋がらなかった…もう一度話しかけてね',
      )]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, isLoading, messages, displayName, mascotStage, records, progress, profile, getTodayRecord, scrollToBottom]);

  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  const topPad = Platform.OS === 'web' ? space.xl : insets.top;

  const canSend = !!input.trim() && !isLoading;
  const showChips = messages.length <= 1;
  const CHIPS = ['今日あったこと話したい', '少し落ち込んでる', 'がんばった！聞いて', '雑談しよう'];

  return (
    <View style={styles.root}>
      <SkyBackground />

      <View style={[styles.header, { paddingTop: topPad + space.md }]}>
        <Mascot stage={mascotStage} mood={mascotMood} size={40} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerName}>{displayName}</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>
              {messages.filter(m => m.id !== 'welcome').length > 0
                ? `${messages.filter(m => m.id !== 'welcome').length}件の会話`
                : 'いつでもそばにいるよ'}
            </Text>
          </View>
        </View>
        {messages.length > 1 && (
          <PressScale
            onPress={clearHistory}
            style={styles.clearBtn}
            accessibilityLabel="会話履歴を消す"
          >
            <Icon name="trash-2" size={18} color={colors.mutedForeground} />
          </PressScale>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        renderItem={({ item, index }) => (
          <>
            {(index === 0 || messages[index - 1]?.dateKey !== item.dateKey) && (
              <DateDivider dateKey={item.dateKey} />
            )}
            <MessageBubble msg={item} mascotStage={mascotStage} mascotMood={mascotMood} />
          </>
        )}
        ListFooterComponent={isLoading ? (
          <View style={bubbleStyles.rowMascot}>
            <View style={bubbleStyles.avatar}>
              <Mascot stage={mascotStage} mood="happy" size={40} />
            </View>
            <View style={bubbleStyles.bubbleMascot}>
              <TypingDots />
            </View>
          </View>
        ) : null}
      />

      <View
        style={[
          styles.inputArea,
          { paddingBottom: TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? insets.bottom : space.sm) },
        ]}
      >
        {showChips && (
          <View style={styles.chips}>
            {CHIPS.map(c => (
              <Chip key={c} label={c} onPress={() => sendMessage(c)} />
            ))}
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={`${displayName}に話しかける…`}
            placeholderTextColor={colors.subtleForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={400}
            onSubmitEditing={() => sendMessage()}
          />
          <Animated.View style={sendBtnStyle}>
            <PressScale
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={() => sendMessage()}
              disabled={!canSend}
              accessibilityLabel="送信"
              accessibilityState={{ disabled: !canSend }}
            >
              <Icon
                name="send"
                size={16}
                color={canSend ? colors.primaryForeground : colors.disabledForeground}
              />
            </PressScale>
          </Animated.View>
        </View>
      </View>

      <RestEventModal
        visible={showRestEvent}
        level={progress.level}
        mascotName={displayName}
        onClose={() => setShowRestEvent(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: screenPadding,
    paddingBottom: space.md,
    borderBottomWidth: border.width,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerCopy: { flex: 1 },
  headerName: { ...typography.subhead, color: colors.foreground },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  onlineDot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.success },
  onlineText: { ...typography.micro, color: colors.mutedForeground },
  clearBtn: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: { flex: 1 },
  listContent: { paddingVertical: space.lg, gap: space.md },

  inputArea: {
    borderTopWidth: border.width,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: space.md,
    paddingHorizontal: screenPadding,
    gap: space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.xl,
    backgroundColor: colors.input,
    ...border.hairlineStrong,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.xs,
    gap: space.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.foreground,
    maxHeight: 120,
    paddingVertical: space.sm,
  },
  sendBtn: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...border.inner,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: colors.muted },
});