/**
 * キャラ詳細画面(図鑑)
 * 大きなビジュアル(埋め込みステージ活用・ネイティブはMascotへ自動フォールバック)、
 * プロフィール、元気/光の力、そしてインタラクション(話しかける・なでる・ジャンプ・
 * ブルブル・歩く)ができるモーダル。
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, Platform, Animated as RNAnimated,
} from 'react-native';
import {
  border,
  colors,
  control,
  elevation,
  radius,
  space,
  typography,
} from '@/constants/theme';
import { StageCharacter } from '@/components/StageCharacter';
import { StaticMascot } from '@/components/Mascot';
import { useAppActivity } from '@/components/room/useRoomActivity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CharacterKey, MascotMood } from '@/utils/mascotUtils';
import { stageForChar } from '@/utils/encounters';
import { DEX_PROFILES } from '@/data/characterDex';
import { useApp } from '@/contexts/AppContext';
import { Icon, iconSize, type IconName } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

interface Props {
  charKey: CharacterKey;
  metDate: string;
  /** このキャラが現在のパートナーか(元気・光の力はパートナーの現在値) */
  isCurrent: boolean;
  onClose: () => void;
}

const TALK_LINES: Record<CharacterKey, string[]> = {
  egg: ['…すぅ…すぅ…', 'ん…? よんだ…?', 'あったかいね…'],
  odango: ['きょうもきてくれたの!?', 'なでなでして〜!', 'ぼく、がんばって光つくるね!'],
  happa: ['やっほ〜。いいかぜだね', 'きみのおかげで葉っぱがつやつやだよ', 'ゆっくりでいいんだよ〜'],
  colorful_happa: ['みてみて! きょうの葉っぱ、七色!', 'きみの光、街まで届いてるよ!', 'いっしょなら何でもできそう!'],
};

type ActionKey = 'talk' | 'pet' | 'jump' | 'shake' | 'walk';

const ACTIONS: { key: ActionKey; icon: IconName; label: string }[] = [
  { key: 'talk',  icon: 'message-circle',   label: '話しかける' },
  { key: 'pet',   icon: 'heart',            label: 'なでる' },
  { key: 'jump',  icon: 'arrow-up-circle',  label: 'ジャンプ' },
  { key: 'shake', icon: 'refresh-cw',       label: 'ブルブル' },
  { key: 'walk',  icon: 'activity',         label: '歩く' },
];

