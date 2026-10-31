// Screen family manifest: recording. Import each screen module of this family here.
// Owned by the "recording" screen agent. Family styles live in recording.css.
//   rec/panel   — the mix recorder (shell screen): idle, recording, markers, format choice, restricted source,
//                 storage full, interrupted writer, finalizing
//   rec/history — saved sessions and recordings: saved, empty, incomplete recording, export, session detail,
//                 recovering segments
import './history.js';
import './panel.js';
