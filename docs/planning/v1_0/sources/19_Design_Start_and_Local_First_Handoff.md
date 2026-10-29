# 19 - Start design: local Android handoff

**Version:** 1.0  
**Date:** 29 October 2026  
**Status:** Design handoff baseline; implementation and validation pending  
**Owners:** Design lead, Android lead, audio lead and product lead

## 1. Readiness and immediate assignment

The planning baseline is sufficient to start design. No additional questionnaire is required before the first design work package. Begin a fresh native Android design for the owner's Galaxy S26 Ultra using **C - Crystal Current**. Use **Mobile DJ** as an explicitly temporary working label; **ParDay** names the assistant. Neither label chooses a public repository name or final app brand. Do not inherit Mixline.

Read this document, the root README, AGENTS.md, Document 12 and the decision ledger first. Then use Documents 03/04 for interaction and material rules, Document 02 for requirement IDs, and Document 08 for assets. Consult Documents 05/06 for control-to-engine boundaries, 13 for ParDay, 14/16 for acquisition and 15 for specialist modules. Document 10 assigns the broader build workstreams.

The first assignment is a connected portrait/landscape design and interaction specification for **local import -> prepare -> route check -> load two decks -> transition -> record/save -> resume**. Include failure and recovery states. Accompany it with the expansion map for the complete feature set. This is design work; a prototype must identify any simulated audio, source, model or hardware behavior.

## 2. Decisions the next agent must preserve

| Confirmed direction | Design consequence |
| --- | --- |
| Local Android version first; AWS later | The phone owns library, preparation, session and audio. No server pairing or cloud account is required for the local journey. |
| Galaxy S26 Ultra first; up-to-date software reported | Design for native phone windows and measured device settings; exact build, density, insets and audio route still need capture. |
| Serious mobile/live DJs primary; casual streaming DJs secondary | Keep precise touch control while making preparation and source readiness understandable. |
| Personal practice/private gatherings; personal-tool delivery | No app billing, public-store submission or customer acquisition flow is required. |
| C Crystal Current | Pale frosted glass, titanium, dark-ink labels and restrained brass. A is historical comparison only. |
| Full enumerated professional scope, excluding lighting/external controllers | Four decks, stems, sampler/sequencer, recording, automix, mic, video/karaoke, broadcast and genuine third-party hosting remain tracked. |
| USB audio interfaces and DJ splitters allowed | Design truthful route/cue checks. Do not invent a supported hardware configuration. |
| ParDay preparation plus specifically armed assistance | Read/propose until a bounded performance plan is armed; make immediate takeover clear. |
| Spotify/YouTube link-to-file capability, including unofficial candidates | Design paste/share, exact-version/source review, format choice, transfer, validation and local publication. No adapter is yet proven working. |
| Compatible open-source DSP preferred; paid alternative acceptable if justified | Keep presentation independent of a DSP vendor; no purchase is implied. |
| AWS later, about US$35/month excluding ParDay AI charges | Keep expansion modular. This is a future planning target, not a quote, hard cap or deployment instruction. |
| Possible future open-source GitHub sharing | Keep provenance and reproducible sources. Licence, repository and publication remain later choices. |

Local first does not mean every capability works without a network. Discovery/downloads, broadcasting and optional provider AI can need connectivity. A prepared local set remains usable when those services are unavailable. Establish the on-device acquisition baseline first; compare it with AWS when expansion is considered. A failed local source adapter is a specific feasibility gap, not permission to introduce a mandatory server.

## 3. First connected design work package

Design these scenes as one navigable journey using a small, clearly labelled fixture library. The existing fictional titles AURORA DRIVE and COPPER SKY may be reused as fixtures; their displayed waveform or meter values are illustrative until backed by real audio.

1. **Open or resume.** Empty library offers Import and clearly labelled Demo when demo media actually exists. A saved session shows missing media honestly and requires deliberate audible resume.
2. **Import and prepare.** Select local files, show per-item validation/indexing, search the result, inspect an uncertain grid, edit a cue and preserve the correction. A failed file leaves valid imports available.
3. **Check output.** Show the actual route, supported master/cue arrangement and any mono tradeoff. Without independent cue, explain the limit and retain available master playback. Never claim that headphones are isolated without route evidence.
4. **Perform.** Load A/B deliberately, play, cue, nudge/sync, operate EQ/faders and complete a transition. Browse the next track while the transport, crossfader, route and meters remain reachable. Protect audible-deck replacement.
5. **Record and finish.** Start eligible recording, show storage/finalization, recover writer failure without interrupting unrelated playback, save useful preparation/session history and return to a recent set.
6. **Recover.** Show route loss, pointer cancellation/rotation, missing next track, low storage and interrupted-session recovery. Specify the actual action and the music that remains available.

Map these scenes to FR-001/002/004/006/008/010/020/022/023/031/033-042. Document 02 remains the authoritative requirement set; this work package does not replace it.

## 4. Screen inventory and expansion map

Two visible decks are a proposed default composition, not the product's final deck limit. Keep four stable deck identities and an accessible A-D focus path. At least eight hot cues per track and the selected sampler/sequencer remain in the control-access map, even when only one bank is visible.

