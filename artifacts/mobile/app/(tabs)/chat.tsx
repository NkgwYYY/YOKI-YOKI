import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ActivityIndicator,
  FlatList, Keyboard, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { readChatHistory, writeChatHistory, clearChatHistory } from '@/utils/conversationStorageClient';
import { useRouter, useFocusEffect } from 'expo-router';
import { getTabBarHeight } from '@/utils/tabLayout';
import { localDateKey, normalizeStoredMessage, type Message, type Citation } from '@/utils/chatHistory';
import { chatErrorMessage } from '@/utils/chatErrors';
import { Analytics } from '@/utils/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, colors, control, radius, screenPadding, space, typography } from '@/constants/theme';
import { SaveHintButton } from '@/components/hints/SaveHintButton';
import { applyConversationMode, conversationModes, type ConversationMode } from '@/utils/conversationMode';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { hasAiConsent, postAiJson } from '@/utils/aiConsent';
import { profileToContext } from '@/utils/profileContext';
import { Mascot, StaticMascot } from '@/components/Mascot';
import { getMascotStage, getMascotMood } from '@/utils/mascotUtils';
import { formatDateJP, getTodayDate, getYesterdayDate } from '@/utils/dateUtils';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function newMessage(
  id: string,
  role: Message['role'],
  content: string,
  citations?: Citation[],
): Message {
  const now = new Date();
  return { id, role, content, timestamp: now.toISOString(), dateKey: localDateKey(now), citations, sourcePolicyVersion: 2 };
}

function messageDateLabel(dateKey: string): string {
  if (dateKey === getTodayDate()) return '今日';
  if (dateKey === getYesterdayDate()) return '昨日';
  return formatDateJP(dateKey);
}

function TypingDots() {
  return (
    <View style={dotStyles.row}>
      <View style={dotStyles.dot} />
      <View style={dotStyles.dot} />
      <View style={dotStyles.dot} />
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

  if (isUser) {
    return (
      <View style={bubbleStyles.rowUser}>
        <View style={bubbleStyles.bubbleUser}>
          <Text style={bubbleStyles.userText}>{msg.content}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={bubbleStyles.rowMascot}>
      <View style={bubbleStyles.avatar}>
        {Platform.OS === 'ios' ? (
          <StaticMascot stage={mascotStage} mood={mascotMood} size={42} />
        ) : (
          <Mascot stage={mascotStage} mood={mascotMood} size={42} />
        )}
      </View>
      <View style={bubbleStyles.bubbleMascot}>
        <Text testID={msg.id === 'welcome' ? 'chat-welcome' : 'chat-assistant-message'} style={bubbleStyles.mascotText}>{msg.content}</Text>
        {msg.id !== 'welcome' && <SaveHintButton hint={{ id: `chat:${msg.id}`, title: msg.content.split(/[。！？\n]/)[0].slice(0, 45) || 'おはなしのヒント', body: msg.content, source: 'conversation', citations: msg.sourcePolicyVersion === 2 ? msg.citations : undefined }} />}
        {msg.sourcePolicyVersion===2 && !!msg.citations?.length && (
          <View style={bubbleStyles.citations}>
            <Text style={bubbleStyles.citationsTitle}>健康・相談についての参考情報</Text>
            {msg.citations.map(citation => (
              <PressScale
                key={citation.url}
                onPress={() => Linking.openURL(citation.url)}
                accessibilityRole="link"
                accessibilityLabel={`${citation.title}を開く`}
                style={bubbleStyles.citationLink}
              >
                <Icon name="external-link" size={13} color={colors.primary} />
                <Text style={bubbleStyles.citationText}>{citation.title}</Text>
              </PressScale>
            ))}
          </View>
        )}
      </View>
    </View>
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
    backgroundColor: '#8967A3',
  },
  userText: { ...typography.body, color: colors.primaryForeground },
  bubbleMascot: {
    maxWidth: '76%',
    padding: space.md,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: '#FFFCF5',
    ...border.hairline,
  },
  mascotText: { ...typography.body, color: '#554559', lineHeight: 25 },
  citations: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
    gap: space.xs,
  },
  citationsTitle: { ...typography.micro, color: colors.mutedForeground },
  citationLink: {
    minHeight: control.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  citationText: { ...typography.caption, color: colors.primary, textDecorationLine: 'underline', flexShrink: 1 },
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
    backgroundColor: '#FFFCF5',
    ...border.hairlineStrong,
  },
  text: { ...typography.label, color: colors.foreground },
});

