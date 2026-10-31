#!/usr/bin/env python3
"""Serve design/prototype over HTTP (ES modules need http://, not file://).

    python3 design/tools/serve.py            # http://127.0.0.1:8765/
    python3 design/tools/serve.py 8080       # other port
    python3 design/tools/serve.py 8765 0.0.0.0   # reachable from a phone on the LAN

Open on the phone with the state switcher's viewport set to "Fill this window" so
1 CSS px = 1 dp at the device's real size. Nothing here is the DJ app.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1] / "prototype"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
HOST = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # quieter output
        if "--verbose" in sys.argv:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    Handler.extensions_map.update({".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml"})
    with ThreadingHTTPServer((HOST, PORT), Handler) as httpd:
        print(f"prototype at http://{HOST}:{PORT}/  (serving {ROOT})", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
