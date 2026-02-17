/**
 * Heterogeneous Calculator — three rendering technologies in one UI.
 *
 * Demonstrates Tsyne's decomposed composition model by mixing:
 *   - Cosyne Vector Graphics (CVG) for the calculator display
 *   - Three.js (OpenGL) for 3D animated number buttons
 *   - Standard Tsyne/Fyne widgets for operation buttons
 *
 * Each rendering technology is a reusable component (like drawClockFace),
 * composed into a single window through Tsyne's container stack.
 *
 * Run: npx tsx examples/heterogeneous-calculator.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cvg, CvgContext } from '../cosyne/src';
import { initThreeJSWidget } from '../trine/integration/init';

// ─── Reusable CVG component: calculator display ─────────────────

const DISPLAY_VB_W = 520;
const DISPLAY_VB_H = 60;

/**
 * Draw a green-on-black monospace calculator display.
 *
 * Returns the CvgContext — call `.refresh()` after updating getValue().
 */
function drawDisplay(
  a: App,
  getValue: () => string,
): CvgContext {
  return cvg(a, { viewBox: `0 0 ${DISPLAY_VB_W} ${DISPLAY_VB_H}`, width: 520, height: 60 }, (s) => {
    s.rect({ x: 0, y: 0, width: DISPLAY_VB_W, height: DISPLAY_VB_H, fill: '#1a1a2e', rx: 6 });
    s.text({
      x: 12, y: 44,
      fill: '#00ff41', 'font-size': 36,
      'font-family': 'monospace',
    }, getValue()).bindText(getValue);
  });
}

// ─── Reusable Three.js component: 3D number button ──────────────

/** Color palette for digit cubes — index by digit value. */
const DIGIT_COLORS = [
  0x7f8c8d, // 0 — grey
  0xe74c3c, // 1 — red
  0xe67e22, // 2 — orange
  0xf1c40f, // 3 — yellow
  0x2ecc71, // 4 — green
  0x1abc9c, // 5 — teal
  0x3498db, // 6 — blue
  0x9b59b6, // 7 — purple
  0xe91e63, // 8 — pink
  0x00bcd4, // 9 — cyan
];

/** 5×7 bitmap font for digits 0-9 and '='. Each glyph is a 7-row array of 5-bit masks. */
const DIGIT_GLYPHS: number[][] = [
  [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110], // 0
  [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110], // 1
  [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111], // 2
  [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110], // 3
  [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010], // 4
  [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110], // 5
  [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110], // 6
  [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000], // 7
  [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110], // 8
  [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100], // 9
  [0b00000, 0b11111, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000], // 10 → '='
];

/**
 * Create a DataTexture with a digit rendered as white-on-colored bitmap.
 * Returns a 64×64 RGBA texture.
 */
function makeDigitTexture(THREE: any, digit: number, bgColor: number): any {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const bgR = (bgColor >> 16) & 0xff;
  const bgG = (bgColor >> 8) & 0xff;
  const bgB = bgColor & 0xff;

  // Fill background
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = bgR;
    data[i * 4 + 1] = bgG;
    data[i * 4 + 2] = bgB;
    data[i * 4 + 3] = 255;
  }

  // Render glyph — scale 5×7 up to ~35×49, centered in 64×64
  const glyph = DIGIT_GLYPHS[digit];
  const scale = 7;
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  const offsetX = Math.floor((size - glyphW) / 2);
  const offsetY = Math.floor((size - glyphH) / 2);

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row] & (1 << (4 - col))) {
        // Fill a scale×scale block
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = offsetX + col * scale + dx;
            const py = offsetY + row * scale + dy;
            // DataTexture is bottom-up, so flip Y
            const idx = ((size - 1 - py) * size + px) * 4;
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Draw a 3D rotating cube button with a glyph texture.
 *
 * Each call creates its own GLCanvas widget and Three.js scene.
 * The widget is added to the current container (grid cell, vbox, etc.)
 */
async function drawCubeButton(
  a: App,
  glyphIndex: number,
  color: number,
  onClick: () => void,
): Promise<void> {
  const { THREE, canvas } = await initThreeJSWidget(a, { width: 80, height: 80, interactive: true });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2c2c2c);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 2.8;

  // Lit cube with glyph texture on all faces
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const tex = makeDigitTexture(THREE, glyphIndex, color);
  const material = new THREE.MeshPhongMaterial({ map: tex });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  const light = new THREE.PointLight(0xffffff, 12);
  light.position.set(2, 3, 2);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x505050));

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas as any });
  renderer.setSize(80, 80);

  // Click → shrink feedback + fire handler
  renderer.domElement.addEventListener('click', () => {
    cube.scale.set(0.8, 0.8, 0.8);
    setTimeout(() => cube.scale.set(1, 1, 1), 120);
    onClick();
  });

  // Gentle idle rotation
  const animate = async () => {
    cube.rotation.x += 0.005;
    cube.rotation.y += 0.008;
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    if (gl?.flush) await (gl as any).flush();
    setTimeout(animate, 33); // ~30 fps — less pressure than 60
  };
  animate();
}

