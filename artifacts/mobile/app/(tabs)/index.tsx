import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { border, colors, control, radius, space, typography, elevation } from '@/constants/theme';
import { BottomSheet, CenterDialog } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, IconBadge, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { Screen } from '@/components/ui/Screen';
import { FeedModal } from '@/components/FeedModal';
import { MiniGameModal } from '@/components/MiniGameModal';
import { QuickAffirmationRecord } from '@/components/record/QuickAffirmationRecord';
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
import { CakeIllustration, ChatIllustration, GamepadIllustration } from '@/components/ui/Illustrations';
import { RoomView } from '@/components/RoomView';

const FURNITURE_OPTIONS: { id: RoomFurniture; name: string; description: string; cost: number; color: string }[] = [
  { id: 'sofa', name: 'ふわふわソファ', description: '最初からある、ピンクのくつろぎ場所', cost: 0, color: '#F05A9D' },
  { id: 'vanity', name: 'きらめきドレッサー', description: '光を集めるラベンダーの鏡台', cost: 180, color: '#9B6BD0' },
  { id: 'bookshelf', name: 'ミニ本棚', description: '思い出を少しずつ並べる紫の棚', cost: 260, color: '#6D4B9B' },
];

const FLOWER_OPTIONS: { id: RoomFlower; name: string; description: string; cost: number; color: string }[] = [
  { id: 'pink', name: 'ピンクの花', description: 'やさしく明るい定番のお花', cost: 0, color: '#FF77B7' },
  { id: 'violet', name: 'すみれの花', description: '少し大人っぽい紫のお花', cost: 70, color: '#C79BFF' },
  { id: 'rainbow', name: 'にじいろの花', description: '長く続けた部屋に似合う特別なお花', cost: 140, color: '#FFB5DF' },
];

