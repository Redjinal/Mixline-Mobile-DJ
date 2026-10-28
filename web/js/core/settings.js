/** Studio settings: schema, validation, explicit save with a draft, and DOM application. */
import {haptics} from '../ui/haptics.js';

export const DEFAULT_SETTINGS = Object.freeze({haptics: true, hapticProfile: 'essential', theme: 'dark', decks: 'red', glow: 1, motion: 'system', curve: 'blend', stopOutgoing: true, safeLevel: true});
const KEY = 'settings-6';

export const SETTINGS_SCHEMA = [
  {id: 'audio', label: 'Audio', icon: 'speaker', items: [
    {key: 'curve', label: 'Crossfader curve', help: 'Blend keeps both decks audible around the centre; Cut switches hard for scratching.', type: 'select', options: [['blend', 'Blend (equal power)'], ['cut', 'Cut']], synonyms: 'crossfade fader scratch'},
    {key: 'stopOutgoing', label: 'Pause outgoing deck after a transition', help: 'When a timed transition completes, the deck that faded out stops instead of playing silently.', type: 'switch', synonyms: 'transition fade stop'},
    {key: 'safeLevel', label: 'Safe level warning', help: 'Warn when the master level is pushed above 90%. The limiter still protects the output.', type: 'switch', synonyms: 'loud volume limiter hearing'}
  ]},
  {id: 'haptics', label: 'Haptics', icon: 'vibrate', items: [
    {key: 'haptics', label: 'Enable haptic feedback', help: 'Short cues for presses, detents and loads. Audio never waits for haptics.', type: 'switch', synonyms: 'vibration vibrate touch feedback'},
    {key: 'hapticProfile', label: 'Feedback profile', help: 'Essential: loads, presses, centre detents, toggles and warnings. Detailed adds selection and step ticks.', type: 'select', options: [['off', 'Off'], ['essential', 'Essential'], ['detailed', 'Detailed']], synonyms: 'vibration intensity'}
  ]},
  {id: 'appearance', label: 'Appearance', icon: 'palette', items: [
    {key: 'theme', label: 'Theme', help: 'Dark is tuned for booths and night use.', type: 'select', options: [['dark', 'Dark (default)'], ['light', 'Light']], synonyms: 'mode colour brightness'},
    {key: 'decks', label: 'Deck colours', help: 'Deck 1 and Deck 2 identities used across every workspace.', type: 'select', options: [['red', 'Red · Cyan (default)'], ['violet', 'Violet · Teal']], synonyms: 'colour color identity palette'},
    {key: 'glow', label: 'Glow intensity', help: 'How strongly active controls light up.', type: 'range', min: 0.4, max: 1.6, step: 0.1, synonyms: 'brightness neon light'}
  ]},
  {id: 'motion', label: 'Motion', icon: 'beat', items: [
    {key: 'motion', label: 'Animations', help: 'Reduced keeps every state change immediate; platters still show position.', type: 'select', options: [['system', 'Follow system'], ['reduced', 'Reduced'], ['on', 'Always on']], synonyms: 'reduce motion animation accessibility'}
  ]}
];

const OPTIONS = Object.fromEntries(SETTINGS_SCHEMA.flatMap(g => g.items).filter(i => i.type === 'select').map(i => [i.key, i.options.map(o => o[0])]));

export function normalizeSettings(input) {
  const out = {...DEFAULT_SETTINGS};
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof DEFAULT_SETTINGS[key] === 'boolean') out[key] = !!value;
    else if (key === 'glow') { const n = Number(value); out.glow = Number.isFinite(n) ? Math.min(1.6, Math.max(0.4, Math.round(n * 10) / 10)) : 1; }
    else if (OPTIONS[key]) out[key] = OPTIONS[key].includes(value) ? value : DEFAULT_SETTINGS[key];
  }
  return out;
}

export function settingsSearch(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return SETTINGS_SCHEMA.flatMap(g => g.items.map(i => ({...i, group: g.id})));
  return SETTINGS_SCHEMA.flatMap(g => g.items.filter(i => `${g.label} ${i.label} ${i.help} ${i.synonyms || ''}`.toLowerCase().includes(q)).map(i => ({...i, group: g.id})));
}

/** Push settings into the document and subsystems. Safe to call with a draft for preview. */
export function applySettings(settings, {engine} = {}) {
  const root = globalThis.document?.documentElement;
  if (root) {
    root.dataset.theme = settings.theme;
    root.dataset.decks = settings.decks;
    root.dataset.motion = settings.motion === 'reduced' ? 'reduced' : settings.motion === 'on' ? 'system-on' : 'system';
    root.style.setProperty('--glow', String(settings.glow));
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = settings.theme === 'light' ? '#f3f1ed' : '#0b0b0d';
  }
  haptics.configure({enabled: settings.haptics, profile: settings.hapticProfile});
  engine?.setCrossfadeCurve?.(settings.curve);
}

export function createSettings({store, engine} = {}) {
  let current = {...DEFAULT_SETTINGS};
  let draft = {...DEFAULT_SETTINGS};
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(api); };
  const api = {
    get current() { return current; },
    get draft() { return draft; },
    get dirty() { return JSON.stringify(draft) !== JSON.stringify(current); },
    isDefault(key) { return draft[key] === DEFAULT_SETTINGS[key]; },
    changed(key) { return draft[key] !== current[key]; },
    async load() { current = normalizeSettings(store ? await store.getSetting(KEY, null) : null); draft = {...current}; applySettings(current, {engine}); emit(); return current; },
    set(key, value) { draft = normalizeSettings({...draft, [key]: value}); applySettings(draft, {engine}); emit(); },
    async save() { const next = normalizeSettings(draft); if (store) await store.setSetting(KEY, next); current = next; draft = {...next}; applySettings(current, {engine}); emit(); return current; },
    discard() { draft = {...current}; applySettings(current, {engine}); emit(); },
    resetDraft() { draft = {...DEFAULT_SETTINGS}; applySettings(draft, {engine}); emit(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
  return api;
}
