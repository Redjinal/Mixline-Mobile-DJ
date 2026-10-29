# 03 · Mobile workflows and interaction contracts

**Version 1.0 · 29 October 2026 · Design handoff baseline - implementation and performance remain unverified**

Android first, with **C - Crystal Current** selected and Galaxy S26 Ultra as the initial test device. Its current software is owner-reported; exact build and route are uninspected. This new product reuses no Mixline design or code. USB audio interfaces and DJ splitters are allowed; external DJ controllers are excluded. Screen names and numerical usability/performance targets are proposals.

## 1. Experience contract

The user must be able to prepare, start and sustain a live set on the phone. Two visible decks are the proposed default workspace; four decks and a sampler remain selected advanced capabilities. Professional scope is preserved through deliberate focus and navigation rather than progressively smaller controls. Changing screens, selecting a deck or opening the library must not change musical state.

Local Android comes first; AWS is a later optional extension. First use opens local import and route setup, without server pairing, an AWS account or assistant subscription. The phone owns library, preparation, performance state and audio. Discovery/downloads, broadcasting and optional AI need their own connectivity; a prepared local set does not. Add AWS settings only when implemented. Its future target is about US$35/month excluding ParDay AI charges; cost settings stay outside the live surface.

Separate **Prepare**, **Perform** and optional **Rehearse** contexts. Prepare supports detailed beatgrid/cue work. Perform protects the controls needed during a set. Rehearse provides optional explanations and practice. Users can enter Perform without completing a tutorial.

The requested finished scope includes four decks, prepared and live stems, sampler/sequencer, recording, automix, microphone, video/karaoke, broadcast and plugin hosting. Lighting is excluded. These modules need dedicated views and compatibility gates; their presence in the plan does not establish universal device, plugin or source support. An intermediate two-deck build is a delivery milestone, not a redefinition of the requested finished product.

### Persistent performance shell

On compact portrait phones the shell contains:

- A labelled status selector for every enabled deck: A/B, or A–D. Each shows playing/paused/empty/loading state, an identifiable shortened track name, and a level/activity cue. Colour supplements the deck letter.
- Play and Cue for the currently focused pair, with at least 48dp touch targets.
- The crossfader, its assignments and current position.
- Master meters, recording status, the current output route, and a 48dp Master button opening its control panel.

The remaining region hosts the active workspace or library. Four-deck portrait does **not** promise eight full-sized Play/Cue buttons plus every mixer control at once. A nonfocused deck is one selector tap from its transport. Selection only changes the view. If a held gesture would disappear, defer the focus change until release; never redirect that finger to another deck.

The browser docks within the remaining space. The search keyboard may reduce result rows, but cannot cover all live controls. In an extreme small-height layout, use a compact search workflow rather than overlapping targets. These rules need validation against chosen physical devices before support is promised.

## 2. Layouts and screen inventory

Portrait uses a two-deck overview and a larger focused control area. Landscape gives the active pair adjacent workspaces and a central mixer, with waveform lanes readable together. It is a different composition, not a rotated portrait stack. Tablets can expose four channels and the browser together after usable target sizes are verified. Foldables use current window dimensions and keep critical controls clear of hinges; changing posture preserves engine state.

