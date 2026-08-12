/**
 * キャラ詳細画面(図鑑)
 * 大きなビジュアル(埋め込みステージ活用・ネイティブはMascotへ自動フォールバック)、
 * プロフィール、元気/光の力、そしてインタラクション(話しかける・なでる・ジャンプ・
 * ブルブル・歩く)ができるモーダル。
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring, FadeIn,
} from 'react-native-reanimated';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { StageCharacter } from '@/components/StageCharacter';
import { CharacterKey, MascotMood } from '@/utils/mascotUtils';
import { stageForChar } from '@/utils/encounters';
import { DEX_PROFILES } from '@/data/characterDex';
import { useApp } from '@/contexts/AppContext';

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

const ACTIONS: { key: ActionKey; icon: string; label: string }[] = [
  { key: 'talk',  icon: 'chatbubble-ellipses-outline', label: '話しかける' },
  { key: 'pet',   icon: 'hand-left-outline',           label: 'なでる' },
  { key: 'jump',  icon: 'arrow-up-circle-outline',     label: 'ジャンプ' },
  { key: 'shake', icon: 'sync-outline',                label: 'ブルブル' },
  { key: 'walk',  icon: 'walk-outline',                label: '歩く' },
];

export function CharacterDexModal({ charKey, metDate, isCurrent, onClose }: Props) {
  const colors = useColors();
  const { lightEnergy, growth } = useApp();
  const profile = DEX_PROFILES[charKey];
  const stage = stageForChar(charKey);

  const [mood, setMood] = useState<MascotMood>('normal');
  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (speechTimer.current) clearTimeout(speechTimer.current);
    if (moodTimer.current) clearTimeout(moodTimer.current);
  }, []);

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

  /* キャラのラッパーを動かすインタラクション(ステージ/フォールバック共通で効く) */
  const jumpY = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const walkX = useSharedValue(0);
  const wrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: jumpY.value },
      { translateX: shakeX.value + walkX.value },
    ],
  }));

  const handleAction = (key: ActionKey) => {
    switch (key) {
      case 'talk': {
        const lines = TALK_LINES[charKey];
        say(lines[Math.floor(Math.random() * lines.length)]);
        feel('happy');
        break;
      }
      case 'pet':
        feel('happy', 3500);
        say('えへへ…', 1800);
        break;
      case 'jump':
        feel('excited');
        jumpY.value = withSequence(
          withTiming(-46, { duration: 240 }),
          withSpring(0, { damping: 6, stiffness: 220 }),
          withTiming(-26, { duration: 200 }),
          withSpring(0, { damping: 7, stiffness: 220 }),
        );
        break;
      case 'shake':
        feel('excited', 2000);
        shakeX.value = withSequence(
          ...Array.from({ length: 6 }, (_, i) =>
            withTiming(i % 2 === 0 ? 8 : -8, { duration: 70 })),
          withTiming(0, { duration: 80 }),
        );
        break;
      case 'walk':
        feel('happy', 3600);
        walkX.value = withSequence(
          withTiming(50, { duration: 900 }),
          withTiming(-50, { duration: 1600 }),
          withTiming(0, { duration: 900 }),
        );
        break;
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(200)} style={[styles.sheet, { borderColor: colors.border }]}>
          <LinearGradient
            colors={['rgba(34,22,74,0.99)', 'rgba(16,10,38,1)']}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* ビジュアル */}
            <View style={styles.stageArea}>
              {speech && (
                <Animated.View entering={FadeIn.duration(150)} style={styles.bubble}>
                  <Text style={styles.bubbleText}>{speech}</Text>
                </Animated.View>
              )}
              <Animated.View style={wrapStyle}>
                <StageCharacter
                  stage={stage}
                  mood={mood}
                  size={150}
                  growthSize={isCurrent ? growth.growthSize : 1}
                />
              </Animated.View>
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
                <TouchableOpacity
                  key={a.key}
                  style={styles.actionBtn}
                  onPress={() => handleAction(a.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={a.icon as any} size={20} color="#FFD86B" />
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 元気・光の力(現在のパートナーのみ実数値) */}
            {isCurrent && (
              <View style={styles.gaugeCard}>
                {[
                  { label: '元気', value: lightEnergy.genki, color: '#FF9ECD', icon: '💗' },
                  { label: '光の力', value: lightEnergy.lightPower, color: '#FFD86B', icon: '✨' },
                ].map((g) => (
                  <View key={g.label} style={styles.gaugeRow}>
                    <Text style={styles.gaugeIcon}>{g.icon}</Text>
                    <Text style={styles.gaugeLabel}>{g.label}</Text>
                    <View style={styles.gaugeTrack}>
                      <View style={[styles.gaugeFill, { width: `${g.value}%`, backgroundColor: g.color }]} />
                    </View>
                    <Text style={styles.gaugeValue}>{g.value}</Text>
                  </View>
                ))}
              </View>
            )}

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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,5,20,0.7)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', borderWidth: 1,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 16, zIndex: 10,
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scroll: { padding: 22, paddingBottom: Platform.OS === 'web' ? 40 : 34, alignItems: 'stretch' },
  stageArea: { alignItems: 'center', minHeight: 240, justifyContent: 'flex-end' },
  bubble: {
    position: 'absolute', top: 0, alignSelf: 'center', zIndex: 5,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8, maxWidth: 240,
  },
  bubbleText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#2A1E52' },
  name: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'center', marginTop: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 },
  metaBadge: {
    backgroundColor: 'rgba(255,201,77,0.16)', borderColor: 'rgba(255,201,77,0.4)',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
  },
  metaBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#FFD86B' },
  metaText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 6 },
  actionBtn: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
  },
  actionLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.85)' },
  gaugeCard: {
    marginTop: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    padding: 14, gap: 10,
  },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gaugeIcon: { fontSize: 14 },
  gaugeLabel: { width: 48, fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  gaugeTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 4 },
  gaugeValue: { width: 30, fontSize: 12, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right' },
  profileCard: {
    marginTop: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    padding: 16, gap: 12,
  },
  profileRow: { gap: 3 },
  profileLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#FFD86B' },
  profileValue: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.9)', lineHeight: 19 },
  quoteCard: { marginTop: 14, alignItems: 'center' },
  quoteText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  storyCard: {
    marginTop: 14, backgroundColor: 'rgba(138,180,255,0.08)', borderRadius: 16,
    padding: 16, gap: 6, borderWidth: 1, borderColor: 'rgba(138,180,255,0.2)',
  },
  storyTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#8AB4FF' },
  storyText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.9)', lineHeight: 21 },
});
