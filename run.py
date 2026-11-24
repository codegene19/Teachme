#!/usr/bin/env python3
"""Lexicosmos — install what it needs, then run it on your computer.

    python3 run.py                 # first run: sets up, then opens the app
    python3 run.py --voices it_IT-paola-medium,es_ES-davefx-medium
    python3 run.py --voices none   # skip downloading Piper voices
    python3 run.py --port 8080 --no-browser

Uses only Python's standard library (3.8+): nothing to pip install.

What it does
  1. Downloads Piper's runtime (onnxruntime-web and the phonemizer) from the
     npm registry into local/piper/, so natural voices work without CDNs.
  2. Downloads the Piper voices you choose into local/piper/voices/.
     Voices you pick later in the app are downloaded and kept there too.
  3. Serves the app on http://127.0.0.1:<port> (only reachable from this
     computer) and auto-saves your universe to data/universe.json, with
     rolling backups in data/backups/.
"""

import argparse
import io
import json
import mimetypes
import os
import shutil
import sys
import tarfile
import threading
import time
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOCAL = ROOT / 'local' / 'piper'
DATA = ROOT / 'data'
BACKUPS = DATA / 'backups'
UNIVERSE = DATA / 'universe.json'

ORT_VERSION = '1.18.0'
PHONEMIZE_VERSION = '1.0.0'
VOICE_MIRRORS = [
    'https://huggingface.co/diffusionstudio/piper-voices/resolve/main',
    'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0',
]
# The voices offered in the app (js/piper.js), with their paths in the mirrors.
VOICES = {
    'it_IT-paola-medium': ('it/it_IT/paola/medium', 'Italian · Paola · 64 MB'),
    'it_IT-riccardo-x_low': ('it/it_IT/riccardo/x_low', 'Italian · Riccardo · 28 MB'),
    'es_ES-davefx-medium': ('es/es_ES/davefx/medium', 'Spanish (Spain) · Davefx · 63 MB'),
    'es_ES-sharvard-medium': ('es/es_ES/sharvard/medium', 'Spanish (Spain) · Sharvard · 77 MB'),
    'es_MX-claude-high': ('es/es_MX/claude/high', 'Spanish (Mexico) · Claude · 63 MB'),
    'es_MX-ald-medium': ('es/es_MX/ald/medium', 'Spanish (Mexico) · Ald · 63 MB'),
    'en_US-hfc_female-medium': ('en/en_US/hfc_female/medium', 'English (US) · HFC · 63 MB'),
    'en_US-lessac-medium': ('en/en_US/lessac/medium', 'English (US) · Lessac · 63 MB'),
}
DEFAULT_VOICES = ['it_IT-paola-medium', 'es_ES-davefx-medium']
KEEP_BACKUPS = 30
BACKUP_EVERY = 10 * 60  # seconds between kept backups

mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/javascript', '.mjs')
mimetypes.add_type('application/octet-stream', '.onnx')
mimetypes.add_type('application/octet-stream', '.data')

# ----------------------------------------------------------------- download
def fetch(url, dest=None, label=None):
    """Download url (to dest, atomically) and return bytes when dest is None."""
    req = urllib.request.Request(url, headers={'User-Agent': 'lexicosmos-setup'})
    with urllib.request.urlopen(req, timeout=60) as res:
        total = int(res.headers.get('Content-Length') or 0)
        out = io.BytesIO() if dest is None else open(f'{dest}.part', 'wb')
        done, last = 0, 0.0
        try:
            while True:
                chunk = res.read(1 << 16)
                if not chunk:
                    break
                out.write(chunk)
                done += len(chunk)
                if label and time.time() - last > 0.2:
                    last = time.time()
                    pct = f'{done * 100 // total:3d}%' if total else f'{done >> 20} MB'
                    print(f'\r  {label}  {pct}', end='', flush=True)
        finally:
            if dest is not None:
                out.close()
        if label:
            print(f'\r  {label}  done ({done >> 20} MB)        ')
        if dest is None:
            return out.getvalue()
        os.replace(f'{dest}.part', dest)


