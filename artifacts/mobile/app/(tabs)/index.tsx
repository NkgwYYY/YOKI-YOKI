import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { border, colors, control, radius, space, typography } from '@/constants/theme';
import { BottomSheet, CenterDialog } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon, IconBadge, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { Screen } from '@/components/ui/Screen';
import { FeedModal } from '@/components/FeedModal';
import { MiniGameModal } from '@/components/MiniGameModal';
import { StageCharacter } from '@/components/StageCharacter';
import {
  EGG_COMPANION_COST,
  useApp,
  type RoomFlower,
  type RoomFurniture,
  type RoomItemKind,
} from '@/contexts/AppContext';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { getCurrentSlot, MAX_PLAYS_PER_SLOT } from '@/utils/miniGameUtils';
import { getMascotStage } from '@/utils/mascotUtils';
import { RoomItemPreview, RoomView } from '@/components/RoomView';
import { GameBoardIllustration } from '@/components/ui/Illustrations';

const FURNITURE_OPTIONS: { id: RoomFurniture; name: string; cost: number }[] = [
  { id: 'none', name: '置かない', cost: 0 },
  { id: 'sofa', name: 'ソファ', cost: 120 },
  { id: 'vanity', name: 'ドレッサー', cost: 180 },
  { id: 'bookshelf', name: '本棚', cost: 260 },
];

const FLOWER_OPTIONS: { id: RoomFlower; name: string; cost: number }[] = [
  { id: 'none', name: '置かない', cost: 0 },
  { id: 'pink', name: 'ローズ', cost: 70 },
  { id: 'violet', name: 'バイオレット', cost: 90 },
  { id: 'rainbow', name: 'レインボー', cost: 140 },
];

function OrbitAction({
  icon,
  illustration,
  label,
  onPress,
  disabled,
  testID,
  style,
}: {
  icon: IconName;
  illustration?: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
  style: object;
}) {
  return (
    <PressScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[styles.orbitAction, style, disabled && styles.orbitActionDisabled]}
    >
      {illustration ?? <Icon name={icon} size={iconSize.md} color={colors.foreground} />}
      <Text style={styles.orbitActionLabel} numberOfLines={1}>{label}</Text>
    </PressScale>
  );
}

function MenuAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityLabel={label} style={styles.menuAction}>
      <IconBadge name={icon} size="sm" background={colors.muted} tint={colors.primary} />
      <Text style={styles.menuActionText}>{label}</Text>
      <Icon name="chevron-right" size={iconSize.sm} color={colors.subtleForeground} />
    </PressScale>
  );
}

function HomeSatietyGauge({ satiety }: { satiety: number }) {
  const isHungry = satiety < 40;
  return (
    <View style={styles.satietyContainer}>
      <Icon name="coffee" size={14} color={isHungry ? colors.danger : colors.primary} />
      <View style={styles.satietyTrack}>
        <View style={[styles.satietyFill, { width: `${satiety}%`, backgroundColor: isHungry ? colors.danger : colors.primary }]} />
      </View>
      <Text style={styles.satietyText}>{satiety}%</Text>
    </View>
  );
}

