// Component gallery: every registered component in every declared state.
// Components provide `static samples = { default: {...attrs}, <state>: {...attrs} }`
// so the gallery (and the audit) can render each state with sensible inputs.
import { register } from '../../app/registry.js';
import { registry, h } from '../../components/base.js';
const components = registry.components;

register({
  id: 'foundation/gallery',
  family: 'foundation',
  title: 'Component gallery',
  order: 1,
  fr: [],
  shell: false,
  states: { all: { label: 'All components, all states', exercised: true } },
  render(ctx) {
    const root = h('div', { class: 'gallery stage' });
    root.appendChild(h('header', {}, [
      h('h1', { class: 'title gallery__title', text: 'Component gallery' }),
      h('p', { class: 'gallery__meta', text: `${components.length} components · theme ${ctx.prototype.theme} · tier ${ctx.prototype.tier} · every value shown is a fixture` }),
    ]));
    for (const cls of components) {
      if (cls.tag === 'mdj-fixture-mark') continue;
      const sec = h('section', { class: 'gallery__component glass', style: { padding: '12px' } });
      sec.appendChild(h('h2', { class: 'title', style: { fontSize: 'var(--fs-md)', margin: 0 }, text: cls.tag }));
      sec.appendChild(h('p', { class: 'gallery__meta', text: `hit ${cls.hit || 'n/a'} · FR ${cls.fr.join(', ') || '—'} · states ${cls.states.length}` }));
      const list = h('div', { class: 'gallery__states' });
      const samples = cls.samples || {};
      const variants = Array.isArray(samples.variants) ? samples.variants : [{}];
      for (const state of cls.states) {
        const row = h('div', { class: 'gallery__state' }, [h('span', { class: 'gallery__state-name', text: state })]);
        const sample = h('div', { class: 'gallery__sample' });
        for (const variant of variants) {
          const stateSample = state === 'default' ? {} : (samples[state] || {});
          const attrs = { ...(samples.default || {}), ...variant, ...stateSample, state };
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
