import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { border, colors, radius, space, typography } from '@/constants/theme';

/**
 * 宇宙の居場所テーマに合わせた、半透明で浮遊感のあるカード。
 */
export function Card({
  children,
  style,
  padding = space.lg,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    // 暗いテーマに合わせた微かな輝き
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  headerCopy: { flex: 1 },
  title: { ...typography.subhead, color: colors.foreground },
  subtitle: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
});
