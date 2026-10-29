# 05 — Tech Stack and Architecture

**Version:** 1.0  
**Date:** 29 October 2026  
**Status:** Design handoff baseline; implementation and validation pending  
**Product basis:** New product; no Mixline code, assets, architecture or approval is inherited.  
**Platform decision:** Android first; Samsung Galaxy S26 Ultra is the first test device, software reported up to date.  
**Accountable agents:** Architecture/Orchestrator; Audio Engine; Android Platform.  
**Related documents:** 06 Audio Engine and DSP; 09 Quality and Device Validation; product requirements and data/content specifications.

## Purpose and architectural decision

Build the local Android version first, with a persistent phone-native audio engine, a touch-focused product interface, a durable local library and no required application server. AWS is a later optional extension. Local first does not mean Internet sources can be downloaded offline or that every ParDay function has an on-device language model. The live mix must remain independent of navigation, screen animation, network requests and analytics. Two music decks form the integration foundation; the intended full product grows to four music decks plus a separate sampler. Prepared stems belong to the product baseline; separation during performance is a selected additional capability that must pass device and quality gates.

The proposed stack is Kotlin and Jetpack Compose for Android, a portable C++ DSP core, and Oboe for Android audio I/O. Google recommends Oboe for high-performance native audio. Oboe alone does not decode music files or supply the musical operations of a DJ engine. Those responsibilities require explicit components. [S1, S2]

This decision is **provisionally ready** at the boundary level. The DSP provider, minimum device class and exact cue routes are **experiment-first**. Android first, the Galaxy S26 Ultra first device and permission to use USB audio interfaces/splitters are confirmed. Record the actual variant, OS/build and accessory route before using it as evidence; the phone is not yet certified. No performance result in this dossier has been measured. Budgets and limits are proposed requirements for validation.

## Stack and ownership

| Layer | Proposed technology | Owner and boundary |
|---|---|---|
| App shell and performance UI | Kotlin, Compose, native navigation and accessibility | Product UI agent; sends commands and renders snapshots |
| Waveforms and tactile controls | Custom Canvas drawing; measured shaders/blur where useful | Product UI agent; never owns musical time |
| Audio domain | Portable C++ with narrow JNI/C boundary | Audio Engine agent; owns scheduling, DSP and mix state |
| Android output | Oboe using the available native backend | Android Platform agent; opens, verifies and recovers streams |
| Decoder and DJ DSP | Adapter-selected commercial or modular components | Audio Engine agent; no vendor API in UI/data models |
| System playback lifecycle | mediaPlayback foreground service and Media3 session adapter | Android Platform agent; owns focus, notifications and safe resume |
| Local metadata | Room/SQLite plus versioned cache manifests | Library/Data agent; transactions and migrations outside callback |
| Analysis and selected prepared/live stems | Cancellable worker pipeline; chosen native/ML runtime | Analysis agent; queued/preparation work yields; audible live inference remains protected |
| Deferred owner-operated services | Later AWS acquisition comparison; optional sync and ParDay gateway evaluated separately | Services/AI agent; not a local-design or local-release prerequisite |
| ParDay | Local orchestration/validator, source-filtered context, replaceable OpenAI/Anthropic adapters | AI agent; structured proposals only, with ordinary engine authority |
| Video/karaoke/broadcast/plugins | Separate media, network and host modules | Specialists; Document 15 resource/distribution gates |
| iOS expansion | Swift/SwiftUI shell, shared C++ DSP, Apple audio adapter | iOS agent if commissioned; separate routing certification |

Flutter and React Native remain viable shells around a native engine if the team can prove equivalent touch, rendering and lifecycle behavior. Their ordinary media plugins do not satisfy the complete engine contract. A web prototype can test layouts; it is not sufficient evidence for the production audio route. JUCE is a credible alternative for an experienced C++ team, but its current upstream framework licence is AGPLv3/commercial and must be evaluated at the selected version. [S3]

## Personal deployment and optional owner-operated services

Personal-tool delivery and local-first delivery are confirmed. Implement and evaluate the on-device acquisition arm D first, preserving common fixtures and measurements for a later comparison. The local app must not require a home-lab machine, AWS account, application login or gateway merely to import, prepare and perform with its local library. Actual source extraction still needs technical and access/content evidence; the local-first decision is not a successful extractor result.

The owner accepts AWS as a later optional server extension and selected approximately US$35 per month as its planning target, excluding ParDay AI-provider charges. This target is neither a guaranteed bill nor deployment/spending authorization. The earlier D-versus-AWS comparison remains the method for evaluating a future expansion, not a prerequisite to local design, development or personal release. No comparative winner has been measured. Document 16 and contracts/acquisition_comparison_protocol.json define the staged evaluation; Document 17 preserves optional home-lab/publication portability, and Document 18 specifies the deferred AWS trial. Account, region, service/instance and deployment remain unset/unexecuted.

