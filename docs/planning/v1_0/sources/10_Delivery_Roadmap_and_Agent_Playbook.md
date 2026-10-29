# Delivery roadmap and agent playbook

Version 1.0 | 29 October 2026 | Design handoff baseline; implementation and deployment not started

## 1. Delivery strategy

Build the product through evidence gates. The objective is the full agreed professional mobile DJ product; a gate is a proof of readiness for the next investment, not permission to silently remove advanced requirements. This planning task ends with a reconciled design handoff; Document 19 provides the next agent's entry point. No further owner answer is needed to start design. No application, repository deployment, provider account, paid licence, or public release has been created.

The audience, C Crystal Current, Galaxy S26 Ultra first device, ParDay armed-assisted capability and personal-tool delivery are selected. The owner is open to a later GitHub source release for community home labs; publication and licence remain decisions for that stage. The latest decision is local first: develop the phone-native app and on-device acquisition path without a required server. The earlier on-device versus self-hosted comparison is retained for a later optional AWS expansion, with no measured winner. The future AWS planning target is approximately US$35 per month, excluding ParDay AI-provider charges; this is not a hard billing ceiling or deployment/spending authorization. Account, region, service and resources wait for a concrete expansion proposal. The critical path is exact route/build capture, audio feasibility, one real end-to-end mix, interaction validation, breadth on the same engine, then release certification. Visual components and asset exploration can run alongside audio work after they share the same interaction contracts. Source-access feasibility can run early, but an unavailable integration or home-lab service must not become a hidden dependency in the local engine.

## 2. Canonical delivery gates

| Gate | Deliverable | Exit evidence | Dependency |
| --- | --- | --- | --- |
| G0 - Decision baseline | Recorded owner choices, local-first sequence, selected visual direction and versioned requirements | Design can start from Document 19; proposed details and later evidence gates are labelled | Current planning dossier |
| G1 - Audio feasibility | Two native decks, candidate stretch engines, sample-clock scheduling, real output routes | Hardware timing captures, warm-soak logs, DSP listening review, licence route, fail/revise decision | G0; capture device/route and any paid experiment envelope when needed |
| G2 - Working vertical slice | Import two real tracks, prepare, load, cue, transition, save and restore | Demonstration on the named real target device; UI and audio are connected; no simulated waveform or meter values | G1 engine and bridge contracts |
| G3 - Core performance beta | Reliable two-deck mixer, library, grids, cues, loops, FX, sampler, recording eligibility and recovery | Traceable functional tests, accessibility review, owner workflow sessions, sustained performance profile; optional independent DJ review | G2 and assets for core components |
| G4 - Advanced performance | Four-deck workspace, prepared stems, richer sampling/remix features, gated live stems | Per-profile sustained tests, stems quality/alignment, advanced interaction review | G3 and explicit device tiers |
| G5 - Source/provider and ParDay integrations | Source adapters, requested on-device link acquisition and selected assistant capability | Technical proof plus separate provider-access, content-rights, distribution, token/expiry and privacy evidence; local authority and takeover tests | Adapter-specific evidence and personal scope; cloud extension cases deferred; official API not a universal technical prerequisite |
| G6 - Release candidate | Complete selected personal-release matrix, final assets, installation package and operating documentation | No release-blocking failures, signed build reproducibility, licence inventory, support readiness | Required portions of G3-G5 and resolved launch scope |
| G7 - Personal installed release | Verified signed local build installed on the owner's S26 Ultra | Install/upgrade, backup/restore and offline/outage evidence; working local setup instructions | G6 and owner-directed installation; AWS/home-lab setup and public-store approval are not prerequisites |
| G8 - Maintenance and community readiness | Personal updates, regression checks and optional source/release preparation | Reproducible setup, licence/asset manifest, secret-free examples and a tested recovery path | G7; any GitHub publication remains a separate action |

G4 and G5 can overlap. AWS and service-specific home-lab tests are deferred; local cases remain required. Complete personal release includes all selected advanced, source, ParDay and specialist modules. Lighting stays excluded. Run specialist feasibility in G1, integration in G4/G5 and release evidence in G6. Report blocked formats/providers explicitly; G3 is not the finished product.

## 3. Work ownership

