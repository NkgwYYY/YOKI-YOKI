/** Gravity acts after rotation, so the soft base stays against the ground.
 * A quadratic shoulder reaches a level contact patch with a zero slope.
 * Only the lower body compresses; the round crown keeps its full volume. */
export function softContactHeight(y, support) {
    'worklet';
    const start = support * .57, range = support * .34;
    if (y <= start)
        return y;
    const t = Math.min(1, (y - start) / range);
    return start + range * (t - .5 * t * t);
}
export function softContactSpread(y, support) {
    'worklet';
    const t = Math.max(0, Math.min(1, (y / support - .15) / .76));
    return 1 + .10 * t * t * (3 - 2 * t);
}