def npm_files(package, version, wanted, target):
    """Pull selected files out of an npm package tarball into target/."""
    name = package.split('/')[-1]
    url = f'https://registry.npmjs.org/{package}/-/{name}-{version}.tgz'
    data = fetch(url, label=f'{package}@{version}')
    target.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tar:
        for member in tar.getmembers():
            if member.isfile() and member.name in wanted:
                # write by basename only: nothing from the archive picks its own path
                (target / Path(member.name).name).write_bytes(tar.extractfile(member).read())


def install_runtime():
    ort = LOCAL / 'ort'
    if not (ort / 'ort.wasm.min.js').exists():
        print('Installing the Piper runtime (onnxruntime-web)…')
        npm_files('onnxruntime-web', ORT_VERSION, {
            'package/dist/esm/ort.wasm.min.js',
            'package/dist/ort-wasm-simd.wasm',
            'package/dist/ort-wasm.wasm',
        }, ort)
    phon = LOCAL / 'phonemize'
    if not (phon / 'piper_phonemize.wasm').exists():
        print('Installing the Piper phonemizer…')
        npm_files('@diffusionstudio/piper-wasm', PHONEMIZE_VERSION, {
            'package/build/piper_phonemize.wasm',
            'package/build/piper_phonemize.data',
        }, phon)


def voice_files(voice_id):
    folder, _ = VOICES[voice_id]
    return [f'{folder}/{voice_id}.onnx', f'{folder}/{voice_id}.onnx.json']


def download_voice_file(rel, label=None):
    """Fetch one voice file into local/piper/voices/<rel>, trying each mirror."""
    dest = LOCAL / 'voices' / rel
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for base in VOICE_MIRRORS:
        try:
            fetch(f'{base}/{rel}', dest, label)
            return dest
        except Exception as err:  # try the next mirror
            last = err
    raise RuntimeError(f'could not download {rel}: {last}')


def install_voices(ids):
    for vid in ids:
        if vid not in VOICES:
            print(f'  unknown voice {vid!r} — choose from: {", ".join(VOICES)}')
            continue
        onnx, cfg = voice_files(vid)
        try:
            download_voice_file(cfg)
            download_voice_file(onnx, VOICES[vid][1])
        except Exception as err:
            print(f'  {vid}: {err}')


