# Mixline 5.0 — design discussion

Status: working proposal, not an implementation specification or approval to build 5.0.
Date: 28 October 2026 (America/Barbados).
Current code baseline: 4.0.0-test2, repository main at 96c97ed when this discussion began.
No application files, APKs or published environment settings are changed by this design exercise.

Implementation update: the user subsequently authorized the 5.0 build and GitHub update. This document preserves the design-phase baseline and comparison; see [the 5.0 release scope](../RELEASE-5.md) and [verification](../VERIFICATION-5.md) for the delivered implementation.

## Direction from this discussion

The user reports that 4.0 lost capability and menu usability, specifically the interactive FX pad, and feels the interface has worsened. They want more useful screens/panels, including waveform panels, and stronger glow animations/states. They explicitly ask to study the versions before video and stop allowing video to dominate the instrument.

The foundation is therefore **legacy Touch Studio V4 + legacy Wave Studio V4.1**, retaining useful later improvements. The legacy V4/V4.1 names precede mobile v1–v3 and current Android 4.0; version numbers alone do not identify the chronology. Video is an optional extension of the music instrument, not the organizing principle of 5.0.

Already established: Android/S26 Ultra; portrait and landscape; red Deck 1 and cyan/blue Deck 2; speaker/USB-C first; local-master recording without microphone for the test workflow. These do not need to be asked again. The earlier equal-priority local/video instruction is superseded for this design phase by the user's explicit request to return to the pre-video roots.

Confirmed in the latest discussion: **balanced waveforms with medium platters is the starting performance view**. The user also explicitly requested investigation of **Free To Use, Internet Archive and Wikimedia Commons**, alongside restoring Audius and Jamendo. This approves feasibility research, not an unvalidated integration promise or application implementation.

## Evidence and confidence

- Earlier conversation: https://chatgpt.com/share/6ae009be-afd4-83ea-8e24-6fc6858816ad . Its final release descriptions are Touch Studio V4 and Wave Studio V4.1.
- Later conversation: https://chatgpt.com/share/6ae123ee-4ab4-83e8-b6f2-1bea2f69eff6 . Its final mobile version is 3.0, including the approved control/DNA boards and experimental video work.
- The archived release descriptions explicitly state the older behavior below. The complete original engine is unavailable here, so those historical claims cannot be rerun or treated as newly verified behavior.
- Recovered v3 presentation source also shows an expanded library/prepare/queue workflow, collection tabs, video tools, studio utilities and appearance brightness. It depends on missing base modules; it is not a runnable old app.
- Current 4.0 behavior is inspected in web/app.js, engine.js, store.js, video.js, waveform.js, motion.js and the current rendered captures. Some current engine operations exist without any accessible UI.
- Native key lock, continuous sync, stems and partner catalogs were proposals or unverified integrations, not automatically established older capabilities. The design must not claim they were removed working features without further evidence.

## Capability ledger: restore access and behavior before adding features

