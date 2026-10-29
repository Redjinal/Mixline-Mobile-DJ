# Product vision and Product Lens review

Version 1.0 | 29 October 2026 | Design handoff baseline - implementation and device validation pending

## 1. Product direction

Create a self-contained mobile DJ instrument that lets a person prepare music, start a set quickly, perform precise transitions, remix expressively, monitor the result, and recover predictably when the phone or a music source changes state. All performance controls must work through touch. External DJ-controller integration is excluded by the user's instruction.

This is a new project. No Mixline code, screenshots, interaction decisions, dependencies, project names, or earlier approvals are inherited. Android first is now user-confirmed. The product name remains open; ParDay is the confirmed name of the AI assistant. The user has confirmed steampunk and selected **C — Crystal Current** after reviewing the A/C concepts. The first test device is a **Samsung Galaxy S26 Ultra**, reported by the user as up to date; its exact installed build and audio route remain to be recorded.

The selected direction combines liquid glass and mechanical instrument craft through pale frosted glass, titanium and restrained brass detail. A is retained as a historical comparison, not a selected night theme. The product must remain useful when decorative glass and animation are reduced.

The owner has selected a personal tool and confirmed the delivery order: **a local Android version first, an optional AWS extension later**. Local first means the phone owns the library, preparation, performance state and audio engine, with no required LAN or cloud server. Network discovery, downloading, broadcasting and optional AI calls remain network-dependent features; local first does not mean that every feature works in airplane mode. The future AWS planning target is **about US$35 per month, excluding ParDay AI-provider charges**. It is a design target, not a current quote, hard billing cap or instruction to provision resources.

They are open to publishing the code on GitHub so other people can build and operate their own home-lab solutions; publication and the project licence are not yet selected or executed. Establish the on-device acquisition baseline first. Compare that measured baseline with owner-operated AWS when the extension is considered; the earlier immediate D-versus-AWS trial is no longer a dependency for the local build. No existing local host, AWS account, region or instance is selected. The complete target includes professional audio DJ capability, video mixing, karaoke, broadcasting and third-party plugin hosting adapted to Android; lighting is explicitly excluded. The early engineering milestone is a smaller vertical slice that proves the audio and touch architecture. Passing that milestone does not mean the full product is finished or authorize reducing the final scope.

## 2. Confirmed instructions, proposals, and unknowns

| Classification | Item | Consequence |
| --- | --- | --- |
| Confirmed | Start from scratch | Begin a fresh design and, when implementation is requested, a fresh codebase; no Mixline inheritance. A temporary working label is sufficient while the app name remains open. |
| Confirmed | Mobile, quick, all-in-one live DJing | Optimize time to first mix, touch operation, preparation, routing, and recovery. |
| Confirmed | Professional feature breadth | Maintain a requirements ledger; do not call a two-player demo a professional release. |
| Confirmed | No external DJ controllers | Exclude MIDI/HID mappings, controller certification, and motorized control. Treat DVS/timecode exclusion as a proposed interpretation to confirm. |
| Confirmed | C — Crystal Current; liquid glass plus steampunk | Refine the pale frosted-glass/titanium direction into measured native screens; retain A only as comparison history. |
| Confirmed | Planning, questions, at least eight guiding documents | Deliver a reviewable dossier; implementation is a later phase. |
| Confirmed | Android first; Galaxy S26 Ultra first | Record its actual build, variant and route before benchmarking; broader phone/tablet coverage remains to be specified. |
| Proposed | Two-deck default; four-deck advanced workspace | Keep the interface quick while retaining a professional destination. |
| Confirmed ambition; admission conditional | Any and all music sources | Preserve broad discovery and approved adapters; no universal permission or catalog availability is implied. |
| Confirmed | USB audio interfaces and dedicated DJ splitters allowed | Certify actual routes separately from excluded MIDI/HID controller integration. |
| Confirmed | Personal tool only | Personal installation, reliable operation and maintenance are the baseline; commercial pricing and public-store release are not current acceptance gates. |
| Optional future direction | Open-source GitHub release for others to home lab | Prepare reproducible code/docs; choose licences and publication contents before any public release. |
| Confirmed delivery sequence | Local Android first; AWS expansion later | No server setup, cloud comparison or AWS account is required to start the phone design/build. Establish on-device acquisition evidence first. |
| Retained later evaluation | Compare the local baseline with owner-operated acquisition before selecting an expansion runtime | Keep the common contract and comparison protocol; local-first sequencing does not establish a measured long-term runtime winner. |
| Confirmed future cloud target | AWS accepted; about US$35/month excluding ParDay AI charges | Region, account, runtime, actual quote and deployment remain later choices. No local host purchase is required; optional home-lab profiles remain portability references. |
| Confirmed | Serious mobile/live DJs primary; casual streaming DJs secondary | Preserve deep touch control while offering guided preparation and clear source access. |
| Confirmed | Personal practice and private gatherings initially | Source terms still apply; broadcasting is a distinct use requiring its own eligibility. |
| Confirmed | Paid DSP acceptable; compatible open source preferred | Compare quality, licences and total maintenance cost before a purchase decision. |
| Confirmed | ParDay assisted performance, option C | Provide preparation assistance plus explicitly armed bounded transitions/automix with immediate manual takeover. |
| Confirmed capability request; mechanism unresolved | In-app link-to-file acquisition, including unofficial routes | Evaluate own/self-hosted extraction and third-party integration without assuming a working or permitted API; see Document 16. |
| Unknown | Genres, development budget, time, team, exact device build/routes and provider access | Prevents a reliable completion date or capacity claim. These gaps do not block initial design; the future AWS target is already recorded separately. |

