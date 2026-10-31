// Screen family manifest: av. Import each screen module of this family here.
// Owned by the "av" screen agent. Family styles live in av.css.
//   av/video     — preview vs program, deck video modes, visual crossfader, transitions, captions, fallback, display
//   av/karaoke   — singer queue, active singer, lyrics with honest timing, key / tempo, return to DJ
//   av/broadcast — destination, buses, eligibility, test receiver, Start / Stop, congestion, restriction, rehearsal
//   av/mic       — mic strip, input, sends, permission, feedback risk, route change
// video.js also exports the family's shared layout helpers (avLayout, avSection, …).
import './video.js';
import './karaoke.js';
import './broadcast.js';
import './mic.js';
