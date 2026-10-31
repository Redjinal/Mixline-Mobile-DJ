// Screen family manifest: system. Import each screen module of this family here.
// Owned by the "system" screen agent. Family styles live in system.css.
//
// Screens: system/plugins (shell), system/settings, system/diagnostics, system/backup (full-screen pages)
// and system/recovery (shell). Family data: fixtures/system.json (plus the shared plugins.json).
//
// The helpers below are FUNCTION DECLARATIONS on purpose: the screen modules import them from this
// manifest (a circular import), and function declarations are initialised before any module body runs.
import './plugins.js';
import './settings.js';
import './diagnostics.js';
import './backup.js';
import './recovery.js';
import { h, button, icon } from '../../components/base.js';

// One-shot messages carried across a ctx.setState() navigation (e.g. "Saved — the store confirmed").
// Module memory only: a reload or a direct link shows the plain state.
const flashes = new Map();
export function setFlash(screenId, message) { flashes.set(screenId, message); }
export function takeFlash(screenId, state) {
  const f = flashes.get(screenId);
  flashes.delete(screenId);
  return f && (!f.state || f.state === state) ? f : null;
}

// Header for the full-screen (non-shell) system pages: Back, title, one-line purpose, optional tools.
export function pageHead(ctx, { title, sub, back = { label: 'Back', to: 'launch/open' }, tools = [] }) {
  return h('header', { class: 'system-head ink-backing' }, [
    button({
      label: back.label, icon: 'chevron-left', hit: 48, cls: 'btn--ghost system-head__back',
      on: { click: () => (back.onClick ? back.onClick() : ctx.navigate(back.to, back.state ? { state: back.state } : {})) },
    }),
    h('div', { class: 'system-head__titles' }, [
      h('h1', { class: 'system-head__title title', text: title }),
      sub ? h('p', { class: 'system-head__sub body muted', text: sub }) : null,
    ]),
    tools.length ? h('div', { class: 'system-head__tools' }, tools) : null,
  ]);
}

// A notice panel: icon + bold lead + text, tone carried by words and icon as well as colour.
export function notice({ tone = 'info', ic = 'info', lead = '', text = '', role = null, children = [], cls = '' }) {
  return h('div', { class: `system-notice system-notice--${tone} ${cls}`.trim(), role: role || (tone === 'critical' || tone === 'warning' ? 'alert' : 'note') }, [
    h('span', { class: `system-notice__icon tone-${tone}`, 'aria-hidden': 'true' }, [icon(ic, { size: 18 })]),
    h('div', { class: 'system-notice__text' }, [
      lead ? h('p', { class: 'system-notice__lead title', text: lead }) : null,
      text ? h('p', { class: 'system-notice__body body', text }) : null,
      ...children,
    ]),
  ]);
}

// A titled panel on an opaque raised backing. `fixture` adds an inline FIXTURE mark beside the heading.
export function panel({ title, ic = null, fixture = null, cls = '', children = [], level = 'h2', note = null, tone = null }) {
  return h('section', { class: `system-panel raised ${tone ? `system-panel--${tone}` : ''} ${cls}`.trim(), 'aria-label': title }, [
    h('div', { class: 'system-panel__head' }, [
      ic ? h('span', { class: 'system-panel__icon', 'aria-hidden': 'true' }, [icon(ic, { size: 18 })]) : null,
      h(level, { class: 'system-panel__title label label-strong', text: title }),
      fixture ? h('mdj-fixture-mark', { for: fixture, inline: true }) : null,
    ]),
    note ? h('p', { class: 'system-panel__note body muted', text: note }) : null,
    ...children,
  ]);
}

// Key / value list. rows: [[key, value, tone?], ...]; numerals in values use tabular figures.
export function kv(rows, { cls = '' } = {}) {
  return h('dl', { class: `system-kv ${cls}`.trim() }, rows.map(([k, v, tone]) => h('div', { class: 'system-kv__row' }, [
    h('dt', { class: 'system-kv__k label', text: k }),
    h('dd', { class: `system-kv__v body${tone ? ` system-kv__v--${tone}` : ''}`, text: v }),
  ])));
}

// A status word with a shape icon (never colour alone).
export function statusWord(tone, text) {
  const ic = { ok: 'check', warning: 'warning', critical: 'x', neutral: 'minus', info: 'info' }[tone] || 'info';
  return h('span', { class: `system-status tone-${tone} label` }, [icon(ic, { size: 12 }), h('span', { text })]);
}

// Bulleted list with a leading icon per item.
export function bullets(items, ic = 'check', cls = '') {
  return h('ul', { class: `system-bullets ${cls}`.trim() }, items.map((t) => h('li', { class: 'body' }, [icon(ic, { size: 14 }), h('span', { text: t })])));
}