## 3. Primary user hypotheses

The user selected serious mobile/live DJs as the primary audience and casual streaming DJs as the secondary audience. The operating context is personal practice and private gatherings, and personal-tool delivery is now confirmed. The audience definitions describe workflow depth and potential community users rather than a selected customer-acquisition strategy. Professional capability describes the depth and reliability expected; it does not imply that public or paid events were selected. Backup/travel use remains a plausible adjacent situation, not a newly approved primary audience.

These users require different promises. A performance DJ may accept preparation in exchange for reliable cueing. A casual user may reject the product if personal streaming playlists are unavailable. An emergency user may prioritize fast recovery over four-deck remixing. Resolve conflicts in favor of the confirmed primary audience while retaining the secondary audience in first-use and music-discovery testing. Do not simplify away required professional controls to imitate a streaming player.

Do not infer market demand from the existence of DJ apps. Current official product pages demonstrate that mobile DJing, stems, automated transitions, performance pads, effects, and music integrations already exist in the category. They establish a competitive baseline, not evidence that this new product will attract paying customers. [P1-P4]

## 4. Core loop and product promise

**Trigger:** I want to practice, take over music at a gathering, perform a prepared set, or respond to a track request.

**Action:** Open a recent set or choose tracks, verify the output route, load a free deck, audition through cue where supported, match timing and key, transition, and shape the result with performance controls.

**Outcome:** Music stays under the DJ's control, the next track is ready, levels are visible, the session is recoverable, and the DJ can save useful work.

**Return:** Saved crates, reliable cue points, corrected beat grids, reusable sample banks, and set history reduce preparation next time. Optional rehearsal teaches useful gestures and timing without interrupting live operation.

A proposed positioning statement is: "A complete touch DJ instrument for people who want to perform directly from a phone, with fast preparation, expressive control, and clear live-session safeguards." This is a hypothesis to test. It is not a proven advantage.

## 5. What makes the product worth switching to

Liquid glass and steampunk can create recognition, but visual polish is copyable. The stronger opportunity is the combination of three measurable benefits:

1. **Fast readiness:** a recent local set opens, validates playable media, restores preparation data, and reaches a mix with few decisions.
2. **Confident touch control:** the user can change decks, manipulate the waveform, and browse the next track without moving the wrong audible control.
3. **Trust during performance:** source restrictions, output routing, recording eligibility, thermal limits, and recovery are understandable before they become a surprise.

Prototype these benefits against the participant's current workflow. A visual preference test alone cannot validate the product.

## 6. Product Lens assessment

Historical v0.1 assessment: idea-stage prosumer/consumer lens with professional usage requirements. Preserve the score below as the earlier commercial-evidence baseline; it is not a current personal-project launch gate. No implementation, usability result or provider agreement is established. The current success question is whether the owner can prepare and perform the intended set reliably, with a reproducible setup others could adopt if the code is later published.

| Criterion | Weight | Score | Evidence and implication |
| --- | --- | --- | --- |
| Problem severity | 3 | ? | The user wants the tool, but frequency, losses, and current workaround are unspecified. Interview intended DJs. |
| Target user and market | 3 | 3 | The v0.1 brief combined audiences; v0.2 now names serious mobile DJs primary and casual streaming DJs secondary. This clarifies scope but is not new demand evidence. |
| Differentiation | 2 | 2 | Professional parity plus a visual style is currently the main stated distinction; competitors already provide broad functionality. [P1-P4] |
| Core loop and value | 1 | 2 | A useful loop can be described, but delivery depends on unbuilt audio, library, routing, and source features. |
| Feasibility and effort | 2 | ? | Native approaches exist, but team capability, SDK budget, target devices, and performance have not been established. |
| Business viability | 2 | ? | No target price, acquisition channel, support model, or willingness-to-pay evidence. |
| Risk and assumptions | 2 | 2 | Device routing, music access, thermal load, and differentiation remain unresolved. |
| Evidence | 1 | 2 | Founder intent and competitor capability are secondhand signals; no research with this product's users. |

Weighted score = (3x3 + 2x2 + 2x1 + 2x2 + 2x1) / (3+2+1+2+1) = 21/9 = **2.3/5**. Known criteria: 5/8. Weighted evidence coverage: 9/16 = **56.25%**. This score is not a probability of success.

