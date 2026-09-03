import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { border, colors, radius, space, typography } from '@/constants/theme';
import { BadgeDef } from '@/data/badges';
import { UnlockedBadge } from '@/contexts/AppContext';
import { Icon, iconSize } from '@/components/ui/Icon';

interface BadgeCardProps {
  badge: BadgeDef;
  unlocked: UnlockedBadge | undefined;
}

export function BadgeCard({ badge, unlocked }: BadgeCardProps) {
  const isUnlocked = !!unlocked;

  return (
    <View style={[styles.card, isUnlocked && { borderColor: badge.iconColor }]}>
      <View style={styles.iconContainer}>
        <Icon
          name={isUnlocked ? badge.icon : 'lock'}
          size={22}
          color={isUnlocked ? badge.iconColor : colors.disabledForeground}
        />
      </View>
      <Text style={[styles.name, !isUnlocked && styles.nameLocked]} numberOfLines={1}>
        {badge.name}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {badge.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 未獲得は錠アイコンで示す。カードの上に暗幕を重ねない。
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    ...border.hairline,
    alignItems: 'center',
    gap: space.xs,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  name: { ...typography.label, color: colors.foreground, textAlign: 'center' },
  nameLocked: { color: colors.mutedForeground },
  description: { ...typography.micro, color: colors.mutedForeground, textAlign: 'center' },
});
