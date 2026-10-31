export const meta = {
  name: 'build-screen-families',
  description: 'Build hi-fi Crystal Current screens per family (one wave), each refuted by a reviewer, fixed and verified',
  phases: [
    { title: 'Author', detail: 'one agent per screen family' },
    { title: 'Review', detail: 'refuting reviewer clicks through exercised states' },
    { title: 'Fix', detail: 'address blocking/major findings' },
    { title: 'Verify', detail: 'second reviewer confirms' },
  ],
}

const REPO = '/home/user/Mixline-Mobile-DJ'
const wave = Number(args?.wave || 1)

const PREAMBLE = `
You are building SCREENS for a DESIGN PROTOTYPE in the git repo at ${REPO} (branch design/crystal-current-prototype, checked out). It is design evidence for an Android mobile DJ app in the selected "C — Crystal Current" direction: pale frosted glass, brushed titanium, restrained brass rims/index marks, dark-ink labels on opaque backing. NO audio engine exists; every waveform, meter, level, progress or analysis value is a fixture and must say so. The app's working label is "Mobile DJ"; the assistant is "ParDay".

READ FIRST, in this order:
1. ${REPO}/design/prototype/CONVENTIONS.md — binding (especially §5 Screens, §6 canonical ids, §7 fixtures, §9 required states, and the 'via' rule for exercised states).
2. ${REPO}/docs/planning/v1_0/sources/19_Design_Start_and_Local_First_Handoff.md — the brief (§3 journey, §4 inventory and essential states, §5 rules, §7 acceptance).
3. ${REPO}/docs/planning/v1_0/sources/03_Mobile_Workflows_and_Interactions.md — §1 persistent shell, §2 layouts and screen inventory, §3 journeys, §4 control behaviour table, §5 accessibility and common UI states, §6 ParDay, §7 extended workspaces.
4. ${REPO}/docs/planning/v1_0/sources/04_Art_Direction_and_Design_System.md §4 (composition, six UI contracts) and the concept render ${REPO}/docs/planning/v1_0/assets/concepts/Direction_C_Crystal_Current.png (Read as an image; material reference, not a layout to copy — it omits controls and is not a verified viewport).
5. The component library: ${REPO}/design/prototype/components/index.js and every components/families/*.js manifest; open each component file's header comment to learn its attributes, states and events. Look at the gallery in the browser (#/s/foundation/gallery) to see them. Reference screens: ${REPO}/design/prototype/screens/foundation/shell-demo.js and app/shell.js (what the persistent shell already provides: route chip, REC, ParDay button, deck tabs, Cue/Play for the focused pair, crossfader, master meter, Master button — DO NOT duplicate those in shell screens).
6. The family-specific documents named in your brief.

NOTES LEFT FOR YOU BY THE COMPONENT FAMILIES (binding where they describe behaviour)
- No engine exists, so every control (mdj-dial, mdj-fader, mdj-pitch-rail, mdj-jog, mdj-crossfader, pads, loop controls) enters `pending` BY ITSELF after a gesture or key press: it sets pending-value + state=pending and emits mdj:value { phase: 'end' } (or its own verb). YOUR SCREEN STANDS IN FOR THE ENGINE in exercised states: listen, then set `value` and clear `state` (acknowledged) via ctx.setState or by updating attributes. Until you do, the control honestly shows SENT with the acknowledged value underneath — never leave a walkthrough state looking stuck unless the fixture says the command is unacknowledged.
- Finger-down states (touched / held / held-scratch / held-nudge) are transient data-state values while the pointer is captured; drive the `state` attribute only for drawn states.
- mdj-step-grid is a horizontally scrolled 48 dp strip in portrait with beat page tabs (1–4 … 13–16) as the non-scroll path; keep it outside any vertical scroll region that could steal taps. Four lanes are ~390 dp tall in landscape, so the sampler/sequencer landscape screen must set dock: { landscape: false } or show rows="2" per view.
- A standalone 56 dp pad truncates labels longer than ~4–5 characters and one-word reasons ≤ 8 characters (Capacity, No stems, Refused, No grid, Missing, No track, Blocked); the full reason belongs in mdj-stem-strip's readiness line or a caption you place next to the bank.
- Pads and sampler screens may add fixtures/pads.json and fixtures/sampler.json carrying the same shapes as the `pads`, `lanes`, `slots-json` and `stems` attributes (read the component headers for the shapes).
- Give full-scale vertical mixer meters (mdj-meter scale="full" orientation="vertical") at least ~260 px of height; the compact dock meter is the shell's. mdj-waveform emits mdj:seek-preview / mdj:seek / mdj:scratch / mdj:zoom; in-lane annotation text is capped at 11 px by design, so the information must also be printed in your header/readouts.
- ParDay components only emit events (mdj:parday-action, mdj:parday-arm, mdj:stop-automation, mdj:parday-quick, mdj:parday-send, mdj:parday-cancel, mdj:parday-voice, mdj:parday-message); the parday screens drive their `state` / `sent` attributes for pending → acknowledged. fixtures/parday.json (proposals P37–P43, arm plan P42, conversation m1–m10, quick actions, cost record) already exists and is read-only for you — add any extra screen data in your own fixtures/<family>.json. The arm panel's three-column route needs a ≥ 480 px container; narrower containers stack.
- Data components emit mdj:select, mdj:load-request, mdj:chip, mdj:chip-remove, mdj:search, mdj:filters-clear, mdj:action, mdj:toast-action, mdj:sheet-action, mdj:setting-change, mdj:save / mdj:discard / mdj:preview / mdj:reset, mdj:workspace, mdj:queue-move, mdj:progress-pause / -cancel / -retry, mdj:section-action. A tap on mdj-library-row SELECTS; loading is the separate mdj-load-target (Load A/B/C/D) — never load on row tap.
- app/app.css sizes every .icon at 1em; an icon inside a fixed-size disc/rim/chip needs an explicit width/height in your CSS or it overflows at 200 % font scale. Icon ids referenced through the sprite fall back to nothing visible if missing — always pair icons with text.
- components/index.js loads each family manifest independently; a console error naming a family means that family is broken, not your screen — report it, do not work around it by copying components.
- The gallery now stacks state name above sample in portrait, so #/s/foundation/gallery?o=portrait shows every component at the real 380 dp content width.

GENERAL RULES
- One module per screen under screens/<family>/<screen>.js, registered with register({...}) exactly per CONVENTIONS §5 with the canonical ids in §6; import them from screens/<family>/index.js; styles in screens/<family>/<family>.css with the .<family>- prefix.
- Compose from the component library (mdj-* elements) wherever a component exists; build screen-specific layout with h()/button()/icon() from components/base.js. Do not write new generic components; if one is missing, build the piece locally inside your screen file (prefix classes with your family) and list it under componentsMissing in your report.
- BOTH orientations are different compositions (portrait 412 × 892 dp minus insets and, for shell screens, minus the status strip and dock; landscape 892 × 412 dp). Read ctx.orientation; style with :root[data-orientation='landscape'] .<family>-… .
- Every declared state renders; exercised states carry 'via'; drawn states are honest. Required states for your family (CONVENTIONS §9) must exist. Every state has a useful next action; unavailable things say why in plain language (Document 03 vocabulary).
- Controls: data-fr with the FR ids from the register; data-hit 48 (56 for transport/pads/deck selectors); no overlaps; nothing under 48. Transport, crossfader, route and master must stay reachable on shell screens (the shell provides them — keep your content inside the content area; never cover the dock).
- Honesty: fixture marks on anything that looks like audio/levels/progress/analysis; unknown progress says unknown; nothing says Done without an acknowledged fixture state; never show a percentage that the fixture does not provide.
- Fixture scenarios: use the ones in fixtures/sessions.json via the state's scenario; add family data in fixtures/<family>.json (yours) with a _fixture note. Do not edit shared fixtures.
- Text is real copy. Long titles (the 'longtitle' fixture), 200 % font scale, reduced motion and colour-independent deck identity are part of done. Daylight, low-light and high-contrast themes; Essential tier keeps everything.
- You may read any file; WRITE ONLY your ownership. Shared changes go in sharedChangeRequests with the exact diff. Do NOT run git add/commit/push.

CHECK YOUR WORK (required)
- node --check every JS file you wrote.
- From ${REPO}: node design/tools/smoke.mjs --screen <id> --all-states --port PORT --out previews/_smoke/FAMILY  (for every screen you own; both orientations are rendered automatically), then again with --theme lowlight and with --theme contrast --fontscale 200, and once with --tier essential --hitbounds on. All lines must be "ok"; zero console errors. Open the PNGs with the Read tool and look hard: overlaps, clipped text, content hidden under the dock, unreadable numerals, unlabeled states, anything generic or dark-graphite.
- Click-through: write a small Playwright script in your scratch directory (not in the repo; use createRequire(import.meta.url)('playwright') like design/tools/smoke.mjs; start python3 design/tools/serve.py PORT in the background and kill it afterwards) that, for each exercised state, opens the 'via.from' state, clicks the control by accessible name (page.getByRole(…, { name })), and asserts window.mdj.current.state (or screen id) changed as declared. Fix until every exercised state passes.

REPORT (final message = ONLY the JSON for the schema): screens (id, states with exercised/drawn and via, orientations, shell/dock, fr), cssFile, fixturesAdded, componentsMissing, sharedChangeRequests, smokeRuns, clickThrough (per exercised state: pass/fail), knownLimitations.
`