| Capability | Older documented behavior | Current 4.0 test2 | 5.0 discussion disposition |
|---|---|---|---|
| Direct workspaces | Touch Studio: Decks, Mixer, Pads, FX, Library on one session | Perform has shortcuts below tall decks; elsewhere frequent tools are reached through Tools | Restore direct, consistent access; no hub for frequent performance tools |
| FX performance pad | Large two-axis filter/echo surface alongside independent controls | Separate rotary sends; XY surface absent | Restore as the centerpiece of FX, with an optional quick panel |
| Main Cue | Temporary cue semantics, hold to audition, release/return behavior | Click Cue pauses/returns; no hold-audition UI | Restore and distinguish Cue, hot cue, and Return to start |
| Temporary tempo nudge | Hold to speed/slow, release returns to chosen tempo | Beat jumps exist; they are not temporary tempo nudges | Restore explicit pitch-bend/nudge controls |
| Waveform workbench | Overview + detailed waveform, expanded Wave desk | Single overview with seek staging, cues/loop overlays | Restore dual-scale waveform and Wave desk |
| Wave gestures | Explicit Seek/Pan/Scratch, pinch zoom, vertical fine seeking, Fit/Follow | Seek on waveform; scratch on platter; no full mode/zoom system | Restore explicit modes and gestures without accidental seeks |
| Cue/marker editing | Eight named/colorable cue slots, manual section markers and navigation | Eight numbered cues retained; no names/section markers; clear-all action | Preserve eight slots and restore names, per-cue editing/clear and manual markers |
| Loop editing | Beat loops, In/Out, draggable custom boundaries | Beat lengths and In/Out retained; no draggable handles | Restore exact/graphical editing, custom labeling and loop movement |
| Preparation | Independent preparation waveform/preview position, prepared cue, crate | Title/artist/BPM/start form; no preparation waveform/isolated preview | Restore real prepare workspace and context panel |
| Collection organization | Crate and later source/favorites/recents collections | Local imports/demo filters and search | Restore crates/favorites/recents with meaningful source organization |
| Mixer precision | Separate trim, channel, EQ cuts, filter, master meter/mute | Basic mixer retained; trim exists in engine but not UI; no full kill/master UI | Restore missing control access and clear channel scope |
| Track management | Cancel load, eject/deselect, safe failed replacement | Safe replacement retained; eject/cancel APIs have no UI | Restore explicit non-destructive management tools |
| Timing/grid | Tap/manual correction, approximate estimation, manual downbeat, quantized actions | Tap/manual BPM and one-time tempo/phase match; no full grid/quantize UI | Restore the documented grid/timing tools; label estimates and manual values |
| Transition styles | Blend, bass exchange, echo out; manual takeover | Blend/echo-out available; bass exchange absent; limited preset seconds | Restore styles and proper duration/parameter controls with takeover |
| Fine/exact control | Fine mode and exact numeric entry | Keyboard step, rotary drag/reset; no consistent numeric editor/fine mode | Restore a consistent exact-value/fine interaction |
| Haptics | Off/Essential/Detailed and test feedback | Boolean on/off; detent throttling | Restore meaningful profiles and feedback preview |
| Session/library retention | Sessions/crate existed; music needed reselection after reload | Managed audio copies, recordings, recovery and atomic local session restore | Retain these 4.0 improvements |
| Sources | Originals, Audius, Jamendo, Your Files and Crate; live online playback unverified | Two originals/local imports + experimental visible YouTube; Audius/Jamendo absent | Restore Audius/Jamendo library integrations and validate live; retain local improvements. Full source inventory is in the expanded audit. |
| Routing | Earlier split/cue controls were described; hardware behavior unverified | Android-selected stereo output; no private cue routing | Separate software restoration from USB/split-output feasibility; no fake private preview |

This ledger is a baseline for discussion. Each row needs an agreed retain/restore/redesign/defer decision before implementation. Fewer buttons or prettier controls are not evidence that a capability was preserved.

## Why the current flow regressed

1. We rebuilt a smaller core before completing a parity audit. The pad and waveform behaviors were dropped rather than carried forward.
2. Menu compression displaced frequent work: shortcuts can be below the fold, and returning through Tools costs context even when a control technically exists.
3. Global Local/Video mode changes pause the previous engine. A navigation-looking action can therefore alter a live performance.
4. Library preparation became a numeric form instead of a music-inspection workflow.
5. Large platters, repeated transport and decorative hardware consume space while useful editing controls are distant. More chrome did not restore interaction depth.
6. Some operations work only at engine level. Programmatic existence does not make them usable features.
7. State cues conflate loaded, playing, audible and armed. Decorative glow cannot resolve that ambiguity by itself.

## Proposed flow: one persistent session, several direct working surfaces

Proposed primary workspace rail, always reachable:

**Decks | Waves | Mixer | Pads | FX | Library**

These select views of the same decks/session. They do not reload tracks or stop playback. No Tools hub is required to reach them. Selecting a deck is explicit and persists as the target for Wave/Pad/FX work; every such panel shows Deck 1, Deck 2, or Both prominently.

A persistent performance dock retains both track identities, Play, Cue, current balance and crossfader. Recording state/timer, queue access and session utilities are discoverable without turning them into extra required navigation layers. Final exact placement is a wireframe decision, not approved yet.

A typical local session:

