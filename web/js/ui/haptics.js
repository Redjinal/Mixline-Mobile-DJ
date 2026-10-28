/**
 * Haptic vocabulary. Every event also has a visual state; audio never waits on this.
 * Android: posted to the shell which maps kinds to system haptic constants.
 * Web: navigator.vibrate where available (Chromium); otherwise silent.
 */
const PATTERNS = {select: [6], load: [10, 40, 12], press: [9], step: [5], detent: [12], center: [14], edge: [8, 30, 8], contact: [7], toggle: [10], warning: [18, 40, 18]};
const PROFILES = {
  off: new Set(),
  essential: new Set(['load', 'press', 'center', 'toggle', 'warning']),
  detailed: new Set(Object.keys(PATTERNS))
};
const state = {enabled: true, profile: 'essential', last: new Map()};

export const haptics = {
  kinds: Object.keys(PATTERNS),
  configure({enabled, profile} = {}) {
    if (enabled !== undefined) state.enabled = !!enabled;
    if (profile && PROFILES[profile]) state.profile = profile;
  },
  get profile() { return state.profile; },
  get enabled() { return state.enabled; },
  /** Fire a haptic cue by kind; throttled per kind to avoid buzzing on jitter. */
  play(kind, {force = false} = {}) {
    if (!PATTERNS[kind]) return false;
    if (!force && (!state.enabled || !PROFILES[state.profile].has(kind))) return false;
    const now = performance.now();
    if (now - (state.last.get(kind) || 0) < 45) return false;
    state.last.set(kind, now);
    try {
      if (globalThis.MixlineAndroid?.postMessage) { globalThis.MixlineAndroid.postMessage(JSON.stringify({type: 'haptic', kind})); return true; }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') return !!navigator.vibrate(PATTERNS[kind]);
    } catch { /* unsupported */ }
    return false;
  },
  /** Whether this device can produce any haptic at all (best effort). */
  get available() { return !!(globalThis.MixlineAndroid || (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')); }
};
