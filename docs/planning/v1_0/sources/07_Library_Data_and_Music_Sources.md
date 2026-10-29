# 07 — Library, data and music-source architecture

**Version:** 1.0  
**Date:** 29 October 2026  
**Status:** Design handoff baseline; implementation and device validation remain unperformed  
**Product:** New mobile DJ application; no Mixline reuse  
**Platform direction:** Android first confirmed; implementation stack remains subject to G1  
**Owners:** Data lead, integrations lead, security lead and audio lead

## 1. Data principles

The user has confirmed serious mobile DJs as the primary audience, casual streaming DJs as secondary, and private practice/personal gatherings as the initial use context. The desired catalog scope is “any and all.” Treat this as a broad integration ambition, not a claim that every service permits every operation or is approved for this app. Document 14 specifies discovery and acquisition; Document 16 adds the explicitly requested unofficial link-to-file subsystem. Document 13 specifies ParDay, now selected for preparation plus explicitly armed assisted performance. The delivery objective is now a personal tool with optional future open-source sharing. Neither that choice nor self-hosting overrides a source contract or independently settles the rights for a particular gathering. The latest owner decision makes the first version local: the Android app, library, preparation and live engine run on the phone without a required server. Implement and validate the on-device acquisition path first. Retain the Document 16 comparison for a later optional AWS extension; no comparative runtime winner is claimed. Local first does not make Internet downloads or optional external AI available offline.

The local library is the durable record of the performer's preparation. It must remain useful without an app account, network connection or provider partnership. Cloud sync, if selected, supplements this record. This design supports FR-001–008, FR-031, FR-034, FR-036 and FR-040–044.

Keep user edits separate from machine-derived analysis. Cue points, corrected grids and playlists are user work; waveforms and detected key are recomputable caches. Losing either is undesirable, but their retention, conflict and migration policies differ. Imported media, user preparation and provider entitlements must not be conflated into one track object.

Use a transactional local database. Room/SQLite is the proposed Android implementation if the stack decision confirms Kotlin. Media bytes and large derived artifacts live outside database rows, with manifests and integrity checks. Real-time audio reads prepared immutable state, not database queries. Database, indexing, network and file operations execute off the audio thread.

## 2. Entity and identity contract

| Entity | Required fields and invariants |
|---|---|
| Track | Stable app UUID, display metadata, tags, rating, explicit/clean status where known and creation/update metadata. A title or ISRC is not a unique binary-media identity. |
| MediaAsset | UUID, track reference, local/provider source kind, durable URI/reference, content hash when available, byte size, container/codec, sample rate/channels, duration frames, rendition/version and availability state. |
| ProviderReference | Provider ID, provider track ID, market/territory, rendition ID and account association. Provider IDs never collide with local UUIDs. |
| AnalysisVersion | Media identity/hash, algorithm/model version, parameters, completion/error status, detected BPM/key/grid/loudness and artifact manifest. |
| UserPreparation | Media revision, cue markers, saved loops, corrected tempo map, locked fields and edit revisions. Never overwrite this with automatic analysis. |
| Playlist/Entry | Playlist UUID/type/rule, entry UUID, track/media reference, stable ordering key and optional notes. Same track may occur multiple times intentionally. |
| Session/History | Session UUID, deck identities, media assignments, queue, routing configuration reference, checkpoint version and performance event/played records. |
| Recording | UUID, segment manifest, codec/sample format, sample count, creation time, markers, finalization state, recoverability and rights state. |
| CapabilityGrant | Provider/track/rendition/account context, decision values, evidence/contract version, validation time, expiry and restriction reason. |
| AssetLicense | Asset ID, creator/source, license snapshot, receipt/permission reference, allowed uses, attribution and file hash. |
| DiscoveryCandidate | Source-tagged catalog reference, displayed title/artist/version, timestamp, permitted retention, and playable-acquisition options. Discovery is not a media file. |
| ProvenanceLabel | Field-level origin, provider restrictions, allowed processing purposes, expiry/deletion rules and derived-from references. Survives joins and exports. |
| AcquisitionJob | Trusted request/revision, selected actual-source candidate and format, method/adapter version, separate technical/access/content/distribution evidence, transfer lease, cancellation revision, validation and publication journal. Document 16 owns the job schema. |

A file rename or move should not create a new musical identity if content can be matched confidently. Conversely, a different edit, remaster or encoding with changed timing must not silently reuse sample-position cues. Content hashes help detect exact duplicates; partial fingerprints are candidate matches, not proof. Compute expensive fingerprints asynchronously and ask before merging ambiguous identities.

