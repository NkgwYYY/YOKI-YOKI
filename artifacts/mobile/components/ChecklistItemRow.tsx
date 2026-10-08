import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { Icon } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

interface ChecklistItemRowProps {
  id: string;
  text: string;
  isChecked: boolean;
  categoryColor: string;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  editMode?: boolean;
  disabled?: boolean;
  index?: number;
}

/** Quiet rows: state is expressed by the check and border, without flashing. */
export function ChecklistItemRow({ id, text, isChecked, categoryColor, onToggle, onDelete, editMode = false, disabled }: ChecklistItemRowProps) {
  const content = <>
    <View style={[styles.dot, { backgroundColor: isChecked ? categoryColor : colors.borderStrong }]} />
    <Text style={styles.text}>{text}</Text>
    {editMode ? (
      <PressScale disabled={disabled} scaleTo={1} onPress={() => onDelete?.(id)}
        style={styles.deleteBtn} accessibilityLabel={text + 'を削除'}>
        <Icon name="minus" size={18} color={colors.danger} />
      </PressScale>
    ) : <Icon name={isChecked ? 'check-circle' : 'circle'} size={24} color={isChecked ? categoryColor : colors.borderStrong} />}
  </>;
  if (editMode) return <View style={styles.row}>{content}</View>;
  return <PressScale testID={'checklist-item-' + id} scaleTo={1} disabled={disabled}
    onPress={() => onToggle(id)} accessibilityRole="checkbox" accessibilityLabel={text}
    accessibilityState={{ checked: isChecked, disabled: !!disabled }}
    style={[styles.row, isChecked && { borderColor: categoryColor }]}>{content}</PressScale>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: control.height,
    paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm,
    borderRadius: radius.md, backgroundColor: colors.card, ...border.hairline },
  dot: { width: 6, height: 6, borderRadius: radius.pill, flexShrink: 0 },
  text: { ...typography.body, flex: 1, color: colors.foreground },
  deleteBtn: { width: control.icon, height: control.icon, borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
});
