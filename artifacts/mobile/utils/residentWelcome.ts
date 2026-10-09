/** An app visit, independent of room sheets, map changes and navigation focus. */
export type WelcomeVisit = {foreground: boolean | null; awayAt: number; serial: number; pending: number};
export const WELCOME_RETURN_MS = 30_000;
export function nextWelcomeVisit(state: WelcomeVisit, foreground: boolean, now: number): WelcomeVisit {
  if (state.foreground === foreground) return state;
  if (!foreground) return {...state, foreground, awayAt: now};
  const due = state.serial === 0 || now - state.awayAt >= WELCOME_RETURN_MS;
  return {...state, foreground, serial: state.serial + (due ? 1 : 0), pending: due ? state.serial + 1 : state.pending};
}
export const WELCOME_DURATION = 5.6;
/** Ground-relative figure eight, three hops and a final happy twirl. */
export function welcomeSample(seconds: number) {
  'worklet';
  const t = Math.max(0, Math.min(WELCOME_DURATION, seconds));
  let dx = 0, dy = 0, jump = 0, squash = 0, lean = 0, turn = 0;
  if (t < .4) {
    squash = .65 * Math.sin(Math.PI * t / .4);
  } else if (t < 2.05) {
    const h = (t - .4) / .55, q = h % 1;
    jump = Math.sin(Math.PI * q) * [ .58, .8, .66 ][Math.min(2, Math.floor(h))];
    squash = .65 * Math.max(0, 1 - Math.abs(q - .97) / .10);
    lean = 7 * Math.sin(h * Math.PI);
  } else if (t < 4.55) {
    const q = (t - 2.05) / 2.5, angle = q * Math.PI * 2;
    const envelope = Math.sin(Math.PI * q);
    dx = .088 * Math.sin(angle * 2) * envelope;
    dy = .027 * (1 - Math.cos(angle)) * envelope;
    jump = .15 * Math.abs(Math.sin(q * Math.PI * 10)) * envelope;
    lean = 13 * Math.sin(angle * 2) * envelope;
    turn = .65 * Math.cos(angle * 2) * envelope;
  } else if (t < 5.25) {
    const q = (t - 4.55) / .7;
    jump = .78 * Math.sin(Math.PI * q);
    turn = Math.PI * 2 * (q * q * (3 - 2 * q));
  } else if (t < WELCOME_DURATION) {
    squash = .72 * Math.sin(Math.PI * (t - 5.25) / .35);
  }
  return {dx, dy, jump, squash, lean, turn, done: t >= WELCOME_DURATION};
}