export function CharacterDexModal({ charKey, metDate, isCurrent, onClose }: Props) {
  const { lightEnergy, growth } = useApp();
  const { active, reduceMotion } = useAppActivity();
  const insets = useSafeAreaInsets();
  const profile = DEX_PROFILES[charKey];
  const stage = stageForChar(charKey);

  const [mood, setMood] = useState<MascotMood>('normal');
  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (line: string, ms = 2600) => {
    setSpeech(line);
    if (speechTimer.current) clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => setSpeech(null), ms);
  };
  const feel = (m: MascotMood, ms = 3000) => {
    setMood(m);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood('normal'), ms);
  };

  const jumpY = useRef(new RNAnimated.Value(0)).current;
  const shakeX = useRef(new RNAnimated.Value(0)).current;
  const walkX = useRef(new RNAnimated.Value(0)).current;
  const squish = useRef(new RNAnimated.Value(0)).current;
  const translateX = RNAnimated.add(shakeX, walkX);
  const squishY = squish.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const squishX = squish.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  useEffect(() => {
    const stop = () => {
      [jumpY, shakeX, walkX, squish].forEach(value => { value.stopAnimation(); value.setValue(0); });
      if (speechTimer.current) clearTimeout(speechTimer.current);
      if (moodTimer.current) clearTimeout(moodTimer.current);
    };
    if (!active || reduceMotion) { stop(); setSpeech(null); setMood('normal'); }
    return stop;
  }, [active, reduceMotion, jumpY, shakeX, walkX, squish]);

  const doSquish = () => {
    squish.stopAnimation();
    squish.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(squish, { toValue: 1, duration: 120, useNativeDriver: true }),
      RNAnimated.spring(squish, {
        toValue: 0,
        damping: 5,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAction = (key: ActionKey) => {
    if (!active) return;
    if (reduceMotion) {
      feel('happy');
      say(key === 'talk' ? TALK_LINES[charKey][0] : key === 'pet' ? 'えへへ…' : 'いっしょにいると、うれしいね');
      return;
    }
    switch (key) {
      case 'talk': {
        const lines = TALK_LINES[charKey];
        say(lines[Math.floor(Math.random() * lines.length)]);
        feel('happy');
        doSquish();
        break;
      }
      case 'pet':
        feel('happy', 3500);
        say('えへへ…', 1800);
        doSquish();
        break;
      case 'jump':
        feel('excited');
        say('ぴょん！', 1600);
        jumpY.stopAnimation();
        jumpY.setValue(0);
        RNAnimated.sequence([
          RNAnimated.timing(jumpY, { toValue: -46, duration: 240, useNativeDriver: true }),
          RNAnimated.spring(jumpY, {
            toValue: 0,
            damping: 6,
            stiffness: 220,
            useNativeDriver: true,
          }),
          RNAnimated.timing(jumpY, { toValue: -26, duration: 200, useNativeDriver: true }),
          RNAnimated.spring(jumpY, {
            toValue: 0,
            damping: 7,
            stiffness: 220,
            useNativeDriver: true,
          }),
        ]).start();
        break;
      case 'shake':
        feel('excited', 2000);
        say('ぶるぶる〜！', 1600);
        shakeX.stopAnimation();
        shakeX.setValue(0);
        RNAnimated.sequence([
          ...Array.from({ length: 6 }, (_, i) => RNAnimated.timing(shakeX, {
            toValue: i % 2 === 0 ? 8 : -8,
            duration: 70,
            useNativeDriver: true,
          })),
          RNAnimated.timing(shakeX, { toValue: 0, duration: 80, useNativeDriver: true }),
        ]).start();
        break;
      case 'walk':
        feel('happy', 3600);
        say('いっしょに歩こう！', 2200);
        walkX.stopAnimation();
        walkX.setValue(0);
        RNAnimated.sequence([
          RNAnimated.timing(walkX, { toValue: 50, duration: 900, useNativeDriver: true }),
          RNAnimated.timing(walkX, { toValue: -50, duration: 1600, useNativeDriver: true }),
          RNAnimated.timing(walkX, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]).start();
        break;
    }
  };

  return (
    <Modal visible transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.sheet, { paddingBottom: insets.bottom }]} testID="character-album-detail">
          <PressScale
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={space.sm}
            accessibilityLabel="閉じる"
          >
            <Icon name="x" size={20} color={colors.foreground} />
          </PressScale>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* ビジュアル */}
            <View style={styles.stageArea}>
              {speech && (
                <View style={styles.bubble}>
                  <Text style={styles.bubbleText} accessibilityLiveRegion="polite">{speech}</Text>
                </View>
              )}
              <RNAnimated.View testID="dex-character-motion"
                style={{
                  transform: [
                    { translateY: jumpY },
                    { translateX },
                    { scaleY: squishY },
                    { scaleX: squishX },
                  ],
                }}
              >
                {!active || reduceMotion ? <StaticMascot stage={stage} mood={mood} size={150 * (isCurrent ? growth.growthSize : 1)} /> : <StageCharacter
                  stage={stage}
                  mood={mood}
                  size={150}
                  growthSize={isCurrent ? growth.growthSize : 1}
                  onPet={() => handleAction('pet')}
                />}
              </RNAnimated.View>
            </View>

            <Text style={styles.name}>{profile.name}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{profile.stageLabel}</Text>
              </View>
              <Text style={styles.metaText}>出会った日 {metDate.replace(/-/g, '/')}</Text>
            </View>

            {/* インタラクション */}
            <View style={styles.actionRow}>
              {ACTIONS.map((a) => (
                <PressScale
                  key={a.key}
                  style={styles.actionBtn}
                  accessibilityLabel={a.label}
                  scaleTo={reduceMotion ? 1 : undefined}
                  onPress={() => handleAction(a.key)}
                >
                  <Icon name={a.icon} size={iconSize.md} color={colors.primaryOnSoft} />
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </PressScale>
              ))}
            </View>

            {/* 元気・光の力。進化しても同一個体なので、どの姿でも今日の値を表示する */}
            <View style={styles.gaugeCard}>
              {!isCurrent && (
                <Text style={styles.gaugeNote}>いまのこの子の状態(進化してもおなじ個体だよ)</Text>
              )}
              {[
                { label: '元気', value: lightEnergy.genki, color: colors.primary, icon: 'heart' as IconName },
                { label: '光の力', value: lightEnergy.lightPower, color: colors.success, icon: 'zap' as IconName },
              ].map((g) => (
                <View key={g.label} style={styles.gaugeRow}>
                  <Icon name={g.icon} size={iconSize.sm} color={g.color} />
                  <Text style={styles.gaugeLabel}>{g.label}</Text>
                  <View style={styles.gaugeTrack}>
                    <View style={[styles.gaugeFill, { width: `${g.value}%`, backgroundColor: g.color }]} />
                  </View>
                  <Text style={styles.gaugeValue}>{g.value}</Text>
                </View>
              ))}
            </View>

            {/* プロフィール */}
            <View style={styles.profileCard}>
              {[
                { label: 'せいかく', value: profile.personality },
                { label: 'すきなこと', value: profile.likes },
                { label: 'とくちょう', value: profile.traits },
              ].map((row) => (
                <View key={row.label} style={styles.profileRow}>
                  <Text style={styles.profileLabel}>{row.label}</Text>
                  <Text style={styles.profileValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.quoteCard}>
              <Text style={styles.quoteText}>「{profile.quote}」</Text>
            </View>

            <View style={styles.storyCard}>
              <Text style={styles.storyTitle}>この子のものがたり</Text>
              <Text style={styles.storyText}>{profile.story}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#F8F4EF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: border.width,
    borderTopColor: colors.border,
    overflow: 'hidden',
    ...elevation.overlay,
  },
  closeBtn: {
    position: 'absolute',
    top: space.lg,
    right: space.lg,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: space.xl, paddingTop: space.xxl, gap: space.lg },

  stageArea: { alignItems: 'center', justifyContent: 'flex-end', minHeight: 190 },
  bubble: {
    position: 'absolute',
    top: 0,
    zIndex: 1,
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  bubbleText: { ...typography.label, color: colors.foreground },

  name: { ...typography.title, color: colors.foreground, textAlign: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  metaBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 2,
  },
  metaBadgeText: { ...typography.micro, color: colors.primaryOnSoft },
  metaText: { ...typography.micro, color: colors.mutedForeground },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '28%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: 64,
    backgroundColor: colors.muted,
    ...border.hairline,
    borderRadius: radius.md,
  },
  actionLabel: { ...typography.micro, color: colors.mutedForeground },

  /* ゲージ */
  gaugeCard: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  gaugeNote: { ...typography.micro, color: colors.subtleForeground },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  gaugeLabel: { ...typography.caption, width: 48, color: colors.mutedForeground },
  gaugeTrack: {
    flex: 1,
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  gaugeFill: { height: '100%', borderRadius: radius.pill },
  gaugeValue: { ...typography.label, width: 30, color: colors.foreground, textAlign: 'right' },

  /* プロフィール */
  profileCard: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  profileRow: { gap: space.xs },
  profileLabel: { ...typography.micro, color: colors.primaryOnSoft },
  profileValue: { ...typography.callout, color: colors.foreground },

  quoteCard: {
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  quoteText: { ...typography.bodyStrong, color: colors.foreground },

  storyCard: {
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  storyTitle: { ...typography.label, color: colors.mutedForeground },
  storyText: { ...typography.callout, color: colors.foreground },
});
