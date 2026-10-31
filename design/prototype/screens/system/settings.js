// system/settings — searchable settings categories (Document 04 §4 "Settings": searchable categories,
// explicit Save, dirty-state protection, preview / discard, scoped Reset, consequences; Document 03 §5:
// settings are drafts, performance controls are not; FR-038 / FR-040 / FR-034).
//
// Full-screen page (no performance shell). Every row is an <mdj-settings-row> that edits a DRAFT; the
// <mdj-save-bar> is the only way a draft becomes a saved value. No settings store exists: THIS SCREEN
// STANDS IN FOR THE STORE and prints its answers as fixture acknowledgements. Nothing here applies to an
// engine. Values printed as current are the fixture's saved values (fixtures/system.json).
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon } from '../../components/base.js';
import { setFlash, takeFlash, pageHead, notice } from './index.js';

const SYS = await load('system');
const CATS = SYS.settings.categories;
const ID = 'system/settings';
const OPTIONS = {
  'xf-curve': ['Linear', 'Equal power', 'Cut'],
  quantize: ['Off', '1/8 beat', '1/4 beat', '1/2 beat', '1 beat', '1 bar'],
  'cue-behaviour': ['Hold to preview', 'Tap to set and return', 'Stutter'],
  'rec-format': ['WAV 44.1 kHz', 'FLAC 44.1 kHz', 'AAC 256 kbps'],
  theme: ['Daylight', 'Low-light', 'High contrast'],
  tier: ['Essential', 'Balanced', 'Enhanced'],
  'font-scale': ['System (100 %)', '130 %', '160 %', '200 %'],
};
const VALUES = { 'cue-gain': { min: -12, max: 6, step: 0.5, def: -3 }, 'rec-margin': { min: 0.5, max: 10, step: 0.5, def: 2 } };
const DEFAULTS_TEXT = {
  performance: 'Seek lock on · Jump-to-touch off · Quantize 1/4 beat · Cue behaviour Hold to preview · Ask before replacing an audible deck on.',
};

// Per state: the open category, the drafts that exist, and how the save bar is drawn.
const PLAN = {
  clean: { cat: 'performance', drafts: {} },
  dirty: { cat: 'performance', drafts: { 'jump-to-touch': 'on' } },
  'save-failed': { cat: 'performance', drafts: { 'jump-to-touch': 'on' }, failed: true },
  preview: { cat: 'display', drafts: { theme: 'Low-light' }, preview: true },
  'reset-scoped': { cat: 'performance', drafts: {}, confirmReset: true },
  search: { cat: 'performance', drafts: {}, query: 'cue' },
};

