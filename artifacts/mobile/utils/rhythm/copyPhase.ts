export interface CopyTiming {
  presentStart: number;
  respondStart: number;
  respondEnd: number;
}

/** Use the audio clock for both presentation and input, never a stale frame. */
export function getCopyPhase(runs: readonly CopyTiming[], time: number): {
  phase: 'watch' | 'copy' | 'wait'; index: number;
} {
  let index = 0;
  if (!Number.isFinite(time)) return { phase: 'wait', index };
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (time >= run.presentStart - 0.05 && time < run.respondStart) return { phase: 'watch', index: i };
    if (time >= run.respondStart && time < run.respondEnd + 0.35) return { phase: 'copy', index: i };
    if (time < run.presentStart) return { phase: 'wait', index: i };
    index = i;
  }
  return { phase: 'wait', index };
}
