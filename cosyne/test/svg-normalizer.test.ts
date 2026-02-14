/**
 * Tests for SVG path normalizer
 */

import { parsePath, normalizeCommands, normalizePath, serializeCommands } from '../src/cvg/normalizer';
import type { PathCommand, NormalizedCommand } from '../src/cvg/types';

describe('parsePath', () => {
  it('should parse simple absolute commands', () => {
    const cmds = parsePath('M 10 10 L 20 20 Z');
    expect(cmds).toEqual([
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [20, 20] },
      { type: 'Z', args: [] },
    ]);
  });

  it('should parse comma-separated coordinates', () => {
    const cmds = parsePath('M10,10 L20,20');
    expect(cmds).toEqual([
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [20, 20] },
    ]);
  });

  it('should parse negative numbers as separators', () => {
    const cmds = parsePath('M50,30c9-22 42-24 48,0');
    expect(cmds).toEqual([
      { type: 'M', args: [50, 30] },
      { type: 'c', args: [9, -22, 42, -24, 48, 0] },
    ]);
  });

  it('should handle implicit L after M', () => {
    const cmds = parsePath('M 10 10 20 20 30 30');
    expect(cmds).toEqual([
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [20, 20] },
      { type: 'L', args: [30, 30] },
    ]);
  });

  it('should handle implicit l after m', () => {
    const cmds = parsePath('m 10 10 5 5 3 3');
    expect(cmds).toEqual([
      { type: 'm', args: [10, 10] },
      { type: 'l', args: [5, 5] },
      { type: 'l', args: [3, 3] },
    ]);
  });

  it('should parse arc commands', () => {
    const cmds = parsePath('M23,57A27,27 0 1 0 23,44');
    expect(cmds).toEqual([
      { type: 'M', args: [23, 57] },
      { type: 'A', args: [27, 27, 0, 1, 0, 23, 44] },
    ]);
  });

  it('should parse relative arc commands', () => {
    const cmds = parsePath('M65,20a15,15,0,1,1,15,15');
    expect(cmds).toEqual([
      { type: 'M', args: [65, 20] },
      { type: 'a', args: [15, 15, 0, 1, 1, 15, 15] },
    ]);
  });

  it('should parse repeated cubic bezier commands', () => {
    const cmds = parsePath('M50,30c9-22 42-24 48,0c5,40-40,40-48,65');
    expect(cmds).toEqual([
      { type: 'M', args: [50, 30] },
      { type: 'c', args: [9, -22, 42, -24, 48, 0] },
      { type: 'c', args: [5, 40, -40, 40, -48, 65] },
    ]);
  });

  it('should parse Z and z', () => {
    const cmds = parsePath('M0,0 L10,0 L10,10 z');
    expect(cmds).toEqual([
      { type: 'M', args: [0, 0] },
      { type: 'L', args: [10, 0] },
      { type: 'L', args: [10, 10] },
      { type: 'z', args: [] },
    ]);
  });

  it('should parse H and V commands', () => {
    const cmds = parsePath('M0,0 H10 V20');
    expect(cmds).toEqual([
      { type: 'M', args: [0, 0] },
      { type: 'H', args: [10] },
      { type: 'V', args: [20] },
    ]);
  });

  it('should parse decimal numbers', () => {
    const cmds = parsePath('M 0.5 1.5 L 2.25 3.75');
    expect(cmds).toEqual([
      { type: 'M', args: [0.5, 1.5] },
      { type: 'L', args: [2.25, 3.75] },
    ]);
  });

  it('should parse heart.svg path', () => {
    const d = 'M50,30c9-22 42-24 48,0c5,40-40,40-48,65c-8-25-54-25-48-65c 6-24 39-22 48,0 z';
    const cmds = parsePath(d);
    expect(cmds.length).toBe(6); // M, c, c, c, c, z
    expect(cmds[0]).toEqual({ type: 'M', args: [50, 30] });
    expect(cmds[5]).toEqual({ type: 'z', args: [] });
  });

  it('should parse star.svg path', () => {
    const d = 'M50,3l12,36h38l-30,22l11,36l-31-21l-31,21l11-36l-30-22h38z';
    const cmds = parsePath(d);
    expect(cmds[0]).toEqual({ type: 'M', args: [50, 3] });
    // After M, the 'l' starts a series of relative lines
    expect(cmds[1]).toEqual({ type: 'l', args: [12, 36] });
  });

  it('should handle empty string', () => {
    expect(parsePath('')).toEqual([]);
  });

  it('should parse S command', () => {
    const cmds = parsePath('M10,80 C40,10 65,10 95,80 S150,150 180,80');
    expect(cmds).toHaveLength(3);
    expect(cmds[2].type).toBe('S');
    expect(cmds[2].args).toEqual([150, 150, 180, 80]);
  });

  it('should parse Q command', () => {
    const cmds = parsePath('M10,80 Q95,10 180,80');
    expect(cmds).toHaveLength(2);
    expect(cmds[1].type).toBe('Q');
    expect(cmds[1].args).toEqual([95, 10, 180, 80]);
  });
});