| Candidate | Comparison purpose | Boundary to preserve |
| --- | --- | --- |
| On-device acquisition - first | Implement and measure native/package dependencies, preparation time, battery, heat and maintenance | Acquisition is outside protected audio; downloaded media remains locally usable afterward |
| Owner-operated AWS acquisition - deferred | Later measure resolver/processing behavior, phone offload, actual transfer mode, server resources, retention, cost and setup effort | Not required for local delivery; if enabled later, outage blocks only dependent acquisition tasks |
| Optional local home-lab profile - deferred | Preserve LAN/remote portability for a later owner or community deployment | Not a prerequisite for local delivery or the future AWS comparison; no local host has been selected |
| Hybrid split - deferred, if supported | Later evaluate server resolution with phone transfer or processing when source/session behavior permits it | Do not assume server-issued media URLs work from a phone; test the exact transfer mode |

Acquisition execution, ParDay's gateway location, language-model inference location and optional metadata sync are independent decisions. An AWS or home-lab acquisition server does not determine where ChatGPT/Claude requests are processed, and an on-device extractor does not imply an on-device language model. A private gateway can hold provider credentials and enforce limits, while cloud providers still receive the permitted request content sent to them. A local language model is a separate quality/resource experiment. Do not add billing, multi-tenant accounts or a managed database as prerequisites for this personal app.

The service implementation language, persistence and packaging follow the chosen worker's needs; a small Ktor service or another well-supported runtime can be evaluated without prescribing a large managed platform. Document 18 and contracts/aws_deployment_profile.json define the deferred bounded AWS experiment; contracts/aws_cost_scenarios.json keeps researched prices separate from workload assumptions and actual spending. These are planning artifacts, not deployed resources. Preserve versioned contracts and replaceable workers. First record local evidence; when the cloud comparison is commissioned, use the same applicable outage, deletion and privacy tests for both candidates, record actual operating cost, and keep credentials out of distributable client binaries and repository examples. Optional future cloud-sync/commercial services require a separate scope decision.

## Module and dependency boundaries

Use modules equivalent to `app`, `feature-performance`, `feature-library`, `feature-preparation`, `feature-recordings`, `core-domain`, `core-data`, `platform-audio`, `engine-api`, `engine-core`, `dsp-adapters`, `analysis` and `test-harness`. Names are provisional; dependency direction is mandatory. Feature modules depend on stable domain contracts, not each other’s implementation. The C++ core must not depend on Android UI or database APIs.

The engine service owns one session across Activity recreation and orientation changes. A Media3 custom `Player` adapter can represent that native engine to a media session; Android documents `SimpleBasePlayer` for custom players. Advertise only safe whole-session system commands. Do not map an unsolicited system “next” command to destructive replacement of the currently audible deck. [S4]

The data layer resolves a media reference and its permission/capability record. Decode workers prepare PCM cache pages. The engine accepts a ready handle and generation identifier. UI state reports the actual command outcome. Backend entitlements are evaluated before starting a feature; an already-authorized local session must not be interrupted by a routine network outage. Third-party streaming entitlements and revocations remain governed by their provider agreement and require their own behavior specification.

## Contracts agents must implement together

| Contract | Required fields/behavior | Failure behavior |
|---|---|---|
| `EngineCommand` | Sequence, engine instance, origin, deck generation/stream epoch, payload; scheduled automation has engine-issued ID/revision | Explicit rejected/stale/queue-full result; atomic batch admission and cancellation acknowledgement |
| `EngineSnapshot` | Engine instance, stream epoch, deck/manual/master revisions, automation state, configuration, source positions, meters, route, capabilities, warnings | Stale snapshot labelled; audio never waits for UI |
| `PreparedMedia` | Stable source ID, validated format, duration, PCM/cache handle, capability record, generation | Unsupported/unavailable media cannot replace a playing deck |
| `DspProvider` | Prepare off-thread; bounded render; reported latency; timestamped parameter application; reset/seek; supported ranges | Provider failure quarantined; no silent parameter change |
| `RouteDescriptor` | Device identity, actual rate/channels/buffer, master/cue mapping, verified profile | Unsupported mapping rejected before playback |
| `AnalysisResult` | Source fingerprint, algorithm/model version, confidence, manual overrides and cache location | Stale analysis invalidated without deleting user edits |
| `RecordingSession` | Permission decision, source eligibility, master tap, format, storage state, recovery journal | Disk failure ends recording while protecting master audio |