const WAVE1 = [
  {
    key: 'launch', port: 8801,
    ownership: `screens/launch/index.js, screens/launch/launch.css, screens/launch/open.js, screens/launch/import.js, screens/launch/library.js, screens/launch/crates.js, fixtures/launch.json (optional)`,
    brief: `FAMILY: launch — launch/open, launch/import, launch/library, launch/crates. Also read Document 07 §3 (import and availability states, demo crate) and Document 14 §4 "Search" (result types are visibly distinct).

launch/open (shell: false). First screen and resume point. States: empty (scenario fresh; Import is the primary 56 dp action; a clearly labelled Demo action is offered ONLY because demo media exists in the fixture crate 'crate-demo' — say "Demo crate (bundled fixtures)"; no account, no server, no cloud; one line "Local first: your phone owns the library"), demo (demo crate opened: two demo tracks ready), resume (saved session 'sess-1' with decks, queue, route and a deliberate "Resume set" that does NOT autoplay: "Audio stays paused until you press Play"), resume-missing (scenario missing-media; walkthrough state: BRASS CANYON missing on A with "Locate file" / "Keep cues and continue with B"; cues and crate entries preserved note), interrupted (recovered after process death: last consistent checkpoint time, what is preserved, what needs action; resume is deliberate). Exercised: empty → demo (Demo crate), empty → launch/import (Import), resume → perform/ab (Resume set). Landscape: side-by-side hero/actions.

launch/import (shell: false). Scoped file/folder access, per-item validation/indexing. States: picker (choose Files / Folder with the scoped-access explanation; no broad storage permission), indexing (fixture importBatches.indexing: real counts 14 of 52, no fake percentage beyond counts; Cancel), partial (walkthrough; importBatches.partial: 8 items with their individual results — ready, analysis pending, duplicate with "Keep both / Merge", unsupported DRM with reason, skipped non-audio, permission-missing with "Grant access again"; counts summary; valid imports stay available; actions "Open library", "Import more"), denied (permission not granted: nothing imported, library unchanged, retry), complete. Exercised: picker → indexing (Folder), indexing → partial (Cancel? no: let "Continue in background" go to library; partial is the walkthrough default), partial → prep/track (tap TIDE SIGNAL row → navigate('prep/track', { state: 'uncertain' })).

launch/library (shell: true; dock on in both orientations). The docked browser for live browsing (Document 03 §3): a tap on a row SELECTS; Load A/B/C/D is a deliberate destination choice via mdj-load-target; an audible occupied deck is marked protected. Search bar + removable filter chips with counts (BPM range, key compatible, availability, played), sort, crate tabs (All, Warm-up, Peak, Soca set, Requests, Demo). States: browse (set-ready), selected (row selected shows Load A / Load B / … ; exercised via tapping 'DRIFT HOUR'), search-results (query "co" → COPPER SKY…), no-results (query "zzz" with recovery: clear filters / import), offline (scenario offline: local results only; downloaded/discovery sources marked unavailable), analysis-pending (GLASSWORK pending), keyboard-open (compact search workflow: simulate the soft keyboard as a 300 dp inset guide at the bottom; results shrink, the dock's transport stays visible — Document 03 §1), protected-load (a-playing scenario: Load A on the playing deck opens a confirm sheet: "Deck A is playing — Load to B instead / Replace A"), long-title (longtitle row visible). Landscape: list left, selected track detail + load targets right; dock stays. Exercised: browse → selected (DRIFT HOUR), selected → search-results (type? use a "Search" button that applies a canned query), browse → no-results, selected → protected-load (Load A, in a-playing), protected-load → perform/ab (Load to B).

launch/crates (shell: true). Crates, playlists, smart rules, history (Document 02 FR-005). States: crates (list with counts, colours, demo badge), crate-detail (Warm-up with reorder handle + Move up/down, duplicate entry allowed intentionally, notes), smart-rule (rule editor: BPM between 120–128, key compatible 8A, availability ready; live result count), history (played list with time/deck/session), rename-duplicate (duplicate detection on rename), offline. Exercised: crates → crate-detail (Warm-up), crates → smart-rule (Compatible with A).`,
  },
  {
    key: 'preparation', port: 8802,
    ownership: `screens/preparation/index.js, screens/preparation/preparation.css, screens/preparation/track.js, fixtures/preparation.json (optional)`,
    brief: `FAMILY: preparation — prep/track. Also read Document 02 FR-006/007/008/009/011, Document 07 §2 (user preparation vs machine analysis; cue media-time basis; half/double), Document 06 AE-02.

prep/track (shell: false; full-height editor). Portrait: header (deck summary full, analysis status with method + confidence), overview waveform, detailed waveform with grid, tool rows, cue list, loops, gain/tags. Landscape: waveform-led (overview + detailed across the top), tools and lists in two columns beneath.
Tools: Tap downbeat, Nudge grid −/+, Local tempo, Half / Double BPM, Lock grid, Reanalyze (cannot overwrite locked edits: say so), Set cue (needs explicit edit state), Name/colour cue, Delete (edit state only), Loop in/out, Gain trim numeral with reset, Phrase markers, Tags/comment/rating/colour. Save / Undo with saved-revision indicator ("Saved · revision 4 · cues bind to this rendition").
States: uncertain (walkthrough; track 'tide': low confidence after the bridge; hatched uncertain region on the waveform; "Uncertain grid after 2:21 — tap a downbeat to correct"; nothing presented as certain), edited (walkthrough; after a cue edit: cue 2 renamed/moved, correction kept, Undo available, grid locked indicator), locked ('calypso': half/double corrected to 136 and locked; Reanalyze disabled with reason), undo (the Undo confirmation/toast with what will revert), pending-analysis ('glasswork': playable, analysis queued; grid tools disabled with reason; "Play is available"), save-failure (save failed: storage or write error; edits retained in memory; Retry / Export), cue-edit (explicit edit mode for pads: edit badge, delete enabled), half-double (BPM ambiguity choice 68/136 for calypso). Exercised: uncertain → cue-edit (Edit cues), cue-edit → edited (Keep correction), edited → undo (Undo), uncertain → half-double? no — locked → half-double (Half / Double).`,
  },
  {
    key: 'routing', port: 8803,
    ownership: `screens/routing/index.js, screens/routing/routing.css, screens/routing/check.js, screens/routing/readiness.js`,
    brief: `FAMILY: routing — route/check, route/readiness. Also read Document 06 AE-07 (route-loss table — binding), Document 02 FR-022/023/042, Document 09 QA-06/QA-10, Document 05 "Platform and output matrix" (splitter = mono master + mono cue; four outputs or proven combination for stereo both).

route/check (shell: true, dock on). The output check before and during a set. Content: current route card (mdj-route-card) + exact diagram (mdj-route-diagram), master/cue arrangement in words, the tradeoff, next actions, a list of other available routes (fixtures.routes) with status, "Run cue isolation check" (only where a cue exists), "Swap master/cue sides" (splitter), sample rate/buffer numerals as fixture. Never claims isolated headphones without route evidence.
States: speaker (walkthrough, PRIMARY: "Phone speaker — master only. Not a cue route." with the explanation and the three alternatives; master playback stays available), bluetooth (delay unknown, not a scratch/cue route), usbc-stereo (stereo master, no independent cue), splitter (mono master + mono cue; stereo given up; swap sides), usb-4ch (verified stereo master 1–2 + stereo cue 3–4; isolation check available), unsupported (6-channel device, mapping unverified, playback blocked until mapped; manual pair selection), disconnected (scenario route-lost: decks paused and muted, cue NOT rerouted to the speaker, deliberate Resume after reconnect/choose), checking (isolation check running: labelled fixture progress "unknown", Cancel). Exercised: speaker → usbc-stereo (choose route row "USB-C headphones / DAC"), usb-4ch → checking (Run cue isolation check), disconnected → speaker (Choose another route → pick speaker), splitter → splitter-swapped? make 'swapped' a state exercised via "Swap master/cue sides".

route/readiness (shell: true). The set readiness summary (Document 03 §3 "Prepared set": confirm offline availability and rights, route check): rows for Media (ready 11 · missing 1 · permission 1 · unsupported 1 with Fix actions), Analysis (1 pending), Storage (free bytes, recording estimate), Battery/thermal (fixture), Route (current + cue availability), Offline readiness ("Prepared set works offline; downloads/ParDay need network"), Source restrictions ("SODA LIGHTS (Radio Edit): recording eligibility unknown — treated as not allowed"). States: ready, missing-media (missing-media scenario), low-storage (low-storage scenario), offline (offline scenario), hot (hot scenario), restricted-source. Exercised: missing-media → launch/library? (Locate file → navigate launch/library state browse), ready → route/check (Check route).`,
  },
  {
    key: 'performance', port: 8804,
    ownership: `screens/performance/index.js, screens/performance/performance.css, screens/performance/ab.js, screens/performance/focus-map.js, screens/performance/mixer.js, screens/performance/master.js, fixtures/performance.json (optional)`,
    brief: `FAMILY: performance — perform/ab, perform/focus-map, perform/mixer, perform/master. This is the heart of the design. Also read Document 03 §1 (shell: in portrait the dock already provides deck selectors, Cue/Play for the focused pair, crossfader, master meter and Master button — your portrait content must NOT repeat them), §2 (portrait = two-deck overview + larger focused control area; landscape = adjacent deck workspaces + central mixer with waveform lanes readable together — a different composition), §4 (every control row: overview seek lock, detailed waveform nudge/scrub/scratch, jog zones, dials, faders, cue/play semantics, hot cues pending, XY, deck selector), Document 06 AE-02/AE-04, Document 02 FR-010…021, FR-035.

perform/ab (shell: true; dock { portrait: true, landscape: false } — in landscape you draw the complete composition yourself including Cue/Play 56 dp per deck, Sync, crossfader, channel faders, gain/EQ/filter dials, meters; the shell still provides the top status strip).
Portrait content (≈ 412 × 600 dp): stacked overview waveforms A and B (mdj-waveform overview, deck colours, cue markers, seek-lock preview), compact deck summaries (title/BPM/key/time), then the FOCUSED deck area for the focused deck (A by default; focus follows the shell's deck tabs — read ctx.session.focus and a 'focus' state attribute you keep in the screen's state ids): detailed waveform with beat grid, a row of 4 visible hot cue pads (bank 1 of 2, numbers visible) + Loop/Beatjump access, Sync / Key lock / Slip / Quantize toggles (48 dp, text labels), a jog (mdj-jog 160) or pitch rail — choose a composition where nothing overlaps and the dock remains; offer "Pads", "FX", "Stems" as workspace links (mdj-workspace-switcher compact) at the bottom of the content.
Landscape (892 × ~330 dp): two full-width waveform lanes at the top (A above B, readable together), Deck A workspace left and Deck B right (title/BPM/key, jog 200, Sync, 4 hot cues, Cue + Play 56 dp), central mixer (gain + filter dials, 3-band EQ as compact dials or a mini mdj-mixer strip, channel faders, meters), crossfader lower centre, bottom workspace tabs (Library, Pads, FX, Stems). This is the corrected version of the concept render with real hit bounds.
States: set-ready (both paused, cue selected on A), playing (a-playing), transition (walkthrough; transition scenario; crossfader toward B), protected-load (walkthrough; a-playing + a confirm sheet over the content: "Deck A is playing. Load COPPER SKY to B instead? [Load to B] [Replace A — confirm] [Cancel]"; the dock stays visible), held-scratch (jog on A held; slip marker; fixture), pending-quantized (hot cue 3 pending Q on the next beat; distinct from playing), clipping (clipping scenario; master clip + limiter GR), seek-preview (seek lock: overview drag shows a target line and a "Seek to 2:41" commit button; playback unchanged until Seek), loading (D loading in four-deck scenario or B loading), empty (fresh), route-lost (route-lost scenario: decks paused/muted, interrupted badges, Resume deliberate via route/check), four-deck (four-deck scenario; focus A/B with C/D tabs in the dock; "C playing in loop 8" visible in summaries). Exercised: set-ready → playing (Play A via a 'Play deck A' control in your landscape composition OR via the dock in portrait — the dock buttons emit mdj:transport; listen for it on the shell and call ctx.setState('playing')), playing → protected-load (Load to A from… simplest: a "Load next" control in the content), protected-load → transition (Load to B then Play B → 'transition'), playing → seek-preview (tap the overview "Preview seek" control), seek-preview → playing (Seek), playing → pending-quantized (tap hot cue 3), set-ready → four-deck? drawn.

perform/focus-map (shell: true). The A–D focus path (Document 03 §1 "A nonfocused deck is one selector tap from its transport; selection only changes the view; held gestures keep their deck"). Content: four deck cards each with state, title, time, mini transport access (Cue/Play 56), "Focus" action, pair chooser (A/B, C/D, A/C, B/D), explanation of deferred focus while a gesture is held. States: two-deck, four-deck (four-deck scenario), held-gesture-deferred ("Focus change waits for the held scratch on A to end"), loading-d, missing-c. Exercised: two-deck → four-deck? drawn; four-deck → perform/ab (Focus C/D → navigate perform/ab state four-deck).

perform/mixer (shell: true). Full mixer: per channel (A, B; C, D when enabled) trim dial, HI/MID/LO EQ dials with centre detent, filter dial, cue select (48, text "Cue"), channel fader (mdj-fader) with meter (mdj-meter vertical full), crossfader assignment chips (A side / B side / Thru) and curve selector (linear / equal-power / cut), reverse. States: normal, clipping (clipping scenario), muted-channel, cue-selected, four-channel (four-deck scenario; portrait shows two channels with a pair switch), bypass-crossfader. Exercised: normal → cue-selected (Cue B), normal → bypass-crossfader (Thru).

perform/master (shell: true). The Master panel from the dock's Master button: master level dial, limiter state with gain-reduction numeral (fixture), headroom, clip latch reset, cue mix (cue/master blend) and cue gain, split-cue option (only when a cue route exists), recording status link, route summary link, "Cue unavailable on this route" when the route has no cue. States: normal, limiter-active, clipping, muted-route-lost (route-lost), cue-unavailable (speaker route), split-cue. Exercised: normal → clipping? drawn; cue-unavailable → route/check (Change route).`,
  },
  {
    key: 'recording', port: 8805,
    ownership: `screens/recording/index.js, screens/recording/recording.css, screens/recording/panel.js, screens/recording/history.js, fixtures/recording.json (optional)`,
    brief: `FAMILY: recording — rec/panel, rec/history. Also read Document 02 FR-031/034/041, Document 07 §6 (safety margin, segments, journal, storage exhaustion stops recording while playback continues), Document 09 QA-11, Document 06 AE-07 (record after master FX/limiter, hardware volume irrelevant).

rec/panel (shell: true). States: idle (eligible: format choice FLAC/WAV/AAC with storage estimate from the selected format and free space; safety margin; Start 56 dp; "Records the master after the limiter; headphone cue is not recorded"), recording (walkthrough; recording scenario: elapsed numeral, format, bytes written, estimated remaining time, Add marker, Stop; fixture marks; "Recording continues if you browse"), restricted-source (soda-radio eligibility unknown → treated as not allowed: when it is next, the choice before transition: "Finalize this recording before the restricted track plays / Skip the track / Continue without recording it" — mark partial honestly), storage-full (low-storage scenario: recording stopped by storage, playback continued, 3 recoverable segments, Free space / Keep segments), interrupted-writer (writer failure: last valid chunk at 24:40, incomplete status, playback unaffected), finalizing (finalization with labelled unknown progress; Cancel keeps segments), format-choice (the format sheet), markers (marker list with times and names). Exercised: idle → recording (Start recording), recording → markers (Add marker), recording → finalizing (Stop), idle → format-choice (Format).

rec/history (shell: false). Sessions and recordings. States: saved (walkthrough; set-ready: the just-saved session 'Saturday practice' with decks, queue, duration, route, recording link, "Reopen set", "Export session log"), empty, incomplete-recording (rec-2 with 3 recoverable segments: Recover / Export segments / Delete with confirm), export (export sheet: metadata + references; media copies opt-in; "No tokens or restricted caches are exported"), session-detail (sess-3 with missing media), recover-fragments (recovery in progress, unknown progress labelled). Exercised: saved → session-detail (Saturday practice), saved → export (Export session log), incomplete-recording → recover-fragments (Recover).`,
  },
  {
    key: 'system', port: 8806,
    ownership: `screens/system/index.js, screens/system/system.css, screens/system/plugins.js, screens/system/settings.js, screens/system/diagnostics.js, screens/system/backup.js, screens/system/recovery.js, fixtures/system.json (optional)`,
    brief: `FAMILY: system — system/plugins, system/settings, system/diagnostics, system/backup, system/recovery. Also read Document 15 §6 (real third-party hosting; isolation models; faults), Document 11 §3–§4 (privacy, personal installation, backup/restore), Document 07 §7 (migrations, backups, restore validation), Document 06 AE-07 route-loss table, Document 02 FR-034/037/039/040/041/042/047, Document 04 §4 (settings contract: searchable categories, explicit Save, dirty-state protection, preview/discard, scoped Reset, consequences).

system/plugins (shell: true). Plugin rack: mdj-plugin-slot list from fixtures/plugins.json, add to chain, parameters/presets sheet, bypass, compatibility info, isolation model label, "Loads at a qualified time" note. States: compatible-list, loaded, failed-validation, unsupported-format (desktop VST3: "Desktop plugin binaries are not Android-compatible"), unavailable-placeholder (restored session keeps the slot: "Plugin unavailable — placeholder kept; not replaced by another effect"), bypass, latency-change-blocked ("Latency changed — graph rebuild waits for a qualified time"). Exercised: compatible-list → loaded (Load 'Glass Verb'), loaded → bypass (Bypass).

system/settings (shell: false). Searchable categories: Audio & routing, Library & import, Performance (Seek lock default on, Jump-to-touch advanced off, Quantize default 1/4, Cue behaviour), ParDay (provider: Not configured; monthly cost limit: Not set — required before paid use; data policy; voice off), Sources & downloads (adapters: enabled/unverified with the four statuses technical/access/content/distribution), Recording, Display (theme Daylight/Low-light/High contrast, rendering tier, reduced transparency/motion, font scale), Backup, Diagnostics, About & licences, and a final row "Later extensions — AWS acquisition service: Not configured. Not required for this app." States: clean, dirty (explicit Save bar: Save / Discard / Preview), save-failed, preview (previewing a display change with "Discard preview"), reset-scoped (confirm: resets only this section), search (query "cue" filters rows). Exercised: clean → dirty (toggle 'Jump-to-touch'), dirty → save-failed? drawn; dirty → clean (Save), clean → search (Search), clean → reset-scoped (Reset section).

system/diagnostics (shell: false). Route, storage, battery/thermal, source readiness, versions (app/build fixture), "Export redacted diagnostics" with what is excluded (track contents, tokens, private paths unless selected). States: normal, fault-route, fault-storage, telemetry-consent (explicit opt-in with reviewable contents), export-review. Exercised: normal → export-review (Export diagnostics).

system/backup (shell: false). Backup (versioned metadata, references, media copies opt-in, excludes tokens/restricted caches) and Restore (validate archive, version mismatch, rejected traversal/oversized). States: backup, in-progress-unknown, restore-ok, restore-mismatch ("Backup from a newer version 0.5 — restore needs app 0.5 or a compatible backup"), restore-rejected ("Archive rejected: unsafe path"), restore-conflicts (cue/grid conflicts kept for deliberate resolution). Exercised: backup → in-progress-unknown (Back up now), backup → restore-ok (Restore → pick 'backup-2026-10-24'), restore-conflicts resolved via "Keep mine".

system/recovery (shell: true). States: route-lost (walkthrough; route-lost scenario: "Output lost. Decks paused and muted. Cue was not sent to the speaker." + Reconnect then Resume / Choose another route; Resume is deliberate), interrupted-session (after process death: checkpoint 21:12, preserved: decks, cues, queue; needs: deliberate Play; nothing autoplays), pointer-cancel (a held scratch was released safely by the system: deck A at the slip position; no stuck hold), rotation (orientation change kept engine state; show the current orientation and "nothing moved"), low-storage (recording stopped, playback continues), missing-next (queue next missing: pick another / skip). Exercised: route-lost → route/check (Choose another route), interrupted-session → perform/ab (Open set — paused).`,
  },
]

