import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { FeedModal } from '@/components/FeedModal';
import { Mascot } from '@/components/Mascot';
import { MiniGameModal } from '@/components/MiniGameModal';
import { QuickAffirmationRecord } from '@/components/record/QuickAffirmationRecord';
import { StageCharacter } from '@/components/StageCharacter';
import { SkyBackground } from '@/components/SkyBackground';
import { useApp } from '@/contexts/AppContext';
import { formatDateJP, getTodayDate } from '@/utils/dateUtils';
import { getCurrentSlot, MAX_PLAYS_PER_SLOT } from '@/utils/miniGameUtils';
import { getMascotStage } from '@/utils/mascotUtils';

function MenuAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.menuAction, { backgroundColor: colors.muted }]} activeOpacity={0.82}>
      <View style={[styles.menuIcon, { backgroundColor: colors.primary + '4D' }]}>
        <Ionicons name={icon} size={19} color={colors.foreground} />
      </View>
      <Text style={[styles.menuActionText, { color: colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
  const topInset = Platform.OS === 'web' ? 79 : insets.top + 12;
  const bottomInset = Platform.OS === 'web' ? 92 : insets.bottom + 58;
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
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <SkyBackground />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.header}>
          <View>
            <Image source={require('@/assets/images/yoki_logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDateJP(getTodayDate())}</Text>
          </View>
          <TouchableOpacity
            testID="home-more-menu"
            accessibilityLabel="ほかのメニュー"
            onPress={() => setShowMenu(true)}
            style={[styles.moreButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.mascotArea}>
          <View style={[styles.speechBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.speechText, { color: colors.foreground }]}>
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
          <TouchableOpacity
            testID="home-feed"
            onPress={() => setShowFeed(true)}
            style={[styles.homeAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.82}
          >
            <Text style={styles.homeActionEmoji}>🍚</Text>
            <View style={styles.homeActionCopy}>
              <Text style={[styles.homeActionLabel, { color: colors.foreground }]}>ごはん</Text>
              <Text style={[styles.homeActionSub, { color: colors.mutedForeground }]}>🪙{feedState.points}pt</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            testID="home-chat"
            onPress={() => router.push('/(tabs)/chat')}
            style={[styles.homeAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.82}
          >
            <Text style={styles.homeActionEmoji}>💬</Text>
            <View style={styles.homeActionCopy}>
              <Text style={[styles.homeActionLabel, { color: colors.foreground }]}>お話する</Text>
              <Text style={[styles.homeActionSub, { color: colors.mutedForeground }]}>いつでもどうぞ</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            testID="home-game"
            onPress={() => { if (canPlay) setShowMiniGame(true); }}
            style={[styles.homeAction, { backgroundColor: colors.card, borderColor: colors.border, opacity: canPlay ? 1 : 0.55 }]}
            activeOpacity={0.82}
          >
            <Text style={styles.homeActionEmoji}>🎵</Text>
            <View style={styles.homeActionCopy}>
              <Text style={[styles.homeActionLabel, { color: colors.foreground }]}>あそぶ</Text>
              <Text style={[styles.homeActionSub, { color: colors.mutedForeground }]}>{canPlay ? 'リズムゲーム' : 'また明日'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {todayRecord && !showQuickRecord ? (
          <View style={[styles.completedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.completedEmoji}>🌟</Text>
            <Text style={[styles.completedTitle, { color: colors.foreground }]}>今日の記録、ありがとう</Text>
            <Text style={[styles.completedMessage, { color: colors.mutedForeground }]}>
              {todayRecord.behaviors[0]
                ? `「${todayRecord.behaviors[0]}」を残せたね。`
                : '気分を残せたね。それだけでも大切。'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/record')}
              style={[styles.detailButton, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.detailButtonText, { color: colors.foreground }]}>記録を見直す</Text>
              <Ionicons name="create-outline" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={showQuickRecord ? undefined : styles.hiddenQuickRecord}>
          <QuickAffirmationRecord
            onSaveStart={() => setIsCelebratingRecord(true)}
            onSaveFailed={() => setIsCelebratingRecord(false)}
            onComplete={() => setIsCelebratingRecord(false)}
          />
        </View>
      </ScrollView>

      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setShowMenu(false)} />
          <View style={[styles.menuSheet, { backgroundColor: colors.card, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 18 }]}>
            <View style={[styles.menuHandle, { backgroundColor: colors.border }]} />
            <View style={styles.menuHeader}>
              <View>
                <Text style={[styles.menuTitle, { color: colors.foreground }]}>ほかにできること</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>今日は、気になるものだけで大丈夫。</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMenu(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <MenuAction icon="chatbubble-ellipses-outline" label="お話しする" onPress={() => { setShowMenu(false); router.push('/(tabs)/chat'); }} />
            <MenuAction icon="restaurant-outline" label="ごはんをあげる" onPress={() => { setShowMenu(false); setShowFeed(true); }} />
            <MenuAction
              icon="musical-notes-outline"
              label={canPlay ? 'リズムであそぶ' : 'リズムであそぶ（またあとで）'}
              onPress={() => {
                setShowMenu(false);
                if (canPlay) setShowMiniGame(true);
              }}
            />
            <MenuAction icon="trending-up-outline" label="成長を見る" onPress={() => { setShowMenu(false); router.push('/(tabs)/growth'); }} />
            <MenuAction icon="pencil-outline" label={mascotName ? 'なかまの名前を変える' : 'なかまに名前をつける'} onPress={openName} />
          </View>
        </View>
      </Modal>

      <Modal visible={showName} transparent animationType="fade" onRequestClose={() => setShowName(false)}>
        <KeyboardAvoidingView style={styles.nameOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setShowName(false)} />
          <View style={[styles.nameDialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.nameTitle, { color: colors.foreground }]}>なかまの名前</Text>
            <Text style={[styles.nameSub, { color: colors.mutedForeground }]}>呼びたい名前をつけよう。</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={16}
              placeholder="例：よっきー"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.nameInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            />
            <TouchableOpacity
              disabled={!nameInput.trim()}
              onPress={() => {
                if (!nameInput.trim()) return;
                setMascotName(nameInput.trim());
                setShowName(false);
              }}
              style={[styles.nameSave, { backgroundColor: nameInput.trim() ? colors.primary : colors.muted }]}
            >
              <Text style={[styles.nameSaveText, { color: colors.primaryForeground }]}>この名前にする</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <FeedModal visible={showFeed} onClose={() => setShowFeed(false)} />
      {currentSlot && (
        <MiniGameModal
          visible={showMiniGame}
          slot={currentSlot}
          onClose={() => setShowMiniGame(false)}
          onReward={(reward) => completeMiniGame(currentSlot, reward)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, justifyContent: 'space-between', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  logo: { width: 122, height: 29 },
  date: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: -1 },
  moreButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mascotArea: { height: 202, alignItems: 'center', justifyContent: 'flex-end', marginTop: -2, overflow: 'visible' },
  speechBubble: {
    position: 'absolute',
    top: 0,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
    zIndex: 1,
  },
  speechText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  homeActions: { flexDirection: 'row', gap: 7 },
  homeAction: { flex: 1, minHeight: 56, borderRadius: 15, borderWidth: 1, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  homeActionEmoji: { fontSize: 21 },
  homeActionCopy: { flex: 1, minWidth: 0 },
  homeActionLabel: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  homeActionSub: { fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 2 },
  completedCard: {
    minHeight: 258,
    borderRadius: 25,
    borderWidth: 1,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedEmoji: { fontSize: 42, marginBottom: 10 },
  hiddenQuickRecord: { display: 'none' },
  completedTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  completedMessage: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 20,
  },
  detailButtonText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  menuOverlay: { flex: 1, justifyContent: 'flex-end' },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.54)' },
  menuSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 11, gap: 9 },
  menuHandle: { height: 4, width: 36, borderRadius: 4, alignSelf: 'center', marginBottom: 3 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  menuTitle: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  menuSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  menuAction: { minHeight: 51, borderRadius: 15, alignItems: 'center', flexDirection: 'row', gap: 11, paddingHorizontal: 10 },
  menuIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuActionText: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  nameOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  nameDialog: { width: '100%', borderRadius: 23, borderWidth: 1, padding: 22, gap: 9 },
  nameTitle: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  nameSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  nameInput: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_500Medium', marginTop: 4 },
  nameSave: { minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  nameSaveText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});