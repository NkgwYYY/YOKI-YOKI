type StepResult = 'ready' | 'failed' | 'timeout' | 'cancelled';

/** Neither a lost animation callback nor a suspended frame may lock travel. */
export function settleSceneStep(
  task: () => Promise<unknown>,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<StepResult> {
  if (signal.aborted) return Promise.resolve('cancelled');
  return new Promise(resolve => {
    let settled = false;
    const finish = (result: StepResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      resolve(result);
    };
    const cancel = () => finish('cancelled');
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    signal.addEventListener('abort', cancel, { once: true });
    try {
      Promise.resolve(task()).then(() => finish('ready'), () => finish('failed'));
    } catch {
      finish('failed');
    }
  });
}

type SceneSteps = {
  prepare: () => Promise<unknown>;
  paint: () => Promise<unknown>;
  close: () => Promise<unknown>;
  open: () => Promise<unknown>;
  cover: () => void;
  commit: () => void;
  onError: () => void;
};

export async function performSceneTransition(steps: SceneSteps, signal: AbortSignal) {
  // Preparation and closing run together, but only a decoded image may be committed.
  const ready = settleSceneStep(steps.prepare, 6000, signal);
  try {
    await settleSceneStep(steps.paint, 120, signal);
    if (signal.aborted) return;
    await settleSceneStep(steps.close, 500, signal);
    if (signal.aborted) return;
    steps.cover(); // Snap fully closed even if the animation callback was lost.
    const result = await ready;
    if (signal.aborted) return;
    if (result !== 'ready') {
      steps.onError();
      return;
    }
    steps.commit();
    await settleSceneStep(steps.paint, 120, signal);
  } catch {
    if (!signal.aborted) steps.onError();
  } finally {
    if (!signal.aborted) await settleSceneStep(steps.open, 600, signal);
  }
}