| Agent/role | Owns | Must not decide alone | Required handoff |
| --- | --- | --- | --- |
| Product and integration lead | Requirements, priorities, decision ledger, release assembly | Scope removals, claims of user approval | Updated traceability and unresolved decisions |
| Native audio/DSP engineer | Engine clock, buses, transport, DSP graph, routing adapters | Music rights, public performance promises | Versioned engine API, timing data, audio fixtures |
| Android platform engineer | Lifecycle, foreground playback, files, audio focus, device routes | Ignoring system interruption rules | Device/event matrix and instrumentation |
| UI/interaction engineer | Compose screens, touch capture, accessibility semantics, state presentation | DSP truth, unsupported device capability | Rendered screens and input-state tests |
| Visual/technical artist | Tokens, vector controls, materials, iconography, motion | Adding expensive effects to live path | Asset manifest, source masters, fallback variants |
| Library/data engineer | Track identity, crates, search, analysis jobs, migrations, backups | Overwriting user cues during reanalysis | Schema migrations and conflict/recovery examples |
| Analysis/ML engineer | Beat/key analysis, waveform pyramids, stem generation | Equating a model licence with all weight/data rights | Reproducible model manifest, quality/thermal results |
| Music integration engineer | Capability resolver, contracted provider adapters | Treating public APIs as DJ authorization | Per-provider rights/capability table and tests |
| Cloud/home-lab service engineer - later extension | Deferred comparative acquisition worker, pairing, optional AI gateway, retention and updates | Making a server a local-release prerequisite, selecting a winner without evidence or making live audio server-dependent | Reviewable expansion proposal, then reproducible deployment and measured cost/outage/deletion behavior |
| ParDay AI engineer | Provider adapters, typed proposals, source-filtered context, authority validator | Giving model output direct audio authority or unreviewed data egress | AI-001-024 fixtures, cost/retention settings, rejected-action evidence |
| Audio/video and plugin engineer | Video clock/composition, karaoke, broadcast encoders, real plugin host | Claiming unsupported mobile formats or bypassing distribution rules | Document 15 compatibility profile and AV evidence |
| QA/performance engineer | Fixtures, traces, device profiles, soak and recovery tests | Accepting visual simulation as functional proof | Evidence bundle mapped to requirement IDs |
| Security/release engineer | Dependency review, signing, privacy, distribution checks | Sending messages, buying licences, publishing without authorization | Release checklist and verifiable build provenance |
| DJ reviewer and accessibility reviewer | Actual workflow and listening acceptance | Certifying untested devices or audiences | Observations, failures, and recommended changes |

One person can fill several roles, but independent review is needed for the callback, route changes, capability enforcement, and release claims. AI agents accelerate bounded implementation; their output is not evidence that a phone sounds or behaves correctly.

## 4. Proposed repository organization

Create these locations when implementation is authorized. They are a starting convention, not existing inspected files:

```text
app-android/                  Native app, lifecycle, navigation
core/domain/                  Shared IDs, commands, immutable state
core/data/                    Room, migrations, import and search
audio/engine/                 Platform-independent C++ mix graph
audio/android/                Oboe and platform routing adapter
audio/dsp-adapters/            Replaceable licensed DSP interfaces
analysis/                     Beat/key/waveform/stem workers
features/performance/          Deck, mixer, waveform, pads and FX
features/library/              Import, crates, preparation and search
features/routing/              Output and headphone setup
integrations/                  Source adapters and capability policies
services/acquisition/          Deferred optional owner-operated worker
deploy/                        Deferred AWS/home-lab examples, no secrets
benchmarks/acquisition/        Common comparison protocol and results
docs/homelab/                  Optional future service setup and recovery
assets/source/                Editable masters and licence evidence
assets/runtime/               Optimized production exports
contracts/                    Versioned public interfaces and schemas
tests/fixtures/               Rights-cleared, deterministic inputs
tests/device/                 Hardware configurations and evidence
docs/                         Approved requirements and decisions
```

Keep UI feature modules dependent on domain contracts rather than each other's implementation. Only the audio owner changes the callback graph. UI and integration agents can propose API changes through the integration lead.

## 5. First implementation assignments

**Task A01 - engine and route spike.** Read Documents 05, 06, and 09. Build a bounded native audio harness with two local PCM fixtures, one sample clock, gain controls, equal-power and linear crossfades, stream restart, and independent master/cue tests where hardware permits. Output timing traces and a reproducible hardware configuration. Stop if the proposed route cannot carry the required channels; do not simulate cue separation.

