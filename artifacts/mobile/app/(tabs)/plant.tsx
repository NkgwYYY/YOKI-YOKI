import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, withDelay, FadeInUp, FadeOut, Easing,
} from 'react-native-reanimated';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';
import { CosmicBackground } from '@/components/CosmicBackground';
import { useApp } from '@/contexts/AppContext';
import { Mascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import {
  plantLevelFor, plantLevelProgress, MAX_PLANT_LEVEL, PLANT_LEVEL_THRESHOLDS,
  TOWN_ITEMS, nextTownItem,
} from '@/utils/powerPlant';

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/* ════════════════════════ 発電所シーン(情景) ════════════════════════ */

/** 星(シーン上部にまたたく) */
function SceneStars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        left: `${(i * 41 + 13) % 96}%` as const,
        top: `${(i * 17 + 5) % 38}%` as const,
        size: i % 3 === 0 ? 3 : 2,
        delay: (i * 260) % 1800,
      })),
    [],
  );
  return (
    <>
      {stars.map((s, i) => (
        <TwinkleDot key={i} left={s.left} top={s.top} size={s.size} delay={s.delay} />
      ))}
    </>
  );
}

function TwinkleDot({ left, top, size, delay }: { left: string; top: string; size: number; delay: number }) {
  const o = useSharedValue(0.25);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1300, easing: easeInOutSine }),
          withTiming(0.25, { duration: 1300, easing: easeInOutSine }),
        ), -1, false,
      ),
    );
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: left as any, top: top as any, width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFF6D9' },
        st,
      ]}
    />
  );
}

/** 太陽(光の力で脈動しながら地平線近くで輝く) */
function SceneSun({ lightPower }: { lightPower: number }) {
  const glow = useSharedValue(0.5);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: easeInOutSine }),
        withTiming(0.5, { duration: 1600, easing: easeInOutSine }),
      ), -1, false,
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glow.value * (0.25 + lightPower / 260),
    transform: [{ scale: 1 + glow.value * 0.14 }],
  }));
  return (
    <View style={s.sunWrap} pointerEvents="none">
      <Animated.View style={[s.sunGlowOuter, glowStyle]} />
      <View style={s.sunGlowInner} />
      <LinearGradient
        colors={['#FFF3C4', '#FFD86B', '#FFA43B']}
        style={s.sunBody}
        start={{ x: 0.25, y: 0.1 }} end={{ x: 0.75, y: 0.95 }}
      />
    </View>
  );
}

/** 山なみのシルエット */
function Mountains() {
  return (
    <View style={s.mountainWrap} pointerEvents="none">
      <View style={[s.mountain, { left: '-14%', width: '52%', height: 66, backgroundColor: 'rgba(30,18,64,0.92)' }]} />
      <View style={[s.mountain, { left: '24%', width: '46%', height: 46, backgroundColor: 'rgba(41,26,84,0.9)' }]} />
      <View style={[s.mountain, { right: '-16%', width: '58%', height: 58, backgroundColor: 'rgba(26,15,56,0.94)' }]} />
    </View>
  );
}

/** 街並み(建設が進むほど建物が増え、窓の光が増える)。売電時にぱっと明るくなる */
function TownSkyline({ townBuilt, brightenSeq }: { townBuilt: number; brightenSeq: number }) {
  // 建物は最初から2棟、街アイテムが建つごとに1棟増える(最大8+2)
  const buildingCount = Math.min(2 + townBuilt, 10);
  const flash = useSharedValue(0);
  useEffect(() => {
    if (brightenSeq === 0) return;
    flash.value = withSequence(
      withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 1600, easing: easeInOutSine }),
    );
  }, [brightenSeq]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.55 }));

  const buildings = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        h: 26 + ((i * 13) % 30),
        w: 15 + ((i * 7) % 8),
        windows: 2 + (i % 3),
      })),
    [],
  );

  return (
    <View style={s.townWrap} pointerEvents="none">
      {buildings.slice(0, buildingCount).map((b, i) => (
        <View key={i} style={[s.building, { height: b.h, width: b.w }]}>
          {Array.from({ length: b.windows }).map((_, w) => (
            <View
              key={w}
              style={[
                s.buildingWindow,
                // 発展度が高いほど窓が多く灯る
                { opacity: w < Math.ceil((townBuilt + 2) / 3) + 1 ? 0.95 : 0.2 },
              ]}
            />
          ))}
        </View>
      ))}
      {/* 売電時の「街が明るくなる」フラッシュ */}
      <Animated.View style={[s.townFlash, flashStyle]} pointerEvents="none" />
    </View>
  );
}