Cues and loops store an explicit media-time basis: source-frame position and source sample rate, plus optional musical beat position and grid revision. Tempo maps are ordered beat-to-source-time anchors. Half/double-BPM edits change the musical interpretation without silently moving the underlying cue audio. Every migration documents how old positions map into the current basis.

## 3. Import and availability workflow

User selects files or a folder through platform-supported access. Validate the selection, inspect headers within resource limits, stage metadata, and obtain durable URI permission or copy verified bytes into app-managed storage. A cloud document provider can require download; report that state before promising offline use. Import must not assume a transient URI remains readable after restart.

Availability states are explicit: discovered, importing, locally ready, stream ready, analysis pending, permission missing, file missing, expired, unsupported and failed. “Analyzed” and “playable” are separate. Basic playback may begin before optional analysis completes when the decoder and route are ready. Track load shall fail safely if a file changes underneath it.

Offer a no-login demonstration crate made from commissioned or otherwise redistribution-cleared music. The practical first-use path is demo → file/folder import → background analysis → ready crate → output check → mix. This makes the app immediately explorable while preserving a real local collection workflow.

Library search uses a local index. Search, tags and smart-crate rules cannot require a network round trip. Keep a readable missing-file repair flow; preserve the user's cues and playlist references while the media is unavailable. Test restart, permission revocation, removable-storage loss, duplicate imports and partial-copy failure.

## 4. Provider integration admission

Existing DJ partners demonstrate feasibility; they do not grant our app equivalent access. Ordinary catalog/playback APIs are not evidence of raw PCM access, simultaneous DJ playback or permission to manipulate recordings. For negotiated SDK/streaming integrations, admit the source only after written terms, SDK access, supported territories, commercial use, security obligations and feature restrictions are documented.

| Source | Verified research finding | Planning treatment |
|---|---|---|
| Local authorized files | Unencrypted readable files can use the app's supported decoder/DSP path; technical support does not establish public-performance or redistribution rights. | Primary independent performance path. |
| Spotify | Selected DJ apps support online personal mixing; the ordinary Developer Policy prohibits DJ overlap, voice-control assistants and ingesting Spotify Content into AI. [1,2] | Partner negotiation for Spotify playback; provenance restrictions also apply to ParDay. A Spotify-link acquisition candidate is evaluated separately in Document 16 and must identify the actual audio source; no approved cache is relabelled as a local export. |
| Apple Music | Apple lists named DJ partners; MusicKit describes catalog/library/playback access. Ordinary media terms limit personal/noncommercial use. [3,4,5] | Separate partnership/usage review; do not infer custom-DSP access. |
| Tidal DJ | Official documentation states stem and offline support vary by partner. [6] | Obtain precise mobile SDK and contract capability matrix. |
| Beatport | Qualifying plans advertise offline storage and stems in supported DJ integrations. [7] | Candidate for partnership exploration; tier/track/territory restrictions remain explicit. |
| SoundCloud | Existing integrations differ: supported rekordbox configurations offer DJ-plan offline storage, while djay documents live streaming. [8,9] | No provider-wide offline assumption; validate intended mobile integration. |
| YouTube | Policies restrict separation/modification and hidden/background playback; multiple automatic players are also restricted. [10,11] | Ordinary player/API access does not establish raw-audio permission. The requested extraction adapter is a separate feasibility and access review in Document 16; its result must pass validated local-media publication. |
| Artist/store downloads | Bandcamp exposes downloadable purchase formats; SoundCloud has uploader-enabled web downloads for eligible tracks. [12,13] | Link to the authorized acquisition flow, then import the resulting local file; do not scrape purchase sessions or bypass disabled downloads. |
| Creator-owned YouTube upload | YouTube documents Studio downloads and Google Takeout for one's uploaded videos. [14] | User exports through the official channel, then imports an eligible local original/export. Ownership of the upload alone does not establish rights to every third-party element. |

Recording and stem permissions differ independently. djay documents recording restrictions across streaming providers and no Neural Mix for Apple Music/Spotify; this is evidence that source-dependent controls are necessary, not the final grant for this product. [9] A “DJ” subscription does not by itself establish the right to perform commercially in public. The user's intended territory, venue and use must be reviewed alongside the provider agreement.

## 5. Capability resolver

Permission values are **allowed / denied / unknown**. Unknown fails closed for the affected operation. Do not convert missing fields to true or interpret “playable” as “recordable.”

