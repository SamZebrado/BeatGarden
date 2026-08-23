import { loadSettings } from '../settings/settings';

export const RHYTHM_REVEAL_DURATION_MS = 220;

export function shouldReduceRhythmMotion(): boolean {
  return loadSettings().reducedMotion
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function animateRhythmReveal(
  element: HTMLElement,
  keyframes: Keyframe[],
  reducedMotion = shouldReduceRhythmMotion(),
): Animation | null {
  if (reducedMotion || typeof element.animate !== 'function') return null;
  const animation = element.animate(keyframes, {
    duration: RHYTHM_REVEAL_DURATION_MS,
    easing: 'cubic-bezier(.2,.8,.2,1)',
  });
  element.addEventListener('pointerdown', () => animation.finish(), { once: true, capture: true });
  return animation;
}
