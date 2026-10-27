"""Compatibility entry point for real HTTP and isolated-browser regressions.
Run: node scripts/build-single.mjs && python tests/smoke.py
Requires Node.js, Playwright, and Chromium or installed Microsoft Edge.
Python Playwright is not required.
"""
from pathlib import Path
import shutil
import subprocess
import sys

node = shutil.which('node')
if not node:
    sys.exit('Node.js is required. Run node tests/v4-regression.cjs after installing Node.js.')
test_root = Path(__file__).resolve().parent
backend = subprocess.call([node, '--test', str(test_root / 'backend.test.mjs')])
if backend:
    sys.exit(backend)
sys.exit(subprocess.call([node, str(test_root / 'v4-regression.cjs')]))
