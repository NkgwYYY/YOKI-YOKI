/**
 * STARLIGHT RUN — YOKI YOKIの宇宙を走る、片手操作の横スクロールゲーム。
 *
 * 画面タップで小さくジャンプ、長押しで少し高くジャンプする。
 * キャラクターは既存のMascot素材を使い、ステージの図形だけで
 * オリジナルの星空の道を表現する。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Mascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { useApp } from '@/contexts/AppContext';
import { useCosmicColors as useColors } from '@/constants/cosmicTheme';

const { width: INITIAL_WIDTH } = Dimensions.get('window');

const WORLD_LENGTH = 6_600;
const RUN_SPEED = 92;
const PLAYER_SIZE = 60;
const PLAYER_SCREEN_X_RATIO = 0.23;
const GRAVITY = 1_760;
const HELD_GRAVITY = 820;
const JUMP_SPEED = 475;
const HELD_JUMP_WINDOW = 250;
const FALL_LIMIT = -170;

type Phase = 'intro' | 'playing' | 'failed' | 'complete';

interface PlatformDef {
  x: number;
  width: number;
  height: number;
  kind: 'ground' | 'island';
}

interface ObstacleDef {
  x: number;
  width: number;
  height: number;
  emoji: string;
  color: string;
}

interface SparkDef {
  x: number;
  y: number;
}

export interface SkylineRunResult {
  collected: number;
  totalSparks: number;
  duration: number;
  score: number;
}

interface Props {
  onFinish: (result: SkylineRunResult) => void;
  onQuit: () => void;
  onPlayingChange?: (playing: boolean) => void;
}

interface RunState {
  worldX: number;
  playerY: number;
  velocityY: number;
  grounded: boolean;
  lastTime: number;
  elapsed: number;
}

const PLATFORMS: PlatformDef[] = [
  { x: 0, width: 1_910, height: 0, kind: 'ground' },
  { x: 2_020, width: 860, height: 0, kind: 'ground' },
  { x: 3_010, width: 730, height: 0, kind: 'ground' },
  { x: 3_920, width: 930, height: 0, kind: 'ground' },
  // ゴールの先まで地面を少し伸ばし、星の門を越えた瞬間に演出へ切り替える。
  { x: 5_020, width: 1_920, height: 0, kind: 'ground' },
  // Gaps have a low, friendly island: missing a jump is recoverable once.
  { x: 1_910, width: 110, height: 78, kind: 'island' },
  { x: 2_880, width: 130, height: 80, kind: 'island' },
  { x: 3_740, width: 180, height: 74, kind: 'island' },
  { x: 4_850, width: 170, height: 84, kind: 'island' },
];

const OBSTACLES: ObstacleDef[] = [
  { x: 490, width: 46, height: 52, emoji: '✦', color: '#FFB7DA' },
  { x: 735, width: 50, height: 62, emoji: '✧', color: '#A9E4FF' },
  { x: 1_230, width: 48, height: 56, emoji: '✦', color: '#FFD778' },
  { x: 1_575, width: 52, height: 66, emoji: '✧', color: '#C9B8FF' },
  { x: 2_210, width: 50, height: 56, emoji: '✦', color: '#FFB7DA' },
  { x: 2_575, width: 48, height: 64, emoji: '✧', color: '#A9E4FF' },
  { x: 3_315, width: 52, height: 60, emoji: '✦', color: '#FFD778' },
  { x: 3_585, width: 50, height: 54, emoji: '✧', color: '#FFB7DA' },
  { x: 4_240, width: 52, height: 68, emoji: '✦', color: '#C9B8FF' },
  { x: 4_605, width: 46, height: 56, emoji: '✧', color: '#A9E4FF' },
  { x: 5_270, width: 50, height: 60, emoji: '✦', color: '#FFD778' },
  { x: 5_735, width: 54, height: 66, emoji: '✧', color: '#FFB7DA' },
];

const SPARKS: SparkDef[] = [
  { x: 260, y: 86 }, { x: 540, y: 150 }, { x: 790, y: 122 },
  { x: 1_070, y: 84 }, { x: 1_360, y: 138 }, { x: 1_700, y: 90 },
  { x: 2_070, y: 82 }, { x: 2_330, y: 146 }, { x: 2_690, y: 92 },
  { x: 3_130, y: 84 }, { x: 3_450, y: 138 }, { x: 3_815, y: 105 },
  { x: 4_080, y: 84 }, { x: 4_400, y: 146 }, { x: 4_760, y: 94 },
  { x: 5_160, y: 88 }, { x: 5_480, y: 144 }, { x: 5_900, y: 92 },
  { x: 6_270, y: 126 },
];

const SKY_STARS = [
  { x: 7, y: 17, size: 3 }, { x: 18, y: 31, size: 2 }, { x: 32, y: 11, size: 2 },
  { x: 46, y: 25, size: 3 }, { x: 63, y: 14, size: 2 }, { x: 79, y: 34, size: 2 },
  { x: 91, y: 12, size: 3 }, { x: 105, y: 27, size: 2 }, { x: 119, y: 8, size: 2 },
];

function initialRunState(): RunState {
  return {
    worldX: 0,
    playerY: 0,
    velocityY: 0,
    grounded: true,
    lastTime: 0,
    elapsed: 0,
  };
}

function rangeOverlaps(aStart: number, aWidth: number, bStart: number, bWidth: number) {
  return aStart < bStart + bWidth && aStart + aWidth > bStart;
}

function getSupportHeight(worldPlayerX: number, playerY: number, previousY: number): number | null {
  const candidates = PLATFORMS
    .filter((platform) => rangeOverlaps(worldPlayerX, PLAYER_SIZE * 0.72, platform.x, platform.width))
    .map((platform) => platform.height)
    .filter((height) => previousY >= height - 6 && playerY <= height + 4);
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function Burst({ x, y, color }: { x: number; y: number; color: string }) {
  const scale = useRef(new Animated.Value(0.25)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1.45, duration: 460, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 460, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.burst,
        { left: x - 22, bottom: y - 22, borderColor: color, transform: [{ scale }], opacity },
      ]}
    >
      <Text style={[styles.burstText, { color }]}>✦</Text>
    </Animated.View>
  );
}

export function SkylineRunGame({ onFinish, onQuit, onPlayingChange }: Props) {
  const colors = useColors();
  const { progress } = useApp();
  const [phase, setPhase] = useState<Phase>('intro');
  const [frame, setFrame] = useState<RunState>(() => initialRunState());
  const [collected, setCollected] = useState(0);
  const [sceneSize, setSceneSize] = useState({ width: INITIAL_WIDTH, height: 430 });
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const phaseRef = useRef<Phase>('intro');
  const runRef = useRef<RunState>(initialRunState());
  const collectedRef = useRef<Set<number>>(new Set());
  const holdingRef = useRef(false);
  const jumpStartedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const burstIdRef = useRef(0);
  const startAtRef = useRef(0);
  const finishRef = useRef(false);
  const assistedObstacleRef = useRef<number | null>(null);
  const collectSoundRef = useRef<Audio.Sound | null>(null);
  const finishSoundRef = useRef<Audio.Sound | null>(null);

  const groundY = Math.round(sceneSize.height * 0.72);
  const playerScreenX = Math.round(sceneSize.width * PLAYER_SCREEN_X_RATIO);
  const totalSparks = SPARKS.length;

  useEffect(() => {
    onPlayingChange?.(phase === 'playing');
    phaseRef.current = phase;
  }, [onPlayingChange, phase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [collect, finish] = await Promise.all([
          Audio.Sound.createAsync(require('@/assets/sounds/taiko_ka.mp3'), { volume: 0.3 }),
          Audio.Sound.createAsync(require('@/assets/sounds/stars.mp3'), { volume: 0.45 }),
        ]);
        if (cancelled) {
          await Promise.all([collect.sound.unloadAsync(), finish.sound.unloadAsync()]);
          return;
        }
        collectSoundRef.current = collect.sound;
        finishSoundRef.current = finish.sound;
      } catch {
        // 音声の読み込み失敗やブラウザの自動再生制限でもゲームは続けられる。
      }
    })();
    return () => {
      cancelled = true;
      collectSoundRef.current?.unloadAsync().catch(() => {});
      finishSoundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playSound = useCallback((soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    soundRef.current?.replayAsync().catch(() => {});
  }, []);

  const resetRun = useCallback(() => {
    const next = initialRunState();
    runRef.current = next;
    setFrame(next);
    collectedRef.current = new Set();
    setCollected(0);
    setBursts([]);
    finishRef.current = false;
    holdingRef.current = false;
    jumpStartedAtRef.current = 0;
    assistedObstacleRef.current = null;
    startAtRef.current = Date.now();
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  const startRun = useCallback(() => {
    resetRun();
  }, [resetRun]);

  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const run = runRef.current;
    holdingRef.current = true;
    if (!run.grounded) return;
    run.velocityY = JUMP_SPEED;
    run.grounded = false;
    jumpStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    setFrame({ ...run });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const releaseJump = useCallback(() => {
    holdingRef.current = false;
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;

    const loop = (time: number) => {
      if (phaseRef.current !== 'playing' || finishRef.current) return;
      const run = runRef.current;
      const previousY = run.playerY;
      const dt = run.lastTime ? Math.min((time - run.lastTime) / 1000, 0.035) : 0.016;
      run.lastTime = time;
      run.elapsed += dt;
      run.worldX += RUN_SPEED * dt;
      const playerWorldX = run.worldX + playerScreenX;

      // YOKI YOKIらしい「星の道のアシスト」。
      // 初めてでも序盤で止まりすぎないよう、障害物・小さな切れ目の直前では
      // キャラがやさしく跳ねる。ユーザーのタップ／長押しは常に優先される。
      if (run.grounded) {
        const nextObstacle = OBSTACLES.find((obstacle) => {
          const distance = obstacle.x - (playerWorldX + PLAYER_SIZE * 0.45);
          // 障害物用は近くで跳ねる。遠すぎると到達前に着地してしまう。
          return distance > 0 && distance < 48;
        });
        const currentPlatform = PLATFORMS.find(
          (platform) => rangeOverlaps(playerWorldX, PLAYER_SIZE * 0.72, platform.x, platform.width)
            && Math.abs(platform.height - run.playerY) < 6,
        );
        const nearPlatformEdge = !!currentPlatform
          && currentPlatform.x + currentPlatform.width - playerWorldX < 58;
        if (nextObstacle || nearPlatformEdge) {
          // 障害物と小さな切れ目は、同じゆったりした高さで確実に越える。
          run.velocityY = JUMP_SPEED * 1.45;
          run.grounded = false;
          holdingRef.current = false;
          jumpStartedAtRef.current = 0;
          if (nextObstacle) assistedObstacleRef.current = nextObstacle.x;
        }
      }

      if (!run.grounded) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const holdingLongEnough = holdingRef.current && now - jumpStartedAtRef.current < HELD_JUMP_WINDOW;
        run.velocityY -= (holdingLongEnough ? HELD_GRAVITY : GRAVITY) * dt;
        run.playerY += run.velocityY * dt;
        const support = getSupportHeight(run.worldX + playerScreenX, run.playerY, previousY);
        if (support !== null && run.velocityY <= 0) {
          run.playerY = support;
          run.velocityY = 0;
          run.grounded = true;
        }
      } else {
        // 地面だけでなく、浮き島の上でも接地状態を維持する。
        const support = getSupportHeight(run.worldX + playerScreenX, run.playerY, run.playerY);
        if (support === null) {
          run.grounded = false;
          run.velocityY = -20;
        } else if (support > 0) {
          run.playerY = support;
        }
      }

      const obstacleHit = OBSTACLES.some((obstacle) => {
        const safelyGuidedPast = assistedObstacleRef.current === obstacle.x
          && playerWorldX < obstacle.x + obstacle.width + PLAYER_SIZE;
        return !safelyGuidedPast
          && rangeOverlaps(playerWorldX + 12, PLAYER_SIZE * 0.58, obstacle.x, obstacle.width)
          && run.playerY < obstacle.height - 3
          && run.playerY + PLAYER_SIZE > 8;
      });
      if (assistedObstacleRef.current !== null && playerWorldX > assistedObstacleRef.current + PLAYER_SIZE + 80) {
        assistedObstacleRef.current = null;
      }

      if (obstacleHit || run.playerY < FALL_LIMIT) {
        phaseRef.current = 'failed';
        setPhase('failed');
        setFrame({ ...run });
        return;
      }

      SPARKS.forEach((spark, index) => {
        if (collectedRef.current.has(index)) return;
        const closeX = Math.abs(playerWorldX + PLAYER_SIZE * 0.45 - spark.x) < 62;
        const closeY = Math.abs(run.playerY + PLAYER_SIZE * 0.55 - spark.y) < 62;
        if (closeX && closeY) {
          collectedRef.current.add(index);
          setCollected(collectedRef.current.size);
          const screenX = spark.x - run.worldX;
          const screenY = groundY - spark.y;
          const id = ++burstIdRef.current;
          setBursts((previous) => [...previous, { id, x: screenX, y: screenY }]);
          setTimeout(() => setBursts((previous) => previous.filter((burst) => burst.id !== id)), 500);
          playSound(collectSoundRef);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      });

      setFrame({ ...run });
      if (run.worldX >= WORLD_LENGTH) {
        finishRef.current = true;
        phaseRef.current = 'complete';
        setPhase('complete');
        const duration = Math.max(1, Math.round((Date.now() - startAtRef.current) / 1000));
        const finalCollected = collectedRef.current.size;
        playSound(finishSoundRef);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onFinish({
          collected: finalCollected,
          totalSparks,
          duration,
          score: Math.round(finalCollected * 100 + Math.max(0, 600 - duration)),
        });
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [groundY, onFinish, phase, playSound, playerScreenX, totalSparks]);

  const visiblePlatforms = useMemo(
    () => PLATFORMS.filter((platform) => {
      const left = platform.x - frame.worldX;
      return left < sceneSize.width + 80 && left + platform.width > -80;
    }),
    [frame.worldX, sceneSize.width],
  );
  const visibleObstacles = useMemo(
    () => OBSTACLES.filter((obstacle) => {
      const left = obstacle.x - frame.worldX;
      return left < sceneSize.width + 80 && left + obstacle.width > -80;
    }),
    [frame.worldX, sceneSize.width],
  );
  const visibleSparks = useMemo(
    () => SPARKS.map((spark, index) => ({ spark, index })).filter(({ spark, index }) => {
      if (collectedRef.current.has(index)) return false;
      const left = spark.x - frame.worldX;
      return left > -60 && left < sceneSize.width + 60;
    }),
    [frame.worldX, sceneSize.width, collected],
  );
  const progressPercent = Math.min(100, Math.round((frame.worldX / WORLD_LENGTH) * 100));
  const stage = getMascotStage(progress.level);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <View style={styles.progressCopy}>
          <Text style={[styles.gameTitle, { color: colors.foreground }]}>STARLIGHT RUN</Text>
          <Text style={[styles.gameSubtitle, { color: colors.mutedForeground }]}>星の道を、いっしょに</Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterSpark}>✦</Text>
          <Text style={styles.counterText}>{collected}/{totalSparks}</Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <View
        style={styles.sceneFrame}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) setSceneSize({ width, height });
        }}
      >
        <LinearGradient
          colors={['#120A35', '#21145C', '#39205E']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.skyDecor}>
          <View style={styles.planet} />
          {SKY_STARS.map((star) => (
            <Text
              key={`${star.x}-${star.y}`}
              style={[styles.skyStar, { left: `${star.x}%`, top: `${star.y}%`, fontSize: star.size * 3 }]}
            >
              ·
            </Text>
          ))}
        </View>

        {visiblePlatforms.map((platform) => {
          const left = platform.x - frame.worldX;
          const platformTop = groundY - platform.height;
          return (
            <View
              key={`${platform.x}-${platform.kind}`}
              pointerEvents="none"
              style={[
                styles.platform,
                {
                  left,
                  bottom: sceneSize.height - platformTop - (platform.kind === 'island' ? 15 : 21),
                  width: platform.width,
                  height: platform.kind === 'island' ? 15 : 21,
                  backgroundColor: platform.kind === 'island' ? '#A58EE8' : '#735BB6',
                },
              ]}
            >
              <View style={styles.platformGlow} />
            </View>
          );
        })}

        {visibleObstacles.map((obstacle) => (
          <View
            key={obstacle.x}
            pointerEvents="none"
            style={[
              styles.obstacle,
              {
                left: obstacle.x - frame.worldX,
                bottom: sceneSize.height - groundY,
                width: obstacle.width,
                height: obstacle.height,
                borderColor: obstacle.color,
              },
            ]}
          >
            <Text style={[styles.obstacleEmoji, { color: obstacle.color }]}>{obstacle.emoji}</Text>
          </View>
        ))}

        {visibleSparks.map(({ spark, index }) => (
          <View
            key={index}
            pointerEvents="none"
            style={[styles.spark, { left: spark.x - frame.worldX - 14, bottom: groundY - spark.y - 14 }]}
          >
            <Text style={[styles.sparkText, { opacity: 0.65 + Math.sin(frame.elapsed * 5 + index) * 0.25 }]}>✦</Text>
          </View>
        ))}

        {WORLD_LENGTH - frame.worldX < sceneSize.width + 120 && (
          <View
            pointerEvents="none"
            style={[styles.goalGate, { left: WORLD_LENGTH - frame.worldX - 18, bottom: sceneSize.height - groundY - 2 }]}
          >
            <View style={styles.goalPillar} />
            <View style={styles.goalArch}>
              <Text style={styles.goalStar}>✦</Text>
            </View>
            <View style={styles.goalPillar} />
          </View>
        )}

        <View
          pointerEvents="none"
          style={[
            styles.player,
            {
              left: playerScreenX,
              bottom: sceneSize.height - groundY + frame.playerY,
              transform: [{ rotate: `${Math.max(-8, Math.min(8, frame.velocityY / 55))}deg` }],
            },
          ]}
        >
          <Mascot stage={stage} mood="happy" size={PLAYER_SIZE} preferStatic />
          {frame.grounded && <View style={styles.runShadow} />}
        </View>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {bursts.map((burst) => <Burst key={burst.id} {...burst} color="#FFD86B" />)}
        </View>

        {phase === 'playing' && (
          <Pressable
            testID="skyline-run-playfield"
            accessibilityLabel="タップでジャンプ、長押しで高くジャンプ"
            style={StyleSheet.absoluteFill}
            onPressIn={jump}
            onPressOut={releaseJump}
          />
        )}

        {phase === 'intro' && (
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>🌌</Text>
            <Text style={styles.overlayTitle}>星の道を走ろう</Text>
            <Text style={styles.overlayDescription}>キラキラを集めながら、ゆっくり進もう。</Text>
            <View style={styles.hintRow}>
              <View style={styles.hintChip}><Text style={styles.hintText}>タップ</Text><Text style={styles.hintSub}>ジャンプ</Text></View>
              <View style={styles.hintChip}><Text style={styles.hintText}>長押し</Text><Text style={styles.hintSub}>高くジャンプ</Text></View>
            </View>
            <Pressable testID="skyline-run-start" style={styles.primaryButton} onPress={startRun}>
              <Text style={styles.primaryButtonText}>はじめる ✦</Text>
            </Pressable>
          </View>
        )}

        {phase === 'failed' && (
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>🌙</Text>
            <Text style={styles.overlayTitle}>ここでひとやすみ</Text>
            <Text style={styles.overlayDescription}>だいじょうぶ。星の道は、何度でも歩けるよ。</Text>
            <View style={styles.failureButtons}>
              <Pressable testID="skyline-run-retry" style={styles.primaryButton} onPress={startRun}>
                <Text style={styles.primaryButtonText}>もう一度 ✦</Text>
              </Pressable>
              <Pressable testID="skyline-run-quit-failed" style={styles.secondaryButton} onPress={onQuit}>
                <Text style={styles.secondaryButtonText}>今日はここまで</Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === 'complete' && (
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>✨</Text>
            <Text style={styles.completeTitle}>今日もここまで来た。えらい！</Text>
            <Text style={styles.completeDescription}>星の道を最後まで、一緒に進めたね。</Text>
            <Text style={styles.completeCount}>✦ {collected}個のキラキラを集めたよ</Text>
            <Pressable testID="skyline-run-quit-complete" style={styles.primaryButton} onPress={onQuit}>
              <Text style={styles.primaryButtonText}>とじる</Text>
            </Pressable>
          </View>
        )}
      </View>

      {phase === 'playing' ? (
        <Text style={[styles.footerHint, { color: colors.mutedForeground }]}>画面のどこでもタップしてジャンプ</Text>
      ) : (
        <Text style={[styles.footerHint, { color: colors.mutedForeground }]}>あせらなくて大丈夫。自分のペースで。</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 12, gap: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 },
  progressCopy: { flex: 1 },
  gameTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  gameSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 18, backgroundColor: 'rgba(255,216,107,0.14)', borderWidth: 1, borderColor: 'rgba(255,216,107,0.4)' },
  counterSpark: { color: '#FFD86B', fontSize: 18 },
  counterText: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  progressTrack: { height: 5, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.13)' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFD86B' },
  sceneFrame: { flex: 1, minHeight: 360, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  skyDecor: { ...StyleSheet.absoluteFillObject },
  planet: { position: 'absolute', right: -34, top: 33, width: 126, height: 126, borderRadius: 63, backgroundColor: 'rgba(176,149,255,0.14)', borderWidth: 1, borderColor: 'rgba(220,206,255,0.22)' },
  skyStar: { position: 'absolute', color: 'rgba(255,255,255,0.72)', fontFamily: 'Inter_700Bold' },
  platform: { position: 'absolute', borderRadius: 12, borderTopWidth: 3, borderTopColor: '#CBB8FF', shadowColor: '#A88DFF', shadowOpacity: 0.45, shadowRadius: 9, shadowOffset: { width: 0, height: -2 } },
  platformGlow: { position: 'absolute', left: 12, right: 12, top: -8, height: 8, borderRadius: 8, backgroundColor: 'rgba(205,185,255,0.3)' },
  obstacle: { position: 'absolute', borderWidth: 2, borderRadius: 15, backgroundColor: 'rgba(20,11,54,0.68)', alignItems: 'center', justifyContent: 'center' },
  obstacleEmoji: { fontSize: 25, fontFamily: 'Inter_700Bold' },
  spark: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  sparkText: { color: '#FFD86B', fontSize: 28, fontFamily: 'Inter_700Bold', textShadowColor: '#FFF2B2', textShadowRadius: 8 },
  goalGate: { position: 'absolute', width: 84, height: 118, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  goalPillar: { width: 11, height: 96, borderRadius: 8, backgroundColor: '#E5CEFF', shadowColor: '#E5CEFF', shadowOpacity: 0.85, shadowRadius: 10 },
  goalArch: { position: 'absolute', left: 10, bottom: 38, width: 64, height: 64, borderRadius: 32, borderWidth: 5, borderColor: '#FFD86B', alignItems: 'center', justifyContent: 'center', shadowColor: '#FFD86B', shadowOpacity: 0.8, shadowRadius: 12 },
  goalStar: { color: '#FFF5C7', fontSize: 27, fontFamily: 'Inter_700Bold' },
  player: { position: 'absolute', width: PLAYER_SIZE, height: PLAYER_SIZE, alignItems: 'center', justifyContent: 'flex-end' },
  runShadow: { position: 'absolute', bottom: -2, width: 42, height: 8, borderRadius: 50, backgroundColor: 'rgba(7,3,25,0.42)' },
  burst: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  burstText: { fontSize: 26 },
  overlayCard: { position: 'absolute', left: 20, right: 20, top: '50%', transform: [{ translateY: -112 }], padding: 21, borderRadius: 24, backgroundColor: 'rgba(12,6,36,0.93)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center' },
  overlayEmoji: { fontSize: 34, marginBottom: 5 },
  overlayTitle: { color: '#FFF', fontSize: 21, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  overlayDescription: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, marginTop: 7 },
  hintRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 15 },
  hintChip: { minWidth: 112, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.09)', alignItems: 'center' },
  hintText: { color: '#FFD86B', fontSize: 13, fontFamily: 'Inter_700Bold' },
  hintSub: { color: 'rgba(255,255,255,0.66)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  primaryButton: { minWidth: 170, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 17, alignItems: 'center', backgroundColor: '#8C6BDE' },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
  secondaryButton: { minWidth: 170, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 17, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.17)' },
  secondaryButtonText: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  failureButtons: { gap: 9, alignItems: 'center', marginTop: 15 },
  completeTitle: { color: '#FFD86B', fontSize: 22, lineHeight: 29, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  completeDescription: { color: 'rgba(255,255,255,0.76)', fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 },
  completeCount: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 14, marginBottom: 16 },
  footerHint: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', minHeight: 16 },
});