const WAVE2 = [
  {
    key: 'pads', port: 8811,
    ownership: `screens/pads/index.js, screens/pads/pads.css, screens/pads/pads.js, screens/pads/loops.js, screens/pads/fx.js, screens/pads/stems.js, fixtures/pads.json (optional)`,
    brief: `FAMILY: pads — pads/pads, pads/loops, pads/fx, pads/stems (all shell: true, dock on; reference the performance family's screens for composition consistency: read screens/performance/*.js and their CSS). Also read Document 03 §4 rows "Hot cues / loop pads" and "XY pad", Document 06 AE-02 (loops/slip), AE-06 (stems), Document 02 FR-018/024/025/026/028/029.

pads/pads: mdj-pad-bank for the focused deck with mode selector (cue, loop, roll, jump, slicer, sampler, pitch-play, stem) and bank 1/2; active mode and deck legible; pad edit mode explicit. States: cue-bank1 (a-playing), bank-switch (bank 2 shown, badge), edit-mode, pending-quantized (pad 3 pending), slicer, pitch-play, stem-mode-unavailable ("Stems not prepared for this track — Prepare stems" link). Landscape: both decks' banks side by side. Exercised: cue-bank1 → bank-switch (Bank 2), cue-bank1 → edit-mode (Edit), cue-bank1 → pending-quantized (pad 3), edit-mode → cue-bank1 (Done).
pads/loops: mdj-loop-controls + beat jump + saved loops list for the focused deck; loop region visible on a detailed mdj-waveform. States: inactive, active-8, pending (loop in set, out pending on beat), roll (momentary roll held), saved-loops, edge-of-track ("Loop out beyond track end — clamped", Document 02 FR-018). Exercised: inactive → pending (Loop in), pending → active-8 (Loop out), active-8 → inactive (Exit).
pads/fx: per-deck FX chain: 3 slots with effect selectors (Echo, Delay, Reverb, Filter, Flanger, Phaser, Distortion, Bitcrush), wet/dry, tempo/free rate, assignment (A / B / Master), mdj-xy-pad with Momentary/Latch, Engage/Bypass, macro. States: idle, momentary-held, latched, bypassed, unavailable-effect ("Effect unavailable on this device profile"), macro, tails ("Bypass keeps the echo tail — documented"). Exercised: idle → latched (Latch then touch), latched → bypassed (Bypass).
pads/stems: mdj-stem-strip per deck with readiness. States: ready (aurora prepared stems), preparing (glasswork: fixture progress labelled; Cancel), unavailable-source-restricted (soda-radio: "Source does not permit separation"), live-refused-capacity (hot scenario: "Live separation refused: device capacity; prepared stems still work"), failed, full-mix-fallback. Exercised: ready → preparing? drawn; preparing → ready? drawn; ready → mute-vocals (Mute vocals) as an exercised state 'vocals-muted'.`,
  },
  {
    key: 'sampler', port: 8812,
    ownership: `screens/sampler/index.js, screens/sampler/sampler.css, screens/sampler/banks.js, screens/sampler/sequencer.js, fixtures/sampler.json (optional)`,
    brief: `FAMILY: sampler — sampler/banks, sampler/sequencer (shell: true). Also read Document 03 §7 "Sequencer", Document 06 AE-06 sampler/sequencer paragraphs, Document 02 FR-027.

sampler/banks: mdj-sample-bank 16 slots over 2 banks, trigger modes, choke groups, levels, Stop all samples (56), sample pack rights note. States: bank-a, empty-slot (tap an empty slot → assign sheet), playing (two one-shots sounding, one loop), choked (choke group stopped a voice; documented voice-stealing), missing-sample ("Sample file missing — slot kept"), edit (assign/rename/trigger mode). Exercised: bank-a → playing (slot 1), playing → choked (slot 2 in the same choke group), bank-a → edit (Edit), empty-slot via (slot 12).
sampler/sequencer: mdj-step-grid with lanes, pattern bank, length/resolution/swing readouts, revision + next-bar marker, Start / Stop at bar / Stop now / Pattern change as distinct actions, takeover note. States: stopped, playing-sounding (current step moving = fixture), queued-next-bar-revision (an edit made during playback becomes revision 7 at the next bar; marker visible; sounding pattern still revision 6), editing (stopped editor usable without ParDay), stop-quantized-pending ("Stops at bar end"), stop-immediate, pattern-change (B queued). Exercised: stopped → playing-sounding (Start), playing-sounding → queued-next-bar-revision (toggle a step), playing-sounding → stop-quantized-pending (Stop at bar), playing-sounding → stop-immediate (Stop now), stopped → editing (Edit pattern).`,
  },
  {
    key: 'queue', port: 8813,
    ownership: `screens/queue/index.js, screens/queue/queue.css, screens/queue/queue.js, fixtures/queue.json (optional)`,
    brief: `FAMILY: queue — queue/queue (shell: true). Also read Document 03 §2 "Queue and automix" row and §4 "Queue reorder" row, Document 02 FR-032, Document 09 QA-23, Document 13 (automix execution is engine-owned; manual takeover).

Content: Automix toggle with current mode (off / assisted / armed plan), the current item (locked, protected), next item readiness (ready / not ready with reason), transition settings (type: cut / fade / at marked exit, duration bars, tempo match), queue list (mdj-queue-item with handle + Move up/down), Skip, Cancel transition, Manual takeover control (Stop automation), "Inspect next" detail. States: ready (set-ready + queue drift/glasswork/calypso), missing-next (queue has BRASS CANYON missing: never treated as ready; pick another), committed-transition (transition scenario: "Transition committed — begins in 8 bars"; edits to the next item blocked with reason), expired-edit (a late reorder was rejected: "Engine already committed; your change did not apply"), takeover (manual takeover: automation cancelled at frame N; faders not reset), automix-off, tempo-mismatch ("CALYPSO WIRE 136 BPM vs 124: sync would exceed range — manual"). Exercised: ready → committed-transition? via scenario; ready → missing-next (Add BRASS CANYON? no—drawn); ready → takeover (Stop automation), ready → automix-off (Automix toggle), ready → inspect-next (Inspect next) as an extra exercised state.`,
  },
  {
    key: 'sources', port: 8814,
    ownership: `screens/sources/index.js, screens/sources/sources.css, screens/sources/add.js, screens/sources/resolve.js, screens/sources/format.js, screens/sources/queue.js, fixtures/acquisition.json`,
    brief: `FAMILY: sources — sources/add, sources/resolve, sources/format, sources/queue (shell: true). Also read Document 14 §4 (end-to-end), §5 (matching states: exact file / probable recording / ambiguous), Document 16 §4 (Crystal Current acquisition workflow — binding), §5 (identity and quality honesty), §6 (state machine: CREATED, RESOLVING, AWAITING_SELECTION, READY, QUEUED, TRANSFERRING, SOURCE_VALIDATING, CONVERTING, VERIFYING, PUBLISHING, COMPLETED, PAUSED, RETRY_WAIT, CANCEL_REQUESTED, CANCELLED, FAILED, BLOCKED), §11 (DLA cases), Document 02 FR-049, Document 03 §3 "Discover and download". The four statuses — technical, service access, content use, distribution — are shown separately and never collapsed into one badge.

First author fixtures/acquisition.json: requests (a Spotify link for SODA LIGHTS resolving to a YouTube candidate (fixture), a YouTube link, a direct file link, an unsupported link, a collection of 6 items with mixed outcomes), candidates with requested vs actual source, duration, edition evidence, confidence class (exact / probable / ambiguous), format options with known/unknown bitrate, jobs in every state with phases, bytes measured or unknown, errors (HTML response, rate limit, login required, oversized), and the four statuses per adapter.

sources/add: Add music sheet with Paste link (field + Paste), Receive share (how it arrives; no clipboard polling), Import files (→ launch/import), Download queue (count badge), adapter list with status chips. States: idle, pasted-link (recognised Spotify link → Resolve), share-received, unsupported-link (reason + alternatives), offline (downloads need network; local import still works). Exercised: idle → pasted-link (Paste), pasted-link → sources/resolve (Resolve).
sources/resolve: requested identity vs actual source, duration, explicit/clean, edition evidence, match explanation, preview/selection step, alternatives. States: matching (RESOLVING; unknown progress labelled; Cancel), exact, probable (needs confirmation before cues attach), ambiguous (Radio Edit 3:21 vs Extended 6:05 — choose; "A matching title alone cannot approve a substitute"), no-match, adapter-unavailable ("YouTube extractor adapter: unverified — not enabled"), blocked-access (login required / rate limited: specific blocked state, no credential prompt), collection-selection (6 items, choose set, enumerated count, order preserved). Exercised: matching → ambiguous (fixture resolves), ambiguous → sources/format (choose Radio Edit).
sources/format: Keep source format / MP3 for compatibility / supported rendition; actual source codec, bitrate known or "unknown", output encoding, estimated storage, honesty note ("Converting a lossy source to WAV/FLAC does not recover detail"), artwork/metadata retention note. States: options, unknown-bitrate, conversion-warning. Exercised: options → sources/queue (Download).
sources/queue: mdj-progress-row entries for every job state; per-item outcomes for the collection; Cancel download (in-app, targets acquisition only; OS Stop note); technical/access/content/distribution statuses per job; "Ready to play" vs "Analyzed" separate; Load deliberately via the library (never auto-loads). States: active (TRANSFERRING with bytes), unknown-progress, cancelling (CANCEL_REQUESTED), cancelled, failed-html-response, blocked-access, retry-wait, paused, collection-partial ("4 of 6 completed · 1 failed · 1 unavailable" — never 'Done'), completed-ready (COMPLETED: in library, analysis pending; "Open in library"). Exercised: active → cancelling (Cancel download), active → paused (Pause), completed-ready → launch/library (Open in library).`,
  },
  {
    key: 'parday', port: 8815,
    ownership: `screens/parday/index.js, screens/parday/parday.css, screens/parday/prepare.js, screens/parday/perform.js, screens/parday/arm.js, fixtures/parday-screens.json (optional; do not edit fixtures/parday.json — read it)`,
    brief: `FAMILY: parday — parday/prepare, parday/perform, parday/arm. Also read Document 13 (all of "Authority and live-session behavior", "Tool contracts and proposal lifecycle", "Worked example"), Document 03 §6, Document 02 FR-048, AI-005/007/008/009/011/020/022. Use the parday component family (mdj-parday-card, mdj-parday-message, mdj-parday-arm-panel, mdj-stop-automation, mdj-parday-quick-actions, mdj-parday-input, mdj-provenance-tag) and fixtures/parday.json.

parday/prepare (shell: false; full-height conversation + structured proposal cards; typed/touch only; voice visibly off). States: ready (quick actions + input), thinking (retained content, unknown progress, Cancel), proposal-ready (crate proposal card with Preview / Apply to preparation; reversible), needs-review (deck B changed since the proposal), applied (saved crate with Undo), rejected, local-only (offline scenario: local search/analysis/saved proposals work; cloud capability named as unavailable), cost-limit ("Monthly AI limit reached — set in Settings; preparation continues manually"), unavailable (hot scenario: paused under thermal pressure), restricted-source-note ("Spotify-derived fields are excluded from ParDay's context by default"). Exercised: ready → thinking (Build a 30-minute crate), thinking → proposal-ready (fixture resolves via "Show proposal"? better: thinking state has a labelled "Fixture: proposal arrives" control), proposal-ready → applied (Apply to preparation), applied → ready (Undo? → 'undone' extra state), proposal-ready → rejected (Dismiss).
parday/perform (shell: true; compact panel that preserves the shell's transport; read/propose until a plan is armed). States: read-propose (default: proposal card for a transition with Preview / Arm transition; "ParDay cannot play anything until you arm a plan"), proposal-transition, stale-after-reload (needs review: B reloaded), armed (bound plan summary + Stop automation prominent), executing (fixture progress against engine frames, labelled), takeover-cancelled ("You touched the crossfader — plan cancelled at frame 1,204,992; faders stay where they are; already heard audio cannot be undone"), unavailable. Exercised: read-propose → parday/arm (Arm transition), armed → executing ('Fixture: plan starts'), executing → takeover-cancelled (Stop automation).
parday/arm (shell: true): the arm sheet using mdj-parday-arm-panel. States: review, armed, executing, expired ("Proposal expired 20 s ago — Refresh"), cancelled. Exercised: review → armed (Arm this transition), armed → cancelled (Cancel), review → parday/perform (Back).`,
  },
  {
    key: 'av', port: 8816,
    ownership: `screens/av/index.js, screens/av/av.css, screens/av/video.js, screens/av/karaoke.js, screens/av/broadcast.js, screens/av/mic.js, fixtures/av-screens.json (optional; read fixtures/av.json)`,
    brief: `FAMILY: av — av/video, av/karaoke, av/broadcast, av/mic (all shell: true; workspace destinations reached through the labelled switcher). Also read Document 15 §3–§5, Document 03 §7, Document 02 FR-030/045/046, AV-001…009. Use mdj-video-frame, mdj-caption-line, mdj-singer-row, mdj-broadcast-state, mdj-mic-strip, mdj-display-target, mdj-route-diagram where useful.

av/video: "Preview on this device" vs "Program output" frames, deck video mode per deck (follow audio / independent / audio-only), visual crossfader unlinked from the audio crossfader when chosen, transition type (cut / dissolve / crossfade), caption offset/visibility/language, external display status, declared visual fallback for frame drops ("audio is not slowed"). States: linked, unlinked, audio-only-fallback (licensed still / black, no invented cover), frozen-dropped, unsupported-stream (HDR→SDR rejected with reason), external-display-connected, external-disconnected ("private UI never shown on the program output"), late-decoding (reverse/scratch video frozen per policy; audio scratch unaffected). Exercised: linked → unlinked (Unlink video crossfader), linked → external-display-connected? drawn; linked → audio-only-fallback (Audio only on B).
av/karaoke: singer queue (local stage names), current song/version, key/tempo, lyric presentation (line-timed vs word-timed honesty), mic routing, Next singer, Pause, Return to DJ, queue state recoverable. States: queue, active-singer, reorder (active row protected), missing-captions, line-timed-only, paused, return-to-dj. Exercised: queue → active-singer (Start next singer), active-singer → paused (Pause), active-singer → return-to-dj (Return to DJ).
av/broadcast: destination/account, audience/destination label, selected buses (master, mic; cue and assistant speech excluded), source eligibility, quality profile, connection state + encoded rate/queue delay/dropped (fixtures), Start/Stop deliberate, test receiver check, local fallback recording as a separate permitted option, "A recording indicator is not a broadcast indicator". States: setup, private-monitoring, connecting, connected, congested (bounded policy: reduce bitrate / reconnect / stop), disconnected-reconnecting, stopped, restricted-source-blocked ("Next track not eligible for broadcast — resolve before transition"), rehearsal-not-published ("Rehearsal is private — nothing is transmitted"). Exercised: setup → private-monitoring (Test receiver), private-monitoring → connecting (Start broadcast), connecting → connected ('Fixture: destination acknowledges'), connected → stopped (Stop broadcast).
av/mic: mdj-mic-strip with input selection, gain, fixture meter, Mute 56, Monitor, Talkover momentary, Duck threshold/envelope, assignment chips (Master / Broadcast / Recording), feedback-risk notice at routing time, separate permission meaning from ParDay voice. States: off, permission-denied ("Microphone permission denied — music playback unaffected"), armed, live, feedback-risk (speaker route + mic live), route-changed (route-loss rules re-applied before monitoring). Exercised: off → armed (Enable microphone), armed → live (Unmute), live → off (Mute and disable).`,
  },
]

