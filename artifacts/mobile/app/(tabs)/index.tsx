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
import { useApp } from '@/contexts/AppContext';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { getCurrentSlot, MAX_PLAYS_PER_SLOT } from '@/utils/miniGameUtils';
import { getMascotStage } from '@/utils/mascotUtils';
import { CakeIllustration, ChatIllustration, GamepadIllustration } from '@/components/ui/Illustrations';

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

export default function HomeScreen() {
  const router = useRouter();
  const {
    completeMiniGame, feedState, growth, getTodayRecord, mascotName,
    miniGameState, progress, setMascotName, currentSatiety
  } = useApp();
  const todayRecord = getTodayRecord();

  const [showMenu, setShowMenu] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showName, setShowName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isCelebratingRecord, setIsCelebratingRecord] = useState(false);

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

          <StageCharacter
            stage={getMascotStage(progress.level)}
            mood={mascotMood}
            size={120}
            growthSize={growth.growthSize}
          />

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
        <MenuAction icon="edit-3" label={mascotName ? 'なかまの名前を変える' : 'なかまに名前をつける'} onPress={openName} />
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