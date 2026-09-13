/**
 * STARLIGHT RUN — YOKI YOKIの宇宙を探検する操作型2Dアクション。
 *
 * 自動スクロールではなく、プレイヤーが左右・ジャンプ・しゃがみを
 * 使って足場、穴、敵、アイテムを攻略する。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Mascot, StaticMascot } from '@/components/Mascot';
import { getMascotStage } from '@/utils/mascotUtils';
import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/constants/theme';
import { Icon, iconSize, type IconName } from '@/components/ui/Icon';

const { width: INITIAL_WIDTH } = Dimensions.get('window');

const WORLD_WIDTH = 5_200;
const GOAL_X = 4_780;
const PLAYER_WIDTH = 48;
const PLAYER_HEIGHT = 62;
const PLAYER_CROUCH_HEIGHT = 40;
const PLAYER_START_X = 84;
const PLAYER_START_Y = 0;
const MAX_HP = 3;
const GRAVITY = 1_700;
const JUMP_POWER = 700;
const MAX_RUN_SPEED = 208;
const MAX_CROUCH_SPEED = 105;
const FALL_LIMIT = -185;
const PLATFORM_THICKNESS = 18;
const CONTROL_SIZE = 58;
const RENDER_FRAME_MS = 1000 / 30;

type Phase = 'intro' | 'playing' | 'failed' | 'complete';
type PlatformKind = 'ground' | 'step' | 'high' | 'moving';
type ItemKind = 'star' | 'heart' | 'light';

interface PlatformDef {
  id: string;
  x: number;
  y: number;
  width: number;
  kind: PlatformKind;
  motion?: { axis: 'x' | 'y'; amplitude: number; speed: number; phase: number };
}

interface ObstacleDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'crystal' | 'thorn';
}

interface EnemyDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minX: number;
  maxX: number;
  speed: number;
}

interface ItemDef {
  id: string;
  x: number;
  y: number;
  kind: ItemKind;
}

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  crouching: boolean;
  coyoteTime: number;
  jumpBuffer: number;
  jumpTime: number;
  hp: number;
  score: number;
  collected: number;
  invincibleUntil: number;
}

interface EnemyRuntime extends EnemyDef {
  direction: 1 | -1;
  alive: boolean;
  defeatedUntil: number;
}

interface ItemRuntime extends ItemDef {
  collected: boolean;
}

interface Effect {
  id: number;
  x: number;
  y: number;
  kind: 'collect' | 'stomp' | 'damage';
  color: string;
}

interface WorldState {
  player: PlayerState;
  enemies: EnemyRuntime[];
  items: ItemRuntime[];
  effects: Effect[];
  elapsed: number;
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

const PLATFORMS: PlatformDef[] = [
  // 最初の穴までは安全な助走区間。低い段差でジャンプを練習できる。
  { id: 'start', x: 0, y: 0, width: 920, kind: 'ground' },
  { id: 'low-step', x: 560, y: 34, width: 360, kind: 'step' },
  // 最初の「ジャンプ必須」の穴
  { id: 'after-first-gap', x: 1_020, y: 0, width: 420, kind: 'ground' },
  { id: 'high-ledge', x: 1_430, y: 116, width: 330, kind: 'high' },
  { id: 'before-moving', x: 1_440, y: 0, width: 390, kind: 'ground' },
  // 大きな穴は小足場を経由。動く足場は中央の近道兼アイテムルート。
  { id: 'bridge-launch', x: 1_900, y: 40, width: 118, kind: 'step' },
  {
    id: 'moving-bridge',
    x: 2_045,
    y: 92,
    width: 142,
    kind: 'moving',
    motion: { axis: 'y', amplitude: 44, speed: 1.5, phase: 0.6 },
  },
  { id: 'bridge-landing', x: 2_205, y: 38, width: 135, kind: 'step' },
  { id: 'middle-ground', x: 2_340, y: 0, width: 640, kind: 'ground' },
  { id: 'item-high', x: 2_600, y: 142, width: 310, kind: 'high' },
  { id: 'upper-route', x: 2_980, y: 170, width: 300, kind: 'high' },
  { id: 'lower-route', x: 2_980, y: 0, width: 300, kind: 'ground' },
  // 2つ目の穴。敵の先へ進むにはジャンプが必要
  { id: 'enemy-ground', x: 3_440, y: 0, width: 740, kind: 'ground' },
  // 最後の穴を越えた先にゴール
  { id: 'goal-ground', x: 4_300, y: 0, width: 900, kind: 'ground' },
];

const OBSTACLES: ObstacleDef[] = [
  { id: 'ledge-thorn', x: 1_605, y: 116, width: 44, height: 48, kind: 'thorn' },
  { id: 'middle-thorn', x: 2_520, y: 0, width: 50, height: 60, kind: 'thorn' },
  { id: 'upper-crystal', x: 3_085, y: 170, width: 46, height: 54, kind: 'crystal' },
  { id: 'finish-thorn', x: 4_470, y: 0, width: 52, height: 62, kind: 'thorn' },
];

const ENEMIES: EnemyDef[] = [
  { id: 'moon-mochi-1', x: 1_285, y: 0, width: 52, height: 46, minX: 1_130, maxX: 1_390, speed: 52 },
  { id: 'moon-mochi-2', x: 2_730, y: 0, width: 52, height: 46, minX: 2_430, maxX: 2_930, speed: 58 },
  { id: 'moon-mochi-3', x: 3_670, y: 0, width: 54, height: 48, minX: 3_500, maxX: 3_950, speed: 66 },
  { id: 'moon-mochi-4', x: 3_150, y: 170, width: 52, height: 46, minX: 3_010, maxX: 3_220, speed: 44 },
];

const ITEMS: ItemDef[] = [
  { id: 'star-step', x: 660, y: 74, kind: 'star' },
  { id: 'star-gap', x: 970, y: 86, kind: 'star' },
  { id: 'light-ledge', x: 1_535, y: 168, kind: 'light' },
  { id: 'moving-star', x: 2_115, y: 142, kind: 'star' },
  { id: 'heart-middle', x: 2_440, y: 76, kind: 'heart' },
  { id: 'high-star', x: 2_750, y: 194, kind: 'star' },
  { id: 'upper-light', x: 3_190, y: 222, kind: 'light' },
  { id: 'enemy-star', x: 3_720, y: 88, kind: 'star' },
  { id: 'goal-star', x: 4_520, y: 86, kind: 'star' },
];

const SKY_STARS = [
  { x: 7, y: 13, size: 3 }, { x: 16, y: 29, size: 2 }, { x: 26, y: 10, size: 2 },
  { x: 36, y: 24, size: 3 }, { x: 49, y: 8, size: 2 }, { x: 60, y: 31, size: 2 },
  { x: 72, y: 14, size: 3 }, { x: 84, y: 27, size: 2 }, { x: 94, y: 9, size: 2 },
];

type ControlKey = 'left' | 'right' | 'jump' | 'crouch';

interface Controls {
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  jumpQueued: boolean;
  jumpWasDown: boolean;
}

function createWorld(): WorldState {
  return {
    player: {
      x: PLAYER_START_X,
      y: PLAYER_START_Y,
      vx: 0,
      vy: 0,
      grounded: true,
      crouching: false,
      coyoteTime: 0,
      jumpBuffer: 0,
      jumpTime: 0,
      hp: MAX_HP,
      score: 0,
      collected: 0,
      invincibleUntil: 0,
    },
    enemies: ENEMIES.map((enemy) => ({ ...enemy, direction: 1, alive: true, defeatedUntil: 0 })),
    items: ITEMS.map((item) => ({ ...item, collected: false })),
    effects: [],
    elapsed: 0,
  };
}

function snapshotWorld(world: WorldState): WorldState {
  return {
    ...world,
    player: { ...world.player },
    enemies: world.enemies.map((enemy) => ({ ...enemy })),
    items: world.items.map((item) => ({ ...item })),
    effects: [...world.effects],
  };
}

function createControls(): Controls {
  return {
    left: false,
    right: false,
    jump: false,
    crouch: false,
    jumpQueued: false,
    jumpWasDown: false,
  };
}

function overlaps(aStart: number, aSize: number, bStart: number, bSize: number) {
  return aStart < bStart + bSize && aStart + aSize > bStart;
}

function getPlatformsAtTime(elapsed: number): PlatformDef[] {
  return PLATFORMS.map((platform) => {
    if (!platform.motion) return platform;
    const offset = Math.sin(elapsed * platform.motion.speed + platform.motion.phase) * platform.motion.amplitude;
    return platform.motion.axis === 'x'
      ? { ...platform, x: platform.x + offset }
      : { ...platform, y: platform.y + offset };
  });
}

function getPlayerHeight(player: PlayerState) {
  return player.crouching && player.grounded ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
}

function getPlayerCollisionBox(player: PlayerState) {
  const height = getPlayerHeight(player);
  return {
    x: player.x + 8,
    y: player.y + 4,
    width: PLAYER_WIDTH - 16,
    height: Math.max(12, height - 8),
  };
}

function getEnemyCollisionBox(enemy: EnemyRuntime) {
  return {
    x: enemy.x + 5,
    y: enemy.y + 5,
    width: Math.max(12, enemy.width - 10),
    height: Math.max(12, enemy.height - 9),
  };
}

function getObstacleCollisionBox(obstacle: ObstacleDef) {
  const inset = obstacle.kind === 'crystal' ? 7 : 5;
  return {
    x: obstacle.x + inset,
    y: obstacle.y + inset,
    width: Math.max(12, obstacle.width - inset * 2),
    height: Math.max(12, obstacle.height - inset * 2),
  };
}

function getSupportPlatform(player: PlayerState, platforms: PlatformDef[]) {
  const height = getPlayerHeight(player);
  return platforms
    .filter((platform) =>
      overlaps(player.x + 7, PLAYER_WIDTH - 14, platform.x, platform.width)
      && Math.abs(platform.y - player.y) < 7
      && platform.y + PLATFORM_THICKNESS <= player.y + height + 8,
    )
    .sort((a, b) => b.y - a.y)[0];
}

function resolveHorizontalWalls(
  previousX: number,
  nextX: number,
  player: PlayerState,
  platforms: PlatformDef[],
) {
  const height = getPlayerHeight(player);
  let resolved = nextX;
  platforms.forEach((platform) => {
    // 低い段差は歩いて上がれる。高い足場の側面だけを壁として扱う。
    if (platform.y < 55) return;
    const verticalOverlap = player.y < platform.y + PLATFORM_THICKNESS
      && player.y + height > platform.y;
    if (!verticalOverlap) return;
    if (previousX + PLAYER_WIDTH <= platform.x
      && resolved + PLAYER_WIDTH > platform.x
      && overlaps(player.x, PLAYER_WIDTH, platform.x - 4, platform.width + 8)) {
      resolved = platform.x - PLAYER_WIDTH;
    }
    if (previousX >= platform.x + platform.width
      && resolved < platform.x + platform.width
      && overlaps(player.x, PLAYER_WIDTH, platform.x - 4, platform.width + 8)) {
      resolved = platform.x + platform.width;
    }
  });
  return Math.max(0, Math.min(WORLD_WIDTH - PLAYER_WIDTH, resolved));
}

function addEffect(world: WorldState, effect: Omit<Effect, 'id'>) {
  const id = Date.now() + Math.round(world.elapsed * 1000) + world.effects.length;
  world.effects.push({ ...effect, id });
}

function EffectBurst({ effect, cameraX, groundY, sceneHeight }: { effect: Effect; cameraX: number; groundY: number; sceneHeight: number }) {
  const scale = useRef(new Animated.Value(0.25)).current;
  const opacity = useRef(new Animated.Value(0.95)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1.45, duration: 440, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 440, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);
  const icon: IconName = effect.kind === 'damage' ? 'x-circle' : 'star';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.effect,
        {
          left: effect.x - cameraX - 23,
          bottom: sceneHeight - groundY + effect.y - 23,
          borderColor: effect.color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <Icon name={icon} size={25} color={effect.color} />
    </Animated.View>
  );
}

function EnemySprite({
  enemy,
  cameraX,
  groundY,
  sceneHeight,
  elapsed,
  colors,
}: {
  enemy: EnemyRuntime;
  cameraX: number;
  groundY: number;
  sceneHeight: number;
  elapsed: number;
  colors: ReturnType<typeof useColors>;
}) {
  const squashed = !enemy.alive;
  const left = enemy.x - cameraX;
  const opacity = squashed ? Math.max(0.15, (enemy.defeatedUntil - elapsed) / 0.45) : 1;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.enemy,
        {
          left,
          bottom: sceneHeight - groundY + enemy.y,
          width: enemy.width,
          height: enemy.height,
          opacity,
          transform: [{ scaleY: squashed ? 0.28 : 1 }, { scaleX: squashed ? 1.22 : 1 }],
        },
      ]}
    >
      <View style={[styles.enemyBody, { backgroundColor: colors.primary, borderColor: colors.accent }]}>
        <View style={styles.enemyEyeRow}>
          <View style={styles.enemyEye} />
          <View style={styles.enemyEye} />
        </View>
        <View style={[styles.enemyMouth, { backgroundColor: colors.accent }]} />
      </View>
      <View style={[styles.enemyAura, { backgroundColor: colors.primary }]} />
    </View>
  );
}

function ItemSprite({
  item,
  cameraX,
  groundY,
  sceneHeight,
  elapsed,
  colors,
}: {
  item: ItemRuntime;
  cameraX: number;
  groundY: number;
  sceneHeight: number;
  elapsed: number;
  colors: ReturnType<typeof useColors>;
}) {
  if (item.collected) return null;
  const icon: IconName =
    item.kind === 'heart' ? 'heart' : item.kind === 'light' ? 'zap' : 'star';
  const color = item.kind === 'heart' ? colors.destructive : item.kind === 'light' ? colors.secondary : colors.accent;
  return (
    <View
      pointerEvents="none"
      style={[styles.item, { left: item.x - cameraX - 15, bottom: sceneHeight - groundY + item.y - 15 }]}
    >
      <Text style={[styles.itemShine, { opacity: 0.45 + Math.sin(elapsed * 5 + item.x) * 0.25 }]}>·</Text>
      <Icon name={icon} size={28} color={color} />
    </View>
  );
}

export function SkylineRunGame({ onFinish, onQuit, onPlayingChange }: Props) {
  const colors = useColors();
  const { progress } = useApp();
  const [phase, setPhase] = useState<Phase>('intro');
  const [world, setWorld] = useState<WorldState>(() => createWorld());
  const [sceneSize, setSceneSize] = useState({ width: INITIAL_WIDTH, height: 430 });
  const [nativeHeld, setNativeHeld] = useState<Record<ControlKey, boolean>>({
    left: false,
    right: false,
    jump: false,
    crouch: false,
  });
  const [lastEffectIds, setLastEffectIds] = useState<number[]>([]);
  const phaseRef = useRef<Phase>('intro');
  const worldRef = useRef<WorldState>(createWorld());
  const controlsRef = useRef<Controls>(createControls());
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const finishRef = useRef(false);
  const effectIdRef = useRef(0);
  const knownEffectIdsRef = useRef<Set<number>>(new Set());
  const lastFrameAtRef = useRef(0);
  const lastRenderAtRef = useRef(0);
  const itemSoundRef = useRef<Audio.Sound | null>(null);
  const finishSoundRef = useRef<Audio.Sound | null>(null);

  const groundY = Math.round(sceneSize.height * 0.7);
  const cameraMax = Math.max(0, WORLD_WIDTH - sceneSize.width);
  const cameraX = Math.max(0, Math.min(cameraMax, world.player.x - sceneSize.width * 0.36));
  const currentPlatforms = useMemo(() => getPlatformsAtTime(world.elapsed), [world.elapsed]);
  const stage = getMascotStage(progress.level);
  const playerHeight = getPlayerHeight(world.player);

  useEffect(() => {
    phaseRef.current = phase;
    onPlayingChange?.(phase === 'playing');
  }, [onPlayingChange, phase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [itemSound, finishSound] = await Promise.all([
          Audio.Sound.createAsync(require('@/assets/sounds/taiko_ka.mp3'), { volume: 0.28 }),
          Audio.Sound.createAsync(require('@/assets/sounds/stars.mp3'), { volume: 0.45 }),
        ]);
        if (cancelled) {
          await Promise.all([itemSound.sound.unloadAsync(), finishSound.sound.unloadAsync()]);
          return;
        }
        itemSoundRef.current = itemSound.sound;
        finishSoundRef.current = finishSound.sound;
      } catch {
        // 音声が使えない環境でも、画面上の演出とゲーム進行は継続する。
      }
    })();
    return () => {
      cancelled = true;
      itemSoundRef.current?.unloadAsync().catch(() => {});
      finishSoundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playSound = useCallback((sound: Audio.Sound | null) => {
    sound?.replayAsync().catch(() => {});
  }, []);

  const resetGame = useCallback(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    const next = createWorld();
    worldRef.current = next;
    controlsRef.current = createControls();
    finishRef.current = false;
    startTimeRef.current = Date.now();
    lastFrameAtRef.current = 0;
    lastRenderAtRef.current = 0;
    knownEffectIdsRef.current.clear();
    phaseRef.current = 'playing';
    setWorld(snapshotWorld(next));
    setLastEffectIds([]);
    setPhase('playing');
  }, []);

  const pressControl = useCallback((key: ControlKey) => {
    controlsRef.current[key] = true;
    if (key === 'jump') {
      controlsRef.current.jumpQueued = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const releaseControl = useCallback((key: ControlKey) => {
    controlsRef.current[key] = false;
  }, []);

  const directPress = useCallback((key: ControlKey) => {
    if (Platform.OS === 'web') pressControl(key);
  }, [pressControl]);

  const directRelease = useCallback((key: ControlKey) => {
    if (Platform.OS === 'web') releaseControl(key);
  }, [releaseControl]);

  const nativeTouchControlsRef = useRef<Map<number, ControlKey>>(new Map());

  const syncNativeTouches = useCallback((touches: readonly any[]) => {
    if (Platform.OS === 'web') return;

    const keyAtPoint = (x: number, y: number): ControlKey | null => {
      const bottom = sceneSize.height - 12;
      const jumpLeft = sceneSize.width - 12 - 98;
      const jumpTop = bottom - 98;
      if (x >= jumpLeft - 8 && y >= jumpTop - 8) return 'jump';

      const crouchLeft = jumpLeft - 9 - 72;
      const crouchTop = bottom - 48;
      if (x >= crouchLeft - 8 && x <= crouchLeft + 80 && y >= crouchTop - 8) return 'crouch';

      const movementTop = bottom - CONTROL_SIZE;
      if (y >= movementTop - 8 && x >= 4 && x <= 12 + CONTROL_SIZE + 8) return 'left';
      const rightLeft = 12 + CONTROL_SIZE + 9;
      if (y >= movementTop - 8 && x >= rightLeft - 8 && x <= rightLeft + CONTROL_SIZE + 8) return 'right';
      return null;
    };

    const previous = nativeTouchControlsRef.current;
    const next = new Map<number, ControlKey>();
    for (const touch of touches) {
      const key = keyAtPoint(touch.locationX, touch.locationY);
      if (key) next.set(touch.identifier, key);
    }

    const keys: ControlKey[] = ['left', 'right', 'crouch', 'jump'];
    for (const key of keys) {
      const wasHeld = Array.from(previous.values()).includes(key);
      const isHeld = Array.from(next.values()).includes(key);
      if (!wasHeld && isHeld) pressControl(key);
      if (wasHeld && !isHeld) releaseControl(key);
    }
    setNativeHeld({
      left: Array.from(next.values()).includes('left'),
      right: Array.from(next.values()).includes('right'),
      jump: Array.from(next.values()).includes('jump'),
      crouch: Array.from(next.values()).includes('crouch'),
    });
    nativeTouchControlsRef.current = next;
  }, [pressControl, releaseControl, sceneSize.height, sceneSize.width]);

  const runAccessibilityControl = useCallback((key: ControlKey) => {
    pressControl(key);
    setNativeHeld((current) => ({ ...current, [key]: true }));
    setTimeout(() => {
      releaseControl(key);
      setNativeHeld((current) => ({ ...current, [key]: false }));
    }, 220);
  }, [pressControl, releaseControl]);

  useEffect(() => () => {
    nativeTouchControlsRef.current.clear();
    controlsRef.current.left = false;
    controlsRef.current.right = false;
    controlsRef.current.jump = false;
    controlsRef.current.crouch = false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const keyToControl = (key: string): ControlKey | null => {
      if (key === 'ArrowLeft' || key.toLowerCase() === 'a') return 'left';
      if (key === 'ArrowRight' || key.toLowerCase() === 'd') return 'right';
      if (key === 'ArrowDown' || key.toLowerCase() === 's') return 'crouch';
      if (key === 'ArrowUp' || key === ' ' || key.toLowerCase() === 'w') return 'jump';
      return null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const control = keyToControl(event.key);
      if (!control) return;
      event.preventDefault();
      if (!controlsRef.current[control]) pressControl(control);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const control = keyToControl(event.key);
      if (!control) return;
      event.preventDefault();
      releaseControl(control);
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [pressControl, releaseControl]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const loop = (time: number) => {
      if (phaseRef.current !== 'playing' || finishRef.current) return;
      const nextWorld = worldRef.current;
      const player = nextWorld.player;
      const previousX = player.x;
      const previousY = player.y;
      const controls = controlsRef.current;
      const dt = lastFrameAtRef.current === 0
        ? 1 / 60
        : Math.min(0.032, Math.max(0.001, (time - lastFrameAtRef.current) / 1000));
      lastFrameAtRef.current = time;
      nextWorld.elapsed += dt;
      const platforms = getPlatformsAtTime(nextWorld.elapsed);
      const currentPlayerHeight = getPlayerHeight(player);
      // 左右は押している間だけ有効。ジャンプ単独で横移動は発生させない。
      const direction = ((controls.right ? 1 : 0) - (controls.left ? 1 : 0));
      const targetSpeed = direction * (controls.crouch ? MAX_CROUCH_SPEED : MAX_RUN_SPEED);
      const acceleration = player.grounded ? 12 : 7;
      player.vx += (targetSpeed - player.vx) * Math.min(1, acceleration * dt);
      if (direction === 0) {
        // 空中では少しだけ慣性を残し、ジャンプボタンとの同時操作が
        // 一瞬外れても、走りながらのジャンプを成立させる。
        player.vx *= Math.pow(player.grounded ? 0.002 : 0.18, dt);
      }
      player.crouching = controls.crouch && player.grounded;

      const jumpPressed = controls.jumpQueued || (controls.jump && !controls.jumpWasDown);
      controls.jumpQueued = false;
      controls.jumpWasDown = controls.jump;
      if (jumpPressed) {
        player.jumpBuffer = 0.18;
      } else {
        player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
      }
      if (player.jumpBuffer > 0 && (player.grounded || player.coyoteTime < 0.2)) {
        player.vy = JUMP_POWER;
        player.grounded = false;
        player.coyoteTime = 0.2;
        player.jumpBuffer = 0;
        player.jumpTime = 0;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      const nextX = resolveHorizontalWalls(previousX, player.x + player.vx * dt, player, platforms);
      player.x = nextX;

      if (!player.grounded) {
        player.coyoteTime += dt;
        player.jumpTime += dt;
        const lowGravity = controls.jump && player.jumpTime < 0.22;
        player.vy -= (lowGravity ? 920 : GRAVITY) * dt;
        player.y += player.vy * dt;
        if (player.vy <= 0) {
          const landing = platforms
            .filter((platform) =>
              overlaps(player.x + 7, PLAYER_WIDTH - 14, platform.x, platform.width)
              && previousY >= platform.y - 3
              && player.y <= platform.y + 4,
            )
            .sort((a, b) => b.y - a.y)[0];
          if (landing) {
            player.y = landing.y;
            player.vy = 0;
            player.grounded = true;
            player.coyoteTime = 0;
          }
        } else {
          const ceiling = platforms.find((platform) =>
            overlaps(player.x + 7, PLAYER_WIDTH - 14, platform.x, platform.width)
            && previousY + currentPlayerHeight <= platform.y
            && player.y + currentPlayerHeight >= platform.y,
          );
          if (ceiling) {
            player.y = ceiling.y - currentPlayerHeight;
            player.vy = 0;
          }
        }
      } else {
        const support = getSupportPlatform(player, platforms);
        if (support) {
          player.y = support.y;
        } else {
          player.grounded = false;
          player.coyoteTime = 0;
        }
      }

      nextWorld.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        enemy.x += enemy.direction * enemy.speed * dt;
        if (enemy.x <= enemy.minX) {
          enemy.x = enemy.minX;
          enemy.direction = 1;
        }
        if (enemy.x + enemy.width >= enemy.maxX) {
          enemy.x = enemy.maxX - enemy.width;
          enemy.direction = -1;
        }
      });

      const playerBoxHeight = getPlayerHeight(player);
      const playerCollision = getPlayerCollisionBox(player);
      const obstacleHit = OBSTACLES.find((obstacle) => {
        const obstacleCollision = getObstacleCollisionBox(obstacle);
        return overlaps(playerCollision.x, playerCollision.width, obstacleCollision.x, obstacleCollision.width)
          && overlaps(playerCollision.y, playerCollision.height, obstacleCollision.y, obstacleCollision.height);
      });
      if (obstacleHit && player.invincibleUntil < nextWorld.elapsed) {
        player.hp -= 1;
        player.invincibleUntil = nextWorld.elapsed + 1.15;
        player.vx = player.x < obstacleHit.x ? -150 : 150;
        player.vy = 280;
        player.grounded = false;
        addEffect(nextWorld, { x: player.x, y: player.y + playerBoxHeight / 2, kind: 'damage', color: colors.destructive });
      }

      nextWorld.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        const enemyCollision = getEnemyCollisionBox(enemy);
        if (!overlaps(playerCollision.x, playerCollision.width, enemyCollision.x, enemyCollision.width)
          || !overlaps(playerCollision.y, playerCollision.height, enemyCollision.y, enemyCollision.height)) return;
        const enemyTop = enemyCollision.y + enemyCollision.height;
        const stomping = player.vy < 0 && previousY >= enemyTop - 5 && player.y <= enemyTop + 7;
        if (stomping) {
          enemy.alive = false;
          enemy.defeatedUntil = nextWorld.elapsed + 0.45;
          player.y = enemyTop;
          player.vy = JUMP_POWER * 0.55;
          player.grounded = false;
          player.score += 250;
          addEffect(nextWorld, { x: enemy.x + enemy.width / 2, y: enemyTop + 16, kind: 'stomp', color: colors.accent });
          playSound(itemSoundRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else if (player.invincibleUntil < nextWorld.elapsed) {
          player.hp -= 1;
          player.invincibleUntil = nextWorld.elapsed + 1.15;
          player.vx = player.x < enemy.x ? -180 : 180;
          player.vy = 300;
          player.grounded = false;
          addEffect(nextWorld, { x: player.x, y: player.y + playerBoxHeight / 2, kind: 'damage', color: colors.destructive });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
      });

      nextWorld.items.forEach((item) => {
        if (item.collected) return;
        const itemSize = 28;
        if (!overlaps(playerCollision.x, playerCollision.width, item.x - itemSize / 2, itemSize)) return;
        if (!overlaps(playerCollision.y, playerCollision.height, item.y - itemSize / 2, itemSize)) return;
        item.collected = true;
        player.collected += 1;
        player.score += item.kind === 'heart' ? 50 : item.kind === 'light' ? 150 : 100;
        if (item.kind === 'heart') player.hp = Math.min(MAX_HP, player.hp + 1);
        addEffect(nextWorld, { x: item.x, y: item.y, kind: 'collect', color: item.kind === 'heart' ? colors.destructive : colors.accent });
        playSound(itemSoundRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      });

      const newEffectIds = nextWorld.effects
        .map((effect) => effect.id)
        .filter((id) => !knownEffectIdsRef.current.has(id));
      if (newEffectIds.length > 0) {
        newEffectIds.forEach((id) => knownEffectIdsRef.current.add(id));
        setLastEffectIds((previous) => [...previous, ...newEffectIds].slice(-12));
      }

      if (player.hp <= 0 || player.y < FALL_LIMIT) {
        phaseRef.current = 'failed';
        setPhase('failed');
        setWorld(snapshotWorld(nextWorld));
        return;
      }

      if (player.x + PLAYER_WIDTH >= GOAL_X) {
        finishRef.current = true;
        phaseRef.current = 'complete';
        setPhase('complete');
        playSound(finishSoundRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onFinish({
          collected: player.collected,
          totalSparks: ITEMS.length,
          duration: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
          score: player.score,
        });
        setWorld(snapshotWorld(nextWorld));
        return;
      }

      worldRef.current = nextWorld;
      if (time - lastRenderAtRef.current >= RENDER_FRAME_MS) {
        lastRenderAtRef.current = time;
        setWorld(snapshotWorld(nextWorld));
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [colors.accent, colors.destructive, onFinish, phase, playSound]);

  const progressPercent = Math.min(100, Math.round((world.player.x / GOAL_X) * 100));
  const visiblePlatforms = currentPlatforms.filter((platform) =>
    platform.x - cameraX < sceneSize.width + 100 && platform.x + platform.width - cameraX > -100,
  );
  const visibleObstacles = OBSTACLES.filter((obstacle) =>
    obstacle.x - cameraX < sceneSize.width + 100 && obstacle.x + obstacle.width - cameraX > -100,
  );
  const visibleEnemies = world.enemies.filter((enemy) =>
    enemy.x - cameraX < sceneSize.width + 100 && enemy.x + enemy.width - cameraX > -100,
  );
  const visibleEffects = world.effects.filter((effect) => lastEffectIds.includes(effect.id));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <View style={styles.titleCopy}>
          <Text style={[styles.gameTitle, { color: colors.foreground }]}>STARLIGHT RUN</Text>
          <Text style={[styles.gameSubtitle, { color: colors.mutedForeground }]}>自分のペースで星の道を探検</Text>
        </View>
        <View style={styles.statusCluster}>
          <View style={styles.statusPill}>
            <Icon name="award" size={15} color={colors.secondary} />
            <Text style={styles.statusText}>{world.player.score}</Text>
          </View>
          <View style={styles.statusPill}>
            <Icon name="star" size={16} color={colors.accent} />
            <Text style={styles.statusText}>{world.player.collected}/{ITEMS.length}</Text>
          </View>
          <View style={styles.statusPill}>
            <Icon name="heart" size={15} color={colors.destructive} />
            <Text style={styles.statusText}>{world.player.hp}</Text>
          </View>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.accent }]} />
      </View>

      <View
        style={styles.sceneFrame}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) setSceneSize({ width, height });
        }}
      >
        <LinearGradient
          colors={['#0E082A', '#21134D', '#3B235C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.skyDecor}>
          <View style={styles.planet} />
          {SKY_STARS.map((star) => (
            <Text key={`${star.x}-${star.y}`} style={[styles.skyStar, { left: `${star.x}%`, top: `${star.y}%`, fontSize: star.size * 3 }]}>·</Text>
          ))}
        </View>

        {visiblePlatforms.map((platform) => (
          <View
            key={platform.id}
            pointerEvents="none"
            style={[
              styles.platform,
              {
                left: platform.x - cameraX,
                bottom: sceneSize.height - groundY + platform.y - PLATFORM_THICKNESS,
                width: platform.width,
                backgroundColor: platform.kind === 'moving' ? colors.secondary : platform.kind === 'high' ? colors.primary : '#7259A8',
              },
            ]}
          >
            <View style={[styles.platformTop, { backgroundColor: platform.kind === 'moving' ? colors.accent : colors.tint }]} />
            {platform.kind === 'moving' && <Icon name="star" size={15} color={colors.accent} style={styles.movingIcon} />}
          </View>
        ))}

        {visibleObstacles.map((obstacle) => (
          <View
            key={obstacle.id}
            pointerEvents="none"
            style={[
              styles.obstacle,
              {
                left: obstacle.x - cameraX,
                bottom: sceneSize.height - groundY + obstacle.y,
                width: obstacle.width,
                height: obstacle.height,
                borderColor: obstacle.kind === 'thorn' ? colors.destructive : colors.secondary,
              },
            ]}
          >
            <Icon
              name={obstacle.kind === 'thorn' ? 'alert-triangle' : 'octagon'}
              size={25}
              color={obstacle.kind === 'thorn' ? colors.destructive : colors.secondary}
            />
          </View>
        ))}

        {world.items.map((item) => (
          <ItemSprite key={item.id} item={item} cameraX={cameraX} groundY={groundY} sceneHeight={sceneSize.height} elapsed={world.elapsed} colors={colors} />
        ))}
        {visibleEnemies.map((enemy) => (
          <EnemySprite key={enemy.id} enemy={enemy} cameraX={cameraX} groundY={groundY} sceneHeight={sceneSize.height} elapsed={world.elapsed} colors={colors} />
        ))}

        {GOAL_X - cameraX < sceneSize.width + 120 && (
          <View pointerEvents="none" style={[styles.goalGate, { left: GOAL_X - cameraX - 14, bottom: sceneSize.height - groundY }]}>
            <View style={[styles.goalPillar, { backgroundColor: colors.secondary }]} />
            <View style={[styles.goalArch, { borderColor: colors.accent }]}>
              <Icon name="star" size={25} color={colors.accent} />
            </View>
            <View style={[styles.goalPillar, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.goalLabel, { color: colors.accent }]}>GOAL</Text>
          </View>
        )}

        <View
          pointerEvents="none"
          style={[
            styles.player,
            {
              left: world.player.x - cameraX,
              bottom: sceneSize.height - groundY + world.player.y,
              width: PLAYER_WIDTH,
              height: playerHeight,
              opacity: world.player.invincibleUntil > world.elapsed && Math.floor(world.elapsed * 12) % 2 === 0 ? 0.35 : 1,
              transform: [{ rotate: `${Math.max(-8, Math.min(8, world.player.vy / 80))}deg` }],
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <StaticMascot
              stage={stage}
              mood={world.player.hp === 1 ? 'tired' : 'happy'}
              size={world.player.crouching ? 45 : 56}
            />
          ) : (
            <Mascot
              stage={stage}
              mood={world.player.hp === 1 ? 'tired' : 'happy'}
              size={world.player.crouching ? 45 : 56}
              preferStatic
            />
          )}
          {world.player.grounded && <View style={styles.playerShadow} />}
        </View>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {visibleEffects.map((effect) => <EffectBurst key={effect.id} effect={effect} cameraX={cameraX} groundY={groundY} sceneHeight={sceneSize.height} />)}
        </View>

        {phase === 'playing' && (
          <View
            pointerEvents={Platform.OS === 'web' ? 'box-none' : 'box-only'}
            style={styles.controlsLayer}
            accessible={Platform.OS !== 'web'}
            accessibilityRole={Platform.OS !== 'web' ? 'adjustable' : undefined}
            accessibilityLabel={Platform.OS !== 'web' ? 'STARLIGHT RUN 操作' : undefined}
            accessibilityHint={Platform.OS !== 'web' ? '上下スワイプで操作を選び、ダブルタップで実行します' : undefined}
            accessibilityActions={Platform.OS !== 'web' ? [
              { name: 'moveLeft', label: '左に移動' },
              { name: 'moveRight', label: '右に移動' },
              { name: 'jump', label: 'ジャンプ' },
              { name: 'crouch', label: 'しゃがむ' },
            ] : undefined}
            onAccessibilityAction={(event) => {
              const action = event.nativeEvent.actionName;
              if (action === 'moveLeft') runAccessibilityControl('left');
              if (action === 'moveRight') runAccessibilityControl('right');
              if (action === 'jump') runAccessibilityControl('jump');
              if (action === 'crouch') runAccessibilityControl('crouch');
            }}
            onStartShouldSetResponder={() => Platform.OS !== 'web'}
            onMoveShouldSetResponder={() => Platform.OS !== 'web'}
            onResponderStart={(event) => syncNativeTouches(event.nativeEvent.touches)}
            onResponderMove={(event) => syncNativeTouches(event.nativeEvent.touches)}
            onResponderEnd={(event) => syncNativeTouches(event.nativeEvent.touches)}
            onResponderRelease={() => syncNativeTouches([])}
            onResponderTerminate={() => syncNativeTouches([])}
          >
            <View style={styles.movementControls}>
              <Pressable
                pointerEvents={Platform.OS === 'web' ? 'auto' : 'none'}
                testID="skyline-run-left"
                accessibilityLabel="左に移動"
                style={({ pressed }) => [styles.controlButton, (pressed || nativeHeld.left) && styles.controlPressed]}
                onPointerDown={() => directPress('left')}
                onPointerUp={() => directRelease('left')}
                onPointerCancel={() => directRelease('left')}
                onPointerLeave={() => directRelease('left')}
              >
                <Icon name="chevron-left" size={30} color="#FFF" />
                <Text style={styles.controlLabel}>左</Text>
              </Pressable>
              <Pressable
                pointerEvents={Platform.OS === 'web' ? 'auto' : 'none'}
                testID="skyline-run-right"
                accessibilityLabel="右に移動"
                style={({ pressed }) => [styles.controlButton, (pressed || nativeHeld.right) && styles.controlPressed]}
                onPointerDown={() => directPress('right')}
                onPointerUp={() => directRelease('right')}
                onPointerCancel={() => directRelease('right')}
                onPointerLeave={() => directRelease('right')}
              >
                <Icon name="chevron-right" size={30} color="#FFF" />
                <Text style={styles.controlLabel}>右</Text>
              </Pressable>
            </View>
            <View style={styles.actionControls}>
              <Pressable
                pointerEvents={Platform.OS === 'web' ? 'auto' : 'none'}
                testID="skyline-run-crouch"
                accessibilityLabel="しゃがむ"
                style={({ pressed }) => [styles.smallControlButton, (pressed || nativeHeld.crouch) && styles.controlPressed]}
                onPointerDown={() => directPress('crouch')}
                onPointerUp={() => directRelease('crouch')}
                onPointerCancel={() => directRelease('crouch')}
                onPointerLeave={() => directRelease('crouch')}
              >
                <Icon name="chevrons-down" size={20} color="#FFF" />
                <Text style={styles.smallControlLabel}>しゃがむ</Text>
              </Pressable>
              <Pressable
                pointerEvents={Platform.OS === 'web' ? 'auto' : 'none'}
                testID="skyline-run-jump"
                accessibilityLabel="ジャンプ"
                style={({ pressed }) => [styles.jumpButton, (pressed || nativeHeld.jump) && styles.jumpPressed]}
                onPointerDown={() => directPress('jump')}
                onPointerUp={() => directRelease('jump')}
                onPointerCancel={() => directRelease('jump')}
                onPointerLeave={() => directRelease('jump')}
              >
                <Icon name="arrow-up" size={33} color="#FFF" />
                <Text style={styles.jumpLabel}>ジャンプ</Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === 'intro' && (
          <View style={styles.overlayCard}>
            <View style={styles.overlayIcon}><Icon name="globe" size={35} color={colors.accent} /></View>
            <Text style={styles.overlayTitle}>星の道を探検しよう</Text>
            <Text style={styles.overlayDescription}>自分で歩いて、ジャンプして、仲間とゴールを目指そう。</Text>
            <View style={styles.instructionRow}>
              <View style={styles.instruction}><Text style={styles.instructionKey}>左・右</Text><Text style={styles.instructionValue}>歩く</Text></View>
              <View style={styles.instruction}><Text style={styles.instructionKey}>ジャンプ</Text><Text style={styles.instructionValue}>穴・敵・高所</Text></View>
            </View>
            <Pressable testID="skyline-run-start" style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={resetGame}>
              <Text style={styles.primaryButtonText}>はじめる</Text>
              <Icon name="arrow-right" size={18} color="#FFF" />
            </Pressable>
          </View>
        )}

        {phase === 'failed' && (
          <View style={styles.overlayCard}>
            <View style={styles.overlayIcon}><Icon name="moon" size={35} color={colors.secondary} /></View>
            <Text style={styles.overlayTitle}>ここでひとやすみ</Text>
            <Text style={styles.overlayDescription}>だいじょうぶ。星の道は、何度でも挑戦できるよ。</Text>
            <Pressable testID="skyline-run-retry" style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={resetGame}>
              <Text style={styles.primaryButtonText}>もう一度</Text>
              <Icon name="refresh-cw" size={18} color="#FFF" />
            </Pressable>
            <Pressable testID="skyline-run-quit-failed" style={styles.secondaryButton} onPress={onQuit}>
              <Text style={styles.secondaryButtonText}>今日はここまで</Text>
            </Pressable>
          </View>
        )}

        {phase === 'complete' && (
          <View style={styles.overlayCard}>
            <View style={styles.overlayIcon}><Icon name="star" size={38} color={colors.accent} /></View>
            <Text style={[styles.completeTitle, { color: colors.accent }]}>今日もよくできました！</Text>
            <Text style={styles.overlayDescription}>自分で星の道を進んで、最後までたどり着いたね。</Text>
            <Text style={styles.completeMeta}>
              {world.player.collected}個あつめた　SCORE {world.player.score}
            </Text>
            <Pressable testID="skyline-run-quit-complete" style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onQuit}>
              <Text style={styles.primaryButtonText}>とじる</Text>
            </Pressable>
          </View>
        )}
      </View>

      {phase === 'playing' ? (
        <Text style={[styles.footerHint, { color: colors.mutedForeground }]}>左・右を押しながらジャンプできるよ　Web: 矢印キー / Space</Text>
      ) : (
        <Text style={[styles.footerHint, { color: colors.mutedForeground }]}>あせらなくて大丈夫。自分のペースで。</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 10, gap: 8 },
  topBar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleCopy: { flex: 1 },
  gameTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  gameSubtitle: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusCluster: { flexDirection: 'row', gap: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  statusText: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold' },
  progressTrack: { height: 5, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.13)' },
  progressFill: { height: '100%', borderRadius: 4 },
  sceneFrame: { flex: 1, minHeight: 360, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  skyDecor: { ...StyleSheet.absoluteFillObject },
  planet: { position: 'absolute', right: -34, top: 27, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(176,149,255,0.13)', borderWidth: 1, borderColor: 'rgba(220,206,255,0.22)' },
  skyStar: { position: 'absolute', color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_700Bold' },
  platform: { position: 'absolute', height: PLATFORM_THICKNESS, borderRadius: 10, borderTopWidth: 3, borderTopColor: 'rgba(255,255,255,0.65)', shadowColor: '#A88DFF', shadowOpacity: 0.45, shadowRadius: 9, shadowOffset: { width: 0, height: -2 } },
  platformTop: { position: 'absolute', left: 12, right: 12, top: -8, height: 8, borderRadius: 8, opacity: 0.55 },
  movingIcon: { position: 'absolute', right: 10, top: -18 },
  obstacle: { position: 'absolute', borderWidth: 2, borderRadius: 14, backgroundColor: 'rgba(13,6,42,0.78)', alignItems: 'center', justifyContent: 'center' },
  enemy: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  enemyBody: { width: '100%', height: '84%', borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  enemyAura: { position: 'absolute', bottom: -3, width: '72%', height: 8, borderRadius: 50, opacity: 0.4 },
  enemyEyeRow: { flexDirection: 'row', gap: 11, marginTop: 3 },
  enemyEye: { width: 7, height: 9, borderRadius: 5, backgroundColor: '#FFF' },
  enemyMouth: { width: 14, height: 4, borderRadius: 4, marginTop: 5 },
  item: { position: 'absolute', width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  itemShine: { position: 'absolute', top: -7, left: 3, color: '#FFF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  player: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  playerShadow: { position: 'absolute', bottom: -2, width: 38, height: 7, borderRadius: 50, backgroundColor: 'rgba(6,2,24,0.48)' },
  effect: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  goalGate: { position: 'absolute', width: 84, height: 122, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  goalPillar: { width: 11, height: 98, borderRadius: 8, shadowOpacity: 0.7, shadowRadius: 10 },
  goalArch: { position: 'absolute', left: 9, bottom: 41, width: 66, height: 66, borderRadius: 34, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  goalLabel: { position: 'absolute', top: -5, left: 17, fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  controlsLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 12, flexDirection: 'row', alignItems: 'flex-end' },
  movementControls: { flexDirection: 'row', gap: 9 },
  actionControls: { flex: 1, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 9 },
  controlButton: { width: CONTROL_SIZE, height: CONTROL_SIZE, borderRadius: 19, backgroundColor: 'rgba(17,9,52,0.68)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  controlPressed: { backgroundColor: 'rgba(155,114,203,0.82)', transform: [{ scale: 0.95 }] },
  controlLabel: { position: 'absolute', bottom: 3, color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: 'Inter_700Bold' },
  smallControlButton: { width: 72, height: 48, borderRadius: 16, backgroundColor: 'rgba(17,9,52,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', alignItems: 'center', justifyContent: 'center' },
  smallControlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  jumpButton: { width: 98, height: 98, borderRadius: 49, backgroundColor: 'rgba(155,114,203,0.78)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', shadowColor: '#B79CE4', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: -2 } },
  jumpPressed: { backgroundColor: 'rgba(208,154,220,0.92)', transform: [{ scale: 0.94 }] },
  jumpLabel: { color: '#FFF', fontSize: 11, fontFamily: 'Inter_700Bold', marginTop: -2 },
  overlayCard: { position: 'absolute', left: 18, right: 18, top: '50%', transform: [{ translateY: -126 }], padding: 20, borderRadius: 24, backgroundColor: 'rgba(11,5,34,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  overlayIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  overlayTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  overlayDescription: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19, marginTop: 7 },
  instructionRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 15 },
  instruction: { minWidth: 105, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.09)', alignItems: 'center' },
  instructionKey: { color: '#FFD86B', fontSize: 12, fontFamily: 'Inter_700Bold' },
  instructionValue: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  primaryButton: { minWidth: 170, paddingHorizontal: 19, paddingVertical: 13, borderRadius: 17, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
  secondaryButton: { minWidth: 170, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 17, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.17)', marginTop: 9 },
  secondaryButtonText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  completeTitle: { fontSize: 21, lineHeight: 29, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  completeMeta: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold', marginTop: 14 },
  footerHint: { textAlign: 'center', fontSize: 10, fontFamily: 'Inter_400Regular', minHeight: 15 },
});