import { prepareWorldArt } from './worldArt';
import { getWorldTime } from './worldTime';

/** Share the scene cache: only the HOME backdrop visible now blocks startup.
 * Other maps, portraits and old 2D expressions load when they are needed. */
export function preloadStartupImages(now = new Date()): Promise<void> {
  return prepareWorldArt('home', getWorldTime(now).period === 'night');
}