const MAX_STORED = 60;
const MAX_CONTEXT = 20;

export default function ChatScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color="#8967A3" /></View>;
  const owner = user?.id ?? 'guest';
  return <OwnerChat key={owner} aiOwner={owner} />;
}

function OwnerChat({ aiOwner }: { aiOwner: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarHeight(Platform.OS, insets.bottom);
  const { progress, records, mascotName, getTodayRecord, getCompletedCount, getTotalCheckCount,
          currentSatiety, inactivityHours, profile } = useApp();

  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();
  const mascotStage = getMascotStage(progress);
  const mascotMood = getMascotMood(progress, todayRecord, completedCount, totalCount, {
    inactivityHours, satiety: currentSatiety,
  });
  const displayName = mascotName || 'よっきー';
  const welcomeMsg = newMessage('welcome', 'assistant', `今日は、どんな一日だった？ 聞いてほしいことでも、一緒に考えたいことでも。${displayName}は、ここにいるよ。`);

  const [conversationMode, setConversationMode] = useState<ConversationMode>('listen');
  const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [clearing, setClearing] = useState(false);
  const clearBusy = useRef(false);
  const loadBusy = useRef(false);
  const saveVersion = useRef(0);
  const lastScheduled = useRef('[]');
  const request = useRef<AbortController | null>(null);
  const sendEpoch = useRef(0);
  const currentOwner = useRef(aiOwner);
  currentOwner.current = aiOwner;
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);

  useFocusEffect(useCallback(() => () => {
    sendEpoch.current += 1;
    if (request.current) {
      request.current.abort();
      request.current = null;
      setIsLoading(false);
      setSendError(chatErrorMessage());
    }
  }, [aiOwner]));

  const loadHistory = async () => {
      if (loadBusy.current) return;
      loadBusy.current = true;
      setLoadError(false);
      try {
        const raw = await readChatHistory(aiOwner);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (!Array.isArray(parsed)) throw new Error('Invalid history');
          const stored = parsed
            .map(normalizeStoredMessage)
            .filter((message): message is Message => message !== null)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
            .slice(-MAX_STORED);
          if (stored.length > 0) {
            lastScheduled.current = JSON.stringify(stored.slice(-MAX_STORED));
            setMessages([welcomeMsg, ...stored]);
          }
        }
        setHistoryLoaded(true);
      } catch { setLoadError(true); }
      finally { loadBusy.current = false; }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const persistHistory = useCallback((serialized: string) => {
    const version = ++saveVersion.current;
    lastScheduled.current = serialized;
    return writeChatHistory(aiOwner, serialized)
      .then(() => { if (saveVersion.current === version) setSaveError(false); })
      .catch(() => { if (saveVersion.current === version) setSaveError(true); });
  }, [aiOwner]);

  useEffect(() => {
    if (!historyLoaded) return;
    const toSave = messages.filter(m => m.id !== 'welcome').slice(-MAX_STORED);
    const serialized = JSON.stringify(toSave);
    if (serialized !== lastScheduled.current) void persistHistory(serialized);
  }, [messages, historyLoaded, persistHistory]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const clearHistory = useCallback(async () => {
    if (request.current || clearBusy.current || !historyLoaded) return;
    clearBusy.current = true;
    setClearing(true);
    try {
      await clearChatHistory(aiOwner);
      ++saveVersion.current;
      lastScheduled.current = '[]';
      setSaveError(false);
      setMessages([{ ...welcomeMsg, content: `また話しかけてね！${displayName}はいつでもここにいるよ` }]);
      setSendError(null);
      setHistoryError(false);
    } catch { setHistoryError(true); }
    finally { clearBusy.current = false; setClearing(false); }
  }, [displayName, historyLoaded, aiOwner]);

  const sendMessage = useCallback(async (text?: string, retry = false) => {
    const msg = (text ?? input).trim();
    if ((!retry && !msg) || request.current || clearBusy.current || !historyLoaded) return;
    const epoch = sendEpoch.current;
    const allowed = await hasAiConsent(aiOwner);
    if (epoch !== sendEpoch.current || aiOwner !== currentOwner.current) return;
    if (!allowed) {
      if (!retry) setInput(msg);
      Keyboard.dismiss();
      router.push('/ai-privacy');
      return;
    }
    if (request.current || clearBusy.current) return;
    Keyboard.dismiss();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    if (!retry) setInput('');
    setSendError(null);
    let failureMessage = chatErrorMessage();

    const userMsg = newMessage(`u_${Date.now()}`, 'user', msg);
    const next = retry ? messages : [...messages, userMsg];
    setMessages(next);
    scrollToBottom();
    setIsLoading(true);

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
        ctxParts.push(`直近${recent.length}日: 平均気分${avgOf(recent.map(r => r.mood))}/5, 平均睡眠${avgOf(recent.filter(r => r.sleepRecorded !== false).map(r => r.sleep)) ?? '未入力'}h`);
      }
      if (todayRec) {
        ctxParts.push(
          `今日の記録: 気分${todayRec.mood}/5, 睡眠${todayRec.sleepRecorded === false ? '未入力' : `${todayRec.sleep}h`}` +
          (todayRec.behaviors.length ? `, したこと[${todayRec.behaviors.join(',')}]` : '') +
          (todayRec.win ? `, 小さな成功「${todayRec.win}」` : '')
        );
      }
      const recentWins = recent.map(r => r.win).filter(Boolean).slice(-3);
      if (recentWins.length) ctxParts.push(`最近の小さな成功: ${recentWins.join(' / ')}`);
      if (progress?.streak) ctxParts.push(`連続記録${progress.streak}日目`);

      const res = await postAiJson(aiOwner, `${API_BASE}/chat/message`, {
          messages: applyConversationMode(history, conversationMode),
          conversationMode,
          mascotName: displayName,
          mascotStage,
          todayDate: getTodayDate(),
          context: ctxParts.join('\n') || undefined,
      }, { signal: controller.signal });
      if (!res.ok) {
        failureMessage = chatErrorMessage(res.data?.code);
        throw new Error('Chat request failed');
      }
      const data = res.data;
      if (typeof data?.content !== 'string' || !data.content.trim()) throw new Error('Invalid chat response');
      if (request.current !== controller) return;
      const validCitations = Array.isArray(data.citations) ? data.citations.filter((item: any) =>
        typeof item?.title === 'string' && typeof item?.url === 'string' && item.url.startsWith('https://www.mhlw.go.jp/')) : [];
      const citations = data.sourcePolicyVersion===2 ? validCitations : [];
      const assistantMsg = newMessage(
        `a_${Date.now()}`,
        'assistant',
        data.content || 'うん、聞いてるよ！',
        citations,
      );
      setMessages(prev => [...prev, assistantMsg]);
      Analytics.chatMessageSent();
    } catch {
      if (request.current === controller) {
        setSendError(controller.signal.aborted ? chatErrorMessage('CHAT_TIMEOUT') : failureMessage);
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setIsLoading(false);
        scrollToBottom();
      }
    }
  }, [input, historyLoaded, messages, displayName, mascotStage, records, progress, profile, getTodayRecord, scrollToBottom, aiOwner, router, conversationMode]);

  const topPad = Platform.OS === 'web' ? space.xl : insets.top;

  const canSend = !!input.trim() && !isLoading && historyLoaded && !clearing;
  const showChips = messages.length <= 1;
  const CHIPS = ['今日あったこと話したい', '少し落ち込んでる', 'がんばった！聞いて', '雑談しよう'];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >

      <View style={[styles.header, { paddingTop: topPad + space.md }]}>
        <PressScale accessibilityLabel="部屋へ戻る" style={styles.clearBtn}
          onPress={() => router.navigate('/(tabs)')}>
          <Icon name="chevron-left" size={iconSize.md} color={colors.foreground} />
        </PressScale>
        {Platform.OS === 'ios' ? (
          <StaticMascot stage={mascotStage} mood={mascotMood} size={40} />
        ) : (
          <Mascot stage={mascotStage} mood={mascotMood} size={40} />
        )}
        <View style={styles.headerCopy}>
          <View style={styles.headerTitle}>
            <Text numberOfLines={1} style={[styles.headerName,{flexShrink:1}]}>{displayName}</Text>
          </View>
          <Text style={styles.onlineText}>{conversationModes.find(mode => mode.id === conversationMode)?.label}</Text>
        </View>
        <PressScale style={styles.clearBtn} accessibilityLabel="自分のヒント帳を開く" onPress={() => router.push('/hints')}><Icon name="book-open" size={20} color="#795D90" /></PressScale>
        {keyboardOpen ? <PressScale style={styles.clearBtn} accessibilityLabel="キーボードを閉じる" onPress={() => Keyboard.dismiss()}><Icon name="chevron-down" size={20} color={colors.foreground} /></PressScale> : messages.length > 1 && (
          <PressScale
            onPress={clearHistory}
            disabled={isLoading || clearing}
            style={styles.clearBtn}
            accessibilityLabel="会話履歴を消す"
          >
            <Icon name="trash-2" size={18} color={colors.mutedForeground} />
          </PressScale>
        )}
      </View>

      {!keyboardOpen && <View style={styles.modeSection}>
        <View style={styles.modeRow}>{conversationModes.map(mode => <PressScale key={mode.id} testID={`chat-mode-${mode.id}`} accessibilityRole="button" accessibilityLabel={mode.label} accessibilityState={{ selected: conversationMode === mode.id, disabled: isLoading }} disabled={isLoading} onPress={() => setConversationMode(mode.id)} style={[styles.modeButton, conversationMode === mode.id && styles.modeSelected]}><Icon name={mode.id === 'listen' ? 'message-circle' : 'sunrise'} size={18} color={conversationMode === mode.id ? '#795D90' : '#8D7B93'} /><Text style={[styles.modeLabel, conversationMode === mode.id && styles.modeSelectedLabel]}>{mode.label}</Text></PressScale>)}</View>
        <Text style={styles.modeDescription}>{conversationModes.find(mode => mode.id === conversationMode)?.description}</Text>
      </View>}

      <View style={styles.medicalNotice}>
        <Icon name="info" size={15} color={colors.mutedForeground} />
        <Text style={styles.medicalNoticeText}>
          AIの回答は医療上の診断・治療を目的としたものではありません。症状が続く場合や医療上の判断をする前に、医師または資格を持つ専門家へ相談してください。
        </Text>
      </View>

      <FlatList
        testID="chat-message-list"
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
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
              {Platform.OS === 'ios' ? (
                <StaticMascot stage={mascotStage} mood="happy" size={40} />
              ) : (
                <Mascot stage={mascotStage} mood="happy" size={40} />
              )}
            </View>
            <View style={bubbleStyles.bubbleMascot}>
              <TypingDots />
            </View>
          </View>
        ) : showChips ? (
          <View style={[styles.chips, { paddingHorizontal: screenPadding }]}>
            {CHIPS.map(c => <Chip key={c} label={c} onPress={() => sendMessage(c)} />)}
          </View>
        ) : null}
      />

      <View
        style={[
          styles.inputArea,
          { paddingBottom: keyboardOpen ? space.sm : tabBarHeight + space.sm },
        ]}
      >
        {historyError && <Text accessibilityRole="alert">履歴を消せませんでした。もう一度お試しください。</Text>}
        {loadError && <View>
          <Text accessibilityRole="alert">会話履歴を読み込めませんでした。保存済みの履歴を守るため、読み込み直してください。</Text>
          <PressScale style={chipStyles.chip} accessibilityLabel="会話履歴を読み込み直す" onPress={loadHistory}><Text>読み込み直す</Text></PressScale>
        </View>}
        {saveError && <View>
          <Text accessibilityRole="alert">会話履歴を保存できませんでした。画面を閉じる前に保存をお試しください。</Text>
          <PressScale style={chipStyles.chip} accessibilityLabel="会話履歴を保存し直す" disabled={clearing} onPress={() => { void persistHistory(JSON.stringify(messages.filter(m => m.id !== 'welcome').slice(-MAX_STORED))); }}><Text>保存をもう一度試す</Text></PressScale>
        </View>}
        {sendError && <View>
          <Text testID="chat-send-error" accessibilityRole="alert">{sendError}</Text>
          <PressScale style={chipStyles.chip} accessibilityLabel="返事をもう一度受け取る" onPress={() => sendMessage(undefined, true)} disabled={isLoading}>
            <Text style={chipStyles.text}>もう一度試す</Text>
          </PressScale>
        </View>}
        <View style={styles.inputRow}>
          <TextInput
            testID="chat-input"
            style={styles.input}
            placeholder={`${displayName}に話しかける…`}
            accessibilityLabel="話しかける内容"
            placeholderTextColor={colors.subtleForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={400}
            onSubmitEditing={() => sendMessage()}
          />
          <View>
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
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F3EA' },
  modeSection: { paddingHorizontal: screenPadding, paddingTop: 12, paddingBottom: 8, gap: 7, backgroundColor: '#FFFCF5' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeButton: { flex: 1, minHeight: 48, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, borderWidth: 1, borderColor: '#E4DACB', backgroundColor: '#FFFCF5' },
  modeSelected: { backgroundColor: '#EEE4F4', borderColor: '#B398C8' },
  modeLabel: { fontSize: 13, color: '#89798C', flexShrink: 1 },
  modeSelectedLabel: { color: '#644778', fontWeight: '600' },
  modeDescription: { fontSize: 11, color: '#8B7D8A', textAlign: 'center', lineHeight: 18 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: screenPadding,
    paddingBottom: space.md,
    borderBottomWidth: border.width,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFCF5',
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  headerTitle: {flexDirection:'row',alignItems:'center',gap:8},
  headerName: { ...typography.subhead, color: colors.foreground },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  onlineDot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.success },
  onlineText: { ...typography.micro, color: colors.mutedForeground, flexShrink: 1 },
  clearBtn: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: space.sm,
    backgroundColor: '#F5F0E8',
    borderBottomWidth: border.width,
    borderBottomColor: colors.border,
  },
  medicalNoticeText: {
    ...typography.micro,
    color: colors.mutedForeground,
    flex: 1,
  },

  list: { flex: 1, minHeight: 0 },
  listContent: { paddingVertical: space.lg, gap: space.md },

  inputArea: {
    flexShrink: 0,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
    backgroundColor: '#FFFCF5',
    paddingTop: space.md,
    paddingHorizontal: screenPadding,
    gap: space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.xl,
    backgroundColor: '#F7F2E9',
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
    backgroundColor: '#8967A3',
    ...border.inner,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: colors.muted },
});