/** コンパクトで没入感のあるアクションモジュール。 */
function HomeActionModule({
  illustration,
  label,
  sub,
  onPress,
  disabled,
  testID,
}: {
  illustration: React.ReactNode;
  label: string;
  sub: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}) {
  return (
    <PressScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`${label}・${sub}`}
      style={[styles.actionModule, disabled && styles.actionModuleDisabled]}
    >
      <View style={styles.actionIlluWrap}>
        {illustration}
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.actionSub} numberOfLines={1}>{sub}</Text>
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
  name,
  description,
  color,
  selected,
  owned,
  cost,
  onPress,
}: {
  name: string;
  description: string;
  color: string;
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
      <View style={[styles.shopSwatch, { backgroundColor: color }]}>
        <Text style={styles.shopSwatchSpark}>✦</Text>
      </View>
      <View style={styles.shopOptionCopy}>
        <Text style={styles.shopOptionName}>{name}</Text>
        <Text style={styles.shopOptionDescription}>{description}</Text>
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
  const [isCelebratingRecord, setIsCelebratingRecord] = useState(false);
  const [shopMessage, setShopMessage] = useState('');

  const currentSlot = getCurrentSlot();
  const slotPlays = currentSlot ? miniGameState[currentSlot] ?? 0 : MAX_PLAYS_PER_SLOT;
  const canPlay = !!currentSlot && slotPlays < MAX_PLAYS_PER_SLOT;
  const mascotMood = todayRecord ? 'happy' : 'normal';
  const showQuickRecord = !todayRecord || isCelebratingRecord;

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
      setShopMessage('アトリエの模様替えができたよ。');
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
      <Screen scroll={true}>
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
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
              {todayRecord ? '今日も来てくれて、うれしい！' : '今日は、ひとつできたら十分。'}
            </Text>
            <View style={styles.speechTail} />
          </View>

          <RoomView
            level={progress.level}
            streak={progress.streak}
            totalDays={progress.totalDays}
            mascotName={mascotName}
            customization={roomCustomization}
            onOpenCustomize={() => { setShopMessage(''); setShowAtelier(true); }}
          >
            <View style={styles.characterGarden}>
              <StageCharacter
                stage={getMascotStage(progress.level)}
                mood={mascotMood}
                size={companionState.extraEggs > 0 ? 102 : 120}
                growthSize={growth.growthSize}
              />
              {companionState.extraEggs > 0 ? (
                <View style={styles.companionEgg}>
                  <StageCharacter stage="egg" mood="happy" size={76} growthSize={0.82} />
                  <Text style={styles.companionLabel}>あたらしい仲間</Text>
                </View>
              ) : null}
            </View>
          </RoomView>

          <HomeSatietyGauge satiety={currentSatiety} />
        </View>

        <View style={styles.actionsGrid}>
          <HomeActionModule
            testID="home-feed"
            illustration={<CakeIllustration size={44} />}
            label="ごはん"
            sub={`${feedState.points} pt`}
            onPress={() => setShowFeed(true)}
          />
          <HomeActionModule
            testID="home-chat"
            illustration={<ChatIllustration size={44} />}
            label="お話する"
            sub="いつでも"
            onPress={() => router.push('/(tabs)/chat')}
          />
          <HomeActionModule
            testID="home-game"
            illustration={<GamepadIllustration size={44} />}
            label="あそぶ"
            sub={canPlay ? 'ゲーム' : 'また明日'}
            disabled={!canPlay}
            onPress={() => setShowMiniGame(true)}
          />
        </View>

        {todayRecord && !showQuickRecord ? (
          <Card padding={space.lg} style={styles.completedCard}>
            <View style={styles.completedRow}>
              <IconBadge name="check" size="sm" background={colors.successSoft} tint={colors.success} />
              <View style={styles.completedCopy}>
                <Text style={styles.completedTitle}>今日の記録完了</Text>
                <Text style={styles.completedMessage} numberOfLines={1}>
                  {todayRecord.behaviors[0] ? `「${todayRecord.behaviors[0]}」を残せたね。` : '気分を残せたね。'}
                </Text>
              </View>
              <Button label="見直す" variant="secondary" size="sm" onPress={() => router.push('/(tabs)/record')} />
            </View>
          </Card>
        ) : null}

        <View style={showQuickRecord ? undefined : styles.hidden}>
          <QuickAffirmationRecord
            onSaveStart={() => setIsCelebratingRecord(true)}
            onSaveFailed={() => setIsCelebratingRecord(false)}
            onComplete={() => setIsCelebratingRecord(false)}
          />
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
        <MenuAction icon="edit-3" label="アトリエをアレンジする" onPress={() => { setShowMenu(false); setShopMessage(''); setShowAtelier(true); }} />
        <MenuAction icon="edit-3" label={mascotName ? 'なかまの名前を変える' : 'なかまに名前をつける'} onPress={openName} />
      </BottomSheet>

      <BottomSheet
        visible={showAtelier}
        onClose={() => setShowAtelier(false)}
        title="アトリエショップ"
        subtitle={`持っているポイント ${feedState.points} pt`}
        maxHeightRatio={0.9}
      >
        {shopMessage ? <Text style={styles.shopMessage}>{shopMessage}</Text> : null}

        <View style={styles.shopSection}>
          <Text style={styles.shopSectionTitle}>家具をえらぶ</Text>
          <Text style={styles.shopSectionSub}>買った家具は、いつでも自由に置き替えられるよ。</Text>
          {FURNITURE_OPTIONS.map((item) => (
            <AtelierOption
              key={item.id}
              {...item}
              selected={roomCustomization.furniture === item.id}
              owned={roomCustomization.ownedFurniture.includes(item.id)}
              onPress={() => handleRoomItem('furniture', item.id, item.cost, roomCustomization.ownedFurniture.includes(item.id))}
            />
          ))}
        </View>

        <View style={styles.shopSection}>
          <Text style={styles.shopSectionTitle}>花を替える</Text>
          <Text style={styles.shopSectionSub}>窓辺と床のお花が一緒に変わるよ。</Text>
          {FLOWER_OPTIONS.map((item) => (
            <AtelierOption
              key={item.id}
              {...item}
              selected={roomCustomization.flower === item.id}
              owned={roomCustomization.ownedFlowers.includes(item.id)}
              onPress={() => handleRoomItem('flower', item.id, item.cost, roomCustomization.ownedFlowers.includes(item.id))}
            />
          ))}
        </View>

        <View style={styles.eggShopCard}>
          <View style={styles.eggShopGlow}><Text style={styles.eggShopIcon}>✦</Text></View>
          <View style={styles.eggShopCopy}>
            <Text style={styles.eggShopTitle}>もうひとつのたまご</Text>
            <Text style={styles.eggShopDescription}>
              長く過ごしてポイントがたまったら、新しい仲間をアトリエに迎えられるよ。
            </Text>
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
  hidden: { display: 'none' },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space.lg },
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

  centerArea: { alignItems: 'center', marginVertical: space.md, gap: space.md },
  characterGarden: { minHeight: 230, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  companionEgg: { alignItems: 'center', marginLeft: -28, marginBottom: 14 },
  companionLabel: { ...typography.micro, color: colors.primaryOnSoft, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3, marginTop: -24 },
  speechBubble: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    position: 'relative',
    marginBottom: space.sm,
    ...elevation.raised,
  },
  speechTail: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  speechText: { ...typography.bodyStrong, color: colors.foreground, textAlign: 'center' },

  satietyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    gap: space.sm,
    ...border.hairline,
  },
  satietyTrack: { width: 80, height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' },
  satietyFill: { height: '100%', borderRadius: 3 },
  satietyText: { ...typography.micro, color: colors.foreground, width: 28, textAlign: 'right' },

  actionsGrid: { flexDirection: 'row', gap: space.sm, marginBottom: space.xl },
  actionModule: {
    flex: 1,
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.xl,
    paddingVertical: space.lg,
    alignItems: 'center',
    gap: space.xs,
    ...elevation.raised,
  },
  actionModuleDisabled: { opacity: 0.6 },
  actionIlluWrap: { height: 56, justifyContent: 'center' },
  actionLabel: { ...typography.label, color: colors.foreground, marginTop: space.xs },
  actionSub: { ...typography.micro, color: colors.primary },

  completedCard: { marginBottom: space.xl },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  completedCopy: { flex: 1 },
  completedTitle: { ...typography.bodyStrong, color: colors.foreground },
  completedMessage: { ...typography.caption, color: colors.mutedForeground },

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
  shopSectionSub: { ...typography.caption, color: colors.mutedForeground, marginBottom: space.xs },
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
  shopSwatch: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  shopSwatchSpark: { color: colors.primaryForeground, fontSize: 19 },
  shopOptionCopy: { flex: 1 },
  shopOptionName: { ...typography.calloutStrong, color: colors.foreground },
  shopOptionDescription: { ...typography.micro, color: colors.mutedForeground, marginTop: 2 },
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
  eggShopDescription: { ...typography.micro, color: colors.mutedForeground, marginTop: 3 },
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