| Screen family | Core purpose | Required special states |
| --- | --- | --- |
| Launch and resume | Import music, use clearly labelled demo media, or restore preparation/session | Empty library, missing files, interrupted session |
| Import and sources | Grant scoped access, select files/folders, connect permitted providers | Denied permission, DRM/unsupported format, expired access, partial indexing |
| Library, crates and playlists | Search/filter, organize, queue, audition where supported, choose Load A/B/C/D | Offline, duplicates, no results, analysis pending, unavailable source |
| Track preparation | Edit beatgrid, BPM/key, cues, loops, gain, tags and phrase markers | Uncertain analysis, manual override, undo, unsaved changes |
| Readiness and routing | Identify master/cue outputs and validate local media/storage | No separate cue route, mono tradeoff, missing track, low storage |
| Performance and deck detail | Transport, waveform, pitch, jog, sync, slip/reverse, beatjump | Near end, held scratch, pending quantized command, protected seek |
| Mixer | Gain, EQ, filter, faders, assignments, headphone mix and meters | Clipping, limiter action, muted channel, cue selection |
| Pads, loops and sampler | Cue/loop banks, samples, choke groups, sync and gain | Empty slot, edit mode, playing loop, missing sample, stop samples |
| FX and stems | Effect chain/XY controls, stem levels and preparation | Source restriction, processing, unavailable effect/model, active latch |
| Queue and automix | Reorder, prepare transitions, inspect next item, manual takeover | Locked current item, committed transition, missing next track |
| Recording and history | Record eligible audio, show duration/storage, export and recover | Restricted source, storage full, interrupted recording, recoverable fragments |
| ParDay assistant | Search permitted context, propose preparation and transitions, explain readiness and rehearse | Offline/local-only, thinking, proposal ready, expired proposal, unavailable provider, cost limit |
| Video and karaoke | Select eligible video/captions, preview the output, manage synchronization and display routing | Missing video/captions, unsupported format, unavailable output, late decoding |
| Broadcast and microphone | Review destinations and routing, monitor levels, deliberately start/stop transmission | Private monitoring, disconnected destination, muted input, feedback risk, restricted source |
| Plugin rack | Inspect compatible effects/instruments, parameters, presets, cost and bypass | Unsupported plugin format, failed validation, unavailable plugin, unsafe load or state restore |
| Settings, help and recovery | Search settings, save preferences, inspect licenses, restore safely | Draft/preview/save failure, route change, entitlement offline, interrupted operation |

Routine account, subscription, announcement and permission prompts must not obstruct an ongoing performance. Request permissions before the affected operation starts. A mid-session source revocation or system interruption follows the actual provider/platform rule, with a clear explanation; uninterrupted access is not promised after authorization is lost.

## 3. End-to-end journeys

**First useful mix:** open → choose demo or import → select an available track → load Deck A → inspect output → play → load Deck B → cue/align → crossfade. If a track fails, keep the other deck running and return selection to the failed deck. Do not mistake a completed tutorial for a completed mix.

**Prepared set:** import → analyze → inspect uncertain grids → set cues/loops → build crate/queue → confirm offline availability and rights → route check → Perform → record when eligible → save session log and export. Analysis can be pending without blocking all library browsing.

**Live browsing:** open the docked library → search/filter → select → choose destination → protect an audible occupied deck from accidental replacement → show load status for that deck → confirm engine readiness. A tap on a row selects; it does not load immediately.

**Discover and download:** search, paste or share a supported link → resolve the requested recording and actual media source → select version/format → download through an enabled on-device adapter → validate → publish to the phone library → prepare → load deliberately. Include the requested unofficial extractor candidates alongside direct-file and provider routes. Show actual source, progress and cancellation; unavailable capabilities have specific reasons. A catalog match is not a ready file. Do not substitute server setup when an on-device adapter fails; expose the source-specific gap while preserving available local import. The same job contract can add an explicitly configured AWS execution path later. Documents 14 and 16 define source evidence, transfer and preparation.

**ParDay-assisted preparation:** a request to suggest a crate, transition or preparation edit produces a bounded proposal with named tracks/actions and permitted context; preview, accept selected changes, then verify actual results. A direct request to create a reversible crate can authorize saving it immediately under the existing task scope, with visible outcome and Undo. Audible performance still requires a specifically armed plan. Declining or dismissing a suggestion leaves music and preparation unchanged. A cloud timeout leaves the current set running.

**Failure recovery:** identify the affected capability → preserve unaffected audio → show a concise actionable state → attempt only a safe recovery → reconcile actual engine/source status → restore the relevant view. UI timeout does not prove an operation failed; do not send duplicate commands blindly.

## 4. Touch and musical behavior

Every control must define its engine command, units, legal range, pending/acknowledged state and cancellation path. Musical scheduling belongs to the engine. Visual animation is never the timing source.