```text
CapabilityContext
  sourceId, mediaRevision, providerAccountId, territory, accountTier
  contractVersion, checkedAt, expiresAt, offlineAuthorizationUntil

OperationGrant
  readPcm, seek, analyze, cacheAnalysis, changeTempo, changeKey
  applyEffects, separateStems, cacheStems, cacheAudio
  record, broadcast, exportAudio, publicPerformance
  displayMetadata, lookup, exportMetadata, aiInference, aiEmbedding
  aiTraining, voiceControl, downloadOriginal, extractLocalAudio
  each: allowed | denied | unknown, reason, evidenceReference

TechnicalLimits
  concurrentDecks, seekGranularity, tempoRange, cacheQuota
  supportedFormats, routeRequirements, certificationTier
```

Effective capability is the intersection of source grant, track/rendition, account, territory, authorization time, engine implementation and certified device capacity. A future commercial app entitlement, if one is selected, would be another layer and could not override source restrictions; product billing is not required for the personal local version. Resolve at load and again before sensitive operations or entitlement changes. Cache grants only within their validated lifetime.

For imported local media, do not invent a provider restriction or require users to upload ownership documents. The app can expose technically supported local operations while explaining that users are responsible for the rights applicable to their use. The public-performance field records known provider restrictions or explicit user-managed context; it is not an automated copyright adjudicator. Unknown provider grants still fail closed for provider-controlled operations.

The UI explains unavailable operations before commitment. The engine/encoder also enforces them. When a user is recording and selects an ineligible source, provide a clear choice before transition. Finalize the existing recording before restricted audio enters it. If rights change during performance, preserve valid audience playback where permitted while stopping prohibited recording/export. Mark partial recordings accurately; never imply that the complete set was captured.

The integration layer must not expose protected provider caches through an unrestricted fallback file URL. Preserve metadata/attribution, cache, account and expiry requirements. The owner now explicitly requires in-app link acquisition, including unofficial extraction candidates. Documents 14 and 16 therefore include maintained extractor and documented third-party conversion adapters alongside direct-file transfer and approved streaming. Technical support, service access, content use and distribution evidence are separate dimensions. Ordinary API access is not claimed to authorize extraction, and unofficial classification alone is not a technical rejection. Keep unverified source support visible as an unresolved requirement.

Retain requested catalog identity and actual media origin independently. A Spotify reference resolved to another platform does not become a Spotify audio master, and its metadata restrictions are not erased by importing the matching file. Apply provenance rules to the particular fields/artifacts, without incorrectly assigning every restriction to independently measured local analysis. Acquire, validate and publish before the engine can load the result; source failures never replace a live deck.

## 5A. ParDay data boundary

ParDay must receive only data whose provenance permits the intended processing. Spotify's developer terms expressly cover AI ingestion, not merely model training; the ordinary integration therefore cannot send Spotify-returned audio, artwork, metadata or derived context into a language model without a separate applicable authorization. [2,15] A user's app-level consent is necessary for optional cloud processing but cannot override the source grant. Do not relabel provider metadata as “user data” merely because it appeared in a playlist, was copied to a local table or was selected on screen.

The gateway distinguishes user-authored requests, user-managed local metadata, licensed app knowledge and provider-controlled fields. Each tool request passes through a deterministic policy resolver before execution; its response passes through an outbound-data filter before any model receives it. Provider display cards may be rendered outside model context where the applicable agreement allows that display. This separation is an architectural control, not a claim that the combined AI/provider use case has automatically been approved.

A safe first integration uses ParDay to interpret a user's independently supplied mood, duration and local-library preferences, while a reviewed deterministic catalog connector performs eligible lookups. It returns source-labelled cards to the UI; it does not feed restricted catalog results back into ParDay. Keep provider-dependent voice playback disabled unless explicitly admitted. The local engine and user-managed local library remain useful when a catalog or AI gateway is unavailable.

A combined track record may contain local user tags and restricted provider artwork. Resolve at field and operation level rather than granting the whole record the least restrictive origin. Logs, analytics, embeddings, vector indexes, conversation summaries and crash reports are also destinations; deleting a visible chat message does not remove an embedding unless deletion is implemented there. Store provenance with derived objects so revocation can find and invalidate affected data.

## 6. Cache, storage and recovery

Separate media, analysis, waveform, artwork, prepared-stem and provider-cache budgets. Pin every currently playing or staged deck's required artifacts against eviction. Avoid a design that loads an entire long track into RAM. The audio subsystem defines bounded decode/read-ahead windows and communicates readiness without blocking.

Cache manifests include media hash/revision, algorithm version, format, completion marker and checksum. Write to a staging file, validate and atomically publish. A partially generated waveform or stem set must not appear ready. User-authored metadata is never reclaimed as disposable cache.

