#!/usr/bin/env python3
"""
Side-by-side SVG rendering comparison.

Left:  Reference rendering via librsvg (the "correct" answer)
Right: Cosyne/Tsyne rendering via the real pipeline

Produces a single HTML file with all comparisons, sorted by MAE (worst first).

Usage:
    python3 cosyne/test/svg-compare.py                    # all SVGs
    python3 cosyne/test/svg-compare.py heart.svg mars.svg  # specific files
    python3 cosyne/test/svg-compare.py --output /tmp/out   # custom output dir
"""

import sys
import os
import base64
import html as html_mod
import json
import argparse
from pathlib import Path

import subprocess
from PIL import Image

# Find paths
SCRIPT_DIR = Path(__file__).parent
SVG_DIR = SCRIPT_DIR / 'svg'
DEFAULT_OUTPUT = SCRIPT_DIR / 'screenshots' / 'svg-compare'
PROJECT_ROOT = SCRIPT_DIR.parent.parent

SIZE = 400  # render at 400x400


def render_reference(svg_path: Path, output_path: Path):
    """Render SVG using rsvg-convert (reference)."""
    tmp_path = output_path.with_suffix('.tmp.png')
    subprocess.run(
        ['rsvg-convert', '-w', str(SIZE), '-h', str(SIZE),
         '--keep-aspect-ratio', '-b', 'white',
         '-o', str(tmp_path), str(svg_path)],
        check=True, capture_output=True,
    )
    # rsvg-convert may produce non-square output; pad to SIZE x SIZE centered
    img = Image.open(tmp_path).convert('RGBA')
    if img.size != (SIZE, SIZE):
        canvas = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 255))
        ox = (SIZE - img.width) // 2
        oy = (SIZE - img.height) // 2
        canvas.paste(img, (ox, oy))
        canvas.save(output_path)
    else:
        img.save(output_path)
    img.close()
    tmp_path.unlink(missing_ok=True)


