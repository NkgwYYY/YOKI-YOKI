import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon, iconSize } from '@/components/ui/Icon';
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
}: {
  food: FoodItem;
  canAfford: boolean;
  onFeed: (id: string) => void;
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
      <Pressable
        style={[
          cardStyles.card,
          { borderColor: rarityColor.border },
          !canAfford && cardStyles.cardLocked,
        ]}
        onPress={handlePress}
        onPressIn={() => {
          scale.value = withSpring(control.pressScale, { damping: 28, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 28, stiffness: 420 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${food.name} ${food.cost}ポイント`}
      >
        <View style={[cardStyles.rarityBadge, { backgroundColor: rarityColor.bg }]}>
          <Text style={[cardStyles.rarityText, { color: rarityColor.text }]}>
            {food.rarity === 'common' ? 'ノーマル' : food.rarity === 'rare' ? 'レア' : 'スペシャル'}
          </Text>
        </View>

        <View style={[cardStyles.iconWrap, { backgroundColor: rarityColor.bg }]}>
          <Icon name={food.icon} size={iconSize.lg} color={rarityColor.text} />
        </View>

        <Text style={cardStyles.name}>{food.name}</Text>
        <Text style={cardStyles.desc}>{food.description}</Text>

        <View style={cardStyles.satietyTrack}>
          <View style={[cardStyles.satietyFill, { width: `${food.satietyGain}%` }]} />
        </View>
        <Text style={cardStyles.satietyLabel}>満腹度 +{food.satietyGain}</Text>

        <View style={cardStyles.costRow}>
          <Icon name="coffee" size={iconSize.xs} color={colors.mutedForeground} />
          <Text style={cardStyles.costText}>{food.cost}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: border.width,
    backgroundColor: colors.card,
    padding: space.md,
    alignItems: 'center',
    gap: space.xs,
  },
  // ポイント不足は透明度だけで示す。塗りは変えない。
  cardLocked: { opacity: 0.5 },
  rarityBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-end',
  },
  rarityText: { ...typography.micro, fontSize: 10 },
  iconWrap: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  name: { ...typography.calloutStrong, color: colors.foreground, textAlign: 'center' },
  desc: { ...typography.micro, color: colors.mutedForeground, textAlign: 'center' },
  satietyTrack: {
    height: 4,
    borderRadius: radius.pill,
    width: '100%',
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  satietyFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.success },
  satietyLabel: { ...typography.micro, fontSize: 10, color: colors.mutedForeground },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
  },
  costText: { ...typography.label, color: colors.foreground },
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
    position: 'absolute',
    top: space.lg,
    alignSelf: 'center',
    backgroundColor: colors.foreground,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.pill,
  },
  text: { ...typography.calloutStrong, color: colors.primaryForeground },
});

/* ── Main modal ── */
export function FeedModal({ visible, onClose }: FeedModalProps) {
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
    currentSatiety >= 70 ? colors.success : currentSatiety >= 40 ? colors.warning : colors.danger;

  const hungerLabel =
    currentSatiety >= 80 ? 'お腹いっぱい' :
    currentSatiety >= 60 ? 'まあまあかな' :
    currentSatiety >= 40 ? 'すこし空腹だよ' :
    currentSatiety >= 20 ? 'お腹すいた〜！' :
    'ぺこぺこだよ';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="ごはんをあげる"
      subtitle="達成するとごはんポイントが貯まるよ"
      maxHeightRatio={0.88}
      contentStyle={modalStyles.content}
    >
      <View style={modalStyles.pointsBadge}>
        <Icon name="coffee" size={iconSize.sm} color={colors.primaryOnSoft} />
        <Text style={modalStyles.pointsText}>{feedState.points} ごはんpt</Text>
      </View>

      {/* マスコットと満腹度 */}
      <View style={modalStyles.mascotRow}>
        <Mascot
          stage={mascotStage}
          mood={isEating ? 'excited' : mascotMood}
          size={80}
          isEating={isEating}
        />
        <View style={modalStyles.satietyWrap}>
          <View style={modalStyles.satietyLabelRow}>
            <Text style={modalStyles.satietyTitle}>満腹度</Text>
            <Text style={[modalStyles.satietyValue, { color: satietyColor }]}>
              {currentSatiety}%
            </Text>
          </View>
          <View style={modalStyles.satietyTrack}>
            <View
              style={[
                modalStyles.satietyFill,
                { width: `${currentSatiety}%`, backgroundColor: satietyColor },
              ]}
            />
          </View>
          <Text style={modalStyles.hungerLabel}>{hungerLabel}</Text>
        </View>
      </View>

      {/* ごはん一覧 */}
      <View style={modalStyles.grid}>
        {FOOD_ITEMS.map((food) => (
          <View key={food.id} style={modalStyles.gridItem}>
            <FoodCard
              food={food}
              canAfford={feedState.points >= food.cost}
              onFeed={handleFeed}
            />
          </View>
        ))}
      </View>

      {/* ポイントの貯め方 */}
      <View style={modalStyles.hint}>
        <Icon name="info" size={iconSize.xs} color={colors.subtleForeground} />
        <Text style={modalStyles.hintText}>
          チェック達成 +2・全達成 +10・きろく +5・ミニゲーム +1〜3・発電所で交換もできるよ
        </Text>
      </View>

      <FeedToast message={toast.message} visible={toast.visible} />
    </BottomSheet>
  );
}

const modalStyles = StyleSheet.create({
  content: { gap: space.xl },

  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  pointsText: { ...typography.bodyStrong, color: colors.primaryOnSoft },

  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  satietyWrap: { flex: 1, gap: space.xs },
  satietyLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  satietyTitle: { ...typography.label, color: colors.foreground },
  satietyValue: { ...typography.label },
  satietyTrack: {
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  satietyFill: { height: '100%', borderRadius: radius.pill },
  hungerLabel: { ...typography.caption, color: colors.mutedForeground },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gridItem: { flexGrow: 1, flexBasis: '45%' },

  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  hintText: { ...typography.micro, color: colors.mutedForeground, flex: 1 },
});
