export type VoiceMoment = 'interaction' | 'event' | 'preview';
export const TOUCH_VOICE_GAP_MS = 10_000;
export const EVENT_VOICE_GAP_MS = 1_800;
export const TOUCH_VOICE_CHANCE = 1 / 3;

/** A silent touch must not stop a voice, or postpone the next meaningful event. */
export function allowCharacterVoice(lastAt: number, now: number, moment: VoiceMoment, random: number): boolean {
  if (moment === 'preview') return true;
  const elapsed = now - lastAt;
  if (moment === 'interaction') return elapsed >= TOUCH_VOICE_GAP_MS && random < TOUCH_VOICE_CHANCE;
  return elapsed >= EVENT_VOICE_GAP_MS;
}
