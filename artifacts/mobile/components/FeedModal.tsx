import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { getMascotStage, getMascotMood } from '@/utils/mascotUtils';
import { FOOD_ITEMS, FoodItem, RARITY_COLORS, FoodRarity } from '@/data/foodItems';

interface FeedModalProps {
  visible: boolean;
  onClose: () => void;
}

function FoodCard({
  food,
  canAfford,
  onFeed,
  colors,
}: {
  food: FoodItem;
  canAfford: boolean;
  onFeed: (id: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const scale = useSharedValue(1);
  const rarityColor = RARITY_COLORS[food.rarity as FoodRarity];
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    if (!canAfford) {
      scale.value = withSequence(
        withTiming(0.95, { duration: 60 }),
        withTiming(1, { duration: 60 }),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    scale.value = withSequence(
      withSpring(0.9, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 300 }),
    );
    onFeed(food.id);
  };

  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[
          cardStyles.card,
          {
            backgroundColor: canAfford ? colors.card : colors.muted,
            borderColor: canAfford ? rarityColor.border : colors.border,
            opacity: canAfford ? 1 : 0.55,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Rarity badge */}
        <View style={[cardStyles.rarityBadge, { backgroundColor: rarityColor.bg }]}>
          <Text style={[cardStyles.rarityText, { color: rarityColor.text }]}>
            {food.rarity === 'common' ? 'ノーマル' : food.rarity === 'rare' ? 'レア' : '★スペシャル'}
          </Text>
        </View>

        {/* Emoji */}
        <Text style={cardStyles.emoji}>{food.emoji}</Text>

        {/* Name + description */}
        <Text style={[cardStyles.name, { color: colors.foreground }]}>{food.name}</Text>
        <Text style={[cardStyles.desc, { color: colors.mutedForeground }]}>{food.description}</Text>

        {/* Satiety bar */}
        <View style={[cardStyles.satietyTrack, { backgroundColor: colors.muted }]}>
          <View style={[cardStyles.satietyFill, { width: `${food.satietyGain}%`, backgroundColor: '#00D4AA' }]} />
        </View>
        <Text style={[cardStyles.satietyLabel, { color: colors.mutedForeground }]}>満腹度 +{food.satietyGain}</Text>

        {/* Cost */}
        <View style={[cardStyles.costRow, { backgroundColor: canAfford ? '#FFD16622' : colors.muted }]}>
          <Text style={cardStyles.coinIcon}>🪙</Text>
          <Text style={[cardStyles.costText, { color: canAfford ? '#D97706' : colors.mutedForeground }]}>
            {food.cost} pt
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 18, borderWidth: 1.5,
    padding: 14, alignItems: 'center', gap: 6,
    width: '100%',
  },
  rarityBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 10, alignSelf: 'flex-end', marginBottom: 2,
  },
  rarityText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  emoji: { fontSize: 40, lineHeight: 48 },
  name: { fontSize: 14, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  desc: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  satietyTrack: { height: 5, borderRadius: 3, width: '100%', overflow: 'hidden' },
  satietyFill: { height: '100%', borderRadius: 3 },
  satietyLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  costRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginTop: 2,
  },
  coinIcon: { fontSize: 13 },
  costText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});