def write_manifest():
    stored = [vid for vid in VOICES if all((LOCAL / 'voices' / rel).exists() for rel in voice_files(vid))]
    manifest = {'runtime': (LOCAL / 'ort' / 'ort.wasm.min.js').exists() and (LOCAL / 'phonemize' / 'piper_phonemize.wasm').exists(), 'voices': stored}
    LOCAL.mkdir(parents=True, exist_ok=True)
    (LOCAL / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    return manifest


def choose_voices(arg):
    if arg:
        return [] if arg == 'none' else list(VOICES) if arg == 'all' else [v.strip() for v in arg.split(',') if v.strip()]
    already = [vid for vid in VOICES if all((LOCAL / 'voices' / rel).exists() for rel in voice_files(vid))]
    if already or not sys.stdin.isatty():
        return [] if already else DEFAULT_VOICES
    print('\nWhich Piper voices should be downloaded now? (others download when you pick them in the app)')
    keys = list(VOICES)
    for i, vid in enumerate(keys, 1):
        print(f'  {i}. {VOICES[vid][1]}')
    answer = input('Numbers separated by commas, Enter for 1,3, or "none": ').strip().lower()
    if answer == 'none':
        return []
    if not answer:
        return DEFAULT_VOICES
    return [keys[int(n) - 1] for n in answer.replace(' ', '').split(',') if n.isdigit() and 0 < int(n) <= len(keys)]


# ------------------------------------------------------------------ server
_last_backup = 0.0
_save_lock = threading.Lock()


def save_universe(body):
    global _last_backup
    data = json.loads(body)
    if not isinstance(data, dict) or data.get('version') != 1 or not isinstance(data.get('words'), dict):
        raise ValueError('not a Lexicosmos universe')
    with _save_lock:
        DATA.mkdir(exist_ok=True)
        if UNIVERSE.exists() and time.time() - _last_backup > BACKUP_EVERY:
            BACKUPS.mkdir(exist_ok=True)
            shutil.copy2(UNIVERSE, BACKUPS / time.strftime('universe-%Y%m%d-%H%M%S.json'))
            _last_backup = time.time()
            for old in sorted(BACKUPS.glob('universe-*.json'))[:-KEEP_BACKUPS]:
                old.unlink()
        tmp = UNIVERSE.with_suffix('.json.tmp')
        tmp.write_text(json.dumps(data, ensure_ascii=False))
        os.replace(tmp, UNIVERSE)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):  # quiet; errors still show
        if args and str(args[1]).startswith(('4', '5')) and '/api/universe' not in str(args[0]):
            sys.stderr.write(f'  {self.address_string()} {fmt % args}\n')

    def end_headers(self):
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _json(self, obj, status=HTTPStatus.OK):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/status':
            return self._json({'disk': True, 'file': str(UNIVERSE.relative_to(ROOT)), 'piper': write_manifest()})
        if path == '/api/universe':
            if not UNIVERSE.exists():
                return self._json({'error': 'no saved universe yet'}, HTTPStatus.NOT_FOUND)
            body = UNIVERSE.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        # A voice the app asks for that isn't downloaded yet: fetch it now and keep it.
        prefix = '/local/piper/voices/'
        if path.startswith(prefix):
            rel = path[len(prefix):]
            known = {f for vid in VOICES for f in voice_files(vid)}
            if rel in known and not (LOCAL / 'voices' / rel).exists():
                try:
                    print(f'Downloading voice file {rel} …')
                    download_voice_file(rel)
                    write_manifest()
                except Exception as err:
                    return self._json({'error': str(err)}, HTTPStatus.BAD_GATEWAY)
        return super().do_GET()

    def _save(self):
        try:
            length = int(self.headers.get('Content-Length') or 0)
            if length > 50 * 1024 * 1024:
                raise ValueError('too large')
            save_universe(self.rfile.read(length))
            self._json({'saved': True, 'at': time.time()})
        except Exception as err:
            self._json({'error': str(err)}, HTTPStatus.BAD_REQUEST)

    def do_PUT(self):
        if self.path.split('?')[0] == '/api/universe':
            return self._save()
        self.send_error(HTTPStatus.METHOD_NOT_ALLOWED)

    def do_POST(self):  # navigator.sendBeacon uses POST when the tab closes
        if self.path.split('?')[0] == '/api/universe':
            return self._save()
        self.send_error(HTTPStatus.METHOD_NOT_ALLOWED)


def main():
    if sys.version_info < (3, 8):
        sys.exit('Lexicosmos needs Python 3.8 or newer.')
    ap = argparse.ArgumentParser(description='Install and run Lexicosmos locally.')
    ap.add_argument('--port', type=int, default=8000)
    ap.add_argument('--voices', help='comma-separated voice ids, "all" or "none"')
    ap.add_argument('--no-browser', action='store_true', help="don't open a browser tab")
    ap.add_argument('--setup-only', action='store_true', help='download everything, then exit')
    args = ap.parse_args()

    print('Lexicosmos — setting up')
    try:
        install_runtime()
    except Exception as err:
        print(f'  Could not install the Piper runtime ({err}). Natural voices will load from the internet instead.')
    install_voices(choose_voices(args.voices))
    manifest = write_manifest()
    print(f'  Piper runtime: {"ready" if manifest["runtime"] else "online fallback"}; voices on disk: {", ".join(manifest["voices"]) or "none yet"}')
    if args.setup_only:
        return

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    url = f'http://127.0.0.1:{args.port}/'
    print(f'\nLexicosmos is running at {url}')
    print(f'Your universe auto-saves to {UNIVERSE.relative_to(ROOT)} (backups in {BACKUPS.relative_to(ROOT)}/).')
    print('Press Ctrl+C to stop.\n')
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped. See you among the stars.')


if __name__ == '__main__':
    main()
