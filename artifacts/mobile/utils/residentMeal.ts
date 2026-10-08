/** Presentation only. Feeding is already committed before this sequence starts. */
export const MEAL_DURATION = 6800;
export function mealSample(progress: number) {
  "worklet";
  const p = Math.max(0, Math.min(1, progress));
  const cycle = Math.max(0, Math.min(2, Math.floor((p - 0.1) / 0.21)));
  const local = Math.max(0, Math.min(1, (p - 0.1 - cycle * 0.21) / 0.21));
  const biting = p >= 0.1 && p < 0.73;
  const reach = biting ? Math.sin(Math.min(1, local / 0.52) * Math.PI) : 0;
  const open =
    biting && local > 0.12 && local < 0.48
      ? Math.sin(((local - 0.12) / 0.36) * Math.PI)
      : 0;
  const chew =
    biting && local >= 0.5
      ? Math.abs(Math.sin((local - 0.5) * Math.PI * 8))
      : 0;
  const taken = p < 0.1 ? 0 : p >= 0.73 ? 3 : cycle + (local >= 0.45 ? 1 : 0);
  const swallow =
    p >= 0.73 && p < 0.85 ? Math.sin(((p - 0.73) / 0.12) * Math.PI) : 0;
  return {
    reach,
    open,
    chew,
    swallow,
    taken,
    morsel: biting && local > 0.15 && local < 0.45 ? 1 : 0,
    flight: Math.max(0, Math.min(1, (local - 0.15) / 0.3)),
    happy: p >= 0.85,
  };
}