| Control | Required behavior | Alternative / recovery |
| --- | --- | --- |
| Full-track overview | Navigation surface. Drag previews a time/beat target. Default Seek Lock on audible decks requires an explicit Seek action to commit. Stopped/cued decks may seek directly according to quantize settings. | Time/beat entry and Beatjump actions; cancelling preview leaves playback unchanged. Advanced jump-to-touch is a deliberate preference. |
| Detailed waveform | Audio-derived multiresolution waveform with engine-aligned playhead. Propose Nudge while playing and Scrub while paused; final mapping requires DJ testing. Scratch is explicitly enabled. Pinch changes zoom only. | Zoom buttons, beatjump and accessible position controls; no decorative repeating bars. |
| Jog wheel | Distinguishable centre scratch and rim nudge zones if large enough; otherwise an explicit Scratch/Nudge mode. Slip shows a continuation marker. | Waveform scratch and labelled controls remain available; pointer cancellation releases a held scratch safely. |
| Dial | Relative vertical drag starts from the existing value; no jump on first contact. Visual rotation follows value. Units remain visible. | Enlarged inspector, fine adjustment, numeric entry and accessible increment/decrement; explicit Reset. |
| Fader | Default pickup on the thumb/current value; no abrupt far-away jump from an incidental tap. Crossfader curve, reverse and assignment are inspectable. | Accessible set/increment actions; optional advanced jump-to-touch. Detents cannot resist intentional fast cuts. |
| Cue / Play | Proposed cue behavior: while paused, holding Cue auditions from the cue point and release returns; Play during hold commits playback. While playing, Cue returns and pauses. Final semantics must match the engine contract. | Accessible activation maps to one equivalent action; no duplicate pointer-down plus click command. |
| Hot cues / loop pads | Cue numbers and bank are always visible. Quantized commands display pending execution. Editing/deleting requires explicit edit state. | Labelled edit actions and undo for preparation changes; no destructive long-press shortcut during normal performance. |
| XY pad | Names both axes, units, wet/dry and Momentary/Latch mode. Starting-point policy is explicit. Momentary release returns according to the preset envelope; Latch remains clearly active. | Independent sliders, Engage and Bypass. Pointer cancellation follows safe momentary release. |
| Queue reorder | Drag by a handle; current item and committed next transition have defined protection. | Move Up/Down or position action; actual engine acknowledgement determines whether a late change took effect. |
| Deck selector | Changes visible focus only; deck ID is never inferred from current colour alone. | Stable names and semantics; held gestures retain their starting deck ID and block a conflicting view replacement. |

All simultaneous touches bind independently to stable controls. A parent scroll region cannot steal a performance gesture. Every held action specifies pointer-up, pointer-cancel, background, route-loss and rotation behavior. Haptics and visual feedback run outside the audio callback.

## 5. Accessibility and common UI states