function AtelierOption({
  kind,
  id,
  name,
  selected,
  owned,
  cost,
  onPress,
}: {
  kind: RoomItemKind;
  id: RoomFurniture | RoomFlower;
  name: string;
  selected: boolean;
  owned: boolean;
  cost: number;
  onPress: () => void;
}) {
  return (
    <PressScale
      onPress={onPress}
      accessibilityLabel={`${name}・${selected ? '使用中' : owned ? '選ぶ' : `${cost}ポイント`}`}
      style={[styles.shopOption, selected && styles.shopOptionSelected]}
    >
      <RoomItemPreview kind={kind} id={id} />
      <View style={styles.shopOptionCopy}>
        <Text style={styles.shopOptionName}>{name}</Text>
      </View>
      <View style={[styles.shopPrice, selected && styles.shopPriceSelected]}>
        <Text style={[styles.shopPriceText, selected && styles.shopPriceTextSelected]}>
          {selected ? '使用中' : owned ? '選ぶ' : `${cost} pt`}
        </Text>
      </View>
    </PressScale>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    completeMiniGame, feedState, growth, getTodayRecord, mascotName,
    miniGameState, progress, setMascotName, currentSatiety,
    roomCustomization, selectRoomItem, buyRoomItem,
    companionState, buyEggCompanion,
  } = useApp();
  const todayRecord = getTodayRecord();

  const [showMenu, setShowMenu] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showAtelier, setShowAtelier] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [shopMessage, setShopMessage] = useState('');

  const currentSlot = getCurrentSlot();
  const slotPlays = currentSlot ? miniGameState[currentSlot] ?? 0 : MAX_PLAYS_PER_SLOT;
  const canPlay = !!currentSlot && slotPlays < MAX_PLAYS_PER_SLOT;
  const mascotMood = todayRecord ? 'happy' : 'normal';
  const characterSize = companionState.extraEggs > 0 ? 92 : 104;
  const characterFrame = characterSize * 1.7;
  const characterHeight = characterSize * 2.4;

  const openName = () => {
    setShowMenu(false);
    setNameInput(mascotName);
    setShowName(true);
  };

  const handleRoomItem = async (
    kind: RoomItemKind,
    id: RoomFurniture | RoomFlower,
    cost: number,
    owned: boolean,
  ) => {
    setShopMessage('');
    if (owned) {
      await selectRoomItem(kind, id);
      setShopMessage('背景を変えたよ。');
      return;
    }
    const result = await buyRoomItem(kind, id, cost);
    setShopMessage(result.success ? '新しいアイテムを飾ったよ。' : 'ポイントがもう少し必要みたい。');
  };

  const handleBuyEgg = async () => {
    setShopMessage('');
    const result = await buyEggCompanion();
    setShopMessage(result.success ? '新しいたまごが仲間になったよ！' : result.reason === 'already_owned' ? 'このたまごはもう仲間になっているよ。' : 'たまごを迎えるにはポイントがもう少し必要だよ。');
  };

  return (
    <>
      <Screen scroll={false} gap={space.sm} contentStyle={styles.homeContent}>
        <View style={styles.header}>
          <View>
            <Image source={require('@/assets/images/yoki_logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.date}>{formatDateJP(getTodayDate())}</Text>
          </View>
          <PressScale
            testID="home-more-menu"
            accessibilityLabel="ほかのメニュー"
            onPress={() => setShowMenu(true)}
            style={styles.moreButton}
          >
            <Icon name="menu" size={iconSize.md} color={colors.foreground} />
          </PressScale>
        </View>

        <View style={styles.centerArea}>
          <RoomView
            level={progress.level}
            streak={progress.streak}
            totalDays={progress.totalDays}
            mascotName={mascotName}
            customization={roomCustomization}
          >
            <View style={styles.characterGarden}>
              <View
                style={[
                  styles.characterMain,
                  {
                    width: characterFrame,
                    height: characterHeight,
                    marginLeft: -characterFrame / 2,
                    marginTop: -characterHeight / 2,
                  },
                ]}
              >
                <StageCharacter
                  stage={getMascotStage(progress.level)}
                  mood={mascotMood}
                  size={characterSize}
                  growthSize={growth.growthSize}
                />
              </View>
              {companionState.extraEggs > 0 ? (
                <View style={styles.companionEgg}>
                  <StageCharacter stage="egg" mood="happy" size={58} growthSize={0.78} />
                </View>
              ) : null}

              <OrbitAction
                testID="home-feed"
                icon="coffee"
                label="ごはん"
                onPress={() => setShowFeed(true)}
                style={styles.orbitFeed}
              />
              <OrbitAction
                testID="home-record"
                icon="edit-3"
                label={todayRecord ? '記録を見る' : '記録する'}
                onPress={() => router.push('/(tabs)/record')}
                style={styles.orbitRecord}
              />
              <OrbitAction
                testID="home-chat"
                icon="message-circle"
                label="チャット"
                onPress={() => router.push('/(tabs)/chat')}
                style={styles.orbitChat}
              />
              <OrbitAction
                testID="home-game"
                icon="star"
                illustration={<GameBoardIllustration size={46} />}
                label="あそぶ"
                disabled={!canPlay}
                onPress={() => setShowMiniGame(true)}
                style={styles.orbitGame}
              />
            </View>
          </RoomView>
          <View style={styles.statusRow}>
            <HomeSatietyGauge satiety={currentSatiety} />
            <View style={styles.pointsBalance}>
              <Icon name="star" size={14} color={colors.primary} />
              <Text style={styles.pointsBalanceText}>{feedState.points} pt</Text>
            </View>
          </View>
        </View>
      </Screen>

      <BottomSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        title="ほかにできること"
        subtitle="今日は、気になるものだけで大丈夫。"
        scroll={false}
      >
        <MenuAction icon="message-circle" label="お話しする" onPress={() => { setShowMenu(false); router.push('/(tabs)/chat'); }} />
        <MenuAction icon="coffee" label="ごはんをあげる" onPress={() => { setShowMenu(false); setShowFeed(true); }} />
        <MenuAction icon="music" label={canPlay ? 'リズムであそぶ' : 'リズムであそぶ（またあとで）'} onPress={() => { setShowMenu(false); if (canPlay) setShowMiniGame(true); }} />
        <MenuAction icon="trending-up" label="成長を見る" onPress={() => { setShowMenu(false); router.push('/(tabs)/growth'); }} />
        <MenuAction icon="edit-3" label="背景をカスタムする" onPress={() => { setShowMenu(false); setShopMessage(''); setShowAtelier(true); }} />
        <MenuAction icon="edit-3" label={mascotName ? 'なかまの名前を変える' : 'なかまに名前をつける'} onPress={openName} />
      </BottomSheet>

      <BottomSheet
        visible={showAtelier}
        onClose={() => setShowAtelier(false)}
        title="カスタム"
        subtitle={`きらめきポイント ${feedState.points} pt`}
        maxHeightRatio={0.9}
      >
        {shopMessage ? <Text style={styles.shopMessage}>{shopMessage}</Text> : null}

        <View style={styles.shopSection}>
          <Text style={styles.shopSectionTitle}>家具</Text>
          {FURNITURE_OPTIONS.map((item) => (
            <AtelierOption
              key={item.id}
              {...item}
              kind="furniture"
              selected={roomCustomization.furniture === item.id}
              owned={item.id === 'none' || roomCustomization.ownedFurniture.includes(item.id)}
              onPress={() => handleRoomItem('furniture', item.id, item.cost, item.id === 'none' || roomCustomization.ownedFurniture.includes(item.id))}
            />
          ))}
        </View>

        <View style={styles.shopSection}>
          <Text style={styles.shopSectionTitle}>花</Text>
          {FLOWER_OPTIONS.map((item) => (
            <AtelierOption
              key={item.id}
              {...item}
              kind="flower"
              selected={roomCustomization.flower === item.id}
              owned={item.id === 'none' || roomCustomization.ownedFlowers.includes(item.id)}
              onPress={() => handleRoomItem('flower', item.id, item.cost, item.id === 'none' || roomCustomization.ownedFlowers.includes(item.id))}
            />
          ))}
        </View>

        <View style={styles.eggShopCard}>
          <View style={styles.eggShopGlow}><Text style={styles.eggShopIcon}>✦</Text></View>
          <View style={styles.eggShopCopy}>
            <Text style={styles.eggShopTitle}>もうひとつのたまご</Text>
          </View>
          <Button
            label={companionState.extraEggs > 0 ? '仲間になったよ' : `${EGG_COMPANION_COST} pt`}
            size="sm"
            disabled={companionState.extraEggs > 0 || feedState.points < EGG_COMPANION_COST}
            onPress={handleBuyEgg}
          />
        </View>
        {companionState.extraEggs === 0 && feedState.points < EGG_COMPANION_COST ? (
          <Text style={styles.eggProgress}>あと {EGG_COMPANION_COST - feedState.points} pt で新しいたまごを迎えられるよ</Text>
        ) : null}
      </BottomSheet>

      <CenterDialog visible={showName} onClose={() => setShowName(false)}>
        <Text style={styles.dialogTitle}>なかまの名前</Text>
        <Text style={styles.dialogSub}>呼びたい名前をつけよう。</Text>
        <TextInput
          value={nameInput}
          onChangeText={setNameInput}
          maxLength={16}
          placeholder="例：よっきー"
          placeholderTextColor={colors.subtleForeground}
          style={styles.input}
        />
        <Button label="この名前にする" disabled={!nameInput.trim()} fullWidth onPress={() => {
          if (!nameInput.trim()) return;
          setMascotName(nameInput.trim());
          setShowName(false);
        }} />
      </CenterDialog>

      <FeedModal visible={showFeed} onClose={() => setShowFeed(false)} />
      {currentSlot && (
        <MiniGameModal
          visible={showMiniGame}
          slot={currentSlot}
          onClose={() => setShowMiniGame(false)}
          onReward={(reward) => completeMiniGame(currentSlot, reward)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  homeContent: { justifyContent: 'space-between', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  logo: { width: 120, height: 28, tintColor: colors.foreground },
  date: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  moreButton: {
    width: control.icon,
    height: control.icon,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  characterGarden: { width: '100%', height: 310, position: 'relative' },
  characterMain: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionEgg: { position: 'absolute', left: '50%', marginLeft: 42, bottom: 8, zIndex: 4 },
  orbitAction: {
    position: 'absolute',
    zIndex: 12,
    width: 72,
    height: 68,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 0,
  },
  orbitActionDisabled: { opacity: 0.45 },
  orbitActionLabel: { ...typography.micro, color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
  orbitFeed: { left: 0, top: 28 },
  orbitRecord: { left: 0, top: 120 },
  orbitChat: { left: 0, top: 212 },
  orbitGame: { right: 0, top: 120 },

  satietyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    gap: space.sm,
    minHeight: 38,
    ...border.hairline,
  },
  satietyTrack: { width: 80, height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' },
  satietyFill: { height: '100%', borderRadius: 3 },
  satietyText: { ...typography.micro, color: colors.foreground, width: 28, textAlign: 'right' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingTop: 2, paddingBottom: space.sm },
  pointsBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    gap: space.xs,
    minHeight: 38,
    ...border.hairline,
  },
  pointsBalanceText: { ...typography.micro, color: colors.foreground },

  shopMessage: {
    ...typography.calloutStrong,
    color: colors.primaryOnSoft,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  shopSection: { gap: space.sm },
  shopSectionTitle: { ...typography.subhead, color: colors.foreground },
  shopOption: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...border.hairline,
    padding: space.md,
  },
  shopOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  shopOptionCopy: { flex: 1 },
  shopOptionName: { ...typography.calloutStrong, color: colors.foreground },
  shopPrice: { borderRadius: radius.pill, backgroundColor: colors.muted, paddingHorizontal: space.sm, paddingVertical: 6 },
  shopPriceSelected: { backgroundColor: colors.primary },
  shopPriceText: { ...typography.micro, color: colors.secondaryForeground },
  shopPriceTextSelected: { color: colors.primaryForeground },
  eggShopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    backgroundColor: '#E8D5FA',
    borderWidth: border.width,
    borderColor: '#B986E3',
    padding: space.lg,
  },
  eggShopGlow: { width: 46, height: 56, borderRadius: 24, backgroundColor: '#D7B6F2', alignItems: 'center', justifyContent: 'center' },
  eggShopIcon: { color: '#7D42AE', fontSize: 24 },
  eggShopCopy: { flex: 1 },
  eggShopTitle: { ...typography.calloutStrong, color: colors.foreground },
  eggProgress: { ...typography.caption, color: colors.primaryOnSoft, textAlign: 'center', marginTop: -space.sm },

  menuAction: {
    minHeight: control.minTouch,
    borderRadius: radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  menuActionText: { ...typography.body, flex: 1, color: colors.foreground },

  dialogTitle: { ...typography.heading, color: colors.foreground },
  dialogSub: { ...typography.caption, color: colors.mutedForeground },
  input: {
    ...typography.body,
    height: control.height,
    backgroundColor: colors.input,
    ...border.hairlineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    color: colors.foreground,
  },
});