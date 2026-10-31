// Screen family manifest: performance. Import each screen module of this family here.
// Owned by the "performance" screen agent. Family styles live in performance.css.
// ab.js loads fixtures/performance.json (top-level await) and exports the helpers the other
// performance screens share, so it is imported first.
import './ab.js';
import './focus-map.js';
import './mixer.js';
import './master.js';
