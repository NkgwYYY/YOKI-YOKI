import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const easeOut = (t: number) => t * (2 - t);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { ChecklistItemRow } from '@/components/ChecklistItemRow';
import {
  DEFAULT_CHECKLIST_ITEMS,
  ChecklistCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS_DARK,
  CATEGORY_COLORS_LIGHT,
} from '@/data/defaultChecklist';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';

const CATEGORIES: ChecklistCategory[] = ['body', 'mind', 'social'];

/* ---------- Celebration sparkles ---------- */
function Sparkles({ visible }: { visible: boolean }) {
  const colors = useColors();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const dots = [
    { top: -14, left: 10, size: 8, color: colors.primary },
    { top: -10, right: 14, size: 6, color: colors.secondary },
    { top: 4, right: -12, size: 7, color: colors.accent },
    { top: 4, left: -12, size: 5, color: colors.primary },
    { bottom: -12, left: 20, size: 6, color: colors.secondary },
    { bottom: -10, right: 20, size: 5, color: colors.accent },
  ];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, style]}>
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: d.size,
            height: d.size,
            borderRadius: d.size / 2,
            backgroundColor: d.color,
            top: (d as any).top,
            bottom: (d as any).bottom,
            left: (d as any).left,
            right: (d as any).right,
          }}
        />
      ))}
    </Animated.View>
  );
}

/* ---------- Pulsing complete banner ---------- */
function CompleteBanner() {
  const colors = useColors();
  const glow = useSharedValue(0.6);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: easeInOutSine }),
        withTiming(0.6, { duration: 900, easing: easeInOutSine })
      ),
      -1,
      false
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
      <LinearGradient
        colors={[colors.primary + 'CC', colors.secondary + '99']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.completeBanner}
      >
        <Ionicons name="star" size={17} color="#FFF" />
        <Text style={styles.completeText}>全て完了！よく頑張りました</Text>
        <Ionicons name="star" size={17} color="#FFF" />
      </LinearGradient>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#FFFFFF', borderRadius: 14 },
          style,
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

/* ---------- FAB ---------- */
function FAB({ onPress, color, textColor }: { onPress: () => void; color: string; textColor: string }) {
  const scale = useSharedValue(1);
  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    onPress();
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: color }]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color={textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ---------- Main Screen ---------- */
export default function CheckScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { checkedState, customItems, toggleCheckItem, addCustomItem, getCompletedCount, getTotalCheckCount } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [newItemText, setNewItemText] = useState('');

  const catColors = colorScheme === 'dark' ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  const isChecked = (id: string) => checkedState.items.find((i) => i.id === id)?.checked ?? false;

  const handleAddCustom = async () => {
    if (!newItemText.trim()) return;
    await addCustomItem(newItemText.trim());
    setNewItemText('');
    setShowModal(false);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // Animated progress bar
  const barW = useSharedValue(0);
  useEffect(() => {
    barW.value = withTiming(progressPct, { duration: 500, easing: easeOut });
  }, [progressPct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barW.value}%` as any }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={colorScheme === 'dark' ? ['#0E0A1C', '#130D28'] : ['#FAF7FF', '#F0F5FF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Sticky Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 14, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>今日できたこと</Text>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
              {formatDateJP(getTodayDate())}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={[styles.countNum, { color: colors.primary }]}>{completedCount}</Text>
            <Text style={[styles.countSep, { color: colors.mutedForeground }]}>/{totalCount}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: allDone ? colors.primary : colors.primary },
              barStyle,
            ]}
          />
        </View>

        {allDone && <CompleteBanner />}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((cat) => {
          const items = DEFAULT_CHECKLIST_ITEMS.filter((i) => i.category === cat);
          const catColor = catColors[cat];
          const catDone = items.filter((i) => isChecked(i.id)).length;
          return (
            <View key={cat} style={styles.section}>
              <View style={styles.catHeader}>
                <View style={[styles.catDot, { backgroundColor: catColor }]} />
                <Text style={[styles.catLabel, { color: colors.foreground }]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
                <View style={[styles.catCountBadge, { backgroundColor: catColor + '22' }]}>
                  <Text style={[styles.catCount, { color: catColor }]}>
                    {catDone}/{items.length}
                  </Text>
                </View>
              </View>
              {items.map((item, idx) => (
                <ChecklistItemRow
                  key={item.id}
                  id={item.id}
                  text={item.text}
                  isChecked={isChecked(item.id)}
                  categoryColor={catColor}
                  onToggle={toggleCheckItem}
                  index={idx}
                />
              ))}
            </View>
          );
        })}

        {customItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.catHeader}>
              <View style={[styles.catDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.catLabel, { color: colors.foreground }]}>マイチェック</Text>
              <View style={[styles.catCountBadge, { backgroundColor: colors.accent + '22' }]}>
                <Text style={[styles.catCount, { color: colors.accent }]}>
                  {customItems.filter((i) => isChecked(i.id)).length}/{customItems.length}
                </Text>
              </View>
            </View>
            {customItems.map((item, idx) => (
              <ChecklistItemRow
                key={item.id}
                id={item.id}
                text={item.text}
                isChecked={isChecked(item.id)}
                categoryColor={colors.accent}
                onToggle={toggleCheckItem}
                index={idx}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <View
        style={[
          styles.fabWrap,
          { bottom: Platform.OS === 'web' ? 34 + 94 : insets.bottom + 94 },
        ]}
      >
        <FAB
          onPress={() => setShowModal(true)}
          color={colors.primary}
          textColor={colors.primaryForeground}
        />
      </View>

      {/* Add Item Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowModal(false)} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>チェック項目を追加</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
              ]}
              placeholder="例：10分間瞑想した"
              placeholderTextColor={colors.mutedForeground}
              value={newItemText}
              onChangeText={setNewItemText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
            />
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: newItemText.trim() ? colors.primary : colors.muted },
              ]}
              onPress={handleAddCustom}
              disabled={!newItemText.trim()}
              activeOpacity={0.85}
            >
              <Text style={[styles.saveBtnText, { color: newItemText.trim() ? '#FFF' : colors.mutedForeground }]}>
                追加する
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  dateLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  countBadge: { flexDirection: 'row', alignItems: 'baseline' },
  countNum: { fontSize: 30, fontFamily: 'Inter_700Bold' },
  countSep: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, position: 'absolute', top: 0, left: 0 },
  completeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: 14,
  },
  completeText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFF', flex: 1, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 26 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  catCountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catCount: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  fabWrap: { position: 'absolute', right: 20 },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 10,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, gap: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  input: { padding: 15, borderRadius: 14, fontSize: 15, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
