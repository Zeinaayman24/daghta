import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
/**
 * Motion tokens. Five durations, three curves, three springs; nothing in the app picks its own timing.
 * Every helper honours the system's reduced-motion setting: then transitions become a 120 ms crossfade and springs
 * become plain timing with no overshoot.
 */
export const dur = { instant: 80, fast: 150, base: 250, slow: 400, story: 700 } as const;
export const ease = {
  out: Easing.bezier(0.2, 0.8, 0.2, 1),
  in: Easing.bezier(0.4, 0, 1, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};
/** Physics springs as (stiffness, damping). soft: sheets, cards, snaps. snappy: indicators, chips. bouncy: ticks, pops, the press. */
export const spring = {
  soft: { stiffness: 170, damping: 22, mass: 1 },
  snappy: { stiffness: 300, damping: 24, mass: 1 },
  bouncy: { stiffness: 400, damping: 16, mass: 1 },
} as const;
export const distance = { micro: 8, enter: 16, sheet: 24 } as const;
export const stagger = { list: 40, chips: 50, cards: 60 } as const;

/* ---- reduced motion ---- */
let reduced = false;
if (Platform.OS === 'web') {
  try {
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq) { reduced = mq.matches; mq.addEventListener?.('change', (e) => { reduced = e.matches; }); }
  } catch { /* no matchMedia */ }
} else {
  AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduced = !!v; }).catch(() => {});
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => { reduced = !!v; });
}
export const reducedMotion = () => reduced;

const native = Platform.OS !== 'web';

/** A spring to `to`, or a short timing when motion is reduced. */
export function springTo(v: Animated.Value, to: number, kind: keyof typeof spring = 'soft', useNativeDriver = native) {
  if (reduced) return Animated.timing(v, { toValue: to, duration: dur.fast, easing: ease.out, useNativeDriver });
  return Animated.spring(v, { toValue: to, ...spring[kind], useNativeDriver });
}
/** A timed move with one of the three curves. */
export function timing(v: Animated.Value, to: number, ms: number = dur.base, curve: keyof typeof ease = 'out', useNativeDriver = native) {
  return Animated.timing(v, { toValue: to, duration: reduced ? Math.min(ms, 120) : ms, easing: ease[curve], useNativeDriver });
}
/** Entrance for a screen or a list item: 16 px up and in. `delay` staggers items. */
export function enter(opacity: Animated.Value, y: Animated.Value, delay = 0) {
  if (reduced) { y.setValue(0); return Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: native }); }
  return Animated.parallel([
    Animated.timing(opacity, { toValue: 1, duration: dur.base, delay, easing: ease.out, useNativeDriver: native }),
    Animated.spring(y, { toValue: 0, delay, ...spring.soft, useNativeDriver: native }),
  ]);
}
