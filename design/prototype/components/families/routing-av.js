// Component family manifest: routing-av. Import each component module of this family here.
// Owned by the "routing-av" component agent. Styles for the family live in routing-av.css.
//
// Family: output-route diagrams and cards, the shell's route chip, video preview / program frames, karaoke
// caption lines and singer rows, the broadcast state block, the microphone strip, plugin-rack slots and the
// external display target (Documents 03 §2 / §7, 06 AE-07, 15 §3–§6, 19 §4 "routing" and "av").
// Nothing here is wired to an engine, a decoder, an encoder, a microphone or a display: route descriptors come
// from fixtures/routes.json, video / karaoke / broadcast / mic / display data from fixtures/av.json and plugin
// records from fixtures/plugins.json. Frame counts, bitrates, delays, levels, latency and CPU figures are
// fixtures and the components that print them carry a FIXTURE mark (<mdj-video-frame>, <mdj-broadcast-state>,
// <mdj-plugin-slot>; <mdj-mic-strip> embeds the shared <mdj-meter>, which prints its own). The route diagram is
// a drawing of a descriptor, not a measurement, and says so. Sent states are printed stamps (CHECKING, SELECTED,
// SENT, LOADING, VERIFYING); nothing animates to imply success. Commands are emitted events for screens:
// mdj:open-route, mdj:route-action, mdj:singer-move / -remove / -action, mdj:broadcast / mdj:broadcast-bus,
// mdj:mic / mdj:mic-input / mdj:value (mic-gain), mdj:plugin, mdj:display.
// Family members, in gallery order:
//   mdj-route-chip        shell route status (handed over from the foundation; API unchanged)
//   mdj-route-diagram     AS-23 vector: phone → device → outputs, channel labels, master / cue, tradeoffs
//   mdj-route-card        one route to review: status word + shape, summary, tradeoffs, diagram, 48 dp actions
//   mdj-caption-line      line- or word-timed karaoke caption, offset / language / visibility flags
//   mdj-video-frame       Preview on this device vs Program output, declared fallbacks, placeholder picture
//   mdj-singer-row        singer-queue entry with protected active row, Local stage-name badge
//   mdj-broadcast-state   destination, buses, connection word + shape, fixture metrics, Start / Stop (56)
//   mdj-mic-strip         input, gain rail, fixture meter, Mute (56) / Monitor / Talkover / Duck, assignment
//   mdj-plugin-slot       plugin contract, latency / CPU fixtures, isolation model, Bypass, failure text
//   mdj-display-target    external display status with the "verified before live" rule
import '../mdj-route-chip.js';
import '../mdj-route-diagram.js';
import '../mdj-route-card.js';
import '../mdj-caption-line.js';
import '../mdj-video-frame.js';
import '../mdj-singer-row.js';
import '../mdj-broadcast-state.js';
import '../mdj-mic-strip.js';
import '../mdj-plugin-slot.js';
import '../mdj-display-target.js';