**Task A02 - performance interaction prototype.** Start with Document 19, then read Documents 03, 04, and 08. Build representative portrait and landscape screens containing actual touch targets, deck focus, browse sheet, and control states. Early fixtures must be visibly identified as prototype data. Validate protected seek versus scratch, playing-deck replacement, hidden-deck observability, and rotation. Integrate the real A01 engine before claiming G2.

**Task A03 - durable local library.** Read Documents 02 and 07. Import a permitted local folder/file set; persist identity and user annotations; handle revoked URI access and missing media; analyze asynchronously. Demonstrate that reanalysis preserves edited cues/grids and that a failed import cannot damage the previous crate.

**Task A04 - DSP candidate comparison.** Compare time-stretch/key-shift engines using the same files, tempo range, output format, and hardware. Include transients, vocals, sustained harmony, silence, variable tempo, and rapid cue/seek changes. Report licensing, integration time, reported latency, memory, CPU, and listening results. Do not compare marketing claims as benchmark results.

**Task A05 - assets and design tokens.** Produce the representative knob, fader, pad, meter, waveform markers, and glass surface at multiple states and scales. Deliver source plus optimized export and an opaque fallback. Validate those components before making every screen.

**Task A06 - recovery and recording.** Exercise activity recreation, route removal, focus loss, full storage, recording permission changes, and process restart. Record what is preserved and what requires user action. A force-stopped or killed process cannot be promised uninterrupted audio.

**Task A07 - ParDay deterministic harness.** Read Documents 07, 13 and 14. Use synthetic eligible fixtures before live API access. Prove context provenance, typed proposals, user scope, state freshness, idempotency and manual takeover. Only then attach a replaceable provider adapter. Cloud-model latency must never enter the audio deadline.

**Task A08 - on-device link acquisition first.** Read Documents 07, 14 and 16 plus contracts/acquisition_comparison_protocol.json. Implement the native intake/queue and validated publication contract with controlled fixtures. Prove an actual on-device candidate for the requested source path, record source/network conditions and retain the baseline data for later comparison. Preserve requested and actual-source identities; include unofficial routes as concrete candidates rather than replacing them with discovery-only handoff. Report technical, access/content and distribution evidence separately. A mocked download is not capability evidence. If an intended local adapter is infeasible or inadmissible, report the specific blocker; do not silently require AWS or mark FR-049 complete. Documents 17 and 18 guide the deferred service extension, not this task's prerequisites.

**Task A09 - advanced module feasibility.** Read Document 15. Verify video/audio sync under seek/scratch, karaoke microphone/output, an independent encoder failure and one real third-party Android plugin. Pin supported format/distribution choices and workload budgets. Report a plugin-hosting blocker if only built-in effects work.

**Task A10 - local personal installation and recovery.** Read Documents 11 and 17. Specify stable private signing, local install/upgrade, configuration/secret separation and backup/restore. Rehearse a prepared set with network and optional AI unavailable. Verify the phone-native release without requiring an AWS or home-lab service. Preserve versioned worker contracts for later expansion. A future community release needs buildable code, dependency/asset notices and truthful supported profiles; no music library, credentials or signing keys belong in it.

**Task A11 - optional AWS expansion, deferred.** Activate after a usable local baseline exists and the owner commissions the expansion. Read Documents 16-18 and the deployment/cost contracts. First identify the measured bottleneck or useful offload outcome, then prepare a concrete source-path trial, region/service proposal, current cost estimate within the approximately US$35/month target, pairing, retention and teardown. Keep AI charges separate. Compare D and AWS with the common protocol before selecting supported cloud behavior. No AWS account, deployment or spending is required for A01-A10. Optional LAN/remote home-lab profiles remain portability references.

These assignments define testable work; they do not authorize starting it during this planning session.

## 6. Required task envelope

Every coding assignment must state its objective, requirement IDs, owner, allowed paths, dependency versions, input/output schema, non-goals, failure behavior, acceptance cases, device requirements, and definition of done. Work ends with a handoff containing changed files, interface changes, tests actually run, supporting artifacts, untested cases, known limitations, and the next dependency.

Use this compact prompt pattern:

