// Component family manifest: controls. Import each component module of this family here.
// Owned by the "controls" component agent. Styles for the family live in controls.css.
//
// Family: dials, faders, pitch rail, jog, value inspector and the handed-over crossfader.
// Every control documents its engine binding, units, gesture, pending/acknowledged
// behaviour, cancellation path and accessible alternative in its file header. None of
// them is wired to an engine: `value` attributes stand in for acknowledged engine state
// and `pending-value` for a sent, unacknowledged command.
import '../mdj-dial.js';
import '../mdj-fader.js';
import '../mdj-pitch-rail.js';
import '../mdj-jog.js';
import '../mdj-value-inspector.js';
import '../mdj-crossfader.js';
