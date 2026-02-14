/**
 * SVG Path Normalizer
 *
 * Converts arbitrary SVG path data into absolute M/L/C/Z commands only,
 * which is all the Go bridge PathRaster supports.
 *
 * Conversions:
 *  - Relative → absolute (all lowercase commands)
 *  - H/V → L
 *  - A → C (arc to cubic bezier approximation)
 *  - S → C (smooth cubic, reflect previous control point)
 *  - Q/T → C (quadratic to cubic promotion)
 *  - Implicit repeated commands (M x y x2 y2 → M x y L x2 y2)
 */

import { PathCommand, NormalizedCommand } from './types';

// Number of parameters each command type expects
const PARAM_COUNTS: Record<string, number> = {
  M: 2, m: 2, L: 2, l: 2, H: 1, h: 1, V: 1, v: 1,
  C: 6, c: 6, S: 4, s: 4, Q: 4, q: 4, T: 2, t: 2,
  A: 7, a: 7, Z: 0, z: 0,
};

/**
 * Tokenize an SVG path `d` string into PathCommands.
 *
 * Handles tricky SVG tokenization:
 *  - Negative signs as implicit separators: "50-30" → [50, -30]
 *  - Commas and whitespace as separators
 *  - Implicit lineTo after moveTo: "M 10 10 20 20" → M(10,10), L(20,20)
 *  - Repeated implicit commands
 */
export function parsePath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  if (!d) return commands;

  // Tokenize: split into command letters and numbers
  const tokens: (string | number)[] = [];
  // Match command letters or numbers (including negative, decimal, scientific notation)
  const tokenRe = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(d)) !== null) {
    if (match[1]) {
      tokens.push(match[1]);
    } else {
      tokens.push(parseFloat(match[2]));
    }
  }

  let i = 0;
  let currentCmd: string | null = null;

  while (i < tokens.length) {
    const token = tokens[i];

    if (typeof token === 'string') {
      currentCmd = token;
      i++;

      if (token === 'Z' || token === 'z') {
        commands.push({ type: token, args: [] });
        currentCmd = null;
        continue;
      }
    }

    // No current command yet and we got a number — shouldn't happen in valid SVG
    if (currentCmd === null) {
      i++;
      continue;
    }

    const paramCount = PARAM_COUNTS[currentCmd];
    if (paramCount === undefined) {
      i++;
      continue;
    }

    if (paramCount === 0) {
      // Z/z already handled above
      continue;
    }

    // Collect required number of numeric arguments
    const args: number[] = [];
    while (args.length < paramCount && i < tokens.length) {
      const t = tokens[i];
      if (typeof t === 'number') {
        args.push(t);
        i++;
      } else {
        break; // Hit next command letter
      }
    }

    if (args.length === paramCount) {
      commands.push({ type: currentCmd, args: [...args] });

      // After M/m, implicit subsequent coordinate pairs are L/l
      if (currentCmd === 'M') currentCmd = 'L';
      else if (currentCmd === 'm') currentCmd = 'l';
    } else {
      // Not enough args — skip
      break;
    }
  }

  return commands;
}

/**
 * Normalize parsed commands to absolute M/L/C/Z only.
 */
