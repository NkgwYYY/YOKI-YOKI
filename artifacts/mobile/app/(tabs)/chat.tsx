import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Platform, useColorScheme,
} from 'react-native';
import { RestEventModal } from '@/components/RestEventModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring, withDelay,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { getMascotStage, getMascotMood } from '@/utils/mascotUtils';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

// Tab bar height constants (matches _layout.tsx)
const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 84 : 0;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/* ── Typing dots ── */
function TypingDots() {
  const colors = useColors();
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
      <Animated.View style={[dotStyles.dot, { backgroundColor: colors.mutedForeground }, s0]} />
      <Animated.View style={[dotStyles.dot, { backgroundColor: colors.mutedForeground }, s1]} />
      <Animated.View style={[dotStyles.dot, { backgroundColor: colors.mutedForeground }, s2]} />
    </View>
  );
}
const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});

/* ── Message bubble ── */
function MessageBubble({ msg, mascotStage, mascotMood, colors }: {
  msg: Message;
  mascotStage: ReturnType<typeof getMascotStage>;
  mascotMood: ReturnType<typeof getMascotMood>;
  colors: ReturnType<typeof useColors>;
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
        <View style={[bubbleStyles.bubbleUser, { backgroundColor: colors.primary }]}>
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
      <View style={[bubbleStyles.bubbleMascot, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[bubbleStyles.mascotText, { color: colors.foreground }]}>{msg.content}</Text>
      </View>
    </Animated.View>
  );
}
const bubbleStyles = StyleSheet.create({
  rowUser: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16 },
  rowMascot: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16 },
  avatar: { marginBottom: 2, flexShrink: 0 },
  bubbleUser: { maxWidth: '72%', padding: 13, borderRadius: 20, borderBottomRightRadius: 4 },
  userText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  bubbleMascot: { maxWidth: '72%', padding: 13, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1 },
  mascotText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
});

/* ── Suggestion chip ── */
function Chip({ label, onPress, colors }: { label: string; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity
      style={[chipStyles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[chipStyles.text, { color: colors.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  text: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});

/* ── Main screen ── */
export default function ChatScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { progress, mascotName, getTodayRecord, getCompletedCount, getTotalCheckCount } = useApp();

  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();
  const { currentSatiety, inactivityHours } = useApp();
  const mascotStage = getMascotStage(progress.level);
  const mascotMood = getMascotMood(progress, todayRecord, completedCount, totalCount, {
    inactivityHours,
    satiety: currentSatiety,
  });
  const displayName = mascotName || 'こころん';

  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: `やあ！${displayName}だよ✨ なんでも話しかけてね！` },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRestEvent, setShowRestEvent] = useState(false);
  const listRef = useRef<FlatList>(null);
  const sendScale = useSharedValue(1);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput('');

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: msg };
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
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, mascotName: displayName, mascotStage }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: data.content || 'うん、聞いてるよ！',
      }]);
      if (data.restEvent) {
        setTimeout(() => setShowRestEvent(true), 1200);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'ごめん、うまく繋がらなかった…もう一度話しかけてね🥺',
      }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, isLoading, messages, displayName, mascotStage, scrollToBottom]);

  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bgColors = isDark ? ['#0E0A1C', '#130D28'] as const : ['#FAF7FF', '#F0F5FF'] as const;

  const showChips = messages.length <= 1;
  const CHIPS = ['今日あったこと話したい', '少し落ち込んでる', 'がんばった！聞いて', '雑談しよう'];

  return (
    <View style={styles.root}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border }]}>
        <View style={styles.headerAvatar}>
          <Mascot stage={mascotStage} mood={mascotMood} size={46} />
        </View>
        <View>
          <Text style={[styles.headerName, { color: colors.foreground }]}>{displayName}</Text>
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.onlineText, { color: colors.mutedForeground }]}>いつでもそばにいるよ</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        renderItem={({ item }) => (
          <MessageBubble
            msg={item}
            mascotStage={mascotStage}
            mascotMood={mascotMood}
            colors={colors}
          />
        )}
        ListFooterComponent={isLoading ? (
          <View style={[bubbleStyles.rowMascot, { paddingHorizontal: 16 }]}>
            <View style={bubbleStyles.avatar}>
              <Mascot stage={mascotStage} mood="happy" size={42} />
            </View>
            <View style={[bubbleStyles.bubbleMascot, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TypingDots />
            </View>
          </View>
        ) : null}
      />

      {/* Input area — sits above the tab bar */}
      <View style={[
        styles.inputArea,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? insets.bottom : 8),
        },
      ]}>
        {/* Chips */}
        {showChips && (
          <View style={styles.chips}>
            {CHIPS.map(c => (
              <Chip key={c} label={c} onPress={() => sendMessage(c)} colors={colors} />
            ))}
          </View>
        )}

        {/* Input row */}
        <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={`${displayName}に話しかける…`}
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={400}
            onSubmitEditing={() => sendMessage()}
          />
          <Animated.View style={sendBtnStyle}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() && !isLoading ? colors.primary : colors.border },
              ]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              activeOpacity={0.85}
            >
              <Ionicons
                name="send"
                size={17}
                color={input.trim() && !isLoading ? '#FFF' : colors.mutedForeground}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
      {/* ── Rest Event Modal ── */}
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
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerAvatar: { marginBottom: -4 },
  headerName: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  list: { flex: 1 },
  listContent: { paddingVertical: 16, gap: 12 },

  inputArea: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    borderRadius: 26, borderWidth: 1,
    paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
    gap: 6,
  },
  input: {
    flex: 1,
    fontSize: 15, fontFamily: 'Inter_400Regular',
    maxHeight: 120, lineHeight: 22,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
});
