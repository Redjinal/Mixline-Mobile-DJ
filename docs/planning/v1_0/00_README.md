# Mobile DJ - final planning and design handoff

Version 1.0 | 29 October 2026 | Ready to start design; application implementation and validation pending

This is the consolidated planning baseline for a new Android mobile DJ app, independent of the earlier Mixline preview. The owner's latest instruction is **local version first, AWS later**. The future AWS planning target is **about US$35 per month, excluding ParDay's AI-provider charges**. This is a target for later planning, not a current bill, guaranteed ceiling or instruction to deploy.

The pack contains **nineteen coordinated specifications**, their PDFs, a combined dossier, machine-readable requirements and contracts, two generated concept studies, and asset work orders. Version 1.0 labels this planning handoff, not a production app release. There is no implemented DJ app or measured device certification in this package.

## Start design here

1. Read **Document 19 - Design start and local-first handoff** for the immediate brief, screen inventory, state coverage, assets and acceptance.
2. Read **Document 04** for the selected C Crystal Current material system, **Document 03** for interaction behavior, and **Document 08** for asset work orders.
3. Read **Document 12** and `contracts/decision_ledger.json` for confirmed choices, proposed defaults and decisions deferred to engineering or future deployment.
4. Use **Document 02** and `contracts/requirements_register.json` to keep the design traceable to all 49 functional requirements; use **Document 10** for agent ownership and delivery gates.
5. Keep `AGENTS.md` with the pack when handing it to another agent. The complete PDF is `output/pdf/v1_0/Mobile_DJ_Planning_Dossier_v1_0.pdf`; individual PDFs have matching numbers and names. Editable sources are in `sources/`.

**No unanswered owner question currently blocks starting design.** Use the proposed defaults in Document 19, record later changes, and bring forward an unresolved choice when the related work actually depends on it. Do not reopen the selected platform, visual direction, first test device, ParDay authority, personal-delivery objective or local-first sequence.

## What local first means

The first version is a native Android phone app with a local library, preparation state, audio engine and manual performance controls. It requires no AWS service, physical home lab or application server to operate its prepared local set. Evaluate and build the on-device acquisition path first, with its actual source feasibility recorded. Downloading and remote lookup still need a network; optional provider AI and broadcasting have their own network requirements.

The deferred AWS comparison remains useful: preserve a reproducible local baseline, then compare D versus AWS when the owner begins that extension. A chosen delivery order is not a measured runtime winner. Home-lab LAN/remote profiles remain optional portability references. Cloud cases do not block initial local design or personal release. Source functionality, stem quality, audio routes and the other selected modules still need their applicable evidence before being described as working or complete.

## Confirmed product decisions

| Area | Current baseline |
| --- | --- |
| Product and delivery | New product; Android first; personal tool for practice and private gatherings; local version first, AWS later |
| Audience | Serious mobile/live DJs primary; casual streaming DJs secondary |
| First test device | Samsung Galaxy S26 Ultra, up to date according to the owner; exact installed build, variant and audio route still to capture |
| Complete capability | Four decks, prepared/live stems, sampler/sequencer, recording, automix, microphone, video/karaoke, broadcast and genuine third-party Android-compatible plugin hosting, plus the core professional requirements |
| Exclusions/accessories | Lighting and external MIDI/HID DJ-controller integration excluded; USB audio interfaces and dedicated DJ splitters allowed |
| Visual direction | C Crystal Current: pale liquid glass, titanium, restrained brass and readable dark labels; A is historical comparison only |
| DSP preference | Compatible open source preferred; a justified paid alternative is acceptable, with no purchase made or authorized by the preference |
| AI | ParDay is the assistant name, not the app name; preparation plus specifically armed bounded assisted performance, with immediate manual takeover |
| Music sources | Broad coverage desired; explicit Spotify/YouTube link-to-file acquisition request includes unofficial extractor/adapter candidates; exact source, technical behavior, access, rights and distribution status remain distinct |
| Future cloud | AWS accepted for later optional expansion; approximate US$35/month AWS planning target excludes AI charges; account, region, service and deployment remain unset |
| Future source sharing | Open to a GitHub release for others to operate their own setups; project licence, repository and publication remain undecided and unexecuted |

Kotlin/Compose with a C++/Oboe engine is the proposed implementation stack. A focused two-deck view is the proposed first design slice; it does not reduce the selected four-deck/full professional product. Working product label: **Mobile DJ**, pending an app name. Typed/touch ParDay is a design default; voice is deferred, not permanently excluded. Proposed token values and numerical acceptance thresholds still need native and device validation.

## Document map

