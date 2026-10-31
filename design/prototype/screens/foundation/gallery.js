// Component gallery: every registered component in every declared state.
// Components provide `static samples = { default: {...attrs}, <state>: {...attrs} }`
// so the gallery (and the audit) can render each state with sensible inputs.
import { register } from '../../app/registry.js';
import { registry, h } from '../../components/base.js';
const components = registry.components;
const families = {
  "transport-pads": [
    "mdj-transport",
    "mdj-pad",
    "mdj-pad-bank",
    "mdj-xy-pad",
    "mdj-loop-controls",
    "mdj-step-grid",
    "mdj-stem-strip",
    "mdj-sample-slot",
    "mdj-sample-bank"
  ],
  "data": [
    "mdj-chip",
    "mdj-badge",
    "mdj-art",
    "mdj-section-header",
    "mdj-search-bar",
    "mdj-filter-bar",
    "mdj-load-target",
    "mdj-library-row",
    "mdj-crate-row",
    "mdj-queue-item",
    "mdj-progress-row",
    "mdj-empty-state",
    "mdj-skeleton",
    "mdj-toast",
    "mdj-sheet",
    "mdj-settings-row",
    "mdj-save-bar",
    "mdj-workspace-switcher"
  ],
  "routing-av": [
    "mdj-route-chip",
    "mdj-route-diagram",
    "mdj-route-card",
    "mdj-caption-line",
    "mdj-video-frame",
    "mdj-singer-row",
    "mdj-broadcast-state",
    "mdj-mic-strip",
    "mdj-plugin-slot",
    "mdj-display-target"
  ],
  "controls": [
    "mdj-dial",
    "mdj-fader",
    "mdj-pitch-rail",
    "mdj-jog",
    "mdj-value-inspector",
    "mdj-crossfader"
  ],
  "parday": [
    "mdj-provenance-tag",
    "mdj-parday-card",
    "mdj-parday-message",
    "mdj-parday-arm-panel",
    "mdj-stop-automation",
    "mdj-parday-quick-actions",
    "mdj-parday-input",
    "mdj-parday-button"
  ],
  "waveform": [
    "mdj-marker",
    "mdj-waveform",
    "mdj-deck-summary",
    "mdj-beat-phase",
    "mdj-time-display",
    "mdj-zoom-controls",
    "mdj-meter"
  ]
};

register({
  id: 'foundation/gallery',
  family: 'foundation',
  title: 'Component gallery',
  order: 1,
  fr: [],
  shell: false,
  states: { all: { label: 'All components, all states', exercised: true }, ...Object.fromEntries(Object.keys(families).map(f => [f, { label: `${f} family`, exercised: true, via: { from: 'all', control: f } }])) },
  render(ctx) {
    const root = h('div', { class: 'gallery stage' });
    root.appendChild(h('header', {}, [
      h('h1', { class: 'title gallery__title', text: 'Component gallery' }),
      h('p', { class: 'gallery__meta', text: `${components.length} components · theme ${ctx.prototype.theme} · tier ${ctx.prototype.tier} · every value shown is a fixture` }),
    ]));
    const nav = h('nav', { class: 'gallery__nav', 'aria-label': 'Component families' });
    for (const f of ['all', ...Object.keys(families)]) nav.appendChild(h('a', { class: 'btn', href: ctx.hrefFor('foundation/gallery', { state: f }), dataset: { hit: '48' }, text: f, 'aria-current': ctx.state === f ? 'page' : null }));
    root.appendChild(nav);
    for (const cls of components.filter(c => !families[ctx.state] || families[ctx.state].includes(c.tag))) {
      if (cls.tag === 'mdj-fixture-mark') continue;
      const sec = h('section', { class: 'gallery__component glass', style: { padding: '12px' } });
      sec.appendChild(h('h2', { class: 'title', style: { fontSize: 'var(--fs-md)', margin: 0 }, text: cls.tag }));
      sec.appendChild(h('p', { class: 'gallery__meta', text: `hit ${cls.hit || 'n/a'} · FR ${cls.fr.join(', ') || '—'} · states ${cls.states.length}` }));
      const list = h('div', { class: 'gallery__states' });
      const samples = cls.samples || {};
      for (const state of cls.states) {
        const row = h('div', { class: 'gallery__state' }, [h('span', { class: 'gallery__state-name', text: state })]);
        const sample = h('div', { class: 'gallery__sample' });
        const { variants: stateVariants, ...stateSample } = state === 'default' ? {} : (samples[state] || {});
        const { variants: defaultVariants, ...defaults } = samples.default || {};
        const variants = stateVariants || samples.variants || defaultVariants || [{}];
        for (const variant of variants) {
          const attrs = { ...defaults, ...stateSample, ...variant, state };
          const el = document.createElement(cls.tag);
          for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v === true ? '' : String(v));
          sample.appendChild(el);
        }
        row.appendChild(sample);
        list.appendChild(row);
      }
      sec.appendChild(list);
      root.appendChild(sec);
    }
    return root;
  },
});
