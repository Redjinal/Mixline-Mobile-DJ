// <mdj-queue-item track="copper" position="2" total="5" deck="B" reason="file missing" transition="Blend · 16 bars"
//                 bars="16" state="next|ready|not-ready|current|committed|locked|missing|expired">
//
// One queue / automix entry (FR-032; Document 03 §4 "Queue reorder": drag by a handle; the current item
// and a committed next transition have defined protection; Move Up / Move Down are the accessible
// alternative). The readiness line is printed text with an icon ("Not ready: file missing"), never a
// colour alone. Readiness, deck target and the bar countdown are FIXTURE values → FIXTURE mark.
// Engine binding: reordering sends QueueCommand(move, { entryId, from, to, queueRevision }); the engine's
// acknowledgement decides whether a late change took effect (the owning screen reprints `position`). The
// drag handle and the Move buttons emit mdj:queue-move { trackId, from, to, via }. No transport command.
//   next       — the next entry; ready; loads to `deck` when the current track ends (automix) or on Load
//   ready      — a later entry whose file is available and analysed
//   not-ready  — "Not ready: <reason>" (file missing / permission missing / analysis pending / unsupported)
//   current    — playing now on `deck`; PROTECTED: handle hidden, Move buttons unavailable with the reason
//   committed  — the transition to this entry is committed (`bars` until it starts); PROTECTED like
//                current; the screen's manual takeover is the way out (Stop automation)
//   locked     — the entry cannot move (e.g. pinned by the set plan); Move unavailable with the reason
//   missing    — the file is missing; readiness says cues are preserved
//   expired    — an edit to this entry was not acknowledged before the engine moved on: "Expired edit —
//                reapply"; moving it again sends a fresh command with the new revision
// Units / range: position 1..total; bars is a whole number of bars. Gesture: drag on the handle (pointer,
// touch-action none) or tap Move up / Move down (48 dp). Pending vs acknowledged: a move prints SENT on
// the item until the queue revision comes back (owning screen); nothing here animates into place.
// Cancellation: pointer-cancel / capture loss drops the drag, the item stays at its acknowledged position.
// Accessible: listitem "2 of 5, COPPER SKY by Halden Vale, 124.0 BPM, key 8A, ready, loads to Deck B";
// "Move COPPER SKY up to position 1"; protected items: "Move unavailable: current item is protected".
import { MdjElement, define, h, icon, fmt } from './base.js';
import { fixtures } from '../app/fixtures.js';
import { iconId } from './mdj-marker.js';
import './mdj-art.js';

const STATES = ['next', 'ready', 'not-ready', 'current', 'committed', 'locked', 'missing', 'expired'];

export class MdjQueueItem extends MdjElement {
  static tag = 'mdj-queue-item';
  static states = STATES;
  static fr = ['FR-032', 'FR-035'];
  static hit = 48;
  static fixture = true;
  static observed = ['track', 'position', 'total', 'deck', 'reason', 'transition', 'bars', 'sent'];
  static samples = {
    default: { track: 'copper', position: 2, total: 5, deck: 'B', style: 'width:100%' },
    variants: [{}],
    next: { track: 'copper', position: 2, deck: 'B', transition: 'Blend · 16 bars' },
    ready: { track: 'calypso', position: 3, deck: '' },
    'not-ready': { track: 'glasswork', position: 4, reason: 'analysis pending' },
    current: { track: 'aurora', position: 1, deck: 'A' },
    committed: { track: 'copper', position: 2, deck: 'B', bars: 16, transition: 'Blend · 16 bars' },
    locked: { track: 'longtitle', position: 5, reason: 'pinned as the closer' },
    missing: { track: 'brass', position: 3 },
    expired: { track: 'drift', position: 4, deck: 'B' },
  };