| Document | Purpose |
| --- | --- |
| 01 Product vision and Product Lens | Audience, complete scope, core loop, priorities and evidence |
| 02 Professional requirements | 49 functional requirements and acceptance crosswalks |
| 03 Mobile workflows and interactions | Navigation, touch, deck state, recovery, sources and ParDay |
| 04 Art direction and design system | Selected C, historical A/C renders, native tokens and components |
| 05 Tech stack and architecture | Android/C++ boundaries, services and optional integration points |
| 06 Audio engine and DSP | Timing, graph, DSP, stems, sampler/sequencer, routing and recovery |
| 07 Library, data and music sources | Identity, provenance, import, local storage and recovery |
| 08 Asset creation and sourcing | 30 asset classes, creation briefs, sourcing, rights and budgets |
| 09 Quality and device validation | 24 shared gates; functional, AI, source and advanced crosswalks |
| 10 Delivery roadmap and agent playbook | Local-first milestones, G0-G8 gates, work packages and ownership |
| 11 Release, security and personal operation | Personal installation, upgrades, recovery, privacy and later conditional release paths |
| 12 Council decisions and owner answers | Decision closure, historical reasoning, experiments and nonblocking/deferred choices |
| 13 ParDay AI architecture | 24 AI requirements; adapters, authority, provenance, privacy and cost |
| 14 Music discovery and acquisition | Playable-version matching, actual source and 12 source cases |
| 15 Advanced performance modules | Video, karaoke, broadcast, real Android plugin hosting and 14 cases |
| 16 Link acquisition implementation and feasibility | On-device first, unofficial candidates, jobs, exact identity and deferred comparison |
| 17 Open-source and home-lab guide | Optional source publication, licence choices and portable owner operation |
| 18 AWS deployment and comparison plan | Deferred extension, US$35 target, cost assumptions, deployment lifecycle and 10 conditional AWS cases |
| 19 Design start and local-first handoff | Immediate designer brief, screen/state inventory, assets, first slice and acceptance |

## Companion materials and truth of status

`contracts/` holds the decision ledger, functional and specialist registers, engine/ParDay semantic schemas, acquisition job/state contracts, comparison/deployment profiles and design-handoff readiness record. There are 49 functional requirements, 24 shared quality gates and 90 specialist/deployment cases; AWS and home-lab service-specific variants have conditional applicability; reusable local build, isolation, recovery and AI-independence cases remain applicable. They are planned acceptance criteria, not executed tests.

`assets/` contains proposed C tokens, 30 asset classes, two generated concept PNGs and their saved prompts. The two concept renders exist and were visually reviewed. Production vectors, fonts, audio fixtures, samples, motion recipes and interface assets remain work orders unless their register says otherwise. Do not count a mockup, prompt or proposed source as an acquired production asset.

`document_manifest.json` gives actual file and page counts. `document_validation.json` records checks performed on the final pack and their limits. `contracts/handoff_readiness.json` separates design readiness from implementation, device, source, deployment and publication readiness. `render_dossier.py` reproduces the PDFs when its documented Python/font dependencies are present.

Pack version and individual semantic contract versions are independent. Unchanged engine, AI, job/state or asset contracts can retain older internal versions; they remain the referenced current contracts in this pack. Do not mechanically change semantics to make every number match.

## Later decisions, at the right time

Capture the exact phone build and output route before physical audio qualification. Choose the first real AI provider/model, key handling and AI spending limit before paid calls. Resolve codec/DSP/plugin/stem licences and the actual acquisition source path during feasibility work. If any selected capability cannot be supported, report that specific gap and its evidence; do not silently redefine the final product.

Review an account, region, current quote, bounded workload and cleanup plan when AWS expansion begins. The old continuously running EC2 example is illustrative and exceeds the selected target; it is not the future default. Reproducible source publication still needs a project licence, dependency/asset review and an explicit publication instruction. App name, broader devices, genres and schedule can evolve without delaying the first design pass.

## Suggested next-agent instruction

> Read `AGENTS.md`, this README, Document 19 and the decision ledger. Start the native Android design for the selected C Crystal Current direction on the Galaxy S26 Ultra target. Design the complete local import -> library -> prepare -> load -> cue -> mix -> record -> recover journey and its failure states before expanding all selected modules. Use a two-deck focus with explicit four-deck navigation; include portrait adaptation. Treat the supplied renders as material references and all audio/progress data as labelled fixtures until implemented. Keep ParDay's preparation and armed-performance authority visible. Implement no mandatory AWS setup. Return editable component/layout specifications, state and requirement coverage, prioritized production asset work and a clear list of remaining engineering evidence.

## Revision and evidence

Version 1.0 supersedes v0.5 as the current handoff. It reconciles local-first delivery and the future AWS budget, removes cloud work from initial gates, corrects residual A-material and portrait wording, replaces repeated owner questionnaires with timed decisions, and adds the design-start brief. Earlier versions are not bundled into this final archive.

Primary-source research is dated 29 October 2026; time-sensitive APIs, provider terms and prices must be checked again at implementation or deployment. No app, model integration, extractor, AWS account/resource, repository publication or physical-device benchmark has been exercised by this document review.
