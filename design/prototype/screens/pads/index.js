// Screen family manifest: pads. Import each screen module of this family here.
// Owned by the "pads" screen agent. Family styles live in pads.css.
// pads/pads — pad bank for the focused deck (eight modes, banks, edit state, quantized pending)
// pads/loops — loop controls, roll, beat jump and saved loops over a detailed waveform window
// pads/fx — per-deck FX chain (3 slots), XY pad with Momentary/Latch, macro
// pads/stems — prepared stems per deck with readiness and full-mix fallback
import './pads.js';
import './loops.js';
import './fx.js';
import './stems.js';
