// Component family manifest: parday. Import each component module of this family here.
// Owned by the "parday" component agent. Styles for the family live in parday.css (the handed-over
// mdj-parday-button keeps its base styles in app/app.css; its additions are in parday.css).
//
// Family: the assistant's structured proposal cards, conversation messages, field-level provenance
// tags, the arm panel for a bounded transition plan, the persistent Stop automation control, the
// task-specific quick actions, the typed input with voice visibly off, and the ParDay access button.
// Binding rules carried by every member (Documents 03 §6 and 13): read/propose until a specific
// bounded plan is armed; Preview / Apply to preparation / Arm transition are separate actions; each
// actionable proposal states affected deck/track, source eligibility, intended effect, timing and
// whether it can be undone; audible history is never "undoable"; a stale proposal becomes reviewable
// again and never silently retargets; cancel names what was already applied; voice is off in Perform
// and never injected into the master; every claim carries provenance; Spotify-derived fields are
// excluded by default and printed as excluded.
// Nothing here is wired to a model or an engine: proposals, plans, bindings, timestamps, countdowns,
// frames and costs come from fixtures/parday.json (FIXTURE marks on the cards, messages and arm panel);
// pending = dashed SENT, acknowledged = solid state word; the only commands are emitted events
// (mdj:parday-action, mdj:parday-arm, mdj:stop-automation, mdj:parday-quick, mdj:parday-send,
// mdj:parday-cancel, mdj:parday-voice, mdj:parday-message, mdj:open-parday) for screens.
// Family members, in gallery order:
//   mdj-provenance-tag        measured / you / retrieved / inferred / excluded — shape + word + icon
//   mdj-parday-card           proposal card: crate, cue, transition, route, readiness, acquisition × lifecycle
//   mdj-parday-message        conversation bubble with provenance, timestamps, local-only / error / thinking
//   mdj-parday-arm-panel      A→B plan: markers, bars, tempo envelope, gain ceiling, expiry, bound state
//   mdj-stop-automation       persistent high-contrast Stop automation (56 dp; 48 dp compact)
//   mdj-parday-quick-actions  five task-specific 48 dp chips with offline / one-at-a-time / limit states
//   mdj-parday-input          text field + Send + Voice visibly off with its one-line explanation
//   mdj-parday-button         handed-over access button with every state as text, incl. armed
import '../mdj-provenance-tag.js';
import '../mdj-parday-card.js';
import '../mdj-parday-message.js';
import '../mdj-parday-arm-panel.js';
import '../mdj-stop-automation.js';
import '../mdj-parday-quick-actions.js';
import '../mdj-parday-input.js';
import '../mdj-parday-button.js';
