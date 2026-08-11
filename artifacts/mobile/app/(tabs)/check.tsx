import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Platform, KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  withRepeat, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';

const easeOut = (t: number) => t * (2 - t);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

import { useCosmicColors as useColors, COSMIC_SHEET } from '@/constants/cosmicTheme';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp } from '@/contexts/AppContext';
import { ChecklistItemRow } from '@/components/ChecklistItemRow';
import {
  ChecklistCategory,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS_DARK,
  CATEGORY_COLORS_LIGHT,
} from '@/data/defaultChecklist';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';

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
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const dots = [
    { top: -14, left: 10,  size: 8, color: colors.primary },
    { top: -10, right: 14, size: 6, color: colors.secondary },
    { top: 4,   right: -12, size: 7, color: colors.accent },
    { top: 4,   left: -12,  size: 5, color: colors.primary },
    { bottom: -12, left: 20, size: 6, color: colors.secondary },
    { bottom: -10, right: 20, size: 5, color: colors.accent },
  ];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, style]}>
      {dots.map((d, i) => (
        <View key={i} style={{
          position: 'absolute', width: d.size, height: d.size,
          borderRadius: d.size / 2, backgroundColor: d.color,
          top: (d as any).top, bottom: (d as any).bottom,
          left: (d as any).left, right: (d as any).right,
        }} />
      ))}
    </Animated.View>
  );
}

/* ---------- Complete banner ---------- */
function CompleteBanner() {
  const colors = useColors();
  const glow = useSharedValue(0.6);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: easeInOutSine }),
        withTiming(0.6, { duration: 900, easing: easeInOutSine })
      ), -1, false
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
      <LinearGradient
        colors={[colors.primary + 'CC', colors.secondary + '99']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.completeBanner}
      >
        <Ionicons name="star" size={17} color="#FFF" />
        <Text style={styles.completeText}>全て完了！よく頑張りました</Text>
        <Ionicons name="star" size={17} color="#FFF" />
      </LinearGradient>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderRadius: 14 }, style]} pointerEvents="none" />
    </View>
  );
}

