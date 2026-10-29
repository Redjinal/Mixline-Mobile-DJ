// Shell demo: a shell screen whose content explains the persistent performance shell.
// Used to validate the dock in both orientations and every fixture scenario before the
// performance family exists. Not part of the product's screen inventory.
import { register } from '../../app/registry.js';
import { h, fmt } from '../../components/base.js';

register({
  id: 'foundation/shell-demo',
  family: 'foundation',
  title: 'Persistent shell demo',
  order: 2,
  fr: ['FR-010', 'FR-012', 'FR-020', 'FR-021', 'FR-023', 'FR-033'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    'set-ready': { label: 'Two decks loaded', exercised: true, scenario: 'set-ready' },
    'a-playing': { label: 'A playing', exercised: false, scenario: 'a-playing' },
    'four-deck': { label: 'Four decks', exercised: false, scenario: 'four-deck' },
    'route-lost': { label: 'Route lost', exercised: false, scenario: 'route-lost' },
    recording: { label: 'Recording', exercised: false, scenario: 'recording' },
    clipping: { label: 'Clipping', exercised: false, scenario: 'clipping' },
    hot: { label: 'Thermal pressure', exercised: false, scenario: 'hot' },
  },
  render(ctx) {
    const s = ctx.session;
    const root = h('div', { class: 'shell-demo' });
    root.appendChild(h('div', { class: 'glass shell-demo__panel' }, [
      h('p', { class: 'label', text: 'Shell content area' }),
      h('p', { class: 'body', text: 'The workspace or library renders here. The dock below keeps deck selectors, Play/Cue for the focused pair, the crossfader, master metering and the Master button reachable (Document 03 §1).' }),
      h('p', { class: 'body muted', text: `Scenario: ${s.label}. Route: ${s.route.name}. Focus: ${s.focus.join(' / ')}. Orientation: ${ctx.orientation}.` }),
    ]));
    const decks = h('div', { class: 'glass shell-demo__panel' }, [h('p', { class: 'label', text: 'Deck state from the fixture scenario' })]);
    for (const d of Object.values(s.decks).filter((x) => x.enabled)) {
      decks.appendChild(h('p', { class: 'body' }, [
        h('strong', { text: `Deck ${d.letter}: ` }),
        d.track ? `${d.track.title} — ${d.state} at ${fmt.time(d.positionSec)} / ${fmt.time(d.track.durationSec)}` : 'empty',
      ]));
    }
    root.appendChild(decks);
    return root;
  },
});
