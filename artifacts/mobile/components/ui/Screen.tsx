import React from 'react';
import { Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { control, screenPadding, space } from '@/constants/theme';
import { SkyBackground } from '@/components/SkyBackground';

/**
 * 画面の外枠。左右マージン・上下のセーフエリア・タブバーぶんの余白を
 * ここだけで決める。個々の画面で inset を計算しないこと。
 */
export function Screen({
  children,
  scroll = true,
  gap = space.xl,
  contentStyle,
}: {
  children: React.ReactNode;
  /** false にすると縦スクロールしない固定レイアウトになる */
  scroll?: boolean;
  gap?: number;
  contentStyle?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'web' ? space.xxl : insets.top + space.lg;
  // タブバーに隠れないだけの余白を必ず確保する。
  const paddingBottom =
    Platform.OS === 'web' ? space.xxl + space.xxxl : insets.bottom + control.height + space.sm;
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