1. Library: find/select a track. Selection alone does not load or play it.
2. Prepare: inspect a waveform, set start/cues/markers/grid, optionally preview independently of deck timing.
3. Load Deck 1 or 2 deliberately. Replacing a live deck has explicit protection.
4. Perform: move directly among Decks, Waves, Mixer, Pads and FX while playback stays continuous.
5. Open the local queue/crate panel when useful; prepare and load the quieter deck, then perform the transition.
6. Record/save through session utilities while the same live deck state remains visible.

Preview isolation is about not moving live deck clocks. It does not imply private headphone routing. A preview through the current audience output must be clearly labeled or protected while live; private preview needs a validated output configuration.

### Useful panels, not deeper menu chains

A dedicated Wave workspace and quick waveform panel can coexist:

- Tap a deck's expand-wave action to open **that deck's Wave Inspector** over the working area.
- Keep the other deck's identity and the performance dock interactive.
- Show overview + detailed waveform; Seek/Pan/Scratch mode, zoom/Fit/Follow; contextual cues/markers/loops.
- Open cue naming, custom loop, grid/downbeat and track preparation from relevant controls.
- Closing returns to the originating workspace with its scroll, selection, analysis window and live playback intact.
- Live waveform/FX panels should not block access to transport. Blocking confirmation dialogs are for genuinely disruptive operations; avoid stacked dialogs and gesture-only access.

Landscape can show the inspector/library alongside decks. Portrait needs an expandable working-area panel with explicit expand/collapse/close actions. The size and scroll boundaries must be judged in phone-sized wireframes before making artwork.

## Restored FX workspace

The large XY surface is the primary instrument. Independent rotary/numeric controls remain alternate precise inputs, not its replacement.

- Deck 1 / Deck 2 / Both target selector remains visible.
- Initial mapping proposal: X = low-pass ↔ neutral ↔ high-pass filter; Y = dry ↔ echo send. Axis assignments/labels must be explicit.
- A puck, crosshair, axis readouts and a restrained effect-colored trail show the gesture and current values.
- Confirmed by the user: releasing the finger retains the last XY position until they move it or press Reset. This latched behavior is the default; no spring return is implied. The puck, values and active glow remain stable after release.
- Bypass and Reset are distinct actions. Bypass temporarily disables the effect while remembering the pad position/settings; Reset returns the target to neutral. Changing screens or opening a waveform panel must not reset a latched effect. The UI must show actual active/bypassed state and deck scope.
- Audio and visual release/ramp behavior must agree; animation must never delay the command or imply an active effect after bypass.
- Keep wet/feedback/time controls and effect selection in an expandable rack. Restore echo, reverb and sampler plus previously documented transitions; do not label arbitrary presets as implemented DSP.
- A compact Quick FX panel can open from performance without changing decks or interrupting a simultaneous fader gesture. Target selection changes which controls are inspected; it must not overwrite either deck's parameters until the user acts.

## Visual direction and glow grammar

Recommended foundation: **expressive, precise DJ instrument**. Restore the pre-video interaction depth; retain red/cyan identities. Use strong artwork/type hierarchy, graphite surfaces and purposeful neon. Reduce non-interactive chrome/tonearm dominance and repeated controls that squeeze working tools. Wave-first, vinyl-focused and FX-focused arrangements can be layouts of one instrument rather than separate apps.

Glow intensity is not a substitute for clear state. Proposed grammar:

| State | Appearance/motion proposal | Meaning required |
|---|---|---|
| Empty/unavailable control | Quiet boundary, readable disabled reason, no animated glow | No track/capability; does not look ready |
| Loaded/ready | One brief settle glow, then a small steady indicator | Asset/player ready; not automatically audible or buffered |
| Playing but silent | Low steady deck-color transport ring + explicit SILENT/MUTED state | Clock is running but no audience contribution |
| Audible deck | Clear steady ring and subtle halo tied to measured post-fader signal | Audience contribution, not just pre-fader activity |
| Cue/pad press | Short local flash/press depth, then correct saved/active state | One deliberate action; no full-screen flash |
| Armed next/quantized action | Amber edge + ARMED label; restrained bounded pulse | Prepared/pending; never means already playing |
| Loop active | Green loop bounds/indicator + length/custom label | Actual engine loop, with distinct armed vs active state |
| FX active | Violet control illumination scaled by true wet amount; visible puck/axis state | Effect active, not merely a selected FX tab |
| Automatic fade | Progress tied to actual fade, directional balance; takeover clears immediately | Actual transition duration; no ornamental timer |
| Buffering | Amber player status outside the video, bounded waiting/recovery | Source waiting; not fabricated loading percent |
| Error | Icon + explanatory text + recovery action, distinct from red Deck 1 branding | A real failure, not just a color shift |
| Keyboard focus | Separate stable focus outline | Input location, not playback/FX state |

