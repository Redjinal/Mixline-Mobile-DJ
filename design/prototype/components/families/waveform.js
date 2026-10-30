// Component family manifest: waveform. Import each component module of this family here.
// Owned by the "waveform" component agent. Styles for the family live in waveform.css.
//
// Family: overview and detailed waveforms with markers, deck summary, beat / phase indicator, time
// display, zoom controls and the handed-over meter (components/mdj-meter.js; its base styles stay in
// app/app.css, the full-scale and cue additions are in waveform.css). Nothing here is wired to an
// engine: every waveform bin, beat, level and position is a labelled fixture, `position` and the other
// value attributes stand in for acknowledged engine state, and the only commands are emitted events
// (mdj:seek-preview, mdj:seek, mdj:scratch, mdj:zoom, mdj:time-mode) for a screen to interpret.
// Family members, in gallery order:
//   mdj-marker        cue / loop / grid / phrase / memory glyph (shape + number + colour)
//   mdj-waveform      canvas overview (whole track) and detailed window (playhead at the centre)
//   mdj-deck-summary  title, artist, BPM (pitched), key, time, flags, analysis status
//   mdj-beat-phase    four beat dots, bar numeral, phase offset against the leader deck
//   mdj-time-display  elapsed / remaining readout, tap toggles the mode
//   mdj-zoom-controls accessible zoom −/+ and Fit for the detailed waveform
//   mdj-meter         compact dock meter (unchanged), full-scale mixer meter, cue variant
import '../mdj-marker.js';
import '../mdj-waveform.js';
import '../mdj-deck-summary.js';
import '../mdj-beat-phase.js';
import '../mdj-time-display.js';
import '../mdj-zoom-controls.js';
import '../mdj-meter.js';
