import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon, iconSize } from '@/components/ui/Icon';
import { useApp } from '@/contexts/AppContext';
import { Mascot, StaticMascot } from '@/components/Mascot';
import { getMascotStage, getMascotMood } from '@/utils/mascotUtils';
import { FOOD_ITEMS, FoodItem, RARITY_COLORS, FoodRarity } from '@/data/foodItems';
import { BerryIcon, AppleIcon, CandyIcon, CakeFoodIcon, RamenIcon, SpecialFoodIcon } from '@/components/ui/Illustrations';

interface FeedModalProps {
  visible: boolean;
  onClose: () => void;
  onFed?: () => void;
}

function getFoodIllustration(id: string) {
  switch (id) {
    case 'berry': return <BerryIcon size={32} />;
    case 'apple': return <AppleIcon size={32} />;
    case 'candy': return <CandyIcon size={32} />;
    case 'cake': return <CakeFoodIcon size={32} />;
    case 'ramen': return <RamenIcon size={32} />;
    case 'special': return <SpecialFoodIcon size={32} />;
    default: return <BerryIcon size={32} />;
  }
}

function FoodCard({ food, canAfford, onFeed }: { food: FoodItem; canAfford: boolean; onFeed: (id: string) => void; }) {
  const rarityColor = RARITY_COLORS[food.rarity as FoodRarity];

  const handlePress = () => {
    if (!canAfford) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    onFeed(food.id);
  };

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          cardStyles.card,
          { borderColor: rarityColor.border },
          !canAfford && cardStyles.cardLocked,
          pressed && cardStyles.cardPressed,
        ]}
        onPress={handlePress}
      >
        <View style={[cardStyles.rarityBadge, { backgroundColor: rarityColor.bg }]}>
          <Text style={[cardStyles.rarityText, { color: rarityColor.text }]}>
            {food.rarity === 'common' ? 'ノーマル' : food.rarity === 'rare' ? 'レア' : 'スペシャル'}
          </Text>
        </View>

        <View style={cardStyles.iconWrap}>
          {getFoodIllustration(food.id)}
        </View>

        <Text style={cardStyles.name}>{food.name}</Text>
        <Text style={cardStyles.desc}>{food.description}</Text>

        <View style={cardStyles.satietyTrack}>
          <View style={[cardStyles.satietyFill, { width: `${food.satietyGain}%` }]} />
        </View>
        <Text style={cardStyles.satietyLabel}>満腹度 +{food.satietyGain}</Text>

        <View style={cardStyles.costRow}>
          <Icon name="star" size={iconSize.xs} color={colors.primary} />
          <Text style={cardStyles.costText}>{food.cost}</Text>
        </View>
      </Pressable>
    </View>
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
  cardLocked: { opacity: 0.5 },
  cardPressed: { opacity: 0.86, transform: [{ scale: control.pressScale }] },
  rarityBadge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-end' },
  rarityText: { ...typography.micro, fontSize: 10 },
  iconWrap: { height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  name: { ...typography.calloutStrong, color: colors.foreground, textAlign: 'center' },
  desc: { ...typography.micro, color: colors.mutedForeground, textAlign: 'center' },
  satietyTrack: { height: 4, borderRadius: radius.pill, width: '100%', backgroundColor: colors.mutedStrong, overflow: 'hidden', marginTop: space.xs },
  satietyFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.success },
  satietyLabel: { ...typography.micro, fontSize: 10, color: colors.mutedForeground },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.background, marginTop: space.xs },
  costText: { ...typography.label, color: colors.foreground },
});

function FeedToast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={toastStyles.toast}>
      <Text style={toastStyles.text}>{message}</Text>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  toast: { position: 'absolute', top: space.lg, alignSelf: 'center', backgroundColor: colors.primary, paddingHorizontal: space.xl, paddingVertical: space.md, borderRadius: radius.pill },
  text: { ...typography.calloutStrong, color: colors.primaryForeground },
});