describe('normalizeCommands', () => {
  it('should pass through absolute M/L/C/Z', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [20, 20] },
      { type: 'C', args: [30, 10, 40, 20, 50, 30] },
      { type: 'Z', args: [] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [20, 20] },
      { type: 'C', args: [30, 10, 40, 20, 50, 30] },
      { type: 'Z', args: [] },
    ]);
  });

  it('should convert relative l to absolute L', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 10] },
      { type: 'l', args: [5, 5] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [15, 15] },
    ]);
  });

  it('should convert relative m to absolute M', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 10] },
      { type: 'm', args: [5, 5] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [10, 10] },
      { type: 'M', args: [15, 15] },
    ]);
  });

  it('should convert H to L', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [0, 10] },
      { type: 'H', args: [20] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [0, 10] },
      { type: 'L', args: [20, 10] },
    ]);
  });

  it('should convert V to L', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 0] },
      { type: 'V', args: [20] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [10, 0] },
      { type: 'L', args: [10, 20] },
    ]);
  });

  it('should convert relative h to absolute L', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 20] },
      { type: 'h', args: [5] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [10, 20] },
      { type: 'L', args: [15, 20] },
    ]);
  });

  it('should convert relative v to absolute L', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 20] },
      { type: 'v', args: [5] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [10, 20] },
      { type: 'L', args: [10, 25] },
    ]);
  });

  it('should convert relative c to absolute C', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [50, 30] },
      { type: 'c', args: [9, -22, 42, -24, 48, 0] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [50, 30] },
      { type: 'C', args: [59, 8, 92, 6, 98, 30] },
    ]);
  });

  it('should convert Q to C (quadratic to cubic)', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 80] },
      { type: 'Q', args: [95, 10, 180, 80] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toHaveLength(2);
    expect(result[1].type).toBe('C');
    // Verify cubic endpoints: should end at (180, 80)
    expect(result[1].args[4]).toBeCloseTo(180);
    expect(result[1].args[5]).toBeCloseTo(80);
    // cp1 = (10, 80) + 2/3 * ((95, 10) - (10, 80)) = (10 + 56.67, 80 - 46.67) ≈ (66.67, 33.33)
    expect(result[1].args[0]).toBeCloseTo(66.6667, 2);
    expect(result[1].args[1]).toBeCloseTo(33.3333, 2);
  });

  it('should convert S to C (smooth cubic)', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 80] },
      { type: 'C', args: [40, 10, 65, 10, 95, 80] },
      { type: 'S', args: [150, 150, 180, 80] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toHaveLength(3);
    expect(result[2].type).toBe('C');
    // First control point should be reflection of (65,10) through (95,80): (125, 150)
    expect(result[2].args[0]).toBeCloseTo(125);
    expect(result[2].args[1]).toBeCloseTo(150);
    // Endpoint at (180, 80)
    expect(result[2].args[4]).toBeCloseTo(180);
    expect(result[2].args[5]).toBeCloseTo(80);
  });

  it('should convert degenerate arc (zero radius) to L', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 10] },
      { type: 'A', args: [0, 0, 0, 1, 0, 20, 20] },
    ];
    const result = normalizeCommands(cmds);
    expect(result).toEqual([
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [20, 20] },
    ]);
  });

  it('should convert arc to cubic bezier segments', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [23, 57] },
      { type: 'A', args: [27, 27, 0, 1, 0, 23, 44] },
    ];
    const result = normalizeCommands(cmds);
    // Should produce M + multiple C commands
    expect(result[0]).toEqual({ type: 'M', args: [23, 57] });
    expect(result.length).toBeGreaterThan(2);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].type).toBe('C');
    }
    // Last C should end near (23, 44)
    const last = result[result.length - 1];
    expect(last.args[4]).toBeCloseTo(23, 0);
    expect(last.args[5]).toBeCloseTo(44, 0);
  });

  it('should handle relative arc', () => {
    // poi.svg: M65,20a15,15,0,1,1,15,15
    const cmds: PathCommand[] = [
      { type: 'M', args: [65, 20] },
      { type: 'a', args: [15, 15, 0, 1, 1, 15, 15] },
    ];
    const result = normalizeCommands(cmds);
    expect(result[0]).toEqual({ type: 'M', args: [65, 20] });
    // Should end at (65+15, 20+15) = (80, 35)
    const last = result[result.length - 1];
    expect(last.args[4]).toBeCloseTo(80, 0);
    expect(last.args[5]).toBeCloseTo(35, 0);
  });

  it('should reset current point on Z', () => {
    const cmds: PathCommand[] = [
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [20, 20] },
      { type: 'Z', args: [] },
      { type: 'l', args: [5, 5] },  // relative from subpath start (10,10)
    ];
    const result = normalizeCommands(cmds);
    expect(result[3]).toEqual({ type: 'L', args: [15, 15] });
  });
});