export function normalizeCommands(cmds: PathCommand[]): NormalizedCommand[] {
  const result: NormalizedCommand[] = [];
  let cx = 0, cy = 0;          // current point
  let sx = 0, sy = 0;          // subpath start (for Z)
  let lastCp2x = 0, lastCp2y = 0;  // last cubic control point 2 (for S)
  let lastQx = 0, lastQy = 0;      // last quadratic control point (for T)
  let lastCmd = '';

  for (const cmd of cmds) {
    const { type, args } = cmd;
    const isRelative = type === type.toLowerCase() && type !== 'Z' && type !== 'z';
    const abs = type.toUpperCase();

    switch (abs) {
      case 'M': {
        const x = isRelative ? cx + args[0] : args[0];
        const y = isRelative ? cy + args[1] : args[1];
        result.push({ type: 'M', args: [x, y] });
        cx = x; cy = y;
        sx = x; sy = y;
        break;
      }
      case 'L': {
        const x = isRelative ? cx + args[0] : args[0];
        const y = isRelative ? cy + args[1] : args[1];
        result.push({ type: 'L', args: [x, y] });
        cx = x; cy = y;
        break;
      }
      case 'H': {
        const x = isRelative ? cx + args[0] : args[0];
        result.push({ type: 'L', args: [x, cy] });
        cx = x;
        break;
      }
      case 'V': {
        const y = isRelative ? cy + args[0] : args[0];
        result.push({ type: 'L', args: [cx, y] });
        cy = y;
        break;
      }
      case 'C': {
        const ox = isRelative ? cx : 0;
        const oy = isRelative ? cy : 0;
        const cp1x = ox + args[0], cp1y = oy + args[1];
        const cp2x = ox + args[2], cp2y = oy + args[3];
        const x = ox + args[4], y = oy + args[5];
        result.push({ type: 'C', args: [cp1x, cp1y, cp2x, cp2y, x, y] });
        lastCp2x = cp2x; lastCp2y = cp2y;
        cx = x; cy = y;
        break;
      }
      case 'S': {
        // Smooth cubic: reflect previous cp2 through current point
        let cp1x: number, cp1y: number;
        if (lastCmd === 'C' || lastCmd === 'S' || lastCmd === 'c' || lastCmd === 's') {
          cp1x = 2 * cx - lastCp2x;
          cp1y = 2 * cy - lastCp2y;
        } else {
          cp1x = cx;
          cp1y = cy;
        }
        const ox = isRelative ? cx : 0;
        const oy = isRelative ? cy : 0;
        const cp2x = ox + args[0], cp2y = oy + args[1];
        const x = ox + args[2], y = oy + args[3];
        result.push({ type: 'C', args: [cp1x, cp1y, cp2x, cp2y, x, y] });
        lastCp2x = cp2x; lastCp2y = cp2y;
        cx = x; cy = y;
        break;
      }
      case 'Q': {
        // Quadratic → cubic: cp1 = current + 2/3*(qcp - current), cp2 = end + 2/3*(qcp - end)
        const ox = isRelative ? cx : 0;
        const oy = isRelative ? cy : 0;
        const qx = ox + args[0], qy = oy + args[1];
        const x = ox + args[2], y = oy + args[3];
        const cp1x = cx + (2 / 3) * (qx - cx);
        const cp1y = cy + (2 / 3) * (qy - cy);
        const cp2x = x + (2 / 3) * (qx - x);
        const cp2y = y + (2 / 3) * (qy - y);
        result.push({ type: 'C', args: [cp1x, cp1y, cp2x, cp2y, x, y] });
        lastQx = qx; lastQy = qy;
        lastCp2x = cp2x; lastCp2y = cp2y;
        cx = x; cy = y;
        break;
      }
      case 'T': {
        // Smooth quadratic: reflect previous Q control point
        let qx: number, qy: number;
        if (lastCmd === 'Q' || lastCmd === 'T' || lastCmd === 'q' || lastCmd === 't') {
          qx = 2 * cx - lastQx;
          qy = 2 * cy - lastQy;
        } else {
          qx = cx;
          qy = cy;
        }
        const ox = isRelative ? cx : 0;
        const oy = isRelative ? cy : 0;
        const x = ox + args[0], y = oy + args[1];
        const cp1x = cx + (2 / 3) * (qx - cx);
        const cp1y = cy + (2 / 3) * (qy - cy);
        const cp2x = x + (2 / 3) * (qx - x);
        const cp2y = y + (2 / 3) * (qx - y);
        result.push({ type: 'C', args: [cp1x, cp1y, cp2x, cp2y, x, y] });
        lastQx = qx; lastQy = qy;
        cx = x; cy = y;
        break;
      }
      case 'A': {
        const ox = isRelative ? cx : 0;
        const oy = isRelative ? cy : 0;
        const rx = Math.abs(args[0]);
        const ry = Math.abs(args[1]);
        const phi = args[2];
        const largeArc = args[3];
        const sweep = args[4];
        const x = ox + args[5], y = oy + args[6];

        // Degenerate cases
        if (rx === 0 || ry === 0) {
          result.push({ type: 'L', args: [x, y] });
          cx = x; cy = y;
          break;
        }
        if (cx === x && cy === y) {
          break; // Zero-length arc
        }

        const cubics = arcToCubics(cx, cy, rx, ry, phi, largeArc, sweep, x, y);
        for (const c of cubics) {
          result.push({ type: 'C', args: c });
        }
        cx = x; cy = y;
        break;
      }
      case 'Z': {
        result.push({ type: 'Z', args: [] });
        cx = sx; cy = sy;
        break;
      }
    }

    lastCmd = type;
  }

  return result;
}

/**
 * Serialize normalized commands back to a path string.
 */
