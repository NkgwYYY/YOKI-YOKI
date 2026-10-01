import React, { useState, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { BottomSheet, CenterDialog } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon, iconSize } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { ChecklistItemRow } from '@/components/ChecklistItemRow';
import {
  ChecklistCategory,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
} from '@/data/defaultChecklist';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { PressScale } from '@/components/ui/PressScale';

/** すべて完了したときの一行。点滅も発光もさせず、色と文字だけで伝える。 */
function CompleteBanner() {
  return (
    <View style={styles.completeBanner}>
      <Icon name="check-circle" size={16} color={colors.success} />
      <Text style={styles.completeText}>今日の積み重ねを残せたね</Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** 「今日できたこと」チェックリスト(旧チェックタブの機能をシート化) */
export function ChecklistSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const {
    checkedState, checklistItems,
    toggleCheckItem, addChecklistItem, removeChecklistItem, resetChecklistToDefaults,
    getCompletedCount, getTotalCheckCount,
    holdLightFlow,
  } = useApp();

  // シート表示中は光の循環演出を保留(閉じた瞬間にタブ画面上で再生される)
  useEffect(() => {
    if (!visible) return;
    holdLightFlow(true);
    return () => holdLightFlow(false);
  }, [visible, holdLightFlow]);

  const [editMode, setEditMode]         = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addCategory, setAddCategory]   = useState<ChecklistCategory>('basics');
  const [newText, setNewText]           = useState('');
  const [pending, setPending] = useState<{ id: string; text: string } | 'reset' | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) { setEditMode(false); setShowAddSheet(false); setPending(null); setActionError(null); }
  }, [visible]);

  const catColors = CATEGORY_COLORS;
  const completed  = getCompletedCount();
  const total      = getTotalCheckCount();
  const progressPct = total > 0 ? (completed / total) * 100 : 0;
  const allDone    = completed === total && total > 0;

  const isChecked = (id: string) => checkedState.items.find(i => i.id === id)?.checked ?? false;

  const runAction = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try { await action(); }
    catch { setActionError('保存できませんでした。同じ操作をもう一度行うと、保存状況を確認して再開します。'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await runAction(async () => {
      await addChecklistItem(newText.trim(), addCategory);
      setNewText('');
      setShowAddSheet(false);
    });
  };

  const confirmChange = () => {
    if (!pending) return;
    void runAction(async () => {
      if (pending === 'reset') { await resetChecklistToDefaults(); setEditMode(false); }
      else await removeChecklistItem(pending.id);
      setPending(null);
    });
  };

  const openAddForCategory = (cat: ChecklistCategory) => {
    setAddCategory(cat);
    setNewText('');
    setShowAddSheet(true);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => { if (!busyRef.current) onClose(); }}
      title="今日できたこと"
      subtitle={formatDateJP(getTodayDate())}
      maxHeightRatio={0.92}
      contentStyle={styles.content}
    >
      <Text style={styles.editHint}>できたことを、ひとつずつ。全部埋めなくても大丈夫。</Text>
      {actionError && !showAddSheet && !pending && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
      {/* 進捗 */}
      {!editMode ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHead}>
            <Text style={styles.progressCount} accessibilityLabel={`${completed}件の積み重ね`}>
              {completed}
              <Text style={styles.progressTotal}> / {total}</Text>
            </Text>
            <PressScale
              style={styles.iconBtn}
              onPress={() => setEditMode(true)}
              hitSlop={space.sm}
              accessibilityLabel="項目を編集"
            >
              <Icon name="edit-3" size={16} color={colors.foreground} />
            </PressScale>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          {allDone && <CompleteBanner />}
        </View>
      ) : (
        <View style={styles.editBar}>
          <Text style={styles.editHint}>− で項目を削除　＋ で項目を追加</Text>
          <View style={styles.editActions}>
            <PressScale disabled={busy} onPress={() => setPending('reset')} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>リセット</Text>
            </PressScale>
            <Button label="完了" size="sm" onPress={() => setEditMode(false)} />
          </View>
        </View>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = checklistItems.filter((i) => i.category === cat);
        const catColor = catColors[cat];
        const catDone = items.filter((i) => isChecked(i.id)).length;
        return (
          <View key={cat} style={styles.section}>
            <View style={styles.catHeader}>
              <Icon name={CATEGORY_ICONS[cat]} size={iconSize.md} color={catColor} />
              <Text style={styles.catLabel}>{CATEGORY_LABELS[cat]}</Text>
              {!editMode ? (
                <Text style={[styles.catCount, { color: catColor }]}>
                  {catDone}/{items.length}
                </Text>
              ) : (
                <PressScale
                  style={styles.addCatBtn}
                  accessibilityLabel={`${CATEGORY_LABELS[cat]}に項目を追加`}
                  disabled={busy}
                  onPress={() => openAddForCategory(cat)}
                >
                  <Icon name="plus" size={14} color={colors.primaryOnSoft} />
                  <Text style={styles.addCatText}>追加</Text>
                </PressScale>
              )}
            </View>

            {items.length === 0 ? (
              <PressScale
                style={styles.emptyRow}
                onPress={() => openAddForCategory(cat)}
              >
                <Icon name="plus-circle" size={16} color={colors.mutedForeground} />
                <Text style={styles.emptyRowText}>タップして追加</Text>
              </PressScale>
            ) : (
              <View style={styles.rows}>
                {items.map((item, idx) => (
                  <ChecklistItemRow
                    key={item.id}
                    id={item.id}
                    text={item.text}
                    isChecked={isChecked(item.id)}
                    categoryColor={catColor}
                    onToggle={id => { void runAction(() => toggleCheckItem(id)); }}
                    onDelete={id => setPending({ id, text: item.text })}
                    disabled={busy}
                    editMode={editMode}
                    index={idx}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* 項目の追加 */}
      <Modal
        visible={showAddSheet}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!busyRef.current) setShowAddSheet(false); }}
      >
        <KeyboardAvoidingView
          style={styles.addOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <PressScale
            style={styles.addBackdrop}
            accessibilityLabel="追加をキャンセル"
            disabled={busy}
            onPress={() => setShowAddSheet(false)}
          />
          <View
            style={[
              styles.addSheet,
              { paddingBottom: Platform.OS === 'web' ? space.xl : insets.bottom + space.lg },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.md }}>
            <View style={styles.handle} />
            <Text style={styles.addTitle}>チェック項目を追加</Text>

            <Text style={styles.pickerLabel}>カテゴリ</Text>
            <View style={styles.catPicker}>
              {CATEGORY_ORDER.map((cat) => {
                const active = addCategory === cat;
                return (
                  <PressScale
                    key={cat}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setAddCategory(cat)}
                    accessibilityState={{ selected: active }}
                  >
                    <Icon
                      name={CATEGORY_ICONS[cat]}
                      size={iconSize.sm}
                      color={active ? colors.primaryOnSoft : colors.subtleForeground}
                    />
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </PressScale>
                );
              })}
            </View>

            <TextInput
              accessibilityLabel="追加するチェック項目"
              maxLength={120}
              editable={!busy}
              style={styles.input}
              placeholder="例：お風呂に入った"
              placeholderTextColor={colors.subtleForeground}
              value={newText}
              onChangeText={setNewText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
            <Button label={busy ? '保存中…' : '追加する'} onPress={handleAdd} disabled={busy || !newText.trim()} />
            <Button label="キャンセル" variant="ghost" onPress={() => setShowAddSheet(false)} disabled={busy} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <CenterDialog visible={!!pending} onClose={() => { if (!busyRef.current) setPending(null); }}>
        <Text style={styles.addTitle}>{pending === 'reset' ? '元の項目に戻しますか？' : 'この項目を削除しますか？'}</Text>
        <Text style={styles.editHint}>{pending === 'reset'
          ? '追加した項目と今日のチェック状態がリセットされます。'
          : pending?.text}</Text>
        {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
        <Button label="キャンセル" variant="secondary" disabled={busy} onPress={() => setPending(null)} />
        <Button label={busy ? '保存中…' : pending === 'reset' ? '元の項目に戻す' : '削除する'} disabled={busy} onPress={confirmChange} />
      </CenterDialog>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl, backgroundColor: '#F8F4EF' },
  error: { ...typography.callout, color: colors.danger },

  /* 進捗 */
  progressBlock: { gap: space.md },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressCount: { ...typography.display, color: colors.foreground },
  progressTotal: { ...typography.body, color: colors.mutedForeground },
  progressTrack: {
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  iconBtn: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    ...border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  completeText: { ...typography.calloutStrong, color: colors.success },

  /* 編集モード */
  editBar: { gap: space.md },
  editHint: { ...typography.caption, color: colors.mutedForeground },
  editActions: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  resetBtn: {
    minHeight: control.heightSm,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: border.width,
    borderColor: colors.danger,
  },
  resetBtnText: { ...typography.label, color: colors.danger },

  /* カテゴリ */
  section: { gap: space.md },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  catLabel: { ...typography.subhead, color: colors.foreground, flex: 1 },
  catCount: { ...typography.label },
  addCatBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  addCatText: { ...typography.micro, color: colors.primaryOnSoft },
  rows: { gap: space.sm },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: control.height,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: border.width,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyRowText: { ...typography.callout, color: colors.mutedForeground },

  /* 追加シート */
  addOverlay: { flex: 1, justifyContent: 'flex-end' },
  addBackdrop: { flex: 1, backgroundColor: colors.scrim },
  addSheet: {
    maxHeight: '90%',
    backgroundColor: '#F8F4EF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.md,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
  },
  addTitle: { ...typography.heading, color: colors.foreground, marginTop: space.sm },
  pickerLabel: { ...typography.label, color: colors.mutedForeground },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: control.heightSm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    ...border.hairline,
  },
  catChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  catChipText: { ...typography.label, color: colors.mutedForeground },
  catChipTextActive: { color: colors.primaryOnSoft },
  input: {
    ...typography.body,
    height: control.height,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    ...border.hairlineStrong,
    color: colors.foreground,
  },
});