def render_cosyne(svg_path: Path, output_path: Path) -> bool:
    """Render SVG using the real Cosyne/Tsyne pipeline. Returns True on success."""
    env = os.environ.copy()
    env['TSYNE_BRIDGE_PATH'] = str(PROJECT_ROOT / 'core' / 'bin' / 'tsyne-bridge')
    env['TSYNE_HEADED'] = '1'
    env['DISPLAY'] = ':0'
    # When running over SSH, need Xauthority for the local Xwayland session
    if 'XAUTHORITY' not in env:
        import glob
        xauth = glob.glob(f'/run/user/{os.getuid()}/.mutter-Xwaylandauth.*')
        if xauth:
            env['XAUTHORITY'] = xauth[0]
    try:
        result = subprocess.run(
            ['npx', 'tsx', 'cosyne/test/svg-cosyne-render.ts',
             str(svg_path), str(output_path)],
            cwd=str(PROJECT_ROOT),
            env=env,
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            print(f'  Cosyne render failed (exit {result.returncode}):', file=sys.stderr)
            if result.stderr:
                print(f'  stderr: {result.stderr[:300]}', file=sys.stderr)
            if result.stdout:
                print(f'  stdout: {result.stdout[:300]}', file=sys.stderr)
            return False
        if not output_path.exists():
            print(f'  Cosyne render: process exited 0 but no output file', file=sys.stderr)
            if result.stderr:
                print(f'  stderr: {result.stderr[:300]}', file=sys.stderr)
            if result.stdout:
                print(f'  stdout: {result.stdout[:300]}', file=sys.stderr)
            return False
        return True
    except subprocess.TimeoutExpired:
        print(f'  Cosyne render timed out (30s)', file=sys.stderr)
        return False


def png_to_data_uri(png_path: Path) -> str:
    """Convert a PNG file to a base64 data URI."""
    data = png_path.read_bytes()
    b64 = base64.b64encode(data).decode('ascii')
    return f'data:image/png;base64,{b64}'


def pixel_mae(ref_path: Path, other_path: Path) -> float:
    """Compute Mean Absolute Error between two images (0 = identical, 255 = max diff)."""
    import numpy as np
    ref = np.array(Image.open(ref_path).convert('RGB'), dtype=float)
    other = np.array(Image.open(other_path).convert('RGB'), dtype=float)
    if ref.shape != other.shape:
        other_img = Image.open(other_path).convert('RGB').resize((ref.shape[1], ref.shape[0]))
        other = np.array(other_img, dtype=float)
    return float(np.mean(np.abs(ref - other)))


def transpile_all_cosyne(svg_paths: list[Path]) -> dict[str, str]:
    """Batch-transpile SVGs to Cosyne TypeScript source via the transpiler."""
    paths_arg = json.dumps([str(p) for p in svg_paths])
    script = (
        "import{transpileSvgToModule}from'./cosyne/src/svg/transpiler';"
        "import{readFileSync}from'fs';"
        "const r:any={};"
        "for(const p of JSON.parse(process.argv[1])){"
        "try{r[p]=transpileSvgToModule(readFileSync(p,'utf-8'))}"
        "catch(e){r[p]=''}}"
        "process.stdout.write(JSON.stringify(r))"
    )
    try:
        result = subprocess.run(
            ['npx', 'tsx', '-e', script, paths_arg],
            cwd=str(PROJECT_ROOT),
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception as e:
        print(f'  Transpiler batch failed: {e}', file=sys.stderr)
    return {}


def generate_html(results: list[dict], html_path: Path):
    """Generate a single self-contained HTML file with all comparisons."""
    good = sum(1 for r in results if r['mae'] < 20)
    ok = sum(1 for r in results if 20 <= r['mae'] < 40)
    bad = sum(1 for r in results if r['mae'] >= 40)
    unknown = sum(1 for r in results if r['mae'] < 0)

    rows_html = []
    for r in results:
        mae = r['mae']
        if mae < 0:
            badge = '<span class="badge unknown">?</span>'
        elif mae < 20:
            badge = '<span class="badge good">GOOD</span>'
        elif mae < 40:
            badge = '<span class="badge ok">OK</span>'
        else:
            badge = '<span class="badge bad">DIFF</span>'

        mae_str = f'MAE: {mae:.1f}' if mae >= 0 else 'no render'

        svg_source = r.get('svg_source', '')
        svg_source_escaped = html_mod.escape(svg_source)
        cosyne_source_escaped = html_mod.escape(r.get('cosyne_source', ''))

        if r.get('cosyne_uri'):
            cosyne_img = f'<img src="{r["cosyne_uri"]}" width="300" height="300">'
        else:
            cosyne_img = '<div class="no-screenshot">No screenshot</div>'

        cosyne_source_link = ''
        cosyne_source_block = ''
        if cosyne_source_escaped:
            cosyne_source_link = ' <a href="#" class="src-link" onclick="toggleSource(this,\'cosyne\');return false">show source</a>'
            cosyne_source_block = f'<div class="source-pane" data-source="cosyne"><pre><code class="language-typescript">{cosyne_source_escaped}</code></pre></div>'

        svg_source_link = ''
        svg_source_block = ''
        if svg_source_escaped:
            svg_source_link = ' <a href="#" class="src-link" onclick="toggleSource(this,\'svg\');return false">show source</a>'
            svg_source_block = f'<div class="source-pane" data-source="svg"><pre><code class="language-xml">{svg_source_escaped}</code></pre></div>'

        # Scrubber panel (only if cosyne rendered)
        if r.get('cosyne_uri'):
            scrubber_panel = f'''<div class="panel">
          <div class="label scrub-label">Scrub (drag to compare)</div>
          <div class="scrubber" data-active="false">
            <img class="scrub-back" src="{r['ref_uri']}" width="300" height="300" draggable="false">
            <div class="scrub-clip"><img class="scrub-front" src="{r['cosyne_uri']}" width="300" height="300" draggable="false"></div>
            <div class="scrub-handle"><div class="scrub-line"></div><div class="scrub-knob"></div></div>
          </div>
        </div>'''
        else:
            scrubber_panel = ''

        # Inline SVG for browser rendering — set explicit size so it fits the panel
        browser_svg = svg_source
        import re
        # Extract original width/height before stripping (needed for viewBox injection)
        orig_w_m = re.search(r'<svg[^>]*?\s+width\s*=\s*"([^"]*)"', browser_svg)
        orig_h_m = re.search(r'<svg[^>]*?\s+height\s*=\s*"([^"]*)"', browser_svg)
        orig_w = orig_w_m.group(1) if orig_w_m else None
        orig_h = orig_h_m.group(1) if orig_h_m else None
        # Strip existing width/height and inject 300x300
        browser_svg = re.sub(r'(<svg[^>]*?)(\s+width\s*=\s*"[^"]*")', r'\1', browser_svg)
        browser_svg = re.sub(r'(<svg[^>]*?)(\s+height\s*=\s*"[^"]*")', r'\1', browser_svg)
        browser_svg = browser_svg.replace('<svg', f'<svg width="300" height="300"', 1)
        # If no viewBox, inject one from original dimensions so content scales
        if 'viewBox' not in browser_svg.split('>')[0] and 'viewbox' not in browser_svg.split('>')[0]:
            if orig_w and orig_h:
                # Strip non-numeric suffixes (e.g. "406.25000" → "406.25")
                w_val = re.sub(r'[^0-9.]', '', orig_w)
                h_val = re.sub(r'[^0-9.]', '', orig_h)
                if w_val and h_val:
                    browser_svg = browser_svg.replace('<svg ', f'<svg viewBox="0 0 {w_val} {h_val}" ', 1)

        rows_html.append(f'''
    <div class="comparison">
      <div class="row-header">
        <span class="name">{r['name']}</span>
        {badge}
        <span class="mae">{mae_str}</span>
      </div>
      <div class="images">
        <div class="panel">
          <div class="label browser-label">Browser (native){svg_source_link}</div>
          <div class="panel-wrap svg-native">{browser_svg}</div>
        </div>
        <div class="panel">
          <div class="label ref-label">Reference (librsvg)</div>
          <div class="panel-wrap">
            <img src="{r['ref_uri']}" width="300" height="300">
          </div>
        </div>
        <div class="panel">
          <div class="label cosyne-label">Cosyne (Tsyne){cosyne_source_link}</div>
          <div class="panel-wrap">
            {cosyne_img}
          </div>
        </div>
        {scrubber_panel}
      </div>
      {svg_source_block}
      {cosyne_source_block}
    </div>''')

    html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SVG Rendering Comparison</title>
<style>
  body {{ font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }}
  .sticky-header {{ position: sticky; top: 0; z-index: 10; background: #f5f5f5; padding: 20px 20px 0; border-bottom: 1px solid #ddd; }}
  h1 {{ margin: 0 0 5px; }}
  .summary {{ color: #666; margin-bottom: 12px; }}
  .summary .good {{ color: #2a2; }}
  .summary .ok {{ color: #a80; }}
  .summary .bad {{ color: #c22; }}
  .filters {{ padding-bottom: 12px; display: flex; align-items: center; gap: 6px; }}
  .filters input {{ padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; width: 200px; }}
  .filters button {{ padding: 6px 14px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; }}
  .filters button.active {{ background: #333; color: white; border-color: #333; }}
  #comparisons {{ padding: 16px 20px; }}
  .comparison {{ background: white; border-radius: 8px; margin-bottom: 16px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
  .row-header {{ display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }}
  .name {{ font-weight: 600; font-size: 15px; }}
  .mae {{ color: #888; font-size: 13px; }}
  .badge {{ padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; }}
  .badge.good {{ background: #d4edda; color: #155724; }}
  .badge.ok {{ background: #fff3cd; color: #856404; }}
  .badge.bad {{ background: #f8d7da; color: #721c24; }}
  .badge.unknown {{ background: #e2e3e5; color: #383d41; }}
  .images {{ display: flex; gap: 16px; }}
  .panel {{ text-align: center; }}
  .panel img {{ border: 1px solid #ddd; background: white; }}
  .label {{ font-size: 12px; color: #666; margin-bottom: 4px; }}
  .ref-label {{ color: #2a2; }}
  .browser-label {{ color: #07a; }}
  .cosyne-label {{ color: #a2a; }}
  .svg-native {{ width: 300px; height: 300px; border: 1px solid #ddd; background: white; overflow: hidden; }}
  .svg-native svg {{ display: block; width: 100%; height: 100%; }}
  .no-screenshot {{ width: 300px; height: 300px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 13px; }}
  .scrub-label {{ color: #07a; }}
  .scrubber {{ position: relative; width: 300px; height: 300px; border: 1px solid #ddd; cursor: ew-resize; user-select: none; -webkit-user-select: none; overflow: hidden; background: white; }}
  .scrub-back {{ display: block; width: 300px; height: 300px; }}
  .scrub-clip {{ position: absolute; top: 0; left: 0; width: 50%; height: 100%; overflow: hidden; }}
  .scrub-front {{ display: block; width: 300px; height: 300px; }}
  .scrub-handle {{ position: absolute; top: 0; left: 50%; width: 0; height: 100%; pointer-events: none; }}
  .scrub-line {{ position: absolute; left: -1px; top: 0; width: 2px; height: 100%; background: #07a; }}
  .scrub-knob {{ position: absolute; left: -8px; top: 50%; margin-top: -8px; width: 16px; height: 16px; border-radius: 50%; background: #07a; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.4); }}
  .src-link {{ font-size: 11px; color: #888; text-decoration: none; margin-left: 4px; }}
  .src-link:hover {{ color: #333; text-decoration: underline; }}
  .source-pane {{ display: none; text-align: left; background: #282c34; border-radius: 6px; padding: 14px; margin-top: 12px; max-height: 500px; overflow: auto; }}
  .source-pane pre {{ margin: 0; }}
  .source-pane code {{ font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; }}
</style>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/xml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
</head>
<body>
<div class="sticky-header">
<h1>SVG Rendering Comparison</h1>
<p class="summary">
  {len(results)} SVGs &mdash;
  <span class="good">{good} good</span>,
  <span class="ok">{ok} ok</span>,
  <span class="bad">{bad} diff</span>
  &mdash; sorted worst first
  &mdash; MAE = Mean Absolute Error (avg per-pixel diff, 0&ndash;255)
</p>
<div class="filters">
  <input type="text" id="search" placeholder="Search by filename..." oninput="applyFilters()">
  <button class="active" onclick="setFilter('all')">All ({len(results)})</button>
  <button onclick="setFilter('bad')">Diff ({bad})</button>
  <button onclick="setFilter('ok')">OK ({ok})</button>
  <button onclick="setFilter('good')">Good ({good})</button>
</div>
</div>
<div id="comparisons">
{"".join(rows_html)}
</div>
<script>
var currentFilter = 'all';
function setFilter(level) {{
  currentFilter = level;
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  applyFilters();
}}
function applyFilters() {{
  const query = document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('.comparison').forEach(el => {{
    const name = el.querySelector('.name').textContent.toLowerCase();
    const badge = el.querySelector('.badge').textContent;
    const matchesSearch = !query || name.includes(query);
    const matchesFilter = currentFilter === 'all' ||
      (currentFilter === 'bad' && badge === 'DIFF') ||
      (currentFilter === 'ok' && badge === 'OK') ||
      (currentFilter === 'good' && badge === 'GOOD');
    el.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
  }});
}}
function closeAllSources() {{
  document.querySelectorAll('.source-pane').forEach(function(el) {{ el.style.display = 'none'; }});
}}
function toggleSource(link, kind) {{
  var card = link.closest('.comparison');
  var pane = card.querySelector('.source-pane[data-source="' + kind + '"]');
  if (!pane) return;
  var wasOpen = pane.style.display === 'block';
  closeAllSources();
  if (!wasOpen) {{
    pane.style.display = 'block';
    if (!pane.dataset.highlighted) {{
      pane.querySelectorAll('code').forEach(function(block) {{ hljs.highlightElement(block); }});
      pane.dataset.highlighted = '1';
    }}
  }}
}}
document.addEventListener('click', function(e) {{
  if (!e.target.closest('.source-pane') && !e.target.closest('.src-link')) closeAllSources();
}});

// ─── Scrubber drag logic ──────────────────────────────────────
(function() {{
  var active = null; // the .scrubber element being dragged

  function updateScrub(scrubber, clientX) {{
    var rect = scrubber.getBoundingClientRect();
    var x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    var pct = (x / rect.width) * 100;
    scrubber.querySelector('.scrub-clip').style.width = pct + '%';
    scrubber.querySelector('.scrub-handle').style.left = pct + '%';
  }}

  document.addEventListener('mousedown', function(e) {{
    var scrubber = e.target.closest('.scrubber');
    if (!scrubber) return;
    e.preventDefault();
    active = scrubber;
    updateScrub(scrubber, e.clientX);
  }});

  document.addEventListener('mousemove', function(e) {{
    if (!active) return;
    e.preventDefault();
    updateScrub(active, e.clientX);
  }});

  document.addEventListener('mouseup', function() {{
    active = null;
  }});

  // Touch support
  document.addEventListener('touchstart', function(e) {{
    var scrubber = e.target.closest('.scrubber');
    if (!scrubber) return;
    active = scrubber;
    updateScrub(scrubber, e.touches[0].clientX);
  }}, {{ passive: true }});

  document.addEventListener('touchmove', function(e) {{
    if (!active) return;
    e.preventDefault();
    updateScrub(active, e.touches[0].clientX);
  }}, {{ passive: false }});

  document.addEventListener('touchend', function() {{
    active = null;
  }});
}})();
</script>
</body>
</html>'''

    html_path.write_text(html)


def main():
    parser = argparse.ArgumentParser(description='SVG side-by-side comparison')
    parser.add_argument('files', nargs='*', help='Specific SVG files to test (default: all)')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT, help='Output directory')
    parser.add_argument('--no-open', action='store_true', help='Do not open result')
    args = parser.parse_args()

    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.files:
        svg_files = [SVG_DIR / (f if f.endswith('.svg') else f + '.svg') for f in args.files]
    else:
        svg_files = sorted(SVG_DIR.glob('*.svg'))

    if not svg_files:
        print('No SVG files found')
        return 1

    # Batch-transpile all SVGs to Cosyne TypeScript source
    print('Transpiling SVGs to Cosyne source...')
    transpiled = transpile_all_cosyne(svg_files)

    results = []

    for svg_path in svg_files:
        name = svg_path.stem
        print(f'Processing {svg_path.name}...')

        ref_path = output_dir / f'{name}_ref.png'

        try:
            render_reference(svg_path, ref_path)
        except Exception as e:
            print(f'  Reference render failed: {e}')
            continue

        # Render via real Cosyne/Tsyne pipeline
        cosyne_path = output_dir / f'{name}_cosyne.png'
        cosyne_uri = None
        mae = -1.0
        if render_cosyne(svg_path, cosyne_path):
            cosyne_uri = png_to_data_uri(cosyne_path)
            try:
                import numpy as np
                mae = pixel_mae(ref_path, cosyne_path)
                status = '✓' if mae < 20 else '~' if mae < 40 else '✗'
                print(f'  {status} MAE: {mae:.1f}/255')
            except ImportError:
                print(f'  (numpy not available for MAE)')
        else:
            print(f'  Cosyne render: no output')

        # Read raw SVG source + transpiled Cosyne code
        svg_source = svg_path.read_text(encoding='utf-8')
        cosyne_source = transpiled.get(str(svg_path), '')

        results.append({
            'name': svg_path.name,
            'mae': mae,
            'ref_uri': png_to_data_uri(ref_path),
            'cosyne_uri': cosyne_uri,
            'svg_source': svg_source,
            'cosyne_source': cosyne_source,
        })

    # Sort worst first (unknown at the top)
    results.sort(key=lambda r: r['mae'] if r['mae'] >= 0 else 999, reverse=True)

    # Generate HTML
    html_path = output_dir / 'comparison.html'
    generate_html(results, html_path)

    # Write CSV
    csv_path = output_dir / 'results.csv'
    with open(csv_path, 'w') as f:
        f.write('file,mae,status,bytes\n')
        for r in results:
            mae = r['mae']
            status = 'none' if mae < 0 else 'good' if mae < 20 else 'ok' if mae < 40 else 'diff'
            svg_file = SVG_DIR / r['name']
            size = svg_file.stat().st_size if svg_file.exists() else 0
            f.write(f'{r["name"]},{mae:.1f},{status},{size}\n')
    print(f'CSV: {csv_path}')

    # Summary
    print(f'\n{"="*50}')
    print(f'Results: {len(results)} SVGs compared')
    print(f'HTML: {html_path}')
    if results:
        print(f'\n{"File":<30} {"MAE":>8}  Status')
        print(f'{"-"*30} {"-"*8}  {"-"*6}')
        for r in results:
            mae = r['mae']
            if mae < 0:
                status = '? none'
            elif mae < 20:
                status = '✓ good'
            elif mae < 40:
                status = '~ ok'
            else:
                status = '✗ diff'
            print(f'{r["name"]:<30} {mae:>7.1f}  {status}')

    if not args.no_open:
        os.system(f'xdg-open "{html_path}" 2>/dev/null &')

    return 0


if __name__ == '__main__':
    sys.exit(main() or 0)
