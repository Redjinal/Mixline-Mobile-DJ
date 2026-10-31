// Component family manifest: data. Import each component module of this family here.
// Owned by the "data" component agent. Styles for the family live in data.css.
//
// Family: chips, badges, procedural artwork, library / crate rows, search and filter bars, empty states,
// skeletons, toasts, sheets, settings rows, the save bar, the workspace switcher, queue items, acquisition
// progress rows, section headers and the deliberate Load A/B/C/D destination control.
// Nothing here is wired to an engine or a source adapter: availability, counts, readiness, byte progress
// and analysis numerals are fixture values (rows that print them carry a FIXTURE mark), a "sent" state is
// a drawn SENT badge, and the only commands are emitted events (mdj:select, mdj:load-request, mdj:chip,
// mdj:chip-remove, mdj:search, mdj:filters-clear, mdj:action, mdj:toast-action, mdj:sheet-action,
// mdj:setting-change, mdj:save / mdj:discard / mdj:preview / mdj:reset, mdj:workspace, mdj:queue-move,
// mdj:progress-pause / mdj:progress-cancel / mdj:progress-retry, mdj:section-action) for screens.
// Family members, in gallery order:
//   mdj-chip                 capability (fail-closed), availability, removable filter, count and status chips
//   mdj-badge                actionable count: hidden zero, 1–99, 99+, unknown "?"
//   mdj-art                  deterministic procedural artwork placeholder (AS-15), loading skeleton, cached tag
//   mdj-section-header       heading + count + one action, busy / collapsed
//   mdj-search-bar           search field with clear and filters, results / no-results / offline, compact
//   mdj-filter-bar           removable filter chips with real / unknown counts and Clear all
//   mdj-load-target          Load A / B / C / D — the deliberate destination choice, protected audible decks
//   mdj-library-row          one result: a tap selects, Load is separate; every availability state
//   mdj-crate-row            crate / playlist / smart rule row, select, drag, rename
//   mdj-queue-item           queue entry with drag handle AND Move up / down, readiness text, protection
//   mdj-progress-row         acquisition job: separate phases, byte progress only when measurable
//   mdj-empty-state          empty / no results / offline / denied / missing with real action buttons
//   mdj-skeleton             region-sized placeholder for genuinely async data, stalled recovery
//   mdj-toast                transient notice placed off the action bars
//   mdj-sheet                bottom sheet / dialog / confirm with an explicit 48 dp dismiss
//   mdj-settings-row         toggle / select / value / nav / action rows with the dirty indicator
//   mdj-save-bar             Save / Discard / Preview / scoped Reset with honest persistence status
//   mdj-workspace-switcher   labelled destinations, 5 + More on a phone, role=tablist
import '../mdj-chip.js';
import '../mdj-badge.js';
import '../mdj-art.js';
import '../mdj-section-header.js';
import '../mdj-search-bar.js';
import '../mdj-filter-bar.js';
import '../mdj-load-target.js';
import '../mdj-library-row.js';
import '../mdj-crate-row.js';
import '../mdj-queue-item.js';
import '../mdj-progress-row.js';
import '../mdj-empty-state.js';
import '../mdj-skeleton.js';
import '../mdj-toast.js';
import '../mdj-sheet.js';
import '../mdj-settings-row.js';
import '../mdj-save-bar.js';
import '../mdj-workspace-switcher.js';
