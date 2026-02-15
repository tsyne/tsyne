#!/usr/bin/env python3
"""
Revert unstaged PNG changes where MAE < 0.5 (visually identical).

Compares each modified PNG against its HEAD version. If the per-pixel
mean absolute error is below the threshold, the change is noise and
gets reverted via git checkout.

Usage:
    python3 scripts/revert-trivial-pngs.py          # default threshold 0.5
    python3 scripts/revert-trivial-pngs.py --threshold 1.0
    python3 scripts/revert-trivial-pngs.py --dry-run # show what would be reverted
"""

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image


def get_unstaged_pngs() -> list[str]:
    result = subprocess.run(
        ['git', 'diff', '--name-only', '--diff-filter=M'],
        capture_output=True, text=True, check=True,
    )
    return [f for f in result.stdout.splitlines() if f.lower().endswith('.png')]


def get_head_png(path: str) -> bytes:
    result = subprocess.run(
        ['git', 'show', f'HEAD:{path}'],
        capture_output=True, check=True,
    )
    return result.stdout


def pixel_mae(head_bytes: bytes, working_path: Path) -> float:
    import io
    head_img = np.array(Image.open(io.BytesIO(head_bytes)).convert('RGB'), dtype=float)
    work_img = np.array(Image.open(working_path).convert('RGB'), dtype=float)
    if head_img.shape != work_img.shape:
        return 999.0  # size changed — not trivial
    return float(np.mean(np.abs(head_img - work_img)))


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Revert trivial PNG changes')
    parser.add_argument('--threshold', type=float, default=0.5, help='MAE threshold (default: 0.5)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be reverted without doing it')
    args = parser.parse_args()

    repo_root = subprocess.run(
        ['git', 'rev-parse', '--show-toplevel'],
        capture_output=True, text=True, check=True,
    ).stdout.strip()

    pngs = get_unstaged_pngs()
    if not pngs:
        print('No unstaged PNG changes found.')
        return 0

    reverted = 0
    kept = 0

    for rel_path in pngs:
        abs_path = Path(repo_root) / rel_path
        try:
            head_bytes = get_head_png(rel_path)
            mae = pixel_mae(head_bytes, abs_path)
        except Exception as e:
            print(f'  SKIP  {rel_path}  ({e})')
            continue

        if mae < args.threshold:
            if args.dry_run:
                print(f'  WOULD REVERT  {rel_path}  (MAE={mae:.2f})')
            else:
                subprocess.run(['git', 'checkout', '--', rel_path], check=True)
                print(f'  REVERTED  {rel_path}  (MAE={mae:.2f})')
            reverted += 1
        else:
            print(f'  KEPT      {rel_path}  (MAE={mae:.2f})')
            kept += 1

    action = 'Would revert' if args.dry_run else 'Reverted'
    print(f'\n{action} {reverted}, kept {kept} of {len(pngs)} modified PNGs (threshold={args.threshold})')
    return 0


if __name__ == '__main__':
    sys.exit(main() or 0)
