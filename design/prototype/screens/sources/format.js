// sources/format — format and quality choice before transfer (Document 16 §4–5, DLA-05; Document 14 §4
// "Acquire and prepare"; FR-049, FR-003). Shell screen, dock in both orientations.
//
// Readable options only: Keep source format, MP3 for compatibility, a rendition the source actually
// offers, and a lossless container. Every option prints the output encoding and an estimated size; the
// source panel prints the ACTUAL source codec and whether its bitrate was reported, measured or is
// unknown. A high output bitrate is never presented as proof of a high-quality original, and converting
// a lossy source to WAV/FLAC is labelled as not recovering detail. Download creates the job; nothing
// is published until the queue's verify and publish phases complete.
//
// States
//   options             SODA LIGHTS (Radio Edit): Opus 160 kbps reported by the source; Keep source selected
//   unknown-bitrate     HALCYON FERRY: the source reports no bitrate; size unknown until transfer
//   conversion-warning  FLAC chosen for a lossy Opus source: same sound, 5.8× the storage
import { register } from '../../app/registry.js';
import { h, icon, button, fmt } from '../../components/base.js';
import { AQ, withData, sourcesHead, note, dur, handoff } from './index.js';

const FR = ['FR-049', 'FR-003', 'FR-036'];

register({
  id: 'sources/format',
  family: 'sources',
  title: 'Choose format and quality',
  order: 3,
  fr: FR,
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    options: { label: 'Format options — source bitrate reported', exercised: true, scenario: 'set-ready', via: { from: 'sources/resolve:ambiguous', control: 'Choose Radio Edit' } },
    'unknown-bitrate': { label: 'Source bitrate unknown', exercised: true, scenario: 'set-ready', via: { from: 'sources/resolve:exact', control: 'Choose format' } },
    'conversion-warning': { label: 'Lossy → FLAC: no detail recovered', exercised: true, scenario: 'set-ready', via: { from: 'options', control: 'FLAC — lossless container' } },
  },
  defaultState: 'options',
  render(ctx) {
    const root = h('div', { class: `sources-page sources-format sources-format--${ctx.state}` });
    return withData(root, () => {
      const key = ctx.state === 'unknown-bitrate' ? 'halcyon' : (handoff.format || 'soda-radio');
      handoff.format = null;
      mount(ctx, root, key);
    });
  },
});