| Family | First design coverage | Essential states |
| --- | --- | --- |
| Launch, library and crates | Complete connected journey | Empty, missing file, partial import, duplicate, no results, offline, analysis pending |
| Track preparation | Grid/cue edit and saved correction | Uncertain, edited/locked, undo, pending analysis, save failure |
| Readiness and routing | Master/cue review and route change | No isolated cue, split mono, unsupported route, disconnected |
| Performance/mixer | Portrait and landscape A/B, A-D focus map | Empty/loading/playing/paused, held touch, pending quantized action, clipping, protected load |
| Pads, loops, FX and stems | Workspace architecture and representative components | Bank/mode, edit, pending/active latch, unavailable stems, resource refusal |
| Sampler/sequencer | Sixteen-slot/bank and pattern access map | Empty slot, sounding pattern, queued next-bar revision, immediate/quantized stop |
| Queue/automix | Next readiness and takeover sequence | Missing next track, committed transition, expired edit, manual takeover |
| Recording/history | Complete save/resume journey | Restricted source, full storage, interrupted writer, recoverable segment |
| Sources/downloads | Local execution flow and state specification | Matching, ambiguous version, unavailable adapter, format/quality, progress unknown, cancel, validate, ready |
| ParDay | Preparation proposal and armed-transition states | Local only, thinking, stale proposal, needs review, applied, cost limit, unavailable |
| Video/karaoke/broadcast/mic | First-class workspace map and critical controls | Preview/program distinction, singer queue, mic assignment, disconnected receiver, restricted source |
| Plugin rack/settings/recovery | Compatibility and configuration structure | Missing/failed plugin, bypass, dirty/save/discard settings, restore mismatch |

Complete this map before treating a polished two-deck screen as the whole design. Selected specialist controls may use focused destinations; they must not become tiny permanent controls squeezed into one phone view. AWS service setup stays outside the first local onboarding journey.

## 5. Material, geometry and input rules

Use `assets/design_tokens_proposed.json` as a proposed token source. C is selected; its exact colors, fonts and geometry still need verification. Prioritize track identity, time/beat position, transport, levels and output state. Keep text on stable opaque backing. Express steampunk through precise rims, grips and index marks; do not add moving gears, steam or a heavy live 3D scene.

Use Android dp/sp and inspect actual safe areas and text scaling. Document 03 records the Android 48dp target guidance; frequent transport/pads have a proposed 56dp target. Draw hit bounds separately from visible artwork and check overlap. The concept render's aspect ratio and pixel count are not device measurements. Design portrait and landscape deliberately; broader tablet/foldable layouts are later qualification work, not a reason to postpone the phone composition.

Each custom control needs a stable deck/parameter identity, value/unit/range, gesture, accessible alternative, pending/acknowledged state and cancellation behavior. Hold gestures retain their original identity through focus changes. A compact library or ParDay panel preserves essential live controls. Performance values apply immediately; configuration changes use explicit Save and honest persistence status.

Deliver C daylight, low-light and opaque high-contrast treatments, plus reduced transparency/motion. The Essential rendering tier retains every qualified musical action. Simplify optical decoration before reducing legibility or changing audio behavior. Visual acceptance and audio/functional acceptance are separate.

## 6. Assets to create first

| Priority | Work order | Required output |
| --- | --- | --- |
| First | AS-04/05, AS-06/07/08 | Coherent icon/DJ symbol subset and editable native/vector controls with state and hit-bound specifications |
| First | AS-09/10/12/13 | C material recipes, markers and calibrated-meter design with opaque fallback |
| First | AS-02/03/15 | Verified font shortlist or system fallback; original deterministic artwork placeholders |
| First | AS-27/30 | ParDay proposal/status family and truthful local acquisition state components |
| Before functional prototypes | AS-11/21/22/23 | Authorized local demo/fixture media, actual waveform data and exact route diagrams |
| Module slices | AS-14/19/20/24/29 | Stem/FX symbols, original samples/loops, rehearsal content and video/karaoke fixtures |

AS-28's two concept PNGs already exist and record the selected material direction. They are not production control atlases. The other production work orders remain proposed or to create. AS-01 branding can wait for the app name; optional promotional/3D assets do not block the personal app. Every acquired/created item needs the provenance, licence, version/hash, editable master and fallback fields in Document 08. No asset procurement is authorized by the AWS target.

## 7. Design handoff acceptance and evidence

Deliver editable screen/component sources, exported previews, the connected interaction flow, a screen/state index, token changes, control-to-requirement mapping, asset manifest updates and a concise verification report. Separate states actually exercised from merely drawn. Provide native-layout measurements where available and explicitly label unmeasured device assumptions.

The design passes its handoff review when the owner can follow the local first-mix journey; portrait/landscape retain the same musical meaning; essential controls remain reachable during browsing/ParDay use; four-deck and specialist navigation are accounted for; and empty/loading/error/offline/recovery states have useful next actions. Check long titles, large text, color-independent identities, reduced motion, route ambiguity, stale proposals and unknown progress. The proposed usability guardrail is zero wrong-deck or destructive-seek actions in scripted trials; no such result is claimed yet.

Screens alone cannot pass engine, source-extractor, latency, plugin, video or thermal gates. Report **functional status**, **visual status**, **physical-device evidence** and **asset rights status** separately. Current application status is not implemented/not verified; existing concept generation and this planning audit are separate completed activities.

## 8. Questions assigned to the phase that needs them

The app name can wait for branding. Exact S26 Ultra build, dimensions/settings and audio accessories must be captured before physical-device claims. DSP/plugin/source feasibility needs experiments before support promises. ParDay provider, credentials and a separate spending limit are needed before paid model use; optional voice can remain absent from the first prototype. AWS account/region/service/current quote are needed only when expansion starts. Project licence and public repository contents are needed before any source publication. None requires another planning round before design begins.

**Next agent task:** design the connected local journey in section 3, preserving the confirmed choices and the complete navigation map. Use Document 10's bounded work packages for implementation after the owner requests it. Log any new decision that changes scope; resolve ordinary reversible layout choices within the selected C direction.
