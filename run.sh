#!/usr/bin/env sh
# Lexicosmos: install what it needs and run it (macOS / Linux).
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then exec python3 run.py "$@"; fi
if command -v python >/dev/null 2>&1; then exec python run.py "$@"; fi
echo "Python 3.8+ is needed: https://www.python.org/downloads/"
exit 1