const FAMILIES = wave === 1 ? WAVE1 : WAVE2

const AUTHOR_SCHEMA = {
  type: 'object',
  properties: {
    family: { type: 'string' },
    screens: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, shell: { type: 'boolean' }, orientations: { type: 'array', items: { type: 'string' } }, fr: { type: 'array', items: { type: 'string' } }, states: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, exercised: { type: 'boolean' }, via: { type: 'string' } }, required: ['id', 'exercised'] } } }, required: ['id', 'states'] } },
    cssFile: { type: 'string' },
    fixturesAdded: { type: 'array', items: { type: 'string' } },
    componentsMissing: { type: 'array', items: { type: 'string' } },
    sharedChangeRequests: { type: 'array', items: { type: 'string' } },
    smokeRuns: { type: 'array', items: { type: 'string' } },
    clickThrough: { type: 'array', items: { type: 'object', properties: { screen: { type: 'string' }, state: { type: 'string' }, pass: { type: 'boolean' }, note: { type: 'string' } }, required: ['screen', 'state', 'pass'] } },
    knownLimitations: { type: 'array', items: { type: 'string' } },
  },
  required: ['family', 'screens', 'smokeRuns', 'clickThrough'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    family: { type: 'string' },
    passed: { type: 'boolean' },
    findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocking', 'major', 'minor'] }, screen: { type: 'string' }, state: { type: 'string' }, file: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'screen', 'issue', 'fix'] } },
    clickThrough: { type: 'array', items: { type: 'object', properties: { screen: { type: 'string' }, state: { type: 'string' }, pass: { type: 'boolean' }, note: { type: 'string' } }, required: ['screen', 'state', 'pass'] } },
    praise: { type: 'array', items: { type: 'string' } },
  },
  required: ['family', 'passed', 'findings', 'clickThrough'],
}

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    family: { type: 'string' },
    fixed: { type: 'array', items: { type: 'string' } },
    notFixed: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, reason: { type: 'string' } }, required: ['finding', 'reason'] } },
    sharedChangeRequests: { type: 'array', items: { type: 'string' } },
    smokeRuns: { type: 'array', items: { type: 'string' } },
  },
  required: ['family', 'fixed', 'notFixed'],
}

