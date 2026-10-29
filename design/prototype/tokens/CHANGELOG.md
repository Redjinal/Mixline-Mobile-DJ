# Token changes relative to the planning pack

Source of record: `docs/planning/v1_0/assets/design_tokens_proposed.json` (version 0.3, C selected, native contrast unverified). This prototype's `tokens.json` is version 0.4-prototype. Every entry below is a **proposal** recorded for Document 19 §7 ("token changes"); none is validated on the S26 Ultra.

## Kept unchanged

Daylight C role colours (`stage`, `control_surface` → `control`, `raised_surface` → `raised`, `text_primary` → `ink`, `text_secondary` → `ink_2`, `titanium`, `brass`, deck A–D foregrounds and accents, `warning`, `critical`), the 4/8/12/16/24 dp spacing scale, 48/56 dp touch targets, Barlow and IBM Plex Mono candidates, the 12/14/16/20/28 sp sizes, the 90–160 / 140–220 ms motion ranges, the Essential/Balanced/Enhanced tiers and the 8 MiB / 1–2 MiB asset budgets.

## Added (proposed)

| Token | Value (daylight) | Why |
| --- | --- | --- |
| `stage_deep`, `sunken` | `#CBD8DE`, `#D3DEE3` | A second stage tone for the mineral vignette and an inset surface for rails and meters. |
| `ink_3` | `#6B8591` | Tertiary text for de-emphasised metadata; still ≥ 4.5:1 on `control`. |
| `line`, `line_strong` | `rgba(21,37,46,0.12/0.28)` | Panel borders and separators derived from ink, not grey. |
| `glass`, `glass_edge`, `glass_shadow` | see `tokens.json` | The frosted panel recipe needs explicit alpha fill, edge highlight and shadow values. |
| `titanium_hi/lo`, `brass_hi/lo` | see `tokens.json` | Gradient stops for brushed titanium and brass rims; the pack gave one value per metal. |
| `*_fill` status fills, `ok`, `info` | see `tokens.json` | Status chips need a text colour and a fill; the pack defined only warning/critical text. |
| `focus` | `#0B3B46` | Explicit high-contrast focus ring independent of deck colour (Document 04 §3). |
| `meter_low/mid/hot` | `#2E9B8E`, `#C98B1B`, `#A01939` | Meter segment colours separate from status semantics. |
| `fixture`, `fixture_fill` | `#5A3E8E`, `#E9E1F7` | The FIXTURE mark colour; deliberately unlike any deck or status colour. |
| `hit_outline` | `#C21F8A` | Hit-bound overlay colour for audits. |
| `radius.*` | control 6 · pad 10 · panel 14 · sheet 18 | Document 04's "corner vocabulary" needed numbers. |
| `type.sizes.xxl` | 36 sp | BPM readout in landscape deck headers. |
| `insets` | status 24 · gesture 16 · gutter 16 dp | Assumed Android insets drawn as guides; unmeasured. |
| `viewport` | 412 × 892 (default) · 412 × 915 · fill | Assumed S26 Ultra logical sizes, flagged `measured: false`. |

## Derived themes (proposed)

- **Low-light** is derived from C: deep mineral blue-grey stage (`#131E26`), pale ink (`#E8EFF2`), deck foregrounds switch to the luminous accent values so they stay ≥ 4.5:1, brass lifted to `#B08A4E`. It is not direction A (A's graphite/smoked-glass values are not used anywhere).
- **High contrast** uses opaque white/near-white surfaces, pure black ink, 1.5 px black separators, no blur, deck foregrounds darkened (`#00515F`, `#8A2F0F`, `#4C2E85`, `#1B5436`) for ≥ 7:1.

## Open

Native contrast on the composed screen, actual S26 Ultra density/insets, font acquisition (AS-02/03 remain shortlisted; the prototype loads the fonts from Google Fonts with a system fallback).