The DSP contract must expose source-to-engine timeline mapping and algorithmic latency. A vendor whose latency changes without a usable notification/compensation mechanism cannot be combined safely with sample-scheduled cues or aligned stems. Do not assume that two libraries share the same clock simply because both expose a BPM value. Provider selection stops if repeated tempo changes create drift, unsupported blocking/allocation occurs in rendering, or the agreed warm-soak profile fails after reasonable documented tuning.

## Thread and lifecycle boundaries

The audio callback performs bounded DSP and mixing only. Control, decoding, model inference, cache writes, database work and service callbacks run outside it. Use preallocated buffers and bounded queues. Critical commands are acknowledged; high-rate continuous parameters may coalesce. SDK initialization, file opening and licence checks occur before a provider becomes active.

Use an engine frame counter with monotonic host-time mapping, not display time, as the scheduling basis. A route reopen creates a new stream epoch. UI interpolation may make motion smooth, but it cannot alter the authoritative playhead. Commands carrying a prior deck generation must not affect a replacement track.

Android focus, calls and background behavior are platform constraints. The app must start the appropriate playback service from a user action and handle interruption states. Current Android 17 documentation applies additional background-audio rules, including foreground-service requirements; native Oboe playback is not exempt. Test the supported OS versions explicitly. [S5]

## Platform and output matrix

| Target | Working proposal | Evidence still required |
|---|---|---|
| Android phone | First implementation on the selected S26 Ultra; wider support only when commissioned | Exact variant/build/route for the personal target; evidence for each additional advertised profile |
| Android tablet/foldable | Responsive layout with same engine | Resize, hinge, rotation and multitouch tests |
| iPhone/iPad | Portable engine boundary proposed; expansion uncommitted | Separate session/routing and performance validation |
| Emulator | Functional, contract and UI checks | Cannot certify physical latency or USB cueing |
| Bluetooth | Preparation and tolerant playback route | Not certified as precise live scratch/cue route |

Independent stereo master and stereo cue require four output channels or a proven platform-specific combination. A dedicated DJ splitter supports mono master and mono cue on one stereo pair; it does not preserve stereo. The user explicitly allows USB audio interfaces and DJ splitters. This does not add MIDI/HID controller support, and an interface is certified by its actual negotiated channels rather than by its category name.

One verified multichannel USB stream is preferable to unrelated devices whose clocks and delays differ. Query the negotiated configuration rather than trusting the requested one. If unplugging invalidates mapping, mute/pause safely and reconfigure off-thread; never leak headphone cue to the audience. See QA-06 and QA-10.

## Build-versus-buy experiment and delivery gates

Evaluate a compatible open-source modular implementation first, then compare a commercial integrated SDK on the same two-deck harness and corpus. Paid DSP is acceptable if justified, but open source is the user preference; neither preference waives quality, distribution or licence obligations. Superpowered publishes separate evaluation/commercial licence routes; no numerical commercial quote is established here. Rubber Band offers GPL and commercial terms, and proprietary distribution requires the applicable licence. [S6, S7]

Compare QA-03 latency, QA-04 callback headroom, QA-05 timing, QA-08 listening quality and QA-02 maximum load. Include seek/reverse, loop joins, key changes, startup buffers and licence availability offline. Pin the selected version, build flags, licence text, supported ABIs and reproducible fixtures in an architecture decision record. Avoid declaring a “free” path until all code, models and dependencies have been checked.

Before finalizing production rendering budgets, pass two-deck engine/lifecycle integration. Initial layout and component design can proceed from Document 19 in parallel. Before advanced feature certification, pass the aggressive profile with four decks, sampler, recording and the intended glass treatment. Suspend optional analysis and precomputation work and reduce visual cost first under pressure. Live inference supplying audible stems is part of the protected workload; it cannot be suspended without changing the sound. Do not change active tempo, stem alignment, limiter latency or output routing mid-set. If the profile remains unstable, it is not certified.

Canonical checkpoints are G0 Decision baseline, G1 Audio feasibility, G2 Working vertical slice, G3 Core performance beta, G4 Advanced performance, G5 Source/provider and ParDay integrations, G6 Release candidate, G7 Personal installed release and G8 Maintenance/community readiness. G1 resolves DSP/routing experiments; G2 proves the full command-to-sound path; G3 certifies P0; G4 certifies extended profiles. G5 cannot weaken G3/G4 behavior. Its local source and selected assistant requirements remain in scope; cloud-specific G5 cases apply only when the later optional extension is evaluated. AWS setup/comparison does not gate G6 or G7 for the local version. G6 verifies the actual distribution package and evidence set. G7 verifies the owner's signed installation, upgrades, backups and recovery. Optional GitHub publication or public-store distribution is separate from that personal completion gate. G8 monitors regressions and revisits device profiles.