function authorPrompt(f) {
  return `${PREAMBLE}

YOUR OWNERSHIP (create/edit only these, relative to ${REPO}/design/prototype/): ${f.ownership}
YOUR SMOKE PORT: ${f.port}. FAMILY for --out: ${f.key}.
${wave === 2 ? `Wave 1 screens already exist (launch, preparation, routing, performance, recording, system). Read screens/performance/ab.js and screens/launch/library.js first and match their composition language, spacing and the way they keep the shell's dock clear.` : ''}

${f.brief}

Register every screen in screens/${f.key}/index.js. Run the smoke renders and the click-through script, look at the PNGs, fix, and report the JSON.`
}

function reviewPrompt(f, author) {
  return `You are a REFUTING REVIEWER for the "${f.key}" SCREEN family of a design prototype in ${REPO} (branch design/crystal-current-prototype). Find what is wrong; assume defects until proven otherwise. Do not edit files.

Read: ${REPO}/design/prototype/CONVENTIONS.md; ${REPO}/docs/planning/v1_0/AGENTS.md; ${REPO}/docs/planning/v1_0/sources/19_Design_Start_and_Local_First_Handoff.md §3–§5 and §7; ${REPO}/docs/planning/v1_0/sources/03_Mobile_Workflows_and_Interactions.md §1–§5 (and §6/§7 if relevant to this family); ${REPO}/docs/planning/v1_0/sources/04_Art_Direction_and_Design_System.md §4; the family brief below; the concept render ${REPO}/docs/planning/v1_0/assets/concepts/Direction_C_Crystal_Current.png (image; material feel only).

FAMILY BRIEF the author worked from:
${f.brief}

AUTHOR'S REPORT: ${JSON.stringify(author)}
Files: ${REPO}/design/prototype/ → ${f.ownership}

Do all of this:
1. Read every screen module and the CSS. Check registration (canonical ids, states with labels, exercised + via, scenario per state), FR ids exist in ${REPO}/docs/planning/v1_0/contracts/requirements_register.json, data-fr/data-hit on controls, tokens-only colours (grep '#' in JS/CSS), real copy, Document 03 vocabulary, no colour-only meaning, fixture marks on data, no fake percentages, no 'Done' without an acknowledged fixture state, nothing from direction A, no lighting/controller/AWS-onboarding content.
2. Render and LOOK: from ${REPO} run node design/tools/smoke.mjs --screen <id> --all-states --port ${f.port + 10} --out previews/_smoke/review-${f.key} for every screen (both orientations), plus --theme lowlight, --theme contrast --fontscale 200, and --tier essential --hitbounds on for at least the default states. Read every PNG with the Read tool. Look for: content hidden under or colliding with the dock; the dock or status strip missing on a shell screen; portrait that is just a squeezed landscape (Document 03 §2 forbids that); controls under 48/56; overlaps; clipped long titles; unreadable numerals; states that look identical; missing next actions; generic/AI-looking layouts (uniform rounded cards, glowing orbs, gradient soup); anything implying working audio.
3. Measure: write a Playwright script (scratch dir; createRequire(import.meta.url)('playwright'); start python3 design/tools/serve.py ${f.port + 10} in the background and kill it afterwards) that for each screen × state × orientation reports [data-hit] rects smaller than their value and overlapping visible [data-hit] pairs (non-nested, > 2 px), and interactive elements (button, a[href], input, select, [role=button|slider|tab|option]) with no data-hit.
4. Click through every exercised state via its 'via' (open the from-state URL, page.getByRole with the control name, click, read window.mdj.current) and record pass/fail. A state marked exercised that cannot be reached by its declared control is a BLOCKING finding.
5. Check the required Document 19 states for this family (CONVENTIONS §9) are present and distinct, and that each state has a useful next action.
6. Judge craft against Crystal Current and the Document 04 composition rules (instrument, not a dashboard; waveform/position/control hierarchy leads; small art never the primary signal).

Severity: blocking = violates an AGENTS.md/CONVENTIONS rule (hit bounds, overlaps, colour-only meaning, fake progress, missing fixture mark, console error, hard-coded colour, missing required state, unreachable exercised state, dock covered, render error); major = materially wrong behaviour/affordance, squeezed-rotation portrait, or clearly poor craft; minor = polish. passed = no blocking/major. Report JSON per schema with file + concrete fix per finding.`
}

function fixPrompt(f, review) {
  return `${PREAMBLE}

YOUR OWNERSHIP (edit only these): ${f.ownership}
YOUR SMOKE PORT: ${f.port}. FAMILY for --out: ${f.key}.

A refuting reviewer examined the "${f.key}" screen family and reported these findings and click-through results. Fix every blocking and major finding (and minor ones where cheap). If a finding is wrong, say why in notFixed with evidence. Re-run the smoke renders and the click-through after fixing and look at the PNGs. Report JSON.

FINDINGS: ${JSON.stringify(review.findings, null, 1)}
CLICK-THROUGH: ${JSON.stringify(review.clickThrough, null, 1)}`
}

const results = await pipeline(
  FAMILIES,
  (f) => agent(authorPrompt(f), { label: `author:${f.key}`, phase: 'Author', schema: AUTHOR_SCHEMA }),
  (author, f) => author ? agent(reviewPrompt(f, author), { label: `review:${f.key}`, phase: 'Review', schema: REVIEW_SCHEMA }).then((review) => ({ author, review })) : null,
  async (r, f) => {
    if (!r) return null
    const serious = (r.review?.findings || []).filter((x) => x.severity !== 'minor')
    const failedClicks = (r.review?.clickThrough || []).filter((c) => !c.pass)
    if (!r.review || (r.review.passed && serious.length === 0 && failedClicks.length === 0)) { log(`${f.key}: review passed`); return { ...r, fix: null } }
    log(`${f.key}: ${serious.length} blocking/major findings, ${failedClicks.length} failed click-throughs → fixing`)
    const fix = await agent(fixPrompt(f, r.review), { label: `fix:${f.key}`, phase: 'Fix', schema: FIX_SCHEMA })
    return { ...r, fix }
  },
  async (r, f) => {
    if (!r) return null
    if (!r.fix) return { ...r, verify: null }
    const verify = await agent(reviewPrompt(f, { ...r.author, afterFix: r.fix }), { label: `verify:${f.key}`, phase: 'Verify', schema: REVIEW_SCHEMA })
    return { ...r, verify }
  },
)

return results.map((r, i) => ({
  family: FAMILIES[i].key,
  ok: !!r,
  screens: r?.author?.screens?.map((s) => ({ id: s.id, states: s.states.length, exercised: s.states.filter((x) => x.exercised).length })) || [],
  componentsMissing: r?.author?.componentsMissing || [],
  sharedChangeRequests: [...(r?.author?.sharedChangeRequests || []), ...(r?.fix?.sharedChangeRequests || [])],
  reviewPassed: r?.review?.passed ?? null,
  findings: (r?.review?.findings || []).length,
  fixed: r?.fix?.fixed?.length ?? 0,
  notFixed: r?.fix?.notFixed || [],
  verifyPassed: r?.verify ? r.verify.passed : null,
  remaining: r?.verify ? r.verify.findings : (r?.review?.findings || []).filter((x) => x.severity === 'minor'),
  clickFailures: (r?.verify?.clickThrough || r?.review?.clickThrough || []).filter((c) => !c.pass),
  limitations: r?.author?.knownLimitations || [],
}))