Before recording, reserve a configurable safety margin and estimate duration from the actual selected format. Stream writes to recoverable segments and maintain a journal. Storage exhaustion stops/finalizes recording while playback continues. A crash can interrupt audio; recovery must offer valid completed segments and the last consistent state rather than claiming uninterrupted service.

Provider offline caches are encrypted or protected as their agreements require, and expire according to their own authorization. Local user files do not inherit those expirations. Reauthentication and cleanup must never delete unrelated owned audio or user preparation.

## 7. Migrations, backups and optional sync

Every schema has a numbered migration, rollback/recovery strategy and representative old-version fixtures. Run migrations outside an active performance. Preserve a backup/checkpoint before destructive transformation, check free space, and either complete atomically or retain the previous valid state. A failed migration displays an actionable recovery option.

Portable backup includes versioned metadata and media references; media copies are opt-in and rights-aware. OAuth tokens, provider secrets and restricted caches are excluded. Restore validates paths and rejects archive traversal, duplicate IDs and excessive sizes.

If sync is selected, use record revisions and tombstones. Preserve conflicts in user-edited cues/grids for deliberate resolution; do not silently choose a timestamp winner. Upload only consented data, keep local operation functional during conflict, and pin the session's snapshot while performing. Cloud analysis of owned audio requires a separate opt-in and retention policy.

## 8. Acceptance and unresolved decisions

Required test sets cover 10,000 proposed library entries, duplicated files, changed renditions, malformed tags, long paths, Unicode, interrupted imports, missing permissions, migrations, offline grants, account deletion and full storage. The 10,000-entry figure is a proposed design workload, to be ratified against devices and user need; it is not a measured capacity claim.

Confirmed direction: Android first; primary serious mobile DJ audience; secondary casual streaming audience; private/personal initial use; broad source coverage desired; USB interfaces and splitters allowed. No particular streaming partnership is approved. Implementation decisions include ordering of provider investigations, import reference versus managed-copy behavior, metadata portability formats and measured storage/device limits. An app account is not required for the local baseline. Cloud storage/sync and its account purpose are deferred optional decisions, not prerequisites for design. The user has not reduced the requested final scope: any necessary staged release or unavailable source must be explicitly identified, not silently substituted.

In addition to the existing library cases, test a restricted catalog field joined to a local track, a request to send provider artwork to a model, revoked metadata retention, an unavailable official download, a local video whose audio cannot be decoded, and a stale acquisition job returning after the deck changed. Every case must preserve existing cues and valid playback. Document 14 source cases, Document 16 DLA-01 through DLA-20, and Document 13 ParDay cases supply detailed acceptance criteria.


## Later AWS extension data placement

The first release has no required server. Owner-operated AWS remains the accepted later server candidate, with no local host selected and an approximate USD 35 monthly planning target excluding ParDay AI-provider charges. Keep phone preparation and validated local media authoritative. Record server staging, artifact lifetime and actual transfer legs separately; a cloud-resolved URL is not assumed usable from the phone. The deferred AWS source-path feasibility and comparison are defined in Documents 16 and 18; their service-specific cases do not block local design or release. Source rights, provider restrictions, actual media provenance and ParDay context rules remain distinct from hosting location. No account, bucket, worker or media transfer has been created.

## Sources

1. [Spotify DJ integration support](https://support.spotify.com/in-en/article/dj-integration/).
2. [Spotify Developer Policy](https://developer.spotify.com/policy).
3. [DJ with Apple Music](https://music.apple.com/us/curator/dj-with-apple-music/1798261090).
4. [MusicKit](https://developer.apple.com/musickit/).
5. [Apple Media Services terms](https://www.apple.com/legal/internet-services/itunes/us/terms.html), applicable territory to be confirmed.
6. [Tidal DJ support](https://support.tidal.com/hc/en-us/articles/27563493690129-Tidal-DJ).
7. [Beatport Streaming](https://stream.beatport.com/).
8. [rekordbox FAQ](https://rekordbox.com/en/support/faq/rekordbox7/), desktop example, not mobile parity.
9. [djay streaming capabilities](https://help.algoriddim.com/topic/music-streaming/streaming-services).
10. [YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies).
11. [YouTube Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality).
12. [Bandcamp purchase download formats](https://get.bandcamp.help/en/articles/15263234-in-which-formats-can-i-download-my-purchases).
13. [SoundCloud uploader-enabled downloads](https://help.soundcloud.com/hc/en-us/articles/115003448787-Downloading-tracks).
14. [YouTube own-upload exports](https://support.google.com/youtube/answer/56100?hl=en).
15. [Spotify Developer Terms](https://developer.spotify.com/terms), including AI ingestion, stream-ripping and conditional-download restrictions.
