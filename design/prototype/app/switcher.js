// State switcher: the panel outside the device that changes theme, tier, motion,
// font scale, orientation, viewport, scenario, hit-bound overlay and the current
// screen/state. On a phone it collapses to a floating button.
import * as State from './state.js';
import { byFamily, FAMILIES, getScreen } from './registry.js';
import { fixtures } from './fixtures.js';
import { h, icon } from '../components/base.js';
import { hrefFor, parseHash, navigate, currentRoute } from './router.js';

const LABELS = {
  theme: { daylight: 'Daylight', lowlight: 'Low-light', contrast: 'High contrast' },
  tier: { essential: 'Essential', balanced: 'Balanced', enhanced: 'Enhanced' },
  motion: { full: 'Full', reduced: 'Reduced' },
  fontscale: { 100: '100 %', 130: '130 %', 200: '200 %' },
  orientation: { portrait: 'Portrait', landscape: 'Landscape' },
  viewport: { default: '412 × 892 (assumed)', tall: '412 × 915 (assumed)', fill: 'Fill this window' },
  hitbounds: { on: 'Shown', off: 'Hidden' },
  insets: { on: 'Shown', off: 'Hidden' },
  frame: { on: 'Shown', off: 'Hidden' },
};

let host;

export function init(hostEl) {
  host = hostEl;
  render();
  State.subscribe(render);
  window.addEventListener('hashchange', render);
  document.addEventListener('mdj:rendered', render);
}

function select(name, value, options, onChange, label) {
  const sel = h('select', { class: 'sw__select', 'aria-label': label, dataset: { hit: '48' }, on: { change: (e) => onChange(e.target.value) } });
  for (const [v, text] of options) sel.appendChild(h('option', { value: v, selected: v === value ? true : null, text }));
  return h('label', { class: 'sw__field' }, [h('span', { class: 'label', text: label }), sel]);
}

function render() {
  if (!host) return;
  const st = State.get();
  const route = parseHash();
  const cur = currentRoute();
  const panel = h('div', { class: 'sw' });

  panel.appendChild(h('div', { class: 'sw__head' }, [
    h('a', { class: 'sw__home', href: '#/', dataset: { hit: '48' } }, [icon('home'), h('span', { text: 'Index' })]),
    h('a', { class: 'sw__home', href: '#/walk/1', dataset: { hit: '48' } }, [icon('route'), h('span', { text: 'Walkthrough' })]),
    h('a', { class: 'sw__home', href: '#/gallery', dataset: { hit: '48' } }, [icon('grid'), h('span', { text: 'Gallery' })]),
  ]));

  // Screen + state
  const screenOpts = [['', '— choose —']];
  for (const [famId, list] of Object.entries(byFamily())) for (const sc of list) screenOpts.push([sc.id, `${FAMILIES[famId].title.split(',')[0]} · ${sc.title}`]);
  const curId = route.kind === 'screen' ? route.id : (cur?.id || '');
  panel.appendChild(select('screen', curId, screenOpts, (v) => v && navigate(v), 'Screen'));
  const scr = curId ? getScreen(curId) : null;
  if (scr) {
    const stateOpts = Object.entries(scr.states).map(([k, v]) => [k, `${v.label}${v.exercised ? '' : ' (drawn)'}`]);
    panel.appendChild(select('state', cur?.state || scr.defaultState, stateOpts, (v) => navigate(scr.id, { state: v }), 'State'));
    panel.appendChild(h('p', { class: 'sw__fr numeral', text: scr.fr.length ? scr.fr.join(' ') : 'no FR ids declared' }));
  }

  const simple = (name, label) => select(name, st[name], Object.entries(LABELS[name]), (v) => State.set({ [name]: v }), label);
  panel.appendChild(simple('orientation', 'Orientation'));
  panel.appendChild(simple('theme', 'Theme'));
  panel.appendChild(simple('tier', 'Rendering tier'));
  panel.appendChild(simple('motion', 'Motion'));
  panel.appendChild(simple('fontscale', 'Font scale'));
  panel.appendChild(simple('viewport', 'Viewport (unmeasured)'));
  const scenOpts = Object.entries(fixtures.sessions?.scenarios || {}).map(([k, v]) => [k, v.label]);
  if (scenOpts.length) panel.appendChild(select('scenario', st.scenario, scenOpts, (v) => State.set({ scenario: v }), 'Fixture scenario'));
  panel.appendChild(simple('hitbounds', 'Hit bounds'));
  panel.appendChild(simple('insets', 'Inset guides'));
  panel.appendChild(simple('frame', 'Device frame'));

  const link = new URL(location.href);
  const [path, query = ''] = link.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(st)) params.set(key === 'orientation' ? 'o' : key, value);
  link.hash = `${path}?${params}`;
  panel.appendChild(h('div', { class: 'sw__foot' }, [
    h('button', { type: 'button', class: 'btn', dataset: { hit: '48' }, on: { click: async (event) => {
      const button = event.currentTarget;
      try { await navigator.clipboard.writeText(String(link)); button.textContent = 'Link copied'; }
      catch { button.textContent = 'Copy unavailable — use the address bar'; }
    } } }, ['Copy link to this state']),
    h('p', { class: 'body muted sw__note', text: 'Prototype only. 1 CSS px = 1 dp in a phone browser. Viewport sizes are assumptions until the S26 Ultra is measured.' }),
  ]));

  host.replaceChildren(panel);
}
