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
  index?: number;
}

export function ChecklistItemRow({
  id,
  text,
  isChecked,
  categoryColor,
  onToggle,
  index = 0,
}: ChecklistItemRowProps) {
  const colors = useColors();

  // Entrance stagger animation
  const enterOpacity = useSharedValue(0);
  const enterY = useSharedValue(16);
  useEffect(() => {
    enterOpacity.value = withDelay(index * 60, withTiming(1, { duration: 350 }));
    enterY.value = withDelay(index * 60, withSpring(0, { damping: 20, stiffness: 180 }));
  }, []);

  // Check bounce
  const checkScale = useSharedValue(isChecked ? 1 : 0);
  const rowScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    checkScale.value = withSpring(isChecked ? 1 : 0, { damping: 12, stiffness: 200 });
  }, [isChecked]);

  const handlePress = useCallback(() => {
    if (!isChecked) {
      // Bounce the whole row
      rowScale.value = withSequence(
        withSpring(0.97, { damping: 8, stiffness: 400 }),
        withSpring(1.03, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      // Flash highlight
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 400 })
      );
    }
    onToggle(id);
  }, [id, isChecked, onToggle]);

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

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isChecked ? 0.45 : 1, { duration: 200 }),
  }));

  return (
    <Animated.View style={enterStyle}>
      <Animated.View style={rowStyle}>
        <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
          <View
            style={[
              styles.row,
              {
                backgroundColor: colors.card,
                borderColor: isChecked ? categoryColor + '55' : colors.border,
                shadowColor: isChecked ? categoryColor : 'transparent',
              },
            ]}
          >
            {/* Flash overlay */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.flash,
                { backgroundColor: categoryColor + '18', borderRadius: 16 },
                flashStyle,
              ]}
              pointerEvents="none"
            />

            <View style={[styles.dot, { backgroundColor: isChecked ? categoryColor : colors.border }]} />

            <Animated.Text
              style={[styles.text, { color: colors.foreground }, textStyle]}
              numberOfLines={2}
            >
              {text}
            </Animated.Text>

            <View style={styles.checkWrap}>
              {/* Empty ring */}
              {!isChecked && (
                <View style={[styles.emptyRing, { borderColor: colors.border }]} />
              )}
              {/* Filled check */}
              <Animated.View style={[StyleSheet.absoluteFill, styles.checkCenter, checkIconStyle]}>
                <Ionicons name="checkmark-circle" size={26} color={categoryColor} />
              </Animated.View>
            </View>
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
  flash: {
    pointerEvents: 'none',
  },
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
});
