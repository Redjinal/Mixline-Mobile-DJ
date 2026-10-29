# Mobile DJ — planning and design

**Working label; the app name is not chosen.** An Android-first, touch-only professional DJ instrument built as a personal tool, with the AI assistant **ParDay**. This is a new product: the earlier Mixline app that lives in this repository's history is not reused (decision D-001).

## Status

| Area | State |
| --- | --- |
| Planning baseline | v1.0 committed under `docs/planning/v1_0/` (19 specifications, contracts, tokens, asset register, concept renders, PDFs) |
| Design | In progress — see `design/` once it exists |
| Application | Not started. No engine, device certification, source adapter, AI integration, AWS resource or publication exists. |

## Where to start

1. `docs/planning/v1_0/00_README.md` — the pack's own guide and document map.
2. `docs/planning/v1_0/AGENTS.md` — invariants every agent must preserve.
3. `docs/planning/v1_0/sources/19_Design_Start_and_Local_First_Handoff.md` — the immediate design brief.
4. `docs/planning/v1_0/contracts/decision_ledger.json` — confirmed choices versus proposals.

The pack is kept intact so `docs/planning/v1_0/CHECKSUMS.sha256` verifies and `render_dossier.py` (see `RENDERING.md`) can rebuild the PDFs.

## Confirmed direction (summary)

Android first on a Galaxy S26 Ultra · C Crystal Current art direction · local version first, optional AWS extension later (planning target about US$35/month excluding ParDay AI charges) · full professional scope except lighting and external DJ controllers · USB audio interfaces and DJ splitters allowed · ParDay: preparation plus explicitly armed, bounded assisted performance with immediate manual takeover.
