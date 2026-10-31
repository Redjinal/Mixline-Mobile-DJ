// Icon sprite gallery: every <symbol> in assets/icons.svg at 16, 20 and 24 px with its id and its
// source tag ("Lucide (ISC)" for symbols copied from lucide-static, "Original" for drawings made
// for this prototype). The list is not hard-coded: the screen fetches the sprite and parses it at
// render time, reading the `data-source` attribute of each symbol and the "group:" comments that
// separate the families, so it can never drift from the file. Notices: assets/NOTICES.md.
//
// The size-check strip at the top places a few icons inside real control geometry (48 dp button,
// 56 dp transport disc, 32 dp chip, 12 px status line) so the optical weight can be judged at the
// sizes the components use. Those controls are inert samples: nothing here binds to an engine.
import { register } from '../../app/registry.js';
import { h, icon, button } from '../../components/base.js';

const SPRITE_URL = new URL('../../assets/icons.svg', import.meta.url);
const SIZES = [16, 20, 24];
const SOURCE_TEXT = { lucide: 'Lucide (ISC)', original: 'Original' };

let spritePromise = null;
function loadSprite() {
  if (!spritePromise) {
    spritePromise = fetch(SPRITE_URL).then((r) => {
      if (!r.ok) throw new Error(`assets/icons.svg: HTTP ${r.status}`);
      return r.text();
    }).then(parseSprite);
  }
  return spritePromise;
}

// -> { groups: [{ title, symbols: [{ id, source, src }] }], total, bySource: { lucide, original } }
function parseSprite(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('assets/icons.svg did not parse as SVG');
  const groups = [];
  let current = null;
  const bySource = { lucide: 0, original: 0 };
  for (const node of doc.documentElement.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const m = /^\s*group:\s*(.+?)\s*$/.exec(node.data);
      if (m) { current = { title: m[1], symbols: [] }; groups.push(current); }
    } else if (node.nodeType === Node.ELEMENT_NODE && node.localName === 'symbol') {
      const source = node.getAttribute('data-source') === 'lucide' ? 'lucide' : 'original';
      if (!current) { current = { title: 'Ungrouped', symbols: [] }; groups.push(current); }
      current.symbols.push({ id: node.getAttribute('id'), source, src: node.getAttribute('data-src') || null });
      bySource[source]++;
    }
  }
  return { groups, total: bySource.lucide + bySource.original, bySource };
}

// icon() writes width/height attributes, but app.css sizes every .icon at 1em; the gallery wants exact
// pixel sizes regardless of the font-scale setting, so the size goes on the style attribute too.
function glyph(id, size) {
  const svg = icon(id, { size });
  svg.style.width = `${size}px`;
  svg.style.height = `${size}px`;
  return svg;
}

function card(sym) {
  const tag = sym.source === 'lucide' ? `${SOURCE_TEXT.lucide}${sym.src && sym.src !== sym.id ? ` · ${sym.src}` : ''}` : SOURCE_TEXT.original;
  return h('li', { class: `icons-card raised icons-card--${sym.source}`, dataset: { icon: sym.id } }, [
    h('div', { class: 'icons-card__glyphs', 'aria-hidden': 'true' }, SIZES.map((s) => h('span', { class: 'icons-card__cell', style: { width: `${s + 8}px`, height: `${s + 8}px` } }, [glyph(sym.id, s)]))),
    h('span', { class: 'icons-card__id numeral', text: sym.id }),
    h('span', { class: `icons-card__tag icons-card__tag--${sym.source}`, text: tag }),
  ]);
}