**Historical commercial verdict: rethink differentiation before a commercial parity race.** The owner has since selected a personal tool, so willingness to pay, revenue and commercial differentiation do not block personal engineering. Continue the requested planning and bounded feasibility work. The low-coverage score does not reject a personal tool or the creative direction; it says the commercial reason to switch is not established. The 2.3/5 score is retained as the dated v0.1 evidence baseline. Audience selection is now resolved, but no interviews, willingness-to-pay tests or audio experiment have occurred. Recompute after those evidence-producing steps; do not present the old score as a fresh measured assessment. Do not raise scores merely because this dossier is more detailed than the original brief.

## 7. Ranked next work

The idea-stage ranking uses core-job centrality (0-3) plus learning value (0-2). Effort is unestimated until the team and SDK approach are known; rankings do not imply schedules.

| Rank | Work package | Type | Centrality | Learning | Why it is early |
| --- | --- | --- | --- | --- | --- |
| 1 | Output, cue, and two-deck audio experiment | Blocker | 3 | 2 | Tests whether the target phone can support the basic performance promise. |
| 2 | Local import, playability, search, and preparation | Table stakes | 3 | 2 | Tests whether a DJ can get useful music into the app quickly. |
| 3 | Portrait and landscape touch workflow prototype | Differentiator hypothesis | 3 | 2 | Tests focus errors, control reach, and performance while browsing. |
| 4 | Safe deck loading, state recovery, and interruption handling | Blocker | 3 | 2 | Defines behavior when ordinary phone events occur. |
| 5 | Stretch, key lock, beat grid, and sync comparison | Table stakes | 3 | 2 | Makes an informed DSP choice before vendor coupling. |
| 6 | Cue, loop, pad, FX, and sampler vertical slice | Table stakes | 2 | 1 | Proves expressive controls on the same engine clock. |
| 7 | Prepared stems and four-deck load experiment | Expansion of core | 2 | 1 | Establishes credible advanced device tiers. |

Video, karaoke, broadcasting, plugin hosting, prepared/live stems, four decks, sampler/sequencer, mic, recording and automix are selected for the complete target. Lighting is excluded. Delivery gates sequence and validate the selected scope; they do not authorize deleting it. Provider coverage remains an admission problem, and the user has not ranked services. ParDay and requested on-device link acquisition are local-version workstreams. The AWS comparison is a later expansion workstream, activated after a useful local baseline and a concrete expansion need; see Documents 13-18. Document 19 defines the immediate design handoff.

## 8. Proposed discovery and outcome targets

For optional community workflow research, recruit 8-12 intended users, including at least four who perform live. This study is not a requirement to install and validate the owner's personal build. This sample is for workflow discovery, not market sizing. Ask each to bring legally usable tracks and demonstrate their current preparation and next-track workflow. Include Caribbean/open-format material alongside electronic tracks when that matches the selected audience; do not assume every track has a fixed tempo or a clean downbeat.

Proposed gates: at least 8 of 10 participants complete local import and a first transition without help; median time from a prepared cold launch to first audible track under 15 seconds; no accidental replacement of an audible deck in 20 load tasks per participant; at least 6 of 10 prefer the touch workflow for one named situation after comparing it with their current app. Record failures and actual timings. These are targets for discussion, not achieved results.

If the owner later changes the objective to commercial distribution, revisit pricing and demand using real purchase intent or a paid pilot. For the current personal tool, evaluate the owner's usable music collection, required sources and actual preparation workflow directly. Optional open-source adoption is a separate question from paid demand.

## 9. Learning Engine application

Use the Learning Engine to make the planning decisions understandable and, later, to design optional rehearsal. Teach the distinctions between deck sync and automatic transitions, key lock and key shift, master and headphone cue, and streaming playback and permission to transform music.

For rehearsal, progress from demonstration to guided attempt to independent practice. Suggested exercises: set a cue, align an eight-bar phrase, recover a misaligned beat grid, move an EQ without changing the wrong deck, and identify cue-route leakage. Track assisted versus independent attempts only if the user opts in. A completed tutorial is not proof of DJ competence. Live performance must never require a lesson, quiz, badge, account, or tutorial overlay.

## 10. Owner and acceptance

Owner: product lead. Consult: working DJs, audio architect, UX lead, music integration lead. The audience, first platform, operating context and audio-accessory allowance are recorded in Document 12. Crystal Current, the first Galaxy S26 Ultra target, personal-tool delivery, local-first sequencing and the future US$35/month AWS target are confirmed. Numerical success criteria, exact installed hardware/software/audio-route profile, development and AI budgets, licence/publication choices and the eventual expansion comparison outcome remain open or proposed. They are assigned to the phase that needs them. No additional owner answer is required to start the design in Document 19. This readiness judgment does not mean the technical or commercial hypotheses have passed.

## Sources checked 29 October 2026

- [P1] Algoriddim product/platform overview: https://www.algoriddim.com/apps
- [P2] Serato DJ Pro feature overview: https://serato.com/dj/pro
- [P3] VirtualDJ feature overview: https://virtualdj.com/products/virtualdj/features.html
- [P4] Native Instruments Traktor product overview: https://www.native-instruments.com/products/traktor-pro

These sources support the competitive baseline only. Proposed priorities, research targets, positioning, and scores are this plan's judgments.
