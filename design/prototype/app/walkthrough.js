// The Document 19 §3 first-mix journey as an ordered list of scenes.
// Each scene names the screen, the state, the fixture scenario and the interaction
// that advances it. The caption bar sits outside the device canvas.
import { h, icon } from '../components/base.js';

export const scenes = [
  { n: 1, title: 'Open or resume', screen: 'launch/open', state: 'empty', scenario: 'fresh',
    caption: 'Empty library. Import is the primary action; Demo is offered because demo media exists in the fixture crate.',
    advance: 'Tap Import.' },
  { n: 2, title: 'Import', screen: 'launch/import', state: 'partial', scenario: 'set-ready',
    caption: 'Per-item validation and indexing. One failed and one unsupported file leave the valid imports available.',
    advance: 'Tap a ready track to inspect it.' },
  { n: 3, title: 'Prepare', screen: 'prep/track', state: 'uncertain', scenario: 'set-ready',
    caption: 'TIDE SIGNAL has a low-confidence grid after the bridge. The uncertainty is visible; nothing is presented as certain.',
    advance: 'Edit a cue, then keep the correction.' },
  { n: 4, title: 'Prepare — correction kept', screen: 'prep/track', state: 'edited', scenario: 'set-ready',
    caption: 'The corrected cue is saved and the grid edit is locked; reanalysis cannot overwrite it silently. Undo remains available.',
    advance: 'Continue to the output check.' },
  { n: 5, title: 'Check output', screen: 'route/check', state: 'speaker', scenario: 'set-ready',
    caption: 'Phone speaker: master only, not a cue route. The limit is explained and master playback stays available.',
    advance: 'Continue to Perform.' },
  { n: 6, title: 'Perform — load deliberately', screen: 'perform/ab', state: 'protected-load', scenario: 'a-playing',
    caption: 'Deck A is audible. Loading onto it asks for confirmation; Deck B is the suggested free destination.',
    advance: 'Load to B, then cue and align.' },
  { n: 7, title: 'Perform — transition', screen: 'perform/ab', state: 'transition', scenario: 'transition',
    caption: 'Both decks running; the crossfader moves toward B. Transport, crossfader, route and meters stay reachable while browsing.',
    advance: 'Open Record.' },
  { n: 8, title: 'Record', screen: 'rec/panel', state: 'recording', scenario: 'recording',
    caption: 'Eligible recording with elapsed time, format and storage estimate from the fixture. A writer failure would stop recording, not playback.',
    advance: 'Finish the set.' },
  { n: 9, title: 'Finish and save', screen: 'rec/history', state: 'saved', scenario: 'set-ready',
    caption: 'Session log and recording are saved with honest states; the set can be reopened later.',
    advance: 'See what recovery looks like.' },
  { n: 10, title: 'Recover — output lost', screen: 'system/recovery', state: 'route-lost', scenario: 'route-lost',
    caption: 'The output disappeared. Decks are paused and muted; cue was not rerouted to the speaker. Resume is a deliberate action.',
    advance: 'Resume a saved session with a missing file.' },
  { n: 11, title: 'Recover — saved session', screen: 'launch/open', state: 'resume-missing', scenario: 'missing-media',
    caption: 'A saved session shows the missing file honestly and requires deliberate audible resume. Cues and crate entries are preserved.',
    advance: 'End of the walkthrough.' },
];

export function renderWalkBar(index, ctx) {
  const sc = scenes[index];
  const bar = h('div', { class: 'walkbar glass', role: 'region', 'aria-label': 'Walkthrough' });
  bar.appendChild(h('a', { class: 'btn btn--icon', href: index > 0 ? `#/walk/${index}` : '#/', 'aria-label': index > 0 ? 'Previous scene' : 'Back to index', dataset: { hit: '48' } }, [icon('chevron-left')]));
  bar.appendChild(h('div', { class: 'walkbar__text' }, [
    h('p', { class: 'label label-strong', text: `Scene ${sc.n} of ${scenes.length} — ${sc.title}` }),
    h('p', { class: 'body walkbar__caption', text: sc.caption }),
    h('p', { class: 'body muted walkbar__advance' }, [h('strong', { text: 'Next: ' }), sc.advance, ` (${ctx.screen.id} · ${ctx.state})`]),
  ]));
  bar.appendChild(h('a', { class: 'btn btn--icon', href: index < scenes.length - 1 ? `#/walk/${index + 2}` : '#/', 'aria-label': index < scenes.length - 1 ? 'Next scene' : 'Back to index', dataset: { hit: '48' } }, [icon('chevron-right')]));
  return bar;
}
