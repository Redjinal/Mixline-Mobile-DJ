// Global prototype state: theme, tier, motion, font scale, orientation, viewport,
// scenario, hit-bound overlay. Mirrored onto <html data-*> for CSS, persisted to
// localStorage (best effort) and readable from the URL query for audits/previews.

const DEFAULTS = {
  theme: 'daylight',        // daylight | lowlight | contrast
  tier: 'balanced',         // essential | balanced | enhanced
  motion: 'full',           // full | reduced
  fontscale: '100',         // 100 | 130 | 200
  orientation: 'portrait',  // portrait | landscape
  viewport: 'default',      // default | tall | fill
  scenario: 'set-ready',    // key into fixtures/sessions.json scenarios
  hitbounds: 'off',         // on | off
  insets: 'on',             // on | off (status/gesture guides)
  frame: 'on',              // on | off (device bezel on desktop)
};

const VALID = {
  theme: ['daylight', 'lowlight', 'contrast'],
  tier: ['essential', 'balanced', 'enhanced'],
  motion: ['full', 'reduced'],
  fontscale: ['100', '130', '200'],
  orientation: ['portrait', 'landscape'],
  viewport: ['default', 'tall', 'fill'],
  hitbounds: ['on', 'off'],
  insets: ['on', 'off'],
  frame: ['on', 'off'],
};

const KEY = 'mdj-prototype-state-v1';
const listeners = new Set();
let state = { ...DEFAULTS };

function readStorage() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function writeStorage() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: fine */ }
}
function systemPreferences() {
  const out = {};
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) out.motion = 'reduced';
    if (matchMedia('(prefers-contrast: more)').matches) out.theme = 'contrast';
  } catch { /* no matchMedia */ }
  return out;
}
function fromQuery() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    const v = q.get(k === 'orientation' ? 'o' : k) ?? q.get(k);
    if (v != null) out[k] = v;
  }
  return out;
}

export function init() {
  state = { ...DEFAULTS, ...systemPreferences(), ...readStorage(), ...fromQuery() };
  for (const [k, allowed] of Object.entries(VALID)) if (!allowed.includes(state[k])) state[k] = DEFAULTS[k];
  apply();
}

export function get() { return { ...state }; }

export function set(patch) {
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULTS)) continue;
    if (VALID[k] && !VALID[k].includes(String(v))) continue;
    if (state[k] !== String(v)) { state[k] = String(v); changed = true; }
  }
  if (changed) { apply(); writeStorage(); for (const fn of listeners) fn(get()); }
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function viewportSize() {
  if (state.viewport === 'fill') return { w: 0, h: 0, name: 'Fill this window', measured: false };
  const tall = state.viewport === 'tall';
  const portrait = state.orientation === 'portrait';
  const w = 412, h = tall ? 915 : 892;
  return { w: portrait ? w : h, h: portrait ? h : w, name: tall ? 'S26 Ultra (assumed, taller)' : 'S26 Ultra (assumed FHD+ default)', measured: false };
}

function apply() {
  const root = document.documentElement;
  for (const k of Object.keys(DEFAULTS)) root.dataset[k] = state[k];
  const vp = viewportSize();
  root.style.setProperty('--vp-w', vp.w ? `${vp.w}px` : '100vw');
  root.style.setProperty('--vp-h', vp.h ? `${vp.h}px` : '100vh');
}

export const options = VALID;
export const defaults = DEFAULTS;