```text
Implement task [ID] against dossier version [VERSION].
Read [DOCUMENTS] and the current decision ledger first.
Own only [PATHS]; coordinate any contract change with [OWNER].
Satisfy [REQUIREMENT IDS] and execute [ACCEPTANCE IDS].
Use real engine state for any live signal or transport claim.
Report evidence, device/build identity, unresolved risks, and handoff.
Do not change product scope or present provisional choices as approved.
```

Agents must distinguish proposed paths from inspected code and report missing dependencies candidly. They must not work around access controls, embed credentials, or invent successful tests. Provider outreach, paid procurement, app-store publication, and external messages need the applicable user authorization.

## 7. Integration and change control

Create one owner per shared contract. Give each parallel agent a bounded branch or worktree. Merge interface changes before dependent feature branches. A change to source timing, stem latency, persistent IDs, routing, or provider capability semantics requires an updated contract version and targeted migration/regression review.

Priority order for conflicting instructions: current user decisions, explicit exclusions, approved decision ledger, approved requirements, approved detailed specifications, then implementation suggestions. This baseline records user-confirmed product choices separately from proposed implementation and acceptance details. It is not authorization to build or deploy. A newer file is not automatically authoritative if its decisions were never accepted.

Require a review when a change can alter audible output, replace user data, change capability enforcement, or weaken a performance gate. For ordinary styling corrections, use the existing visual acceptance criteria without inventing another approval ceremony.

Maintain a requirement matrix with columns ID, statement, gate, owner, implementation reference, acceptance case, evidence, state, and blockers. Valid states are proposed, approved, building, verified, blocked, or explicitly deferred. A checklist tick without evidence cannot move an item to verified.

## 8. Schedule and cost estimation

No reliable fixed delivery date can be given before G1 and the team/SDK decisions. A useful estimation model is: effort per work package + integration/review effort + device validation + contingency, divided by effective parallel capacity and constrained by the dependency graph. Do not divide the total by the number of AI agents and call the result a schedule.

An illustrative planning allocation for a future budget is 10% discovery and experiments, 30% engine/platform integration, 20% UI and assets, 15% data/analysis, 15% QA/device certification, and 10% release/support preparation. These percentages are an assumption for estimating, not measured costs. Streaming agreements, advanced ML, iOS launch parity, or video can substantially change the allocation.

Obtain separate cost lines for DSP licences, stem-model/weight rights, music partnerships, developer accounts, test devices, audio interfaces, commissioned assets, rights-cleared test music, optional hosting, and human review. Record the currency, vendor quote date, taxes, renewal basis, and cancellation/export terms. Do not silently spend money to satisfy a specification.

## 9. Demonstration and definition of done

A milestone demo should show a real track import, preparation change, deck load, cue audition where supported, a transition, a performance gesture, background/rotation behavior, and session recovery. Show the device, audio route, build identifier, and any restricted feature state. Record audio independently where possible so visible animations cannot conceal a dropout.

G6 is complete only when the agreed launch requirements pass functional, sonic, visual, accessibility, privacy, rights, and endurance gates; assets have provenance; personal installation/update/backup instructions describe real limitations; and diagnostics can explain a route or source problem. Every material failure either blocks release or has an explicit, user-accepted scope decision. No claim of "all professional features" is made until the corresponding launch matrix is verified.

## 10. Design readiness and later decisions

Start design from Document 19, using A02/A05 and the local import-to-mix workflow. No blocking owner question remains for that step. Use the recorded C direction, phone-native Android target, S26 Ultra first device, full professional scope, ParDay authority rules and local-first sequence. The two-deck integration view is a first slice; it does not remove four-deck capability or other selected modules.

Capture actual build/audio-route evidence during G1, select DSP and source mechanisms through measured feasibility work, and choose the first model/provider and AI spending limit before a paid integration. Naming, typed-first voice defaults, wider device support and optional publication/licence choices can be resolved when they affect concrete work. Team capacity and estimates remain unknown, so no fixed delivery date is promised.

AWS is later, with an approximately US$35/month planning target excluding AI-provider charges. Its account, region, service, current quote and operating choices belong to A11, not a questionnaire before local design. Document 12 separates confirmed decisions from these later gates; Documents 16-18 preserve the requested acquisition, portability and future cloud work without making them prerequisites to the local interface.
