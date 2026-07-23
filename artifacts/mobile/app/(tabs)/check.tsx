import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { useColorScheme } from 'react-native';

const CATEGORIES: ChecklistCategory[] = ['body', 'mind', 'social'];

export default function CheckScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { checkedState, customItems, toggleCheckItem, addCustomItem, getCompletedCount, getTotalCheckCount } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [newItemText, setNewItemText] = useState('');

  const categoryColors = colorScheme === 'dark' ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;

  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  const isChecked = (id: string) =>
    checkedState.items.find((i) => i.id === id)?.checked ?? false;

  const handleAddCustom = async () => {
    if (!newItemText.trim()) return;
    await addCustomItem(newItemText.trim());
    setNewItemText('');
    setShowModal(false);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Header */}
      <View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: colors.background,
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
          },
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
            <Text style={[styles.countText, { color: colors.primary }]}>
              {completedCount}
            </Text>
            <Text style={[styles.countSep, { color: colors.mutedForeground }]}>
              /{totalCount}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: allDone ? colors.primary : colors.primary,
                width: `${progressPct}%`,
              },
            ]}
          />
        </View>

        {allDone && (
          <View style={[styles.completeBanner, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name="checkmark-done-circle" size={18} color={colors.primary} />
            <Text style={[styles.completeText, { color: colors.primary }]}>
              全て完了！今日もよく頑張りました
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Categories */}
        {CATEGORIES.map((category) => {
          const items = DEFAULT_CHECKLIST_ITEMS.filter((i) => i.category === category);
          const catColor = categoryColors[category];
          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                <Text style={[styles.categoryLabel, { color: colors.foreground }]}>
                  {CATEGORY_LABELS[category]}
                </Text>
                <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>
                  {items.filter((i) => isChecked(i.id)).length}/{items.length}
                </Text>
              </View>
              {items.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  id={item.id}
                  text={item.text}
                  isChecked={isChecked(item.id)}
                  categoryColor={catColor}
                  onToggle={toggleCheckItem}
                />
              ))}
            </View>
          );
        })}

        {/* Custom Items */}
        {customItems.length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.categoryLabel, { color: colors.foreground }]}>
                マイチェック
              </Text>
              <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>
                {customItems.filter((i) => isChecked(i.id)).length}/{customItems.length}
              </Text>
            </View>
            {customItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                id={item.id}
                text={item.text}
                isChecked={isChecked(item.id)}
                categoryColor={colors.accent}
                onToggle={toggleCheckItem}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90,
          },
        ]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={colors.primaryForeground} />
      </TouchableOpacity>

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
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              チェック項目を追加
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
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
                styles.modalSaveBtn,
                { backgroundColor: newItemText.trim() ? colors.primary : colors.muted },
              ]}
              onPress={handleAddCustom}
              activeOpacity={0.8}
              disabled={!newItemText.trim()}
            >
              <Text
                style={[
                  styles.modalSaveBtnText,
                  { color: newItemText.trim() ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
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
  stickyHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  countSep: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  completeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  categorySection: { marginBottom: 24 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  categoryCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  modalInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
  },
  modalSaveBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
