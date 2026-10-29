/** Absorb floating-point conversion noise, not meaningful input latency. */
const TIMING_EPSILON_MS = 0.000001;

export function withinTimingWindow(deltaMs: number, windowMs: number): boolean {
  return Number.isFinite(deltaMs) && Math.abs(deltaMs) <= windowMs + TIMING_EPSILON_MS;
}

export function noteHasExpired(noteTime: number, time: number, windowMs: number): boolean {
  const deltaMs = (time - noteTime) * 1000;
  return deltaMs > 0 && !withinTimingWindow(deltaMs, windowMs);
}