Android guidance recommends at least 48dp interactive targets. Compose can expand targets beyond visible bounds, so inspect overlaps rather than assuming a small icon is safe because its framework target grew. See [Android Compose accessibility guidance](https://developer.android.com/develop/ui/compose/accessibility/api-defaults), checked 29 October 2026. Provide meaningful semantics for custom dials, pads, meters and waveforms. Screen-reader announcements must report meaningful state changes without narrating every frame or peak.

Use text, position and shape alongside deck colour. Expose essential drag operations through accessible alternatives. Support font scaling, reduced motion, contrast modes and hardware keyboard/switch actions where applicable. Evaluate changes with TalkBack and on physical devices; an automated scan alone is insufficient.

Async states preserve usable controls. Library artwork may show a correctly sized skeleton; a playing deck never becomes a skeleton because analysis is refreshing. Progress percentages come from actual work units. Unknown progress is labelled; a stalled job has retry/cancel/continue-without-analysis paths.

Settings use explicit Save, a visible preview/draft distinction and scoped Reset. Performance controls apply immediately and are not settings drafts. Native search/filter state survives navigation and restoration; web URL persistence rules are adapted to local saved-view identifiers, without putting personal music paths in share links.

## 6. ParDay interaction contract

ParDay names the assistant; the app name remains open. Use a compact labelled button with a stable hit region. Its panel preserves jog wheels, pads, meters and transport. In landscape it may replace a secondary library or inspector; portrait retains the performance shell and a clear dismiss action. Opening ParDay leaves deck focus, recording, automation and routing unchanged.

Prepare may use a full-height conversation and structured proposal cards. The owner selected ParDay option C: preparation assistance plus explicitly armed assisted performance. Perform stays read/propose until a specific bounded plan is armed; the selected mode is not standing permission for arbitrary audible actions. Each actionable proposal states the affected deck or track, source eligibility, intended musical effect, timing, and whether it can be undone. Separate **Preview**, **Apply to preparation**, and **Arm transition** actions. A generic conversational acknowledgement cannot authorize an unbounded sequence of audible actions. The app validates the proposal against current deck identity, media revision, authorization and engine state when the user acts; a stale proposal becomes reviewable again instead of silently targeting the new track.

States are Ready, Local only, Thinking, Proposal ready, Needs review, Applied, Rejected and Unavailable. Saved results or engine acknowledgements determine success. Preserve useful content during loading and label unknown progress. Cancel stops future work and identifies already-applied changes. Retries cannot duplicate cues, crate entries or transport actions.

Voice is optional and explicitly started. Explain where the audio goes before first cloud voice use; microphone permission for ParDay is separate in meaning from sending a microphone to the master or a broadcast. Spoken replies are off in Perform by default and never injected into the master merely because chat is open. Text and accessible actions remain complete alternatives. No always-listening requirement is introduced.

Suggested quick actions are task-specific: “Find a compatible next track,” “Explain this route,” “Draft cues,” “Build a 30-minute crate,” and “Practice this transition.” They use actual eligible content and state. User-requested catalogue lookup follows source provenance and provider permissions; private playlists, lyrics or audio are not silently copied to a cloud model. Offline, available local controls, analysis and saved guidance continue; ParDay states which cloud-dependent capability is unavailable. Document 13 defines the tool and authorization contracts. The requested paste-link acquisition flow, including unofficial extraction candidates, belongs in a dedicated source/download panel with clear progress, cancellation, exact-version review and import status; Document 16 owns feasibility and adapter behavior. It must not obstruct transport or be executed in the audio callback.

## 7. Extended professional workspaces

Video/karaoke, broadcasting and the plugin rack are first-class destinations in the requested finished scope, reached through a labelled workspace switcher when the phone cannot show every destination simultaneously. Lighting receives no controls or placeholder. These destinations keep the same persistent audio controls and route status; they never turn an unrelated swipe into a live transport command.

The video preview distinguishes **Preview on this device** from **Program output**. Caption offset, visibility and language remain explicit. Video frames may drop under a declared visual fallback; audio is not slowed to let the preview catch up. A separate display must be verified before presenting an output as live. Use original/authorized media fixtures for planning and validation.

Broadcasting always presents destination, selected buses and actual connection state before the user starts. A recording indicator is not a broadcast indicator. Show whether microphone, samples and permitted music are included. Stop has an immediate local effect on outgoing capture according to the implementation contract, with remote termination state reported honestly. Do not silently publish a rehearsal or start transmission from an AI suggestion.

Plugin hosting exposes only validated formats and compatible plugins; “everything” cannot mean desktop binaries become Android-compatible automatically. Loading, preset changes and unsafe plugin operations occur at qualified times and follow the engine's cost and failure model. Parameter inspection and bypass have accessible alternatives. ParDay may explain or propose a rack, but cannot install code or insert an effect into audible audio on its own.

**Sequencer:** Pads includes a dedicated step-pattern view with explicit sample/track assignment, per-step velocity/mute, length, resolution and swing. A visible pattern revision and next-bar activation marker distinguish a queued edit from the sounding pattern. Start, quantized stop, immediate stop and pattern change have different labeled actions. Pattern editing does not steal touch focus from the active deck, and the stopped/offline editor remains usable without ParDay. See FR-027 and AE-06.

## 8. Rehearsal and verification

Learning Engine contributes optional contextual explanation and practice that moves from demonstration to independent transfer. No guidance appears unsolicited during Perform. Users can skip rehearsal. Completing an assisted exercise is not evidence of independent skill; learning claims require later performance on a different track.

Test a two-track transition, browsing/loading during playback, cue/loop/FX use, recording failure, rotation, pointer cancellation and route removal. Include long titles, empty/error/offline states, four-deck focus changes and a software keyboard. Proposed broader-usability study: four of five participants complete the transition independently, with **zero wrong-deck or destructive-seek actions**. It is optional; personal acceptance requires the owner's independent workflow completion plus the functional/audio gates.

Test late replies after deck reload, offline use, cancellation, duplicate Apply, unarmed audible actions, text scaling and dismissal during a held gesture. When catalogue discovery has no eligible media, show the actual next action; metadata is not a loaded deck. Exercise video, broadcast and plugin failures under the intended workload.

Functional and visual acceptance remain separate. Current status: **NOT VERIFIED — planning only**. Failure in target size or access is resolved by changing composition, not by claiming a tiny control is professional density.
