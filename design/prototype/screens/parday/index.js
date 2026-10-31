// Screen family manifest: parday. Import each screen module of this family here.
// Owned by the "parday" screen agent. Family styles live in parday.css.
//   parday/prepare — full-height Prepare conversation with structured proposal cards (not a shell screen)
//   parday/perform — compact Perform panel inside the shell: read/propose until a bounded plan is armed,
//                    persistent Stop automation, immediate manual takeover (the shell's ParDay button opens it)
//   parday/arm     — the arm sheet for plan P42 (shell screen)
// perform.js also exports the family's shared helpers, so it is imported first.
import './perform.js';
import './arm.js';
import './prepare.js';