No constant flashing across all controls. A beat-synchronized glow is only meaningful with a valid phase/grid; for unknown tempo/video use a steady state. Reduced-motion and stage/daylight intensity preferences preserve the same readable states. Haptics should mark deliberate actions/detents rather than buzz on every drag frame.

## Role of video

Video is retained as an optional source/view after the DJ core is established. It must not dictate the default navigation, consume the normal audio workspaces or replace local capabilities.

Official players still have visibility and API constraints. If an active video cannot remain visible in a proposed panel/layout, the interface must make the consequence explicit rather than silently pause under a navigation label. Local waveform/DSP/recording controls are available according to source capabilities, not faked for YouTube. Existing mixed-beats-only recording scope remains local audio unless a future supported source can join the master graph.

## What to agree before making 5.0

1. Complete and agree the capability ledger against the pre-video baseline.
2. Settle direct workspace navigation, deck targeting and live panel behavior using phone-sized wireframes.
3. Show the FX pad, Wave Inspector, Library/Prepare and core Deck/Mixer flows in empty, ready, playing, armed, held, buffering and error states where applicable.
4. Review a focused motion/glow study against this state grammar.
5. Walk through concrete tasks: prepare without disturbing playback; scratch waveform + fade with another finger; hold/release FX; name cues/edit loops; cancel a replacement; record and recover.
6. Record decisions and remaining feasibility work explicitly. Only then scope the 5.0 implementation. No APK or application code is changed during this discussion.

## Open decisions

- FX release behavior is settled: retain the last position until moved/reset. Remaining detail: per-deck FX state and the exact Both-target behavior must be mapped without changing parameters merely when selecting a target.
- Default performance emphasis is settled: balanced waveforms with medium platters. Expanded Wave and Vinyl views retain their tools; exact geometry remains to be reviewed.
- Exact dock/rail/panel placement and which quick controls stay visible in each orientation.
- Restoration priorities within the capability ledger, subject to the user's stated goal of retaining the pre-video foundation.


## Next discussion round

The user chose balanced waveforms and medium platters for the starting view. Develop that composition with immediate expanded Wave and Vinyl views, preserving the same capabilities. Do not re-ask the default-layout question.

The user has approved balanced performance emphasis. The six-item rail, precise panel geometry and glow timing/intensity remain proposals. Do not treat this document as permission to start application implementation or generate a 5.0 APK.

## Expanded source and functionality pass

The user explicitly requested a comparison of all older functionality and library sources, plus new 5.0 renders. The detailed [restoration audit and screen study](MIXLINE-5-PARITY.md) inventories every named source, the recoverable initial rehearsal features, pre-video Touch/Wave capabilities and later mobile/session tools against 4.0. It distinguishes missing functionality from intentionally retired integrations and ideas that were never completed.

Audius and Jamendo belong in the restoration scope, not an unspecified commercial-provider backlog. Their historical live playback was unverified, so restoring the workflow still requires current provider and phone validation. Originals, Your Files, source search/selection, Crate and the full preparation workflow also remain explicit requirements. The original six-demo collection and transition rehearsal/adjacent-pair practice are accounted for in addition to the previously discussed Touch/Wave features.

Three boards illustrate nine proposed screens: Decks/Wave/FX; Sources/Browse/Prepare; Mixer/Pads/Live queue. They use the now-confirmed balanced waveforms and medium platters, retain the confirmed latched XY pad and show the proposed direct rail. They are generated illustrations with fixture data, not app screenshots or working integrations. No application, APK, git publication or environment configuration is changed.
