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
    sys.exit('Node.js is required. Run node tests/regression.cjs after installing Node.js.')
sys.exit(subprocess.call([node, str(Path(__file__).with_name('regression.cjs'))]))
