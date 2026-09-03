import React, { useEffect, useCallback } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

interface ChecklistItemRowProps {
  id: string;
  text: string;
  isChecked: boolean;
  categoryColor: string;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  editMode?: boolean;
  index?: number;
}

export function ChecklistItemRow({
  id,
  text,
  isChecked,
  categoryColor,
  onToggle,
  onDelete,
  editMode = false,
  index = 0,
}: ChecklistItemRowProps) {
  const enterOpacity = useSharedValue(0);
  const enterY = useSharedValue(16);
  useEffect(() => {
    enterOpacity.value = withDelay(index * 40, withTiming(1, { duration: 300 }));
    enterY.value = withDelay(index * 40, withSpring(0, { damping: 20, stiffness: 180 }));
  }, []);

  const checkScale = useSharedValue(isChecked ? 1 : 0);
  const rowScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const deleteScale = useSharedValue(editMode ? 1 : 0);

  useEffect(() => {
    checkScale.value = withSpring(isChecked ? 1 : 0, { damping: 12, stiffness: 200 });
  }, [isChecked]);

  useEffect(() => {
    deleteScale.value = withSpring(editMode ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [editMode]);

  const handlePress = useCallback(() => {
    if (editMode) return;
    if (!isChecked) {
      rowScale.value = withSequence(
        withSpring(0.97, { damping: 8, stiffness: 400 }),
        withSpring(1.03, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 400 })
      );
    }
    onToggle(id);
  }, [id, isChecked, onToggle, editMode]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterY.value }],
  }));
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rowScale.value }],
  }));
  const checkIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isChecked && !editMode ? 0.45 : 1, { duration: 200 }),
  }));
  const deleteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deleteScale.value }],
    opacity: deleteScale.value,
  }));

  return (
    <Animated.View style={enterStyle}>
      <Animated.View style={rowStyle}>
        <PressScale onPress={handlePress}>
          <View style={[styles.row, isChecked && !editMode && { borderColor: categoryColor }]}>
            {/* チェックした瞬間のフラッシュ。カテゴリ色をごく薄く一度だけ通す。 */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.primarySoft, borderRadius: radius.md },
                flashStyle,
              ]}
              pointerEvents="none"
            />

            <View
              style={[
                styles.dot,
                { backgroundColor: isChecked && !editMode ? categoryColor : colors.borderStrong },
              ]}
            />

            <Animated.Text style={[styles.text, textStyle]} numberOfLines={2}>
              {text}
            </Animated.Text>

            {/* 削除（編集モード） */}
            <Animated.View style={deleteStyle}>
              <PressScale
                onPress={() => onDelete?.(id)}
                hitSlop={space.sm}
                style={styles.deleteBtn}
                accessibilityLabel="この項目を削除"
              >
                <Icon name="minus" size={16} color={colors.danger} />
              </PressScale>
            </Animated.View>

            {/* チェック（通常モード） */}
            {!editMode && (
              <View style={styles.checkWrap}>
                {!isChecked && <View style={styles.emptyRing} />}
                <Animated.View style={[StyleSheet.absoluteFill, styles.checkCenter, checkIconStyle]}>
                  <Icon name="check-circle" size={24} color={categoryColor} />
                </Animated.View>
              </View>
            )}
          </View>
        </PressScale>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 影は付けない。チェック済みは枠線の色だけで示す。
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: control.height,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    ...border.hairline,
    overflow: 'hidden',
  },
  dot: { width: 6, height: 6, borderRadius: radius.pill, marginRight: space.md, flexShrink: 0 },
  text: { ...typography.body, flex: 1, color: colors.foreground },
  checkWrap: { marginLeft: space.md, width: 24, height: 24, position: 'relative' },
  emptyRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: colors.borderStrong,
  },
  checkCenter: { alignItems: 'center', justifyContent: 'center' },
  deleteBtn: {
    width: control.iconSm,
    height: control.iconSm,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: space.sm,
  },
});