function sizeCheck() {
  const inert = { on: {} };
  const strip = h('section', { class: 'icons-check glass', 'aria-labelledby': 'icons-check-title' });
  strip.appendChild(h('h2', { id: 'icons-check-title', class: 'title icons-check__title', text: 'Size check — inert samples' }));
  strip.appendChild(h('p', { class: 'icons-meta body muted', text: 'The same symbols inside the control geometry the components use: 48 dp button, 56 dp transport disc, 32 dp chip, 12 px status line. Nothing here is wired to an engine.' }));
  const row = h('div', { class: 'icons-check__row' });
  // 56 dp transport-style disc: brass rim, raised face, 22 px glyph (matches .transport__face .icon).
  row.appendChild(h('span', { class: 'icons-check__disc brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'icons-check__face' }, [glyph('loop-in', 22)])]));
  row.appendChild(h('span', { class: 'icons-check__disc brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'icons-check__face' }, [glyph('stop-automation', 22)])]));
  row.appendChild(button({ label: 'Arm transition (sample)', icon: 'automix', iconOnly: true, cls: 'btn--icon icons-check__btn', ...inert }));
  row.appendChild(button({ label: 'Stems (sample)', icon: 'stem-vocals', cls: 'icons-check__btn', ...inert }));
  row.appendChild(button({ label: 'Seek (sample)', icon: 'seek', cls: 'btn--secondary icons-check__btn', ...inert }));
  strip.appendChild(row);
  const line = h('div', { class: 'icons-check__row icons-check__row--small' });
  line.appendChild(h('span', { class: 'chip' }, [glyph('color-tag', 14), h('span', { text: 'Colour tag' })]));
  line.appendChild(h('span', { class: 'chip' }, [glyph('grid-locked', 14), h('span', { text: 'Grid locked' })]));
  line.appendChild(h('span', { class: 'chip' }, [glyph('analysis-pending', 14), h('span', { text: 'Analysis pending' })]));
  line.appendChild(h('span', { class: 'icons-check__status label tone-info' }, [glyph('provenance-measured', 12), h('span', { text: 'Measured' })]));
  line.appendChild(h('span', { class: 'icons-check__status label tone-warning' }, [glyph('provenance-inferred', 12), h('span', { text: 'Inferred' })]));
  line.appendChild(h('span', { class: 'icons-check__status label tone-neutral' }, [glyph('provenance-user', 12), h('span', { text: 'Set by you' })]));
  strip.appendChild(line);
  return strip;
}

function ensureStyles() {
  if (document.getElementById('icons-screen-style')) return;
  const css = `
.icons-screen { padding: var(--space-4) var(--gutter); display: grid; gap: var(--space-4); }
.icons-screen__title { font-size: var(--fs-lg); margin: 0; }
.icons-meta { font-size: var(--fs-xs); margin: 0; }
.icons-check { padding: var(--space-3); display: grid; gap: var(--space-2); }
.icons-check__title { font-size: var(--fs-md); margin: 0; }
.icons-check__row { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
.icons-check__disc { display: inline-grid; width: 56px; height: 56px; border-radius: 50%; }
.icons-check__face { display: grid; place-items: center; background: var(--raised); color: var(--ink); box-shadow: inset 0 1px 0 var(--glass-edge), inset 0 -2px 4px rgba(0,0,0,0.06); }
.icons-check__status { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: var(--radius-pill); }
.icons-group { display: grid; gap: var(--space-2); }
.icons-group__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2); padding: 0 var(--space-1); }
.icons-group__title { font-size: var(--fs-md); margin: 0; }
.icons-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); }
.icons-card { display: grid; gap: 6px; padding: var(--space-2); min-width: 0; align-content: start; }
.icons-card__glyphs { display: flex; align-items: center; gap: var(--space-2); color: var(--ink); }
.icons-card__cell { display: grid; place-items: center; border-radius: var(--radius-control); background: var(--control); border: 1px solid var(--line); }
.icons-card__id { font-size: var(--fs-xs); overflow-wrap: anywhere; line-height: 1.25; }
.icons-card__tag { font-family: var(--font-ui); font-size: calc(11px * var(--fs-scale)); font-weight: 600; letter-spacing: 0.02em; overflow-wrap: anywhere; }
.icons-card__tag--lucide { color: var(--info); }
.icons-card__tag--original { color: var(--ink-2); }
.icons-status { padding: var(--space-3); margin: 0; }
.icons-status--error { color: var(--critical); }
:root[data-orientation='landscape'] .icons-grid { grid-template-columns: repeat(auto-fill, minmax(156px, 1fr)); }
:root[data-fontscale='200'] .icons-grid { grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); }
`;
  document.head.appendChild(h('style', { id: 'icons-screen-style', text: css }));
}

register({
  id: 'foundation/icons',
  family: 'foundation',
  title: 'Icon sprite',
  order: 3,
  fr: [],
  shell: false,
  states: { all: { label: 'Every symbol at 16, 20 and 24 px', exercised: true } },
  render(ctx) {
    ensureStyles();
    const root = h('div', { class: 'icons-screen stage' });
    const meta = h('p', { class: 'icons-meta muted', text: `Loading assets/icons.svg · theme ${ctx.prototype.theme} · tier ${ctx.prototype.tier}` });
    root.appendChild(h('header', { class: 'ink-backing', style: { padding: 'var(--space-2)' } }, [
      h('h1', { class: 'title icons-screen__title', text: 'Icon sprite' }),
      meta,
      h('p', { class: 'icons-meta muted', text: 'Lucide symbols are a subset of lucide-static 1.64.0 under the ISC licence (notice in assets/NOTICES.md). Everything tagged Original was drawn for this prototype; DJ symbols copy no DJ software and carry no brand mark. Colour never carries meaning here: the tag text is the source.' }),
    ]));
    root.appendChild(sizeCheck());
    const status = h('p', { class: 'icons-status body', role: 'status', text: 'Reading the sprite…' });
    root.appendChild(status);
    loadSprite().then((sprite) => {
      if (!root.isConnected) return;
      meta.textContent = `${sprite.total} symbols · ${sprite.bySource.lucide} Lucide (ISC) · ${sprite.bySource.original} original · ${sprite.groups.length} groups · theme ${ctx.prototype.theme} · tier ${ctx.prototype.tier}`;
      status.remove();
      for (const g of sprite.groups) {
        const sec = h('section', { class: 'icons-group', 'aria-label': g.title });
        sec.appendChild(h('div', { class: 'icons-group__head ink-backing' }, [
          h('h2', { class: 'title icons-group__title', text: g.title }),
          h('span', { class: 'icons-meta muted', text: `${g.symbols.length} ${g.symbols.length === 1 ? 'symbol' : 'symbols'}` }),
        ]));
        sec.appendChild(h('ul', { class: 'icons-grid' }, g.symbols.map(card)));
        root.appendChild(sec);
      }
    }).catch((err) => {
      console.error('foundation/icons: sprite failed to load', err);
      status.textContent = `The sprite could not be read: ${err.message}. Serve the prototype over HTTP (python3 design/tools/serve.py).`;
      status.classList.add('icons-status--error');
    });
    return root;
  },
});