/** Convenience: draw a digit cube (glyph index = digit, color from palette). */
function drawNumberButton(a: App, digit: number, onClick: () => void) {
  return drawCubeButton(a, digit, DIGIT_COLORS[digit], onClick);
}

// ─── Calculator builder ─────────────────────────────────────────

export function buildHeterogeneousCalculator(a: App) {
  // Calculator state — same pattern as calculator.ts
  let displayValue = '0';
  let previousValue = '0';
  let operator: string | null = null;
  let shouldReset = false;
  let displayCtx: CvgContext;

  function updateDisplay(value: string) {
    displayValue = value;
    displayCtx.refresh();
  }

  function handleDigit(d: string) {
    if (shouldReset) {
      updateDisplay(d);
      shouldReset = false;
    } else {
      updateDisplay(displayValue === '0' ? d : displayValue + d);
    }
  }

  function handleOperator(op: string) {
    if (operator && !shouldReset) calculate();
    previousValue = displayValue;
    operator = op;
    shouldReset = true;
  }

  function calculate() {
    const prev = parseFloat(previousValue);
    const cur = parseFloat(displayValue);
    if (!operator) return;
    let result: number;
    if (operator === '+') result = prev + cur;
    else if (operator === '-') result = prev - cur;
    else if (operator === '*') result = prev * cur;
    else if (operator === '/') result = cur !== 0 ? prev / cur : NaN;
    else return;
    updateDisplay(isFinite(result) ? String(result) : 'Error');
    operator = null;
    shouldReset = true;
  }

  function clear() {
    previousValue = '0';
    operator = null;
    shouldReset = false;
    updateDisplay('0');
  }

  function backspace() {
    updateDisplay(displayValue.length > 1 ? displayValue.slice(0, -1) : '0');
  }

  function decimal() {
    if (!displayValue.includes('.')) {
      updateDisplay(displayValue + '.');
    }
  }

  a.window({ title: 'Heterogeneous Calculator', width: 540, height: 580, padded: true }, () => {
    a.vbox(() => {
      // ── Display: Cosyne Vector Graphics ──────────────────
      displayCtx = drawDisplay(a, () => displayValue);

      // ── Button grid: Three.js + Fyne widgets ─────────────
      a.grid(4, () => {
        // Row 1 — all Fyne widgets (operators)
        a.button('C',   { onClick: clear });
        a.button('DEL', { onClick: backspace });
        a.button('/',   { onClick: () => handleOperator('/') });
        a.button('*',   { onClick: () => handleOperator('*') });

        // Row 2 — Three.js number cubes + Fyne operator
        drawNumberButton(a, 7, () => handleDigit('7'));
        drawNumberButton(a, 8, () => handleDigit('8'));
        drawNumberButton(a, 9, () => handleDigit('9'));
        a.button('-', { onClick: () => handleOperator('-') });

        // Row 3
        drawNumberButton(a, 4, () => handleDigit('4'));
        drawNumberButton(a, 5, () => handleDigit('5'));
        drawNumberButton(a, 6, () => handleDigit('6'));
        a.button('+', { onClick: () => handleOperator('+') });

        // Row 4
        drawNumberButton(a, 1, () => handleDigit('1'));
        drawNumberButton(a, 2, () => handleDigit('2'));
        drawNumberButton(a, 3, () => handleDigit('3'));
        drawCubeButton(a, 10, 0x27ae60, calculate);  // = (3D cube)

        // Row 5
        drawNumberButton(a, 0, () => handleDigit('0'));
        a.button('.', { onClick: decimal });
        a.spacer();
        a.spacer();
      });
    });
  });
}

// ─── Standalone ─────────────────────────────────────────────────

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Heterogeneous Calculator' }, buildHeterogeneousCalculator);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