  render() {
    const id = this.attr('track', '');
    const track = id ? fixtures.track(id) : null;
    const position = Math.max(1, Math.round(this.num('position', 1)));
    const total = Math.max(position, Math.round(this.num('total', position)));
    const deck = this.attr('deck', '').toUpperCase();
    const reason = this.attr('reason', '');
    const transition = this.attr('transition', '');
    const bars = this.hasAttribute('bars') ? Math.max(0, Math.round(this.num('bars', 0))) : null;
    const sent = this.bool('sent');
    const given = this.getAttribute('state');
    let state = given && STATES.includes(given) ? given : 'ready';
    if (!given && track) { if (track.availability !== 'ready') state = track.availability === 'missing' ? 'missing' : 'not-ready'; else if (track.analysis === 'pending') state = 'not-ready'; }
    const protectedItem = state === 'current' || state === 'committed' || state === 'locked';
    this.className = `queue-item queue-item--${state}${protectedItem ? ' queue-item--protected' : ''}${deck ? ` deck-${deck.toLowerCase()}` : ''}${sent ? ' queue-item--sent' : ''}`;
    delete this.dataset.hit; // the handle and the Move buttons are the targets

    const title = track?.title || 'Unknown track';
    const artist = track?.artist || '';
    const analysed = !!track && track.analysis === 'complete';
    const bpm = analysed ? fmt.bpm(track.bpm) : '—';
    const key = analysed ? track.key : '—';
    const time = track ? fmt.time(track.durationSec) : '—';
    const notReadyReason = reason || (track?.availability === 'missing' ? 'file missing' : track?.availability === 'permission-missing' ? 'permission missing' : track?.availability === 'unsupported' ? 'unsupported format' : track?.analysis === 'pending' ? 'analysis pending' : 'not available');

    let rIcon = 'check', rText = 'Ready', tone = 'ok', protectText = '';
    if (state === 'next') { rIcon = 'queue'; rText = `Next · ready${deck ? ` · loads to Deck ${deck}` : ''}${transition ? ` · ${transition}` : ''}`; tone = 'ok'; }
    else if (state === 'ready') { rIcon = 'check'; rText = `Ready · file available${analysed ? '' : ' · analysis pending'}`; tone = 'ok'; }
    else if (state === 'not-ready') { rIcon = 'unavailable'; rText = `Not ready: ${notReadyReason}`; tone = 'critical'; }
    else if (state === 'current') { rIcon = 'play'; rText = `Current · playing on Deck ${deck || '?'} — protected`; tone = 'info'; protectText = 'current item is protected'; }
    else if (state === 'committed') { rIcon = 'arm'; rText = `Committed · transition to Deck ${deck || '?'}${bars != null ? ` starts in ${bars} ${bars === 1 ? 'bar' : 'bars'}` : ''}${transition ? ` · ${transition}` : ''} — protected`; tone = 'info'; protectText = 'committed transition; use Stop automation to take over'; }
    else if (state === 'locked') { rIcon = 'lock'; rText = `Locked · ${reason || 'cannot be moved'}`; tone = 'neutral'; protectText = reason || 'locked'; }
    else if (state === 'missing') { rIcon = 'unavailable'; rText = 'Not ready: file missing · cues and queue position are preserved'; tone = 'critical'; }
    else if (state === 'expired') { rIcon = iconId('expiry', 'clock'); rText = 'Expired edit · the engine moved on before this change was acknowledged — reapply'; tone = 'warning'; }

    const moveName = (dir) => protectedItem ? `Move unavailable: ${protectText}` : `Move ${title} ${dir} to position ${dir === 'up' ? position - 1 : position + 1}`;
    const canUp = !protectedItem && position > 1, canDown = !protectedItem && position < total;
    const move = (dir) => { const to = dir === 'up' ? position - 1 : position + 1; if ((dir === 'up' && canUp) || (dir === 'down' && canDown)) this.emit('mdj:queue-move', { trackId: id, from: position, to, via: 'button' }); };
    const moveBtn = (dir) => h('button', {
      type: 'button', class: `queue-item__move queue-item__move--${dir}`, dataset: { hit: '48' }, 'aria-label': moveName(dir),
      'aria-disabled': (dir === 'up' ? canUp : canDown) ? undefined : 'true', on: { click: () => move(dir) },
    }, [icon(dir === 'up' ? 'arrow-up' : 'arrow-down', { size: 18 })]);

    const handle = protectedItem
      ? h('span', { class: 'queue-item__handle queue-item__handle--locked', 'aria-hidden': 'true' }, [icon('lock', { size: 16 })])
      : h('span', { class: 'queue-item__handle', 'aria-hidden': 'true', dataset: { hit: '48' }, on: {
          pointerdown: (e) => { e.preventDefault(); this.classList.add('queue-item--dragging'); this.emit('mdj:queue-move', { trackId: id, from: position, to: null, via: 'handle', phase: 'start' }); },
          pointerup: () => { this.classList.remove('queue-item--dragging'); this.emit('mdj:queue-move', { trackId: id, from: position, to: null, via: 'handle', phase: 'end' }); },
          pointercancel: () => { this.classList.remove('queue-item--dragging'); this.emit('mdj:queue-move', { trackId: id, from: position, to: null, via: 'handle', phase: 'cancel' }); },
        } }, [icon('drag', { size: 18 })]);

    const nameParts = [`${position} of ${total}`, `${title}${artist ? ' by ' + artist : ''}`, analysed ? `${bpm} BPM, key ${key}` : 'analysis pending', rText.replace(/ · /g, ', ').replace(' — ', ', ')];
    if (sent) nameParts.push('move sent, waiting for the queue to confirm');
    const main = h('div', { class: 'queue-item__main raised', role: 'listitem', 'aria-label': nameParts.join(', ') }, [
      handle,
      h('span', { class: 'queue-item__pos numeral', 'aria-hidden': 'true', text: String(position) }),
      h('mdj-art', { seed: id || 'none', size: 40, label: title }),
      h('div', { class: 'queue-item__body' }, [
        h('span', { class: 'queue-item__title title truncate', text: title, dataset: { pos: String(position) } }),
        h('span', { class: 'queue-item__artist truncate', text: artist }),
        h('span', { class: `queue-item__ready tone-${tone}` }, [icon(rIcon, { size: 12 }), h('span', { text: rText })]),
      ]),
      h('div', { class: 'queue-item__nums ink-backing', 'aria-hidden': 'true' }, [
        h('span', { class: 'numeral', text: bpm }), h('span', { class: 'numeral', text: key }), h('span', { class: 'numeral', text: time }),
      ]),
      h('div', { class: 'queue-item__moves' }, [moveBtn('up'), moveBtn('down')]),
      sent ? h('span', { class: 'queue-item__sent', text: 'SENT', 'aria-hidden': 'true' }) : null,
      deck ? h('span', { class: 'queue-item__deck numeral', 'aria-hidden': 'true', text: deck }) : null,
    ]);
    this.replaceChildren(main);
  }
}
define(MdjQueueItem);