/* ── Toast notification ── */
function FeedToast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(10);
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      ty.value = withSpring(0, { damping: 18, stiffness: 300 });
    } else {
      opacity.value = withDelay(1800, withTiming(0, { duration: 300 }));
      ty.value = withDelay(1800, withTiming(-10, { duration: 300 }));
    }
  }, [visible]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }));
  return (
    <Animated.View style={[toastStyles.toast, style]}>
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}
const toastStyles = StyleSheet.create({
  toast: {
    position: 'absolute', top: 16, alignSelf: 'center',
    backgroundColor: '#2D1B69EE', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  text: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});

/* ── Main modal ── */
export function FeedModal({ visible, onClose }: FeedModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { feedState, currentSatiety, feedMascot, progress, getTodayRecord, getCompletedCount, getTotalCheckCount } = useApp();

  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();
  const mascotStage = getMascotStage(progress.level);
  const mascotMood = getMascotMood(progress, todayRecord, completedCount, totalCount);

  const [isEating, setIsEating] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const handleFeed = async (foodId: string) => {
    const result = await feedMascot(foodId);
    if (result.success) {
      setIsEating(true);
      setTimeout(() => setIsEating(false), 800);
    }
    setToast({ visible: true, message: result.message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2200);
  };

  const satietyColor =
    currentSatiety >= 70 ? '#00D4AA' :
    currentSatiety >= 40 ? '#FFB347' :
    '#EF4444';

  const hungerLabel =
    currentSatiety >= 80 ? 'お腹いっぱい😊' :
    currentSatiety >= 60 ? 'まあまあかな' :
    currentSatiety >= 40 ? 'すこし空腹だよ' :
    currentSatiety >= 20 ? 'お腹すいた〜！' :
    'ぺこぺこだよ😢';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[modalStyles.sheet, { backgroundColor: colors.card }]}>
          <View style={[modalStyles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={modalStyles.header}>
            <View>
              <Text style={[modalStyles.title, { color: colors.foreground }]}>ごはんをあげる</Text>
              <Text style={[modalStyles.sub, { color: colors.mutedForeground }]}>
                達成するとポイントが貯まるよ
              </Text>
            </View>
            <View style={[modalStyles.pointsBadge, { backgroundColor: '#FFD16622' }]}>
              <Text style={modalStyles.coinIcon}>🪙</Text>
              <Text style={[modalStyles.pointsText, { color: '#D97706' }]}>{feedState.points} pt</Text>
            </View>
          </View>

          {/* Mascot + satiety */}
          <View style={modalStyles.mascotRow}>
            <Mascot stage={mascotStage} mood={isEating ? 'excited' : mascotMood} size={90} isEating={isEating} />
            <View style={modalStyles.satietyWrap}>
              <View style={modalStyles.satietyLabelRow}>
                <Text style={[modalStyles.satietyTitle, { color: colors.foreground }]}>満腹度</Text>
                <Text style={[modalStyles.satietyValue, { color: satietyColor }]}>{currentSatiety}%</Text>
              </View>
              <View style={[modalStyles.satietyTrack, { backgroundColor: colors.muted }]}>
                <View style={[modalStyles.satietyFill, { width: `${currentSatiety}%`, backgroundColor: satietyColor }]} />
              </View>
              <Text style={[modalStyles.hungerLabel, { color: colors.mutedForeground }]}>{hungerLabel}</Text>
            </View>
          </View>

          {/* Food grid */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={modalStyles.grid}
          >
            {FOOD_ITEMS.map((food) => (
              <View key={food.id} style={modalStyles.gridItem}>
                <FoodCard
                  food={food}
                  canAfford={feedState.points >= food.cost}
                  onFeed={handleFeed}
                  colors={colors}
                />
              </View>
            ))}
          </ScrollView>

          {/* How to earn points hint */}
          <View style={[modalStyles.hint, { backgroundColor: colors.muted }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[modalStyles.hintText, { color: colors.mutedForeground }]}>
              チェック達成 +2pt・全達成ボーナス +10pt・きろく +5pt
            </Text>
          </View>

          <View style={{ height: Platform.OS === 'web' ? 16 : insets.bottom + 4 }} />
        </View>

        {/* Toast */}
        <FeedToast message={toast.message} visible={toast.visible} />
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0,
    maxHeight: '85%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  coinIcon: { fontSize: 16 },
  pointsText: { fontSize: 17, fontFamily: 'Inter_700Bold' },

  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  satietyWrap: { flex: 1, gap: 6 },
  satietyLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  satietyTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  satietyValue: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  satietyTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  satietyFill: { height: '100%', borderRadius: 5 },
  hungerLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 14 },
  gridItem: { width: '47%' },

  hint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 12, borderRadius: 12, marginBottom: 12,
  },
  hintText: { fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1 },
});
