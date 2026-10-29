# Rebuilding and checking the planning PDFs

This script produces documentation, not the DJ application. The supplied PDFs are ready to read; running the script is optional.

## Tested documentation environment

- Python 3.12.14
- ReportLab 4.4.9
- pypdf 6.10.0
- Pillow 12.3.0
- DejaVu Sans, DejaVu Sans Bold and DejaVu Sans Mono TTF files under `/usr/share/fonts/truetype/dejavu`

The final document checks also used PyMuPDF 1.26.6. It is not required by `render_dossier.py`. No particular app runtime, Android SDK, audio library or cloud account is required to read or render this documentation.

## Rebuild

Use a Python environment containing the packages above. From this extracted pack's root, run:

```sh
python render_dossier.py
```

The script resolves files relative to its own location. It expects nineteen numbered Markdown specifications in `sources/`, the two concept PNGs under `assets/concepts/`, and the fonts at the location above. On a platform with a different font directory, update the `FONT` path near the start of the script; font changes can alter pagination.

Output consists of nineteen individual PDFs, the combined dossier under `output/pdf/v1_0/`, and an updated `document_manifest.json`. A temporary front-matter PDF is written under `tmp/`. Rebuilding replaces these document outputs; it does not modify Android code, provision a service or publish anything.

The renderer verifies the expected document count and four-page front matter used by the contents offsets. If a substantial edit causes front matter to grow, revise the contents-offset logic together with that layout. After any document changes, inspect rendered pages, cross-references, tables and page numbers. The existing validation report describes the delivered snapshot only; it must not be presented as evidence for edited outputs without rechecking.

The supplied checksum inventory covers the delivered files. Changes or different PDF generation metadata can alter hashes; a successful local rebuild is not a promise of byte-identical output across environments.