Native release packaging must include 16 KB page-size compatibility checks for the core and every prebuilt SDK; Android documents both alignment and runtime requirements. Verify the final packaged APK/AAB, not only locally linked libraries. [S8]

## ParDay and specialist integration boundaries

Document 13 owns the assistant contract. The user selected preparation assistance plus explicitly armed assisted performance; this does not give the model unrestricted engine authority. Add modules for assistant orchestration, model adapters, source-provenance filtering and deterministic action validation. Keep provider credentials in a controlled service for a distributed app. A consumer chat subscription is not a credential or authorization to automate a chat website; API billing/credits must be checked for the selected account and provider. All provider responses are untrusted proposals.

An accepted proposal is revalidated against current session, stream epoch, deck generation, manual-control revision, media/analysis/preparation revision, source grant and user authority before ordinary engine commands are issued. A stale proposal expires. Assistant timeouts, model changes and provider outages cannot change transport or mute a local deck. Local conversational inference yields before active audio and live stem inference. No raw audio, microphone capture or whole-library upload is a default.

Scheduled automation carries an engine-owned execution identity/revision checked immediately before each event executes, including events already queued. Manual takeover, Stop Automation, relevant load/route changes and grant invalidation revoke the affected execution revision. A model cannot mint or renew it. Batch admission is atomic: capacity or validation failure rejects the whole native batch, and later cancellation invalidates remaining events with an acknowledgement. A load-then-arm workflow waits for load acknowledgement and creates a fresh proposal. See the 0.2-draft engine contract and Document 13 for exact transaction semantics.

Document 16 owns requested in-app link acquisition, including unofficial extraction candidates. Keep the adapter/worker pipeline outside playback and separate technical success from provider access, content rights and distribution clearance. Evaluate and implement on-device extraction first. A later D-versus-AWS experiment can justify an optional extension; it is not a condition for starting or finishing the local version. A verified vendor API remains a candidate, not the selected mechanism. An official API is not a universal technical gate.

Document 15 owns video, karaoke, broadcast and real third-party plugin hosting. These add measured resource profiles and distribution constraints rather than weakening the audio clock or callback rules. A network encoder may fail independently. A plugin whose scheduling or latency behavior cannot satisfy the graph contract cannot be certified.

## Completion criteria and unresolved decisions

Architecture completion means contracts compile in a minimal vertical slice, replacement/route/error cases are demonstrated, and QA-01 through QA-07, QA-10 and QA-17 have evidence against selected hardware. It does not mean the interface merely resembles a professional mixer.

No owner answer is required before interface design can begin from Document 19. Use the proposed stack and explicit capability/error states while implementation proves DSP, routes, extraction and specialist formats. Capture S26 Ultra variant/build/accessory evidence at G1; select actual DSP/model providers and their spending limits before paid integration. App naming, voice, wider device support and optional source-publication details can follow their relevant work packages.

Local first, AWS later and the approximately US$35/month future AWS planning target are confirmed. AWS account/region/runtime/access choices wait until a concrete expansion proposal; they do not block local work. Android first, selected C, ParDay armed assistance, allowed audio accessories and the full selected professional scope remain fixed. Record material architecture or scope changes in the decision ledger rather than presenting a default or a failed experiment as an owner decision.

## Sources

Checked 29 October 2026. Source facts support constraints; recommendations and targets are this plan’s proposals.

- **S1:** Google, [Low latency audio](https://developer.android.com/games/sdk/oboe/low-latency-audio).
- **S2:** Google, [Oboe FAQ](https://github.com/google/oboe/blob/main/docs/FAQ.md).
- **S3:** JUCE, [Upstream licence](https://github.com/juce-framework/JUCE/blob/master/LICENSE.md).
- **S4:** Android, [The Player interface](https://developer.android.com/media/media3/session/player).
- **S5:** Android, [Background audio hardening](https://developer.android.com/about/versions/17/changes/bg-audio).
- **S6:** Superpowered, [Pricing and licence categories](https://superpowered.com/pricing).
- **S7:** Breakfast Quay, [Rubber Band Library](https://www.breakfastquay.com/rubberband/).
- **S8:** Android, [Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes).
- **S9:** Supabase, [Official documentation](https://supabase.com/docs).
- **S10:** Firebase, [Official documentation](https://firebase.google.com/docs).
- **S11:** Ktor, [Server project documentation](https://ktor.io/docs/server-create-a-new-project.html).

