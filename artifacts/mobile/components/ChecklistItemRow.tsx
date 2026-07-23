import React, { useEffect, useCallback } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

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
  const colors = useColors();

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
        <TouchableOpacity activeOpacity={editMode ? 1 : 0.85} onPress={handlePress}>
          <View
            style={[
              styles.row,
              {
                backgroundColor: colors.card,
                borderColor: isChecked && !editMode ? categoryColor + '55' : colors.border,
                shadowColor: isChecked && !editMode ? categoryColor : 'transparent',
              },
            ]}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.flash,
                { backgroundColor: categoryColor + '18', borderRadius: 16 },
                flashStyle,
              ]}
              pointerEvents="none"
            />

            <View style={[styles.dot, { backgroundColor: editMode ? colors.border : (isChecked ? categoryColor : colors.border) }]} />

            <Animated.Text
              style={[styles.text, { color: colors.foreground }, textStyle]}
              numberOfLines={2}
            >
              {text}
            </Animated.Text>

            {/* Delete button (edit mode) */}
            <Animated.View style={[styles.deleteWrap, deleteStyle]}>
              <TouchableOpacity
                onPress={() => onDelete?.(id)}
                hitSlop={8}
                style={[styles.deleteBtn, { backgroundColor: '#FEE2E2' }]}
              >
                <Ionicons name="remove" size={16} color="#EF4444" />
              </TouchableOpacity>
            </Animated.View>

            {/* Check circle (normal mode) */}
            {!editMode && (
              <View style={styles.checkWrap}>
                {!isChecked && (
                  <View style={[styles.emptyRing, { borderColor: colors.border }]} />
                )}
                <Animated.View style={[StyleSheet.absoluteFill, styles.checkCenter, checkIconStyle]}>
                  <Ionicons name="checkmark-circle" size={26} color={categoryColor} />
                </Animated.View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  flash: { pointerEvents: 'none' },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 12,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },
  checkWrap: {
    marginLeft: 12,
    width: 26,
    height: 26,
    position: 'relative',
  },
  emptyRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    position: 'absolute',
    top: 1,
    left: 1,
  },
  checkCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteWrap: {
    marginLeft: 8,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