register({
  id: ID, family: 'system', title: 'Settings', order: 2,
  fr: ['FR-038', 'FR-040', 'FR-034', 'FR-022', 'FR-031', 'FR-048', 'FR-049'],
  shell: false,
  states: {
    clean: { label: 'Saved — no unsaved changes', exercised: true, via: { from: 'dirty', control: 'Save 1 unsaved change in Performance' } },
    dirty: { label: 'Unsaved draft — Save / Discard / Preview', exercised: true, via: { from: 'clean', control: 'Jump-to-touch' } },
    'save-failed': { label: 'Save failed — draft kept', exercised: false },
    preview: { label: 'Previewing a display change', exercised: false },
    'reset-scoped': { label: 'Reset this section — confirm', exercised: true, via: { from: 'clean', control: 'Reset Performance to defaults (this section only)' } },
    search: { label: 'Search “cue”', exercised: true, via: { from: 'clean', control: 'Search' } },
  },
  defaultState: 'clean',
  render(ctx) {
    const plan = PLAN[ctx.state] || PLAN.clean;
    const land = ctx.orientation === 'landscape';
    let catId = plan.cat;
    let drafts = { ...plan.drafts };
    let query = plan.query ?? null;
    let barState = plan.failed ? 'failed' : plan.preview ? 'preview' : null;
    const flash = takeFlash(ID, ctx.state);

    const root = h('div', { class: 'system-page system-settings stage', dataset: { state: ctx.state } });
    const overlay = h('div', { class: 'system-overlay', hidden: true });
    const live = h('div', { class: 'system-live', 'aria-live': 'polite' });
    const hasDrafts = () => Object.keys(drafts).length > 0;
    const catOf = (name) => CATS.find((c) => c.rows.some((r) => r.name === name));
    const leave = () => {
      if (!hasDrafts()) { ctx.navigate('launch/open'); return; }
      openSheet({ variant: 'confirm', title: 'Leave with unsaved changes?', body: `${Object.keys(drafts).length} unsaved ${Object.keys(drafts).length === 1 ? 'change stays' : 'changes stay'} a draft only while this page is open. Saved settings are not affected.`, actions: [{ id: 'stay', label: 'Keep editing', primary: true }, { id: 'leave', label: 'Discard and leave', tone: 'danger', icon: 'trash' }] }, (id) => { if (id === 'leave') ctx.navigate('launch/open'); });
    };

    const head = pageHead(ctx, {
      title: 'Settings', sub: 'Changes are drafts until you Save. Reset affects one section only.',
      back: { label: 'Back', onClick: leave },
      tools: query == null ? [button({ label: 'Search', icon: 'search', hit: 48, cls: 'btn--secondary', on: { click: () => ctx.setState('search') } })] : [],
    });

    const searchRow = query == null ? null : h('div', { class: 'system-settings__search' }, [
      h('mdj-search-bar', { value: query, scope: 'Settings', placeholder: 'Search settings', state: 'results', count: String(searchRows(query).length) }),
    ]);
    if (searchRow) {
      searchRow.addEventListener('mdj:search', (e) => { query = e.detail.value || ''; const bar = searchRow.querySelector('mdj-search-bar'); bar.setAttribute('value', query); const n = searchRows(query).length; bar.setAttribute('count', String(n)); bar.setAttribute('state', query ? (n ? 'results' : 'no-results') : 'idle'); draw(); });
      searchRow.addEventListener('mdj:search-clear', () => ctx.setState('clean'));
    }

    const nav = h('div', { class: 'system-settings__nav', role: 'tablist', 'aria-label': 'Settings categories', 'aria-orientation': land ? 'vertical' : 'horizontal' });
    const section = h('div', { class: 'system-settings__section', role: 'tabpanel' });
    const body = h('div', { class: 'system-settings__body' }, query == null ? [nav, section] : [section]);
    const bar = h('mdj-save-bar', {});
    const foot = h('div', { class: 'system-settings__foot' }, [bar]);

    function rowEl(r) {
      const draft = drafts[r.name];
      const value = draft ?? r.value;
      const failed = plan.failed && draft != null;
      const el = h('mdj-settings-row', {
        kind: r.kind, name: r.name, label: r.label, value, detail: r.detail, icon: r.icon, unit: r.unit || null,
        dirty: draft != null ? true : null, state: failed ? 'error' : draft != null ? 'dirty' : null,
        error: failed ? 'Save failed: storage is full (fixture). The draft is kept.' : null,
        dataset: { fr: frFor(r) },
      });
      return el;
    }

    function draw() {
      // Category nav
      nav.replaceChildren(...CATS.map((c) => {
        const n = Object.keys(drafts).filter((k) => catOf(k)?.id === c.id).length;
        return h('button', {
          type: 'button', role: 'tab', class: `system-settings__tab${c.id === catId ? ' is-current' : ''}`, dataset: { hit: '48' }, 'aria-selected': String(c.id === catId),
          'aria-label': `${c.label}${n ? `, ${n} unsaved` : ''}`,
          on: { click: () => { catId = c.id; draw(); } },
        }, [icon(c.icon, { size: 16 }), h('span', { class: 'system-settings__tab-label', text: c.label }), n ? h('span', { class: 'system-settings__tab-dirty label', 'aria-hidden': 'true', text: '•' }) : null]);
      }));
      // Section
      if (query != null) {
        const groups = {};
        for (const { cat, row } of searchRows(query)) (groups[cat.id] ||= { cat, rows: [] }).rows.push(row);
        const parts = [];
        if (!Object.keys(groups).length) parts.push(h('mdj-empty-state', { state: 'no-results', query, title: `No settings match “${query}”`, body: 'Try another word, or browse the categories.', actions: JSON.stringify([{ id: 'browse', label: 'Browse categories', primary: true }]) }));
        for (const g of Object.values(groups)) {
          parts.push(h('mdj-section-header', { title: g.cat.label, count: String(g.rows.length), level: '2' }));
          parts.push(h('div', { class: 'system-settings__rows' }, g.rows.map(rowEl)));
        }
        section.replaceChildren(...parts);
      } else {
        const cat = CATS.find((c) => c.id === catId) || CATS[0];
        const parts = [h('mdj-section-header', { title: cat.label, count: String(cat.rows.length), level: '2' })];
        if (cat.id === 'parday') parts.push(notice({ tone: 'warning', ic: 'cost-limit', lead: 'Paid use stays off until both are set.', text: 'Provider: Not configured. Monthly cost limit: Not set — required before paid use. Local proposals and every mixing feature work without either.' }));
        if (cat.id === 'sources') parts.push(notice({ tone: 'info', ic: 'info', lead: 'Four separate statuses per adapter.', text: 'Technical, access, content and distribution are tracked separately; a working download does not settle the other three. “Unverified” means not checked, not “allowed”.' }));
        if (cat.id === 'display' && barState === 'preview') parts.push(previewBanner());
        parts.push(h('div', { class: 'system-settings__rows' }, cat.rows.map(rowEl)));
        if (cat.id === 'about') parts.push(h('p', { class: 'body muted system-settings__aws', text: 'AWS stays a later optional extension. Nothing in first run, setup or this app requires an account or a server.' }));
        section.replaceChildren(...parts);
        section.setAttribute('aria-label', cat.label);
      }
      // Save bar
      const n = Object.keys(drafts).length;
      const cats = new Set(Object.keys(drafts).map((k) => catOf(k)?.label));
      const scope = n && cats.size === 1 ? [...cats][0] : n ? 'Settings' : (CATS.find((c) => c.id === catId) || CATS[0]).label;
      bar.setAttribute('scope', scope);
      bar.setAttribute('count', String(n));
      bar.setAttribute('state', n ? (barState || 'dirty') : 'clean');
      if (barState === 'failed') bar.setAttribute('error', 'storage is full (fixture)');
      else bar.removeAttribute('error');
      foot.hidden = query != null;
    }

    function previewBanner() {
      return h('div', { class: 'system-settings__preview raised', role: 'status' }, [
        h('div', { class: 'system-settings__swatch', 'aria-hidden': 'true' }, [h('span', { class: 'system-settings__swatch-a' }), h('span', { class: 'system-settings__swatch-b' })]),
        h('div', { class: 'system-settings__preview-text' }, [
          h('p', { class: 'title', text: 'Previewing Low-light — not saved' }),
          h('p', { class: 'body muted', text: 'In the app, Preview shows Low-light everywhere until you Save or Discard preview; leaving this page also returns to Daylight. This prototype draws the draft as the swatch only — use the prototype theme switch to see Low-light screens.' }),
        ]),
        button({ label: 'Discard preview', icon: 'discard', hit: 48, cls: 'btn--secondary', on: { click: () => { drafts = {}; barState = null; setFlash(ID, { state: 'clean', tone: 'neutral', ic: 'undo', lead: 'Preview discarded.', text: 'Display is back to Daylight. Nothing was saved.' }); ctx.setState('clean'); } } }),
      ]);
    }

    function openSheet(spec, onAction, children = []) {
      const sheet = h('mdj-sheet', { variant: spec.variant || 'dialog', title: spec.title, body: spec.body || null, icon: spec.icon || null, actions: JSON.stringify(spec.actions || []), 'dismiss-label': spec.dismiss || 'Close' }, children);
      const close = () => { overlay.hidden = true; overlay.replaceChildren(); };
      sheet.addEventListener('mdj:sheet-dismiss', () => { close(); onAction?.('dismiss'); });
      sheet.addEventListener('mdj:sheet-action', (e) => { close(); onAction?.(e.detail.id); });
      overlay.replaceChildren(h('div', { class: 'system-overlay__scrim', 'aria-hidden': 'true' }), h('div', { class: `system-overlay__sheet system-overlay__sheet--${spec.variant || 'dialog'}` }, [sheet]));
      overlay.hidden = false;
      return sheet;
    }

    const setDraft = (name, value) => {
      const saved = CATS.flatMap((c) => c.rows).find((r) => r.name === name)?.value;
      if (value === saved) delete drafts[name]; else drafts[name] = value;
      if (barState === 'failed') barState = null;
      draw();
    };

    root.addEventListener('mdj:setting-change', (e) => {
      const { name, value, kind } = e.detail;
      const row = CATS.flatMap((c) => c.rows).find((r) => r.name === name);
      if (!row) return;
      if (kind === 'toggle') {
        if (ctx.state === 'clean' && name === 'jump-to-touch' && !hasDrafts()) { ctx.setState('dirty'); return; }
        setDraft(name, value);
      } else if (kind === 'select') {
        const opts = OPTIONS[name] || [value];
        openSheet({ variant: 'dialog', title: row.label, body: row.detail, actions: [] }, null, [h('div', { class: 'system-settings__options', role: 'group', 'aria-label': `${row.label} options` }, opts.map((o) => button({
          label: o, hit: 48, cls: `system-settings__option${o === (drafts[name] ?? row.value) ? ' is-current' : ''}`, attrs: { 'aria-pressed': String(o === (drafts[name] ?? row.value)) },
          on: { click: () => { overlay.hidden = true; overlay.replaceChildren(); setDraft(name, o); } },
        })))]);
      } else if (kind === 'value') {
        const v = VALUES[name] || { min: 0, max: 10, step: 1, def: 0 };
        const insp = h('mdj-value-inspector', { label: row.label, value: drafts[name] ?? row.value, unit: row.unit || '', min: String(v.min), max: String(v.max), step: String(v.step), fine: String(v.step), default: String(v.def) });
        insp.addEventListener('mdj:value', (ev) => { const val = Number(ev.detail.value).toFixed(1); insp.setAttribute('value', val); insp.removeAttribute('draft'); insp.removeAttribute('state'); setDraft(name, val); });
        insp.addEventListener('mdj:reset', (ev) => { const val = Number(ev.detail.value).toFixed(1); insp.setAttribute('value', val); setDraft(name, val); });
        openSheet({ variant: 'dialog', title: row.label, body: null, actions: [] }, null, [h('p', { class: 'body muted', text: `${row.detail}. The new value is a draft until you Save.` }), insp]);
      } else if (kind === 'nav') {
        if (row.to) ctx.navigate(row.to);
        else if (name === 'routes') ctx.navigate('route/check');
        else live.replaceChildren(notice({ tone: 'info', ic: row.icon || 'info', lead: `${row.label}: ${row.value}`, text: `${row.detail}. The detail page for this row is not drawn in this prototype.`, role: 'status' }));
      }
    });
    root.addEventListener('mdj:save', () => {
      const n = Object.keys(drafts).length;
      const theme = drafts.theme;
      setFlash(ID, { state: 'clean', tone: 'ok', ic: 'check', lead: `Saved ${n} ${n === 1 ? 'change' : 'changes'}.`, text: `The settings store confirmed the write (fixture acknowledgement).${theme ? ` Theme is now ${theme}.` : ''}` });
      if (ctx.state === 'clean') { drafts = {}; barState = null; draw(); showFlash(takeFlash(ID, 'clean')); } else ctx.setState('clean');
    });
    root.addEventListener('mdj:discard', () => {
      setFlash(ID, { state: 'clean', tone: 'neutral', ic: 'undo', lead: 'Changes discarded.', text: 'Saved values are unchanged.' });
      if (ctx.state === 'clean') { drafts = {}; barState = null; draw(); showFlash(takeFlash(ID, 'clean')); } else ctx.setState('clean');
    });
    root.addEventListener('mdj:preview', (e) => { barState = e.detail.on ? 'preview' : null; draw(); });
    root.addEventListener('mdj:reset', (e) => {
      if (e.target.closest('mdj-value-inspector')) return;
      if (ctx.state === 'reset-scoped') return;
      if (ctx.state === 'clean') ctx.setState('reset-scoped');
      else openResetConfirm();
    });
    root.addEventListener('mdj:action', (e) => { if (e.detail.id === 'browse') ctx.setState('clean'); });

    function openResetConfirm() {
      const cat = CATS.find((c) => c.id === catId) || CATS[0];
      openSheet({
        variant: 'confirm', icon: 'undo', title: `Reset ${cat.label} settings?`,
        body: `Resets only this section to its defaults: ${DEFAULTS_TEXT[cat.id] || 'the values shipped with the app.'} Your library, cues, grids, crates and every other settings section are untouched. This saves immediately.`,
        actions: [{ id: 'cancel', label: 'Keep current settings', primary: true }, { id: 'reset', label: `Reset ${cat.label}`, tone: 'danger', icon: 'undo' }],
      }, (id) => {
        if (id === 'reset') { setFlash(ID, { state: 'clean', tone: 'ok', ic: 'undo', lead: `${cat.label} reset to defaults.`, text: 'The settings store confirmed the reset (fixture acknowledgement). Other sections were not changed.' }); }
        if (ctx.state === 'reset-scoped') ctx.setState('clean'); else { drafts = {}; barState = null; draw(); }
      });
    }

    function showFlash(f) {
      if (!f) return;
      live.replaceChildren(notice({ tone: f.tone, ic: f.ic, lead: f.lead, text: f.text, role: 'status' }));
    }

    draw();
    showFlash(flash);
    // Keep the open category's tab in view in the portrait strip (local scroll only, never the page).
    requestAnimationFrame(() => { const t = nav.querySelector('.is-current'); if (t && !land) nav.scrollLeft = Math.max(0, t.offsetLeft - nav.offsetLeft - 16); });
    if (plan.failed) live.replaceChildren(notice({ tone: 'critical', ic: 'warning', lead: 'Save failed — your change is kept as a draft.', text: 'The settings store could not write: storage is full (fixture). Free some space in Diagnostics, then Retry save. Jump-to-touch stays off until a save succeeds.' }));

    const scroll = h('div', { class: 'system-settings__scroll' }, [live, searchRow, body].filter(Boolean));
    root.append(head, scroll, foot, overlay);
    if (plan.confirmReset) queueMicrotask(openResetConfirm);
    return root;
  },
});

function searchRows(q) {
  const s = (q || '').trim().toLowerCase();
  if (!s) return [];
  const out = [];
  for (const cat of CATS) for (const row of cat.rows) if (`${row.label} ${row.detail} ${row.value}`.toLowerCase().includes(s)) out.push({ cat, row });
  return out;
}

function frFor(r) {
  if (['theme', 'tier', 'reduce-transparency', 'reduce-motion', 'font-scale'].includes(r.name)) return 'FR-038';
  if (r.name.startsWith('parday')) return 'FR-048 FR-040';
  if (r.name.startsWith('adapter') || r.name === 'wifi-only') return 'FR-049 FR-040';
  if (r.name.startsWith('rec')) return 'FR-031';
  if (['routes', 'cue-gain', 'xf-curve', 'limiter'].includes(r.name)) return 'FR-022';
  if (r.name === 'aws') return 'FR-040';
  return 'FR-034';
}