export function serializeCommands(cmds: NormalizedCommand[]): string {
  const parts: string[] = [];
  for (const cmd of cmds) {
    if (cmd.type === 'Z') {
      parts.push('Z');
    } else {
      const nums = cmd.args.map(n => {
        // Round to 4 decimal places to avoid floating point noise
        const r = Math.round(n * 10000) / 10000;
        return Number.isInteger(r) ? r.toString() : r.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
      });
      parts.push(`${cmd.type} ${nums.join(' ')}`);
    }
  }
  return parts.join(' ');
}

/**
 * Convenience: parse + normalize + serialize an SVG path string.
 */
export function normalizePath(d: string): string {
  return serializeCommands(normalizeCommands(parsePath(d)));
}

// ─── Arc to Cubic Bezier Approximation ───────────────────────────────────────
// Based on SVG spec F.6 (endpoint to center parameterization) and
// the standard approximation of circular arcs with cubic Beziers.

function arcToCubics(
  x1: number, y1: number,
  rxIn: number, ryIn: number,
  phiDeg: number,
  fA: number, fS: number,
  x2: number, y2: number,
): number[][] {
  const phi = (phiDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1') — F.6.5.1
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Step 2: Correct radii — F.6.6.2/3
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;
  let rx2 = rx * rx;
  let ry2 = ry * ry;

  const lambda = x1p2 / rx2 + y1p2 / ry2;
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
    rx2 = rx * rx;
    ry2 = ry * ry;
  }

  // Step 3: Compute (cx', cy') — F.6.5.2
  let num = rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2;
  let den = rx2 * y1p2 + ry2 * x1p2;
  if (num < 0) num = 0;
  let sq = Math.sqrt(num / den);
  if (fA === fS) sq = -sq;

  const cxp = sq * (rx * y1p) / ry;
  const cyp = sq * (-(ry * x1p) / rx);

  // Step 4: Compute (cx, cy) — F.6.5.3
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  // Step 5: Compute theta1 and dtheta — F.6.5.5/6
  function angle(ux: number, uy: number, vx: number, vy: number): number {
    const n = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    if (n === 0) return 0;
    let c = (ux * vx + uy * vy) / n;
    c = Math.max(-1, Math.min(1, c));
    const a = Math.acos(c);
    return (ux * vy - uy * vx < 0) ? -a : a;
  }

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = angle(
    (x1p - cxp) / rx, (y1p - cyp) / ry,
    (-x1p - cxp) / rx, (-y1p - cyp) / ry,
  );

  if (fS === 0 && dtheta > 0) dtheta -= 2 * Math.PI;
  if (fS === 1 && dtheta < 0) dtheta += 2 * Math.PI;

  // Split into segments of at most 90 degrees
  const segments = Math.ceil(Math.abs(dtheta) / (Math.PI / 2));
  const segAngle = dtheta / segments;

  const result: number[][] = [];
  let t = theta1;

  for (let i = 0; i < segments; i++) {
    const t1 = t;
    const t2 = t + segAngle;
    const cubicPts = arcSegmentToCubic(cx, cy, rx, ry, phi, t1, t2);
    result.push(cubicPts);
    t = t2;
  }

  return result;
}

/**
 * Approximate a single arc segment (≤90°) as a cubic Bezier.
 * Returns [cp1x, cp1y, cp2x, cp2y, x, y].
 */
function arcSegmentToCubic(
  cx: number, cy: number,
  rx: number, ry: number,
  phi: number,
  t1: number, t2: number,
): number[] {
  const dt = t2 - t1;
  const alpha = (4 / 3) * Math.tan(dt / 4);

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  function point(theta: number): [number, number] {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return [
      cosPhi * rx * cosT - sinPhi * ry * sinT + cx,
      sinPhi * rx * cosT + cosPhi * ry * sinT + cy,
    ];
  }

  function tangent(theta: number): [number, number] {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return [
      -cosPhi * rx * sinT - sinPhi * ry * cosT,
      -sinPhi * rx * sinT + cosPhi * ry * cosT,
    ];
  }

  const [p1x, p1y] = point(t1);
  const [d1x, d1y] = tangent(t1);
  const [p2x, p2y] = point(t2);
  const [d2x, d2y] = tangent(t2);

  return [
    p1x + alpha * d1x,
    p1y + alpha * d1y,
    p2x - alpha * d2x,
    p2y - alpha * d2y,
    p2x,
    p2y,
  ];
}
