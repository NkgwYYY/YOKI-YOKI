import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { BadgeDef } from '@/data/badges';
import { UnlockedBadge } from '@/contexts/AppContext';

interface BadgeCardProps {
  badge: BadgeDef;
  unlocked: UnlockedBadge | undefined;
}

export function BadgeCard({ badge, unlocked }: BadgeCardProps) {
  const colors = useColors();
  const isUnlocked = !!unlocked;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isUnlocked ? badge.iconColor + '44' : colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isUnlocked ? badge.iconColor + '22' : colors.muted,
          },
        ]}
      >
        <Ionicons
          name={badge.icon as any}
          size={28}
          color={isUnlocked ? badge.iconColor : colors.mutedForeground}
        />
      </View>
      <Text
        style={[
          styles.name,
          { color: isUnlocked ? colors.foreground : colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {badge.name}
      </Text>
      <Text
        style={[styles.description, { color: colors.mutedForeground }]}
        numberOfLines={2}
      >
        {badge.description}
      </Text>
      {!isUnlocked && (
        <View style={[styles.lockOverlay, { backgroundColor: 'rgba(20,13,45,0.72)' }]}>
          <Ionicons name="lock-closed" size={16} color={colors.mutedForeground} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '46%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 15,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
