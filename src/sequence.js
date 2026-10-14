export const DURATIONS = [12, 24, 22, 30, 22];
export const LENGTH = DURATIONS.reduce((a, b) => a + b, 0);
export const XR_HERO = { distance: 2.5, width: .65, height: 1.35 };
export function phaseAt(seconds) {
  let start = 0;
  for (let i = 0; i < DURATIONS.length; i++) {
    if (seconds < start + DURATIONS[i]) return { chapter: i + 1, elapsed: Math.max(0, seconds - start), done: false };
    start += DURATIONS[i];
  }
  return { chapter: 5, elapsed: DURATIONS[4], done: true };
}
// Edge detection: holding a pinch must never generate repeated actions.
export function pinchEdge(previous, distance) {
  const held = distance < (previous ? .045 : .025);
  return { held, released: previous && !held };
}