/* ---------- Main ---------- */
export default function CheckScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    checkedState, checklistItems,
    toggleCheckItem, addChecklistItem, removeChecklistItem, resetChecklistToDefaults,
    getCompletedCount, getTotalCheckCount,
  } = useApp();

  const [editMode, setEditMode]         = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addCategory, setAddCategory]   = useState<ChecklistCategory>('basics');
  const [newText, setNewText]           = useState('');

  const catColors  = CATEGORY_COLORS_DARK; // 宇宙テーマ固定
  const completed  = getCompletedCount();
  const total      = getTotalCheckCount();
  const progressPct = total > 0 ? (completed / total) * 100 : 0;
  const allDone    = completed === total && total > 0;

  const isChecked = (id: string) => checkedState.items.find(i => i.id === id)?.checked ?? false;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const barW = useSharedValue(0);
  useEffect(() => {
    barW.value = withTiming(progressPct, { duration: 500, easing: easeOut });
  }, [progressPct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barW.value}%` as any }));

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await addChecklistItem(newText.trim(), addCategory);
    setNewText('');
    setShowAddSheet(false);
  };

  const handleDelete = useCallback((id: string) => {
    Alert.alert('項目を削除', 'この項目を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => removeChecklistItem(id) },
    ]);
  }, [removeChecklistItem]);

  const handleReset = () => {
    Alert.alert(
      'デフォルトに戻す',
      'カスタムした変更がすべてリセットされ、元の項目に戻ります。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'リセット', style: 'destructive', onPress: () => { resetChecklistToDefaults(); setEditMode(false); } },
      ]
    );
  };

  const openAddForCategory = (cat: ChecklistCategory) => {
    setAddCategory(cat);
    setNewText('');
    setShowAddSheet(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SkyBackground />

      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: topPad + 14, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>今日できたこと</Text>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
              {formatDateJP(getTodayDate())}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {!editMode ? (
              <>
                <View style={styles.countBadge}>
                  <Text style={[styles.countNum, { color: colors.primary }]}>{completed}</Text>
                  <Text style={[styles.countSep, { color: colors.mutedForeground }]}>/{total}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: colors.muted }]}
                  onPress={() => setEditMode(true)}
                  hitSlop={8}
                >
                  <Ionicons name="pencil" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleReset} style={[styles.resetBtn, { borderColor: '#EF4444' }]}>
                  <Text style={styles.resetBtnText}>リセット</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditMode(false)}
                  style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.doneBtnText}>完了</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {!editMode && (
          <>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary }, barStyle]} />
            </View>
            {allDone && <CompleteBanner />}
          </>
        )}

        {editMode && (
          <Text style={[styles.editHint, { color: colors.mutedForeground }]}>
            − で項目を削除　＋ で項目を追加
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORY_ORDER.map((cat) => {
          const items = checklistItems.filter(i => i.category === cat);
          const catColor = catColors[cat];
          const catDone = items.filter(i => isChecked(i.id)).length;
          return (
            <View key={cat} style={styles.section}>
              {/* Category header */}
              <View style={styles.catHeader}>
                <Text style={styles.catIcon}>{CATEGORY_ICONS[cat]}</Text>
                <Text style={[styles.catLabel, { color: colors.foreground }]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
                {!editMode && (
                  <View style={[styles.catCountBadge, { backgroundColor: catColor + '22' }]}>
                    <Text style={[styles.catCount, { color: catColor }]}>{catDone}/{items.length}</Text>
                  </View>
                )}
                {editMode && (
                  <TouchableOpacity
                    style={[styles.addCatBtn, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}
                    onPress={() => openAddForCategory(cat)}
                  >
                    <Ionicons name="add" size={14} color={catColor} />
                    <Text style={[styles.addCatText, { color: catColor }]}>追加</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Items */}
              {items.length === 0 ? (
                <TouchableOpacity
                  style={[styles.emptyRow, { borderColor: catColor + '40', backgroundColor: catColor + '08' }]}
                  onPress={() => openAddForCategory(cat)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={catColor} />
                  <Text style={[styles.emptyRowText, { color: catColor }]}>タップして追加</Text>
                </TouchableOpacity>
              ) : (
                items.map((item, idx) => (
                  <ChecklistItemRow
                    key={item.id}
                    id={item.id}
                    text={item.text}
                    isChecked={isChecked(item.id)}
                    categoryColor={catColor}
                    onToggle={toggleCheckItem}
                    onDelete={handleDelete}
                    editMode={editMode}
                    index={idx}
                  />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* FAB — only in normal mode */}
      {!editMode && (
        <View style={[styles.fabWrap, { bottom: Platform.OS === 'web' ? 34 + 94 : insets.bottom + 94 }]}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => { setAddCategory('basics'); setNewText(''); setShowAddSheet(true); }}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={28} color={colors.primaryForeground ?? '#fff'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Add Item Sheet */}
      <Modal visible={showAddSheet} transparent animationType="slide" onRequestClose={() => setShowAddSheet(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowAddSheet(false)} />
          <View style={[styles.sheet, { backgroundColor: COSMIC_SHEET, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>チェック項目を追加</Text>

            {/* Category picker */}
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>カテゴリ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.catPicker}>
                {CATEGORY_ORDER.map(cat => {
                  const active = addCategory === cat;
                  const cc = catColors[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: active ? cc : colors.muted,
                          borderColor: active ? cc : colors.border,
                        },
                      ]}
                      onPress={() => setAddCategory(cat)}
                    >
                      <Text style={styles.catChipIcon}>{CATEGORY_ICONS[cat]}</Text>
                      <Text style={[styles.catChipText, { color: active ? '#fff' : colors.mutedForeground }]}>
                        {CATEGORY_LABELS[cat]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Text input */}
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="例：お風呂に入った"
              placeholderTextColor={colors.mutedForeground}
              value={newText}
              onChangeText={setNewText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: newText.trim() ? colors.primary : colors.muted }]}
              onPress={handleAdd}
              disabled={!newText.trim()}
              activeOpacity={0.85}
            >
              <Text style={[styles.saveBtnText, { color: newText.trim() ? '#FFF' : colors.mutedForeground }]}>
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
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, gap: 12,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  dateLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: { flexDirection: 'row', alignItems: 'baseline' },
  countNum: { fontSize: 30, fontFamily: 'Inter_700Bold' },
  countSep: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  editBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  editActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  resetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  resetBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#EF4444' },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  doneBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  editHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
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
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  catCountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catCount: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  addCatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  addCatText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    marginBottom: 8,
  },
  emptyRowText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  fabWrap: { position: 'absolute', right: 20 },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 10,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  pickerLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  catPicker: { flexDirection: 'row', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  catChipIcon: { fontSize: 14 },
  catChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  input: { padding: 15, borderRadius: 14, fontSize: 15, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