/** ソーラーパネル1枚 */
function Panel({ built, w, h }: { built: boolean; w: number; h: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {built ? (
        <LinearGradient
          colors={['#5B8AE8', '#3D68C4', '#22407F']}
          style={[s.panelFace, { width: w, height: h }]}
          start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}
        >
          <View style={s.panelSheen} />
          <View style={s.panelLine} />
          <View style={[s.panelLine, { top: '64%' }]} />
          <View style={s.panelVLine} />
        </LinearGradient>
      ) : (
        <View style={[s.panelFace, s.panelGhost, { width: w, height: h }]} />
      )}
      <View style={[s.panelLeg, !built && { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
    </View>
  );
}

/** パネル畑(奥行きのある3列。レベルが上がるほど枚数が増える) */
function PanelField({ level }: { level: number }) {
  // 12スロット(奥3・中4・手前5)。レベル1→2枚 … レベル6→12枚
  const builtCount = Math.min(MAX_PLANT_LEVEL * 2, level * 2);
  const rows = [
    { count: 3, w: 26, h: 15, gap: 14, opacity: 0.75 },
    { count: 4, w: 32, h: 19, gap: 12, opacity: 0.9 },
    { count: 5, w: 40, h: 24, gap: 10, opacity: 1 },
  ];
  let idx = 0;
  return (
    <View style={s.fieldWrap} pointerEvents="none">
      {rows.map((row, r) => {
        const cells = Array.from({ length: row.count }).map(() => idx++ < builtCount);
        return (
          <View key={r} style={[s.fieldRow, { gap: row.gap, opacity: row.opacity }]}>
            {cells.map((built, i) => (
              <Panel key={i} built={built} w={row.w} h={row.h} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** 蓄電タンク(蓄電量に応じて中の光が満ちる) */
function BatteryTanks({ storedRatio, visible }: { storedRatio: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={s.tanksWrap} pointerEvents="none">
      {[0, 1, 2].map((i) => (
        <View key={i} style={[s.tank, { height: 34 - i * 3 }]}>
          <View
            style={[
              s.tankFill,
              { height: `${Math.round(Math.min(1, storedRatio) * 100)}%` as any },
            ]}
          />
          <View style={s.tankCap} />
        </View>
      ))}
    </View>
  );
}

/** 発電施設(レベル3以降に登場) */
function PowerFacility({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={s.facilityWrap} pointerEvents="none">
      <View style={s.facilityBody}>
        <Text style={s.facilityBolt}>⚡</Text>
      </View>
      <View style={s.facilityRoof} />
      <View style={s.facilityMast} />
    </View>
  );
}

/** 手前の緑(自然) */
function Nature() {
  return (
    <View style={s.natureWrap} pointerEvents="none">
      <Text style={s.natureEmoji}>🌲</Text>
      <Text style={[s.natureEmoji, { fontSize: 13, marginTop: 5 }]}>🌿</Text>
    </View>
  );
}

/* ════════════════════════ 画面本体 ════════════════════════ */

export default function PlantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lightEnergy, powerPlant, sellEnergy, buildTownItem, progress } = useApp();

  const [selling, setSelling] = useState(false);
  const [soldMsg, setSoldMsg] = useState<string | null>(null);
  const [builtMsg, setBuiltMsg] = useState<string | null>(null);
  const [justBuiltKey, setJustBuiltKey] = useState<string | null>(null);
  const [brightenSeq, setBrightenSeq] = useState(0);

  const soldTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const builtTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
    if (builtTimerRef.current) clearTimeout(builtTimerRef.current);
  }, []);

  const level = plantLevelFor(lightEnergy.totalEnergy);
  const levelProgress = plantLevelProgress(lightEnergy.totalEnergy);
  const next = nextTownItem(powerPlant);
  const sellable = Math.floor(lightEnergy.storedEnergy);
  const remainToNext =
    level >= MAX_PLANT_LEVEL ? 0 : Math.max(0, PLANT_LEVEL_THRESHOLDS[level] - lightEnergy.totalEnergy);
  const townRatio = powerPlant.townBuilt / TOWN_ITEMS.length;
  const mascotStage = getMascotStage(progress.level);

  const mascotMsg =
    sellable > 0
      ? 'たくさん光が届いたよ!\n売電できるよ✨'
      : lightEnergy.todayEnergy > 0
        ? '今日も光を届けたね!\nえらいよ🌟'
        : '今日もいっしょに\n光を集めよう🌞';

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const sellScale = useSharedValue(1);
  const sellStyle = useAnimatedStyle(() => ({ transform: [{ scale: sellScale.value }] }));

  const handleSell = async () => {
    if (selling || sellable <= 0) return;
    setSelling(true);
    sellScale.value = withSequence(
      withSpring(0.94, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    try {
      const { sold, gained } = await sellEnergy();
      if (sold > 0) {
        setBrightenSeq((n) => n + 1); // 街がぱっと明るくなる
        setSoldMsg(`⚡${sold} 売電! 🌱エコポイント +${gained} — 街に光が灯ったよ`);
        if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
        soldTimerRef.current = setTimeout(() => setSoldMsg(null), 3000);
      }
    } finally {
      setSelling(false);
    }
  };

  const handleBuild = async () => {
    const { built } = await buildTownItem();
    if (built) {
      setJustBuiltKey(built.key);
      setBuiltMsg(`${built.emoji} ${built.name}が建ったよ! ${built.flavor}`);
      if (builtTimerRef.current) clearTimeout(builtTimerRef.current);
      builtTimerRef.current = setTimeout(() => { setBuiltMsg(null); setJustBuiltKey(null); }, 3200);
    }
  };

  const canBuild = !!next && powerPlant.ecoPoints >= next.cost;

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ヘッダー ── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={s.titleRow}>
              <Text style={[s.title, { color: colors.foreground }]}>ひかり発電所</Text>
              <View style={s.levelBadge}>
                <Text style={s.levelBadgeText}>Lv.{level}</Text>
              </View>
            </View>
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
              キミの光が、街を明るく照らしてるよ
            </Text>
          </View>
        </View>

        {/* ── 発電ステータス ── */}
        <View style={[s.card, s.statsCard, { borderColor: colors.border }]}>
          <LinearGradient
            colors={['rgba(52,32,102,0.92)', 'rgba(30,19,64,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statHead}>☀️ 今日の発電</Text>
              <Text style={[s.statValue, { color: '#FFD86B' }]}>
                +{lightEnergy.todayEnergy}
              </Text>
              <Text style={s.statUnit}>Energy</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>🔋 蓄電中</Text>
              <Text style={[s.statValue, { color: '#8AF0B8' }]}>{sellable}</Text>
              <Text style={s.statUnit}>Energy</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statHead}>🪙 売電可能</Text>
              <Text style={[s.statValue, { color: '#C9B2FF' }]}>{sellable}</Text>
              {sellable > 0 ? (
                <View style={s.sellReadyChip}>
                  <Text style={s.sellReadyChipText}>売電できるよ!</Text>
                </View>
              ) : (
                <Text style={s.statUnit}>Energy</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── 発電所シーン ── */}
        <View style={[s.card, s.sceneCard, { borderColor: colors.border }]}>
          {/* 空 */}
          <LinearGradient
            colors={['#231352', '#3A2178', '#6B3E96', '#C4707F']}
            locations={[0, 0.42, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SceneStars />
          <SceneSun lightPower={lightEnergy.lightPower} />
          <Mountains />

          {/* 地面 */}
          <LinearGradient
            colors={['rgba(46,28,92,0.0)', 'rgba(34,20,72,0.96)', 'rgba(22,13,48,1)']}
            style={s.groundGrad}
            pointerEvents="none"
          />

          <TownSkyline townBuilt={powerPlant.townBuilt} brightenSeq={brightenSeq} />
          <PowerFacility visible={level >= 3} />
          <PanelField level={level} />
          <BatteryTanks
            storedRatio={lightEnergy.storedEnergy / 120}
            visible={level >= 2}
          />
          <Nature />

          {/* キャラクター */}
          <View style={s.mascotWrap} pointerEvents="none">
            <View style={s.mascotBubble}>
              <Text style={s.mascotBubbleText}>{mascotMsg}</Text>
            </View>
            <Mascot stage={mascotStage} mood="happy" size={64} idleBehavior="normal" />
          </View>

          {/* レベル進捗(シーン下部オーバーレイ) */}
          <View style={s.sceneFooter}>
            <View style={s.sceneFooterRow}>
              <Text style={s.sceneFooterLabel}>
                {level >= MAX_PLANT_LEVEL
                  ? '🌟 発電所は最大ランク! すごい!'
                  : `⚡ 次のランクまで あと ${remainToNext} Energy`}
              </Text>
              <Text style={s.sceneFooterPct}>{Math.round(levelProgress * 100)}%</Text>
            </View>
            <View style={s.levelTrack}>
              <LinearGradient
                colors={['#FFD86B', '#FF9D2E']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.levelFill, { width: `${Math.max(3, levelProgress * 100)}%` }]}
              />
            </View>
            {level < MAX_PLANT_LEVEL && (
              <Text style={s.sceneFooterHint}>🎁 ランクアップでソーラーパネルが増設されるよ</Text>
            )}
          </View>
        </View>

        {/* ── 4つのアクション ── */}
        <View style={s.actionGrid}>
          {/* 発電 */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)')}
            accessibilityRole="button"
            accessibilityLabel="発電: 光を集めにいく(ホームへ移動)"
            style={[s.actionCard, { borderColor: colors.border }]}
          >
            <LinearGradient colors={['rgba(70,44,120,0.9)', 'rgba(38,24,80,0.95)']} style={StyleSheet.absoluteFill} />
            <Text style={s.actionEmoji}>☀️</Text>
            <Text style={s.actionTitle}>発電</Text>
            <Text style={s.actionDesc}>光を集めてエネルギーにする</Text>
            <View style={s.actionChip}>
              <Text style={s.actionChipText}>光を集めにいく</Text>
            </View>
          </TouchableOpacity>

          {/* 蓄電(ステータス表示) */}
          <View
            accessible
            accessibilityLabel={`蓄電ステータス: 現在 ${sellable} エネルギー蓄電中`}
            style={[s.actionCard, { borderColor: colors.border }]}
          >
            <LinearGradient colors={['rgba(44,70,90,0.85)', 'rgba(26,40,64,0.95)']} style={StyleSheet.absoluteFill} />
            <Text style={s.actionEmoji}>🔋</Text>
            <Text style={s.actionTitle}>蓄電</Text>
            <Text style={s.actionDesc}>貯めたエネルギーをしっかり蓄える</Text>
            <View style={[s.actionChip, { backgroundColor: 'rgba(138,240,184,0.14)' }]}>
              <Text style={[s.actionChipText, { color: '#8AF0B8' }]}>⚡{sellable} 蓄電中</Text>
            </View>
          </View>

          {/* 売電 */}
          <View style={[s.actionCard, sellable > 0 && s.actionCardHot, { borderColor: sellable > 0 ? '#FFC94D88' : colors.border }]}>
            <LinearGradient
              colors={sellable > 0 ? ['rgba(120,80,30,0.55)', 'rgba(64,40,16,0.7)'] : ['rgba(70,44,120,0.9)', 'rgba(38,24,80,0.95)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={s.actionEmoji}>🪙</Text>
            <Text style={s.actionTitle}>売電</Text>
            <Text style={s.actionDesc}>エネルギーを売ってエコポイント獲得</Text>
            <Animated.View style={[sellStyle, { alignSelf: 'stretch' }]}>
              <TouchableOpacity
                onPress={handleSell}
                disabled={selling || sellable <= 0}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={sellable > 0 ? `${sellable} エネルギーを売電する` : 'まだ売電できません。蓄電中です'}
                accessibilityState={{ disabled: selling || sellable <= 0 }}
                style={s.sellBtnWrap}
              >
                <LinearGradient
                  colors={sellable > 0 ? ['#FFC94D', '#FF9D2E'] : ['#3A3357', '#3A3357']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.sellBtn}
                >
                  <Text style={[s.sellBtnText, { color: sellable > 0 ? '#3A2400' : 'rgba(255,255,255,0.4)' }]}>
                    {sellable > 0 ? `⚡${sellable} 売電する` : 'まだ蓄電中…'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* 拡張 */}
          <TouchableOpacity
            activeOpacity={next ? 0.85 : 1}
            onPress={next && canBuild ? handleBuild : undefined}
            disabled={!next || !canBuild}
            accessibilityRole="button"
            accessibilityLabel={next ? `拡張: ${next.name}を建てる(エコポイント${next.cost})` : '街は最大まで発展しました'}
            accessibilityState={{ disabled: !next || !canBuild }}
            style={[s.actionCard, { borderColor: canBuild ? '#7FDCA488' : colors.border }]}
          >
            <LinearGradient colors={['rgba(40,78,60,0.7)', 'rgba(22,44,36,0.9)']} style={StyleSheet.absoluteFill} />
            <Text style={s.actionEmoji}>🏙️</Text>
            <Text style={s.actionTitle}>拡張</Text>
            <Text style={s.actionDesc}>
              {next ? `つぎは ${next.emoji}${next.name}(🌱${next.cost})` : '街は最大まで発展したよ!'}
            </Text>
            <View style={[s.actionChip, canBuild && { backgroundColor: '#7FDCA4' }]}>
              <Text style={[s.actionChipText, canBuild && { color: '#0D3321' }]}>
                {!next ? '🎉 コンプリート' : canBuild ? '建てる!' : `あと 🌱${next.cost - powerPlant.ecoPoints}`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 売電成功バナー */}
        {soldMsg && (
          <Animated.View
            entering={FadeInUp.springify().damping(10)}
            exiting={FadeOut}
            style={[s.banner, { backgroundColor: '#7FDCA426', borderColor: '#7FDCA466' }]}
          >
            <Text style={[s.bannerText, { color: '#7FDCA4' }]}>{soldMsg}</Text>
          </Animated.View>
        )}

        {/* ── 街の発展 ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>🏘️</Text>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>街の発展</Text>
            <View style={s.ecoBadge}>
              <Text style={s.ecoBadgeText}>🌱 {powerPlant.ecoPoints}</Text>
            </View>
          </View>
          <Text style={[s.hint, { color: colors.mutedForeground }]}>
            みんなの暮らしが、どんどん豊かになってるよ
          </Text>
          <View style={s.devRow}>
            <Text style={s.devLabel}>発展度 {Math.round(townRatio * 100)}%</Text>
            <View style={s.devTrack}>
              <LinearGradient
                colors={['#7FDCA4', '#4FC08D']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.devFill, { width: `${Math.max(2, townRatio * 100)}%` }]}
              />
            </View>
          </View>
          <View style={s.townRow}>
            {TOWN_ITEMS.map((item, i) => {
              const isBuilt = i < powerPlant.townBuilt;
              const isNew = item.key === justBuiltKey;
              const isNext = i === powerPlant.townBuilt;
              return (
                <View key={item.key} style={[s.townCell, isNext && s.townCellNext]}>
                  {isNew ? (
                    <Animated.Text entering={FadeInUp.springify().damping(9)} style={s.townEmoji}>
                      {item.emoji}
                    </Animated.Text>
                  ) : (
                    <Text style={[s.townEmoji, !isBuilt && s.townGhost]}>
                      {isBuilt ? item.emoji : isNext ? item.emoji : '🔒'}
                    </Text>
                  )}
                  <Text style={[s.townName, { opacity: isBuilt ? 0.9 : isNext ? 0.7 : 0.35 }]}>
                    {isBuilt || isNext ? item.name : '未解放'}
                  </Text>
                </View>
              );
            })}
          </View>
          {builtMsg && (
            <Animated.View
              entering={FadeInUp.springify().damping(10)}
              exiting={FadeOut}
              style={[s.banner, { backgroundColor: '#FFC94D22', borderColor: '#FFC94D55' }]}
            >
              <Text style={[s.bannerText, { color: '#FFD86B' }]}>{builtMsg}</Text>
            </Animated.View>
          )}
          {next ? (
            <TouchableOpacity
              onPress={handleBuild}
              disabled={!canBuild}
              activeOpacity={0.9}
              style={[s.buildBtn, { backgroundColor: canBuild ? '#7FDCA4' : colors.muted }]}
            >
              <Text style={[s.buildBtnText, { color: canBuild ? '#0D3321' : colors.mutedForeground }]}>
                {next.emoji} {next.name}を建てる(🌱{next.cost})
              </Text>
              {!canBuild && (
                <Text style={[s.buildNeed, { color: colors.mutedForeground }]}>
                  あと 🌱{next.cost - powerPlant.ecoPoints} — 売電するとエコポイントがもらえるよ
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={[s.hint, { color: '#FFD86B' }]}>
              🎉 街は最高に発展したよ! ここまで育ててくれてありがとう!
            </Text>
          )}
        </View>

        {/* ── 光の循環(ゲームループの説明) ── */}
        <View style={[s.card, s.loopCard, { borderColor: colors.border }]}>
          <Text style={s.loopText}>💗 キミが元気になる → ✨ 光が生まれる → 🌞 太陽が輝く</Text>
          <Text style={s.loopText}>→ ⚡ エネルギーが貯まる → 🪙 売電 → 🏙️ 街が発展!</Text>
        </View>

        {/* ── ショップ(将来拡張の枠) ── */}
        <View style={[s.card, s.shopCard, { borderColor: colors.border }]}>
          <Text style={s.cardIcon}>🛍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>アイテムショップ</Text>
            <Text style={[s.hint, { color: colors.mutedForeground }]}>
              エコポイントでキャラのアイテムが買えるようになるよ(準備中)
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ════════════════════════ styles ════════════════════════ */

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },
  levelBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: '#FFC94D26', borderWidth: 1, borderColor: '#FFC94D66',
  },
  levelBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FFD86B' },

  card: { borderRadius: 22, padding: 18, borderWidth: 1, gap: 12, overflow: 'hidden' },

  /* stats */
  statsCard: { padding: 14 },
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  statHead: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.6)' },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  statUnit: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.4)' },
  sellReadyChip: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    backgroundColor: 'rgba(201,178,255,0.18)',
  },
  sellReadyChipText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#C9B2FF' },

  /* scene */
  sceneCard: { height: 400, padding: 0, gap: 0 },
  sunWrap: {
    position: 'absolute', left: '8%', top: 66,
    width: 90, height: 90, alignItems: 'center', justifyContent: 'center',
  },
  sunGlowOuter: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFC94D',
  },
  sunGlowInner: {
    position: 'absolute', width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(255,216,107,0.4)',
  },
  sunBody: { width: 44, height: 44, borderRadius: 22 },
  mountainWrap: { position: 'absolute', left: 0, right: 0, top: 118, height: 70 },
  mountain: {
    position: 'absolute', bottom: 0,
    borderTopLeftRadius: 90, borderTopRightRadius: 90,
  },
  groundGrad: { position: 'absolute', left: 0, right: 0, top: 150, bottom: 0 },

  townWrap: {
    position: 'absolute', right: 10, top: 116, height: 62,
    flexDirection: 'row', alignItems: 'flex-end', gap: 3,
  },
  building: {
    backgroundColor: 'rgba(52,36,96,0.96)', borderTopLeftRadius: 3, borderTopRightRadius: 3,
    alignItems: 'center', paddingTop: 4, gap: 3,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)',
  },
  buildingWindow: { width: 5, height: 4, borderRadius: 1, backgroundColor: '#FFD86B' },
  townFlash: {
    position: 'absolute', left: -14, right: -8, top: -16, bottom: -6,
    borderRadius: 20, backgroundColor: '#FFD86B',
  },

  fieldWrap: { position: 'absolute', left: 0, right: 0, top: 188, alignItems: 'center', gap: 9 },
  fieldRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  panelFace: { borderRadius: 3, overflow: 'hidden', transform: [{ skewX: '-10deg' }] },
  panelGhost: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  panelSheen: {
    position: 'absolute', top: 0, left: 0, width: '45%', height: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  panelLine: { position: 'absolute', top: '32%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  panelVLine: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  panelLeg: { width: 3, height: 7, backgroundColor: 'rgba(255,255,255,0.3)' },

  tanksWrap: {
    position: 'absolute', right: 22, top: 236,
    flexDirection: 'row', alignItems: 'flex-end', gap: 5,
  },
  tank: {
    width: 18, borderRadius: 5, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(138,240,184,0.35)',
    justifyContent: 'flex-end',
  },
  tankFill: { backgroundColor: 'rgba(138,240,184,0.55)', width: '100%' },
  tankCap: { position: 'absolute', top: 2, left: 3, right: 3, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  facilityWrap: { position: 'absolute', left: 24, top: 226, alignItems: 'center' },
  facilityBody: {
    width: 40, height: 34, borderRadius: 5,
    backgroundColor: 'rgba(70,48,128,0.96)',
    borderWidth: 1, borderColor: 'rgba(255,216,107,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  facilityBolt: { fontSize: 16 },
  facilityRoof: {
    position: 'absolute', top: -6, width: 46, height: 8, borderRadius: 3,
    backgroundColor: 'rgba(90,64,150,0.98)',
  },
  facilityMast: { position: 'absolute', top: -18, width: 2, height: 14, backgroundColor: 'rgba(255,255,255,0.4)' },

  natureWrap: { position: 'absolute', left: 12, bottom: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  natureEmoji: { fontSize: 18 },

  mascotWrap: { position: 'absolute', right: 8, top: 8, alignItems: 'center', gap: 2 },
  mascotBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 7, maxWidth: 150,
  },
  mascotBubbleText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#3A2A6A', lineHeight: 14, textAlign: 'center' },

  sceneFooter: {
    position: 'absolute', left: 12, right: 12, bottom: 12,
    backgroundColor: 'rgba(20,12,44,0.82)', borderRadius: 14, padding: 11, gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sceneFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sceneFooterLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  sceneFooterPct: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFD86B' },
  levelTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: 3 },
  sceneFooterHint: { fontSize: 9.5, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' },

  /* actions */
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  actionCard: {
    width: '48.4%', borderRadius: 18, borderWidth: 1, padding: 13,
    gap: 6, overflow: 'hidden', alignItems: 'flex-start',
  },
  actionCardHot: { shadowColor: '#FFC94D', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  actionEmoji: { fontSize: 22 },
  actionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  actionDesc: { fontSize: 10.5, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.62)', lineHeight: 15, minHeight: 30 },
  actionChip: {
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minHeight: 40, paddingVertical: 8,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionChipText: { fontSize: 11.5, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.85)' },
  sellBtnWrap: { borderRadius: 10, overflow: 'hidden' },
  sellBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10 },
  sellBtnText: { fontSize: 12.5, fontFamily: 'Inter_700Bold' },

  banner: { padding: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  bannerText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', textAlign: 'center' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  ecoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#7FDCA422' },
  ecoBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#7FDCA4' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },

  devRow: { gap: 5 },
  devLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#7FDCA4' },
  devTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  devFill: { height: '100%', borderRadius: 3 },

  townRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  townCell: { width: '23%', alignItems: 'center', gap: 2, paddingVertical: 6, borderRadius: 10 },
  townCellNext: { backgroundColor: 'rgba(127,220,164,0.1)', borderWidth: 1, borderColor: 'rgba(127,220,164,0.3)' },
  townEmoji: { fontSize: 24, color: 'rgba(255,255,255,0.3)' },
  townGhost: { opacity: 0.3 },
  townName: { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.75)' },
  buildBtn: { padding: 14, borderRadius: 14, alignItems: 'center', gap: 2 },
  buildBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  buildNeed: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  loopCard: { backgroundColor: 'rgba(35,22,70,0.75)', gap: 4, padding: 14 },
  loopText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.72)', lineHeight: 17, textAlign: 'center' },

  shopCard: { flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.85, backgroundColor: 'rgba(35,22,70,0.6)' },
});
