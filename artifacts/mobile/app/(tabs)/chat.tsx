import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, useColorScheme,
} from 'react-native';
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/* ── Typing dots ── */
function TypingDots() {
  const colors = useColors();
  const dots = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];
  useEffect(() => {
    dots.forEach((d, i) => {
      d.value = withDelay(i * 160,
        withRepeat(
          withSequence(
            withTiming(-5, { duration: 300 }),
            withTiming(0,  { duration: 300 }),
          ), -1, false
        )
      );
    });
  }, []);
  return (
    <View style={typingStyles.row}>
      {dots.map((d, i) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const style = useAnimatedStyle(() => ({ transform: [{ translateY: d.value }] }));
        return (
          <Animated.View key={i} style={[typingStyles.dot, { backgroundColor: colors.mutedForeground }, style]} />
        );
      })}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});

/* ── Single message bubble ── */
function MessageBubble({ msg, mascotStage, mascotMood, colors, isDark }: {
  msg: Message;
  mascotStage: ReturnType<typeof getMascotStage>;
  mascotMood: ReturnType<typeof getMascotMood>;
  colors: ReturnType<typeof useColors>;
  isDark: boolean;
}) {
  const isUser = msg.role === 'user';
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (isUser) {
    return (
      <Animated.View style={[styles.rowUser, style]}>
        <View style={[styles.bubbleUser, { backgroundColor: colors.primary }]}>
          <Text style={styles.bubbleUserText}>{msg.content}</Text>
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[styles.rowMascot, style]}>
      <View style={styles.mascotAvatar}>
        <Mascot stage={mascotStage} mood={mascotMood} size={44} />
      </View>
      <View style={[styles.bubbleMascot, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.bubbleMascotText, { color: colors.foreground }]}>{msg.content}</Text>
      </View>
    </Animated.View>
  );
}

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
  const mascotStage = getMascotStage(progress.level);
  const mascotMood = getMascotMood(progress, todayRecord, completedCount, totalCount);
  const displayName = mascotName || 'こころん';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `やあ！${displayName}だよ✨ なんでも話しかけてね！`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const sendScale = useSharedValue(1);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    scrollToBottom();
    setIsLoading(true);

    sendScale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );

    try {
      const history = nextMessages
        .filter(m => m.id !== 'welcome')
        .slice(-12) // keep last 12 messages for context window
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          mascotName: displayName,
          mascotStage,
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: data.content ?? 'うん、聞いてるよ！',
      };
      setMessages(prev => [...prev, assistantMsg]);
      scrollToBottom();
    } catch {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'ごめん、うまく繋がらなかった…もう一度話しかけてね🥺',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, displayName, mascotStage, scrollToBottom]);

  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  const bgColors = isDark
    ? (['#0E0A1C', '#130D28'] as const)
    : (['#FAF7FF', '#F0F5FF'] as const);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 90 : insets.bottom + 90;

  return (
    <View style={styles.flex}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerMascot}>
          <Mascot stage={mascotStage} mood={mascotMood} size={48} />
        </View>
        <View>
          <Text style={[styles.headerName, { color: colors.foreground }]}>{displayName}</Text>
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.onlineText, { color: colors.mutedForeground }]}>いつでもそばにいるよ</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              mascotStage={mascotStage}
              mascotMood={mascotMood}
              colors={colors}
              isDark={isDark}
            />
          )}
          ListFooterComponent={isLoading ? (
            <View style={styles.rowMascot}>
              <View style={styles.mascotAvatar}>
                <Mascot stage={mascotStage} mood="happy" size={44} />
              </View>
              <View style={[styles.bubbleMascot, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TypingDots />
              </View>
            </View>
          ) : null}
        />

        {/* Input bar */}
        <View style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === 'web' ? 16 : insets.bottom + 12,
          }
        ]}>
          {/* Suggestion chips (only when no messages yet) */}
          {messages.length <= 1 && (
            <View style={styles.chips}>
              {['今日あったこと話したい', '少し落ち込んでる', 'がんばった！聞いて', '雑談しよう'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={() => setInput(t)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, { color: colors.foreground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder={`${displayName}に話しかける…`}
              placeholderTextColor={colors.mutedForeground}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={300}
              returnKeyType="default"
            />
            <Animated.View style={sendBtnStyle}>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: input.trim() && !isLoading ? colors.primary : colors.muted }]}
                onPress={sendMessage}
                disabled={!input.trim() || isLoading}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={input.trim() && !isLoading ? '#FFF' : colors.mutedForeground}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  /* header */
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerMascot: { marginBottom: -4 },
  headerName: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  /* list */
  listContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  /* bubbles */
  rowUser: { flexDirection: 'row', justifyContent: 'flex-end' },
  rowMascot: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  mascotAvatar: { marginBottom: 2 },
  bubbleUser: {
    maxWidth: '75%', padding: 13, borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  bubbleUserText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  bubbleMascot: {
    maxWidth: '75%', padding: 13, borderRadius: 20,
    borderBottomLeftRadius: 4, borderWidth: 1,
  },
  bubbleMascotText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },

  /* input */
  inputBar: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 14, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: {
    flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 15, fontFamily: 'Inter_400Regular', maxHeight: 110, lineHeight: 21,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
});
