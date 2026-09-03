import React from 'react';
import { Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { control, screenPadding, space } from '@/constants/theme';
import { SkyBackground } from '@/components/SkyBackground';

export function Screen({
  children,
  scroll = true,
  gap = space.xl,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  gap?: number;
  contentStyle?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'web' ? space.xxl : insets.top + space.lg;
  const paddingBottom = Platform.OS === 'web' ? space.xxl + space.xxxl : insets.bottom + control.height + space.sm;
  const padding = { paddingTop, paddingBottom, paddingHorizontal: screenPadding };

  return (
    <View style={styles.flex}>
      <SkyBackground />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, padding, { gap }, contentStyle]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, padding, { gap }, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
});
