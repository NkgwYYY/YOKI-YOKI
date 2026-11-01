/** A soft, footless push-and-hop cycle, driven by distance rather than a clock. */
export function residentStridePhase(phase: number, pixels: number, bodySize: number): number {
  'worklet';
  if (!Number.isFinite(pixels) || !Number.isFinite(bodySize) || bodySize <= 0 || pixels <= 0 || pixels > bodySize * .5) return phase;
  return (phase + pixels / (bodySize * .62) * Math.PI * 2) % (Math.PI * 2);
}

export function residentLocomotion(phase: number, intensity: number, directionX = 0) {
  'worklet';
  const amount = Math.max(0, Math.min(1, intensity));
  const wave = Math.sin(phase);
  const push = Math.max(0, wave) * amount;
  const flight = Math.max(0, -wave) * amount;
  return {
    // Compress against the floor, release to the original silhouette, then land.
    // Never stretch the evolved characters taller than their authored shape.
    scaleX: 1 + push * .065 - flight * .015,
    scaleY: 1 - push * .09,
    lift: flight * .075,
    roll: Math.max(-1, Math.min(1, directionX)) * amount * 3.8 + wave * amount * 4.2,
    shadowScale: 1 + push * .055 - flight * .16,
    shadowOpacity: 1 - flight * .22,
  };
}
