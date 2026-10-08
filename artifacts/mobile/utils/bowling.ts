import type { FeedState } from "../contexts/AppContext";
import type { StorageEntry } from "./recoverableStorage";

export const BOWLING_KEY = "@yoki/bowling_v1";
const FEED_KEY = "@mentore/feed_state_v1";
export const POINTS_PER_PIN = 5;
export const BOWLING_DURATION = 3200;
export type BowlingInput = { aim: number; power: number };
export type PinPose = { x: number; y: number; rotation: number; down: boolean };
export type BowlingFrame = { x: number; y: number; pins: PinPose[] };
export type BowlingResult = {
  frames: BowlingFrame[];
  pins: number;
  earned: number;
};
export type BowlingReceipt = BowlingInput & {
  id: string;
  date: string;
  pins: number;
  earned: number;
};
export type BowlingState = { plays: Record<string, BowlingReceipt> };
export const EMPTY_BOWLING: BowlingState = { plays: {} };

export function validateBowlingInput(input: BowlingInput) {
  if (
    !input ||
    !Number.isFinite(input.aim) ||
    input.aim < -1 ||
    input.aim > 1 ||
    !Number.isFinite(input.power) ||
    input.power < 0.15 ||
    input.power > 1
  )
    throw new Error("投げ方を確認できません");
}
export function pinPositions() {
  return Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: row + 1 }, (_, col) => ({
      x: (col - row / 2) * 0.32,
      y: 8 + row * 0.29,
    })),
  ).flat();
}
/** Fixed-step collisions determine both the visible pin fall and the saved reward. */
export function simulateBowling(input: BowlingInput): BowlingResult {
  validateBowlingInput(input);
  const ball = {
    x: 0,
    y: 0.1,
    vx: input.aim * 1.15,
    vy: 4.4 + input.power * 3.3,
    radius: 0.195,
    mass: 4.6,
  };
  const pins = pinPositions().map((p) => ({
    ...p,
    vx: 0,
    vy: 0,
    radius: 0.115,
    mass: 1,
    down: false,
    rotation: 0,
  }));
  const frames: BowlingFrame[] = [];
  let gutter = false;
  const step = 1 / 60;
  const collide = (a: typeof ball, b: typeof ball) => {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      distance = Math.hypot(dx, dy),
      contact = a.radius + b.radius;
    if (distance >= contact || distance < 0.0001) return;
    const nx = dx / distance,
      ny = dy / distance;
    const speed = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (speed <= 0) return;
    const impulse = (1.7 * speed) / (1 / a.mass + 1 / b.mass);
    a.vx -= (impulse * nx) / a.mass;
    a.vy -= (impulse * ny) / a.mass;
    b.vx += (impulse * nx) / b.mass;
    b.vy += (impulse * ny) / b.mass;
    b.x += nx * (contact - distance) * 0.52;
    b.y += ny * (contact - distance) * 0.52;
  };
  for (let frame = 0; frame <= 192; frame++) {
    frames.push({
      x: ball.x,
      y: ball.y,
      pins: pins.map((p) => ({
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        down: p.down,
      })),
    });
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;
    if (Math.abs(ball.x) > 1.02) {
      gutter = true;
      ball.x = Math.sign(ball.x) * 1.07;
      ball.vx = 0;
    }
    if (!gutter) for (const pin of pins) collide(ball, pin);
    for (let i = 0; i < pins.length; i++)
      for (let j = i + 1; j < pins.length; j++) collide(pins[i], pins[j]);
    for (const pin of pins) {
      if (Math.hypot(pin.vx, pin.vy) > 0.38) pin.down = true;
      pin.x += pin.vx * step;
      pin.y += pin.vy * step;
      pin.vx *= 0.966;
      pin.vy *= 0.966;
      if (pin.down) pin.rotation = Math.min(86, pin.rotation + 7);
    }
  }
  const count = pins.filter((p) => p.down).length;
  return { frames, pins: count, earned: count * POINTS_PER_PIN };
}
export function readBowlingState(raw: unknown): BowlingState {
  if (raw == null) return { plays: {} };
  if (
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    !("plays" in raw) ||
    !raw.plays ||
    typeof raw.plays !== "object" ||
    Array.isArray(raw.plays)
  )
    throw new Error("ボウリングの記録を確認できません");
  const plays = raw.plays as Record<string, BowlingReceipt>;
  for (const [date, receipt] of Object.entries(plays)) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !receipt ||
      receipt.date !== date ||
      typeof receipt.id !== "string" ||
      !receipt.id ||
      !Number.isInteger(receipt.pins) ||
      receipt.pins < 0 ||
      receipt.pins > 10 ||
      receipt.earned !== receipt.pins * POINTS_PER_PIN
    )
      throw new Error("ボウリングの記録を確認できません");
    validateBowlingInput(receipt);
  }
  return { plays };
}
export function bowlingPlayedToday(state: BowlingState, today: string) {
  return Object.keys(state.plays).some((date) => date >= today);
}
/** Consume the daily throw and credit its result in one journalled, retryable write. */
export function prepareBowlingPlay(
  values: Record<string, string | null>,
  id: string,
  input: BowlingInput,
  today: string,
  defaultFeed: FeedState,
) {
  validateBowlingInput(input);
  if (!id || id.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(today))
    throw new Error("今日の挑戦を確認できません");
  const state = readBowlingState(
    values[BOWLING_KEY] ? JSON.parse(values[BOWLING_KEY]!) : null,
  );
  const feed: FeedState = values[FEED_KEY]
    ? JSON.parse(values[FEED_KEY]!)
    : defaultFeed;
  if (!feed || !Number.isFinite(feed.points) || feed.points < 0)
    throw new Error("ポイントを確認できません");
  const duplicate = Object.values(state.plays).find((play) => play.id === id);
  const previous = Object.entries(state.plays)
    .sort(([a], [b]) => b.localeCompare(a))
    .find(([date]) => date >= today)?.[1];
  if (duplicate || previous)
    return {
      entries: [] as StorageEntry[],
      result: {
        state,
        feed,
        receipt: duplicate || previous!,
        newlyGranted: false,
        accepted: !!duplicate,
      },
    };
  const result = simulateBowling(input);
  const receipt: BowlingReceipt = {
    ...input,
    id,
    date: today,
    pins: result.pins,
    earned: result.earned,
  };
  const next = {
    plays: Object.fromEntries(
      [...Object.entries(state.plays), [today, receipt]]
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .slice(-32),
    ),
  };
  const nextFeed = { ...feed, points: feed.points + result.earned };
  return {
    entries: [
      [BOWLING_KEY, JSON.stringify(next)],
      [FEED_KEY, JSON.stringify(nextFeed)],
    ] as StorageEntry[],
    result: {
      state: next,
      feed: nextFeed,
      receipt,
      newlyGranted: true,
      accepted: true,
    },
  };
}
