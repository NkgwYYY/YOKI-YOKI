import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Icon, iconSize, type IconName } from "@/components/ui/Icon";
export const worldUI = {
  cream: "#FFF9F0F5",
  ink: "#56435F",
  violet: "#806195",
  pale: "#EFE3F5",
  edge: "#FFFFFFE8",
};
export function WorldPill({
  label,
  icon,
  onPress,
  disabled = false,
  primary = false,
  compact = false,
  testID,
  accessibilityLabel,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  compact?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.pill,
        primary && s.primary,
        compact && s.compact,
        style,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={iconSize.md}
          color={primary ? "#FFF9F2" : worldUI.violet}
        />
      )}
      {!compact && (
        <Text
          numberOfLines={1}
          style={[s.label, primary && { color: "#FFF9F2" }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
const s = StyleSheet.create({
  pill: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: worldUI.edge,
    backgroundColor: worldUI.cream,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#4D315D",
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  primary: { backgroundColor: worldUI.violet, borderColor: "#BD9FD0" },
  compact: { width: 46, paddingHorizontal: 0 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: worldUI.ink,
  },
});
