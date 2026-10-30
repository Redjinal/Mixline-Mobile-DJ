// Component family manifest: transport-pads. Import each component module of this family here.
// Owned by the "transport-pads" component agent. Styles for the family live in transport-pads.css.
//
// Foundation hand-over: components/mdj-transport.js is owned by this family (its base styles stay in
// app/app.css; the stop kind and the label-less variant are styled in transport-pads.css).
// Family members, in gallery order:
//   mdj-pad            one performance pad (eight modes, nine states)
//   mdj-pad-bank       eight pads + mode selector + bank selector, normal / edit
//   mdj-xy-pad         FX XY surface with momentary / latch, engage / bypass and slider alternative
//   mdj-loop-controls  In / Out / Reloop–Exit, ½ / ×2, roll lengths, beat jump, loop-length readout
//   mdj-step-grid      step sequencer lanes with velocity, mute, revisions and quantized transport
//   mdj-stem-strip     four stems with mute / solo / gain and readiness reasons
//   mdj-sample-slot    one sampler slot (one-shot / loop / gate, choke group)
//   mdj-sample-bank    sixteen slots over two banks, choke legend, Stop all
import '../mdj-transport.js';
import '../mdj-pad.js';
import '../mdj-pad-bank.js';
import '../mdj-xy-pad.js';
import '../mdj-loop-controls.js';
import '../mdj-step-grid.js';
import '../mdj-stem-strip.js';
import '../mdj-sample-slot.js';
import '../mdj-sample-bank.js';
