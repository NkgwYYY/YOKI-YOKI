import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  border,
  colors,
  control,
  radius,
  space,
  typography,
} from '@/constants/theme';
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

/** ホームの主要な行き先。3 つ横並びで、押せる面は等幅にそろえる。 */
function HomeAction({
  icon,
  label,
  sub,
  onPress,
  disabled,
  testID,
}: {
  icon: IconName;
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
      style={[styles.homeAction, disabled && styles.homeActionDisabled]}
    >
      <IconBadge
        name={icon}
        size="sm"
        tint={disabled ? colors.subtleForeground : colors.primaryOnSoft}
        background={disabled ? colors.backgroundSunken : colors.primarySoft}
      />
      <View style={styles.homeActionCopy}>
        <Text style={styles.homeActionLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.homeActionSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </PressScale>
  );
}

/** シート内のメニュー行。 */
function MenuAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressScale onPress={onPress} accessibilityLabel={label} style={styles.menuAction}>
      <IconBadge name={icon} size="sm" />
      <Text style={styles.menuActionText}>{label}</Text>
      <Icon name="chevron-right" size={iconSize.sm} color={colors.subtleForeground} />
    </PressScale>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    completeMiniGame,
    feedState,
    growth,
    getTodayRecord,
    mascotName,
    miniGameState,
    progress,
    setMascotName,
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
  // Keep the quick-record component mounted through its success animation.
  // Hiding only its form prevents a context update from cancelling the celebration.
  const showQuickRecord = !todayRecord || isCelebratingRecord;

  const openName = () => {
    setShowMenu(false);
    setNameInput(mascotName);
    setShowName(true);
  };

  return (
    <>
      <Screen>
        <View style={styles.header}>
          <View>
            <Image
              source={require('@/assets/images/yoki_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.date}>{formatDateJP(getTodayDate())}</Text>
          </View>
          <PressScale
            testID="home-more-menu"
            accessibilityLabel="ほかのメニュー"
            onPress={() => setShowMenu(true)}
            style={styles.moreButton}
          >
            <Icon name="more-horizontal" size={iconSize.md} color={colors.foreground} />
          </PressScale>
        </View>

        <View style={styles.mascotArea}>
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
              {todayRecord ? '今日も来てくれて、うれしい！' : '今日は、ひとつできたら十分。'}
            </Text>
          </View>
          <StageCharacter
            stage={getMascotStage(progress.level)}
            mood={mascotMood}
            size={100}
            growthSize={growth.growthSize}
          />
        </View>

        <View style={styles.homeActions}>
          <HomeAction
            testID="home-feed"
            icon="coffee"
            label="ごはん"
            sub={`${feedState.points} pt`}
            onPress={() => setShowFeed(true)}
          />
          <HomeAction
            testID="home-chat"
            icon="message-circle"
            label="お話する"
            sub="いつでもどうぞ"
            onPress={() => router.push('/(tabs)/chat')}
          />
          <HomeAction
            testID="home-game"
            icon="music"
            label="あそぶ"
            sub={canPlay ? 'リズムゲーム' : 'また明日'}
            disabled={!canPlay}
            onPress={() => setShowMiniGame(true)}
          />
        </View>

        {todayRecord && !showQuickRecord ? (
          <Card padding={space.xl} style={styles.completedCard}>
            <IconBadge name="check" size="lg" />
            <Text style={styles.completedTitle}>今日の記録、ありがとう</Text>
            <Text style={styles.completedMessage}>
              {todayRecord.behaviors[0]
                ? `「${todayRecord.behaviors[0]}」を残せたね。`
                : '気分を残せたね。それだけでも大切。'}
            </Text>
            <Button
              label="記録を見直す"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/(tabs)/record')}
              style={styles.detailButton}
              icon="edit-3"
            />
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
        contentStyle={styles.menuBody}
      >
        <MenuAction
          icon="message-circle"
          label="お話しする"
          onPress={() => {
            setShowMenu(false);
            router.push('/(tabs)/chat');
          }}
        />
        <MenuAction
          icon="coffee"
          label="ごはんをあげる"
          onPress={() => {
            setShowMenu(false);
            setShowFeed(true);
          }}
        />
        <MenuAction
          icon="music"
          label={canPlay ? 'リズムであそぶ' : 'リズムであそぶ（またあとで）'}
          onPress={() => {
            setShowMenu(false);
            if (canPlay) setShowMiniGame(true);
          }}
        />
        <MenuAction
          icon="trending-up"
          label="成長を見る"
          onPress={() => {
            setShowMenu(false);
            router.push('/(tabs)/growth');
          }}
        />
        <MenuAction
          icon="edit-3"
          label={mascotName ? 'なかまの名前を変える' : 'なかまに名前をつける'}
          onPress={openName}
        />
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
        <Button
          label="この名前にする"
          disabled={!nameInput.trim()}
          fullWidth
          onPress={() => {
            if (!nameInput.trim()) return;
            setMascotName(nameInput.trim());
            setShowName(false);
          }}
        />
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

  /* ヘッダー */
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  logo: { width: 120, height: 28 },
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

  /* マスコット */
  mascotArea: { alignItems: 'center', gap: space.lg },
  speechBubble: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  speechText: { ...typography.bodyStrong, color: colors.foreground, textAlign: 'center' },

  /* 3 つのアクション */
  homeActions: { flexDirection: 'row', gap: space.sm },
  homeAction: {
    flex: 1,
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    alignItems: 'center',
    gap: space.md,
  },
  homeActionDisabled: { backgroundColor: colors.backgroundSunken },
  homeActionCopy: { alignItems: 'center', gap: space.xs },
  homeActionLabel: { ...typography.label, color: colors.foreground },
  homeActionSub: { ...typography.micro, color: colors.mutedForeground },

  /* 記録済みカード */
  completedCard: { alignItems: 'center', gap: space.md },
  completedTitle: { ...typography.title, color: colors.foreground, textAlign: 'center' },
  completedMessage: { ...typography.body, color: colors.mutedForeground, textAlign: 'center' },
  detailButton: { marginTop: space.sm, alignSelf: 'center' },

  /* シート */
  menuBody: { gap: space.xs },
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

  /* ダイアログ */
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
