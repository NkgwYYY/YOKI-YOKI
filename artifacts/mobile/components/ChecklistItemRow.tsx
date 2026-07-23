import React, { useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface ChecklistItemRowProps {
  id: string;
  text: string;
  isChecked: boolean;
  categoryColor: string;
  onToggle: (id: string) => void;
}

export function ChecklistItemRow({ id, text, isChecked, categoryColor, onToggle }: ChecklistItemRowProps) {
  const colors = useColors();
  const scale = useSharedValue(isChecked ? 1 : 0);
  const textOpacity = useSharedValue(isChecked ? 0.5 : 1);

  useEffect(() => {
    scale.value = withSpring(isChecked ? 1 : 0, { damping: 12, stiffness: 200 });
    textOpacity.value = withTiming(isChecked ? 0.5 : 1, { duration: 200 });
  }, [isChecked]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onToggle(id)}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: isChecked ? categoryColor + '44' : colors.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: categoryColor }]} />
      <Animated.Text
        style={[
          styles.text,
          { color: colors.foreground },
          textAnimStyle,
        ]}
        numberOfLines={2}
      >
        {text}
      </Animated.Text>
      <View style={styles.checkArea}>
        {/* Unchecked circle */}
        {!isChecked && (
          <View style={[styles.emptyCircle, { borderColor: colors.border }]} />
        )}
        {/* Checked icon animated */}
        {isChecked && (
          <Animated.View style={iconAnimStyle}>
            <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  checkArea: {
    marginLeft: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
});