function mount(ctx, root, key) {
  const f = AQ.formats[key];
  const view = { sel: ctx.state === 'conversion-warning' ? 'flac' : 'keep' };
  const keep = f.options.find((o) => o.id === 'keep');
  const live = h('p', { class: 'sources-sr', role: 'status', 'aria-live': 'polite' });
  const backTo = key === 'halcyon' ? 'exact' : key === 'marlin' ? 'probable' : key === 'collection' ? 'collection-selection' : 'ambiguous';
  const head = sourcesHead(ctx, { title: 'Choose format', step: 'format', back: () => ctx.navigate('sources/resolve', { state: backTo }), backName: 'Back to Resolve' });

  const unknownRate = f.facts.bitrate === 'unknown';
  const source = h('section', { class: 'sources-panel raised', 'aria-labelledby': 'sources-src-t' }, [
    h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'label', text: 'Actual source' }), h('span', { class: 'flag label tone-neutral' }, [icon('video', { size: 11 }), h('span', { text: f.source })])]),
    h('h2', { id: 'sources-src-t', class: 'title sources-requested__title wrap-2', text: f.title }),
    h('div', { class: 'sources-fixture-box' }, [
      h('dl', { class: 'sources-facts sources-facts--grid' }, [
        fact('Source codec', `${f.facts.codec} in ${f.facts.container}`),
        fact('Source bitrate', h('span', {}, [h('span', { class: `numeral${unknownRate ? ' sources-unknownword' : ''}`, text: f.facts.bitrate }), h('span', { class: 'sources-hint', text: ` · ${f.facts.bitrateBasis}` })])),
        fact('Sample rate · channels', `${f.facts.sampleRate} · ${f.facts.channels}`),
        fact('Duration', h('span', { class: 'numeral', text: dur(f.facts.durationSec) })),
      ]),
      h('mdj-fixture-mark', { for: 'source media facts' }),
    ]),
    h('div', { class: 'sources-retention' }, [
      h('p', { class: 'label', text: 'Artwork and metadata' }),
      h('ul', { class: 'sources-bullets' }, AQ.formats.retention.map((t) => h('li', { text: t }))),
    ]),
  ]);

  const opts = h('div', { class: 'sources-opts', role: 'radiogroup', 'aria-labelledby': 'sources-opts-t' });
  const detail = h('div', { class: 'sources-optdetail' });
  const dest = h('dl', { class: 'sources-facts sources-facts--grid sources-dest' });

  function size(o) {
    if (o.storageBytes == null) return o.storageText || 'unknown until transfer';
    return `about ${fmt.bytes(o.storageBytes)}${o.estimateNote ? ' (estimate)' : ''}`;
  }

  function paint() {
    opts.replaceChildren(...f.options.map((o) => {
      const id = `sources-opt-${o.id}`;
      const input = h('input', { id, type: 'radio', name: 'sources-format', value: o.id, class: 'sources-opt__radio', checked: view.sel === o.id ? true : null, 'aria-label': o.label, 'aria-describedby': `${id}-d`, dataset: { hit: '48', fr: 'FR-049' } });
      input.addEventListener('change', () => {
        if (o.id === 'flac' && ctx.state === 'options' && key === 'soda-radio') { ctx.setState('conversion-warning'); return; }
        if (o.id !== 'flac' && ctx.state === 'conversion-warning') { ctx.setState('options'); return; }
        view.sel = o.id; paint(); live.textContent = `${o.label} selected. ${size(o)}.`;
      });
      return h('label', { class: `sources-opt raised${view.sel === o.id ? ' is-selected' : ''}${o.id === 'flac' ? ' sources-opt--lossless' : ''}`, for: id }, [
        input,
        h('span', { class: 'sources-opt__dot', 'aria-hidden': 'true' }),
        h('span', { class: 'sources-opt__text' }, [
          h('span', { class: 'title sources-opt__t', text: o.label }),
          h('span', { id: `${id}-d`, class: 'sources-hint' }, [o.output, ' · ', h('strong', { class: 'sources-opt__size', text: size(o) }), '. ', o.note]),
        ]),
      ]);
    }));
    const sel = f.options.find((o) => o.id === view.sel);
    const out = [];
    if (sel.id === 'flac') {
      const ratio = keep?.storageBytes && sel.storageBytes ? (sel.storageBytes / keep.storageBytes).toFixed(1) : null;
      out.push(h('div', { class: 'sources-warn', role: 'alert' }, [
        h('p', { class: 'sources-warn__t' }, [icon('warning', { size: 16 }), h('strong', { text: AQ.formats.honesty })]),
        h('p', { class: 'body', text: `The source is ${f.facts.codec}, a lossy format. FLAC stores that decoded sound exactly — ${size(sel)}${ratio ? `, ${ratio}× the source file` : ''} — but the detail the source discarded does not come back.` }),
        button({ label: 'Use Keep source format', icon: 'undo', cls: 'btn--secondary', fr: ['FR-049'], on: { click: () => { if (ctx.state === 'conversion-warning') ctx.setState('options'); else { view.sel = 'keep'; paint(); } } } }),
      ]));
    } else if (sel.id === 'mp3') {
      out.push(note('info', `A 320 kbps output does not prove a 320 kbps original: this file is made from ${f.facts.codec} at ${f.facts.bitrate}. The original is not kept unless you choose Keep source format.`));
    } else if (unknownRate && sel.id === 'keep') {
      out.push(note('info', 'Bitrate and size are unknown now. After transfer the app measures the file and prints the measured bitrate — it never fills in a guess.'));
    }
    if (sel.id !== 'flac') out.push(note('lock', AQ.formats.honesty));
    detail.replaceChildren(...out);
    dest.replaceChildren(fact('Saves to', f.destination), fact('Estimated storage', h('span', { class: 'numeral', text: size(sel) })), fact('Free on phone', f.free));
  }
  paint();

  const choose = h('section', { class: 'sources-panel raised sources-choose', 'aria-labelledby': 'sources-opts-t' }, [
    h('h2', { id: 'sources-opts-t', class: 'label sources-label', text: 'Output format' }),
    h('p', { class: 'sources-srcline' }, [h('span', { class: 'label', text: 'Source ' }), h('span', { class: 'numeral', text: `${f.facts.codec} · ${f.facts.bitrate}` }), h('span', { class: 'sources-hint', text: ` (${unknownRate ? 'not reported' : 'reported, not measured'}) · ${f.facts.sampleRate} · ${dur(f.facts.durationSec)}` })]),
    opts, detail, dest,
    h('div', { class: 'sources-actions sources-actions--sticky' }, [
      button({ label: 'Download', icon: 'download', hit: 56, cls: 'btn--primary sources-download', fr: ['FR-049'], on: { click: () => ctx.navigate('sources/queue', { state: 'active' }) } }),
      h('p', { class: 'sources-hint', text: 'Download adds a job to the queue. The file joins the library only after it is verified; it never loads onto a deck by itself.' }),
    ]),
  ]);

  // Portrait leads with the decision (a one-line source summary sits in it); landscape puts the full
  // source facts beside the options.
  const cols = [h('div', { class: 'sources-col sources-col--main' }, [source]), h('div', { class: 'sources-col sources-col--side' }, [choose])];
  if (ctx.orientation !== 'landscape') cols.reverse();
  root.replaceChildren(head, h('div', { class: 'sources-body sources-format__body' }, cols), live);
}

function fact(k, v) { return h('div', { class: 'sources-facts__row' }, [h('dt', { class: 'label', text: k }), h('dd', {}, [].concat(v))]); }