export function FeedModal({ visible, onClose, onFed }: FeedModalProps) {
  const { feedState, currentSatiety, feedMascot, progress, getTodayRecord, getCompletedCount, getTotalCheckCount } = useApp();

  const todayRecord = getTodayRecord();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCheckCount();
  const mascotStage = getMascotStage(progress.level);
  const mascotMood = getMascotMood(progress, todayRecord, completedCount, totalCount);

  const [isEating, setIsEating] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const feeding = useRef(false);
  const mounted = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; timers.current.forEach(clearTimeout); };
  }, []);
  const handleFeed = async (foodId: string) => {
    if (feeding.current) return;
    feeding.current = true;
    try {
      const result = await feedMascot(foodId);
      if (!mounted.current) return;
      if (result.success) {
        if (onFed) { onFed(); return; }
        setIsEating(true);
        timers.current.push(setTimeout(() => setIsEating(false), 800));
      }
      setToast({ visible: true, message: result.message });
      timers.current.push(setTimeout(() => setToast({ visible: false, message: '' }), 2200));
    } catch {
      if (mounted.current) setToast({ visible: true, message: 'ごはんを保存できませんでした。もう一度お試しください。' });
    } finally { feeding.current = false; }
  };

  const satietyColor = colors.primary;
  const hungerLabel = currentSatiety >= 80 ? 'ごちそうさま' : 'おやつでひと休みしよう';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="ごはんをあげる" subtitle="一緒に、ほっとする時間" maxHeightRatio={0.88} contentStyle={modalStyles.content}>
      <View style={modalStyles.pointsBadge}>
        <Icon name="star" size={iconSize.sm} color={colors.primary} />
        <Text style={modalStyles.pointsText}>{feedState.points} pt</Text>
      </View>

      <View style={modalStyles.mascotRow}>
        {Platform.OS === 'ios' ? (
          <StaticMascot stage={mascotStage} mood={isEating ? 'excited' : mascotMood} size={80} />
        ) : (
          <Mascot stage={mascotStage} mood={isEating ? 'excited' : mascotMood} size={80} isEating={isEating} />
        )}
        <View style={modalStyles.satietyWrap}>
          <View style={modalStyles.satietyLabelRow}>
            <Text style={modalStyles.satietyTitle}>満腹度</Text>
            <Text style={[modalStyles.satietyValue, { color: satietyColor }]}>{currentSatiety}%</Text>
          </View>
          <View style={modalStyles.satietyTrack}>
            <View style={[modalStyles.satietyFill, { width: `${currentSatiety}%`, backgroundColor: satietyColor }]} />
          </View>
          <Text style={modalStyles.hungerLabel}>{hungerLabel}</Text>
        </View>
      </View>

      <View style={modalStyles.grid}>
        {FOOD_ITEMS.map((food) => (
          <View key={food.id} style={modalStyles.gridItem}>
            <FoodCard food={food} canAfford={feedState.points >= food.cost} onFeed={handleFeed} />
          </View>
        ))}
      </View>

      <View style={modalStyles.hint}>
        <Icon name="info" size={iconSize.xs} color={colors.subtleForeground} />
        <Text style={modalStyles.hintText}>YOKIポイントは記録やミニゲームで貯まるよ</Text>
      </View>

      <FeedToast message={toast.message} visible={toast.visible} />
    </BottomSheet>
  );
}

const modalStyles = StyleSheet.create({
  content: { gap: space.xl },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: colors.primarySoft, ...border.hairline, borderColor: colors.primary },
  pointsText: { ...typography.bodyStrong, color: colors.primary },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  satietyWrap: { flex: 1, gap: space.xs },
  satietyLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  satietyTitle: { ...typography.label, color: colors.foreground },
  satietyValue: { ...typography.label },
  satietyTrack: { height: space.sm, borderRadius: radius.pill, backgroundColor: colors.muted, overflow: 'hidden' },
  satietyFill: { height: '100%', borderRadius: radius.pill },
  hungerLabel: { ...typography.caption, color: colors.mutedForeground },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gridItem: { flexGrow: 1, flexBasis: '45%' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.muted },
  hintText: { ...typography.micro, color: colors.mutedForeground, flex: 1 },
});