describe('serializeCommands', () => {
  it('should serialize M/L/Z', () => {
    const cmds: NormalizedCommand[] = [
      { type: 'M', args: [10, 10] },
      { type: 'L', args: [20, 20] },
      { type: 'Z', args: [] },
    ];
    expect(serializeCommands(cmds)).toBe('M 10 10 L 20 20 Z');
  });

  it('should serialize C with decimal precision', () => {
    const cmds: NormalizedCommand[] = [
      { type: 'C', args: [66.6667, 33.3333, 123.3333, 126.6667, 180, 80] },
    ];
    const s = serializeCommands(cmds);
    expect(s).toContain('C');
    expect(s).toContain('66.6667');
    expect(s).toContain('180');
  });

  it('should round integer values cleanly', () => {
    const cmds: NormalizedCommand[] = [
      { type: 'L', args: [10.0000, 20.0000] },
    ];
    expect(serializeCommands(cmds)).toBe('L 10 20');
  });
});

describe('normalizePath (end-to-end)', () => {
  it('should normalize simple absolute path', () => {
    expect(normalizePath('M 10 10 L 20 20 Z')).toBe('M 10 10 L 20 20 Z');
  });

  it('should normalize relative to absolute', () => {
    expect(normalizePath('M 10 10 l 5 5')).toBe('M 10 10 L 15 15');
  });

  it('should normalize H/V to L', () => {
    expect(normalizePath('M 0 0 H 10 V 20')).toBe('M 0 0 L 10 0 L 10 20');
  });

  it('should normalize implicit L after M', () => {
    expect(normalizePath('M 10 10 20 20')).toBe('M 10 10 L 20 20');
  });

  it('should normalize heart.svg path without error', () => {
    const d = 'M50,30c9-22 42-24 48,0c5,40-40,40-48,65c-8-25-54-25-48-65c 6-24 39-22 48,0 z';
    const result = normalizePath(d);
    expect(result).toContain('M 50 30');
    expect(result).toContain('C ');
    expect(result).toContain('Z');
    // Should not contain any lowercase commands
    expect(result).not.toMatch(/[a-z]/);
  });

  it('should normalize copyleft.svg arcs', () => {
    const d = 'M23,57A27,27 0 1 0 23,44h13A15,15 0 1 1 36,57Z';
    const result = normalizePath(d);
    // Should be all uppercase M/L/C/Z
    expect(result).not.toMatch(/[a-z]/);
    expect(result).toContain('M 23 57');
    expect(result).toContain('Z');
  });

  it('should normalize star.svg path', () => {
    const d = 'M50,3l12,36h38l-30,22l11,36l-31-21l-31,21l11-36l-30-22h38z';
    const result = normalizePath(d);
    expect(result).not.toMatch(/[a-z]/);
    expect(result).toContain('M 50 3');
  });

  it('should normalize mars.svg paths', () => {
    const d1 = 'M71,8h22v22';
    const result1 = normalizePath(d1);
    expect(result1).toBe('M 71 8 L 93 8 L 93 30');

    const d2 = 'M68,33l22-22';
    const result2 = normalizePath(d2);
    expect(result2).toBe('M 68 33 L 90 11');
  });

  it('should normalize iw.svg paths', () => {
    const d = 'M5,19h9l-1,68h-9z';
    const result = normalizePath(d);
    expect(result).not.toMatch(/[a-z]/);
    expect(result).toContain('M 5 19');
  });

  it('should handle round-trip stability', () => {
    // Normalizing an already-normalized path should give the same result
    const d = 'M 10 10 L 20 20 C 30 10 40 20 50 30 Z';
    const first = normalizePath(d);
    const second = normalizePath(first);
    expect(second).toBe(first);
  });

  it('should handle poi.svg spiral arcs', () => {
    const d = 'M65,20a15,15,0,1,1,15,15h-60a15,15,0,1,1,15-15v60a15,15,0,1,1-15-15h60a15,15,0,1,1-15,15z';
    const result = normalizePath(d);
    expect(result).not.toMatch(/[a-z]/);
    expect(result).toContain('M 65 20');
    expect(result).toContain('Z');
  });
});
