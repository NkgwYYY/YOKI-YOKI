import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { border, colors, radius, space, typography } from '@/constants/theme';

/**
 * 標準の面。白 + 1px ボーダー + radius.lg。影は付けない。
 * 面を重ねるときは色を濃くするのではなく、ボーダーだけで区切る。
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

/** カード内の見出し。任意で右側にアクションを置ける。 */
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
