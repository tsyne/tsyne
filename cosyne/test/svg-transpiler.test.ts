/**
 * Tests for SVG → TypeScript transpiler
 */

import { transpileSvg, transpileSvgToModule } from '../src/svg/transpiler';
import * as fs from 'fs';
import * as path from 'path';

const SVG_DIR = path.join(__dirname, 'svg');

describe('transpileSvgToModule', () => {
  it('should produce valid module structure', () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="red"/></svg>';
    const output = transpileSvgToModule(svg);
    expect(output).toContain("import { svg } from 'cosyne/svg'");
    expect(output).toContain('export function renderSvg');
    expect(output).toContain("viewBox: '0 0 100 100'");
    expect(output).toContain('s.circle(');
  });

  it('should use custom function name', () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"/></svg>';
    const output = transpileSvgToModule(svg, { functionName: 'myHeart' });
    expect(output).toContain('export function myHeart');
  });

  it('should normalize paths in output', () => {
    const svg = '<svg viewBox="0 0 100 100"><path d="M50,30c9-22 42-24 48,0z" fill="#F00"/></svg>';
    const output = transpileSvgToModule(svg);
    // Path should be normalized — no lowercase commands
    expect(output).toContain("d: '");
    expect(output).not.toMatch(/d: '[^']*[a-z]/); // no lowercase in d value
    expect(output).toContain('C '); // cubic bezier from normalized c
    expect(output).toContain('Z');
  });

  it('should omit xmlns attribute', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"/></svg>';
    const output = transpileSvgToModule(svg);
    expect(output).not.toContain('xmlns');
  });

  it('should emit groups with callbacks', () => {
    const svg = '<svg viewBox="0 0 100 100"><g fill="red"><circle cx="50" cy="50" r="20"/></g></svg>';
    const output = transpileSvgToModule(svg);
    expect(output).toContain('s.g(');
    expect(output).toContain('() => {');
    expect(output).toContain('s.circle(');
    expect(output).toContain('});');
  });

  it('should handle desc as comment', () => {
    const penrose = fs.readFileSync(path.join(SVG_DIR, 'penrose-staircase.svg'), 'utf-8');
    const output = transpileSvgToModule(penrose);
    expect(output).toContain('// A Penrose Staircase');
  });

  it('should handle stroke attributes with quotes', () => {
    const svg = '<svg viewBox="0 0 100 100"><path d="M0,0 L10,10" stroke-width="2" stroke-linecap="round"/></svg>';
    const output = transpileSvgToModule(svg);
    expect(output).toContain("'stroke-width'");
    expect(output).toContain("'stroke-linecap'");
  });

  it('should keep numeric values unquoted', () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"/></svg>';
    const output = transpileSvgToModule(svg);
    expect(output).toContain('cx: 50');
    expect(output).toContain('r: 20');
  });

  it('should handle heart.svg', () => {
    const heartSvg = fs.readFileSync(path.join(SVG_DIR, 'heart.svg'), 'utf-8');
    const output = transpileSvgToModule(heartSvg, { functionName: 'heartSvg' });
    expect(output).toContain('export function heartSvg');
    expect(output).toContain('s.path(');
    expect(output).toContain("fill: '#F00'");
    expect(output).toContain("stroke: '#000'");
  });

  it('should handle mars.svg with group', () => {
    const marsSvg = fs.readFileSync(path.join(SVG_DIR, 'mars.svg'), 'utf-8');
    const output = transpileSvgToModule(marsSvg);
    expect(output).toContain('s.g(');
    expect(output).toContain('s.path(');
    expect(output).toContain('s.circle(');
  });
});

describe('transpileSvg (inline)', () => {
  it('should produce inline builder calls', () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="red"/></svg>';
    const output = transpileSvg(svg);
    // No imports or function wrapper
    expect(output).not.toContain('import');
    expect(output).not.toContain('export');
    expect(output).toContain('s.circle(');
    expect(output).toContain("fill: 'red'");
  });

  it('should handle multiple elements', () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="10" cy="10" r="5"/><rect x="20" y="20" width="30" height="30"/></svg>';
    const output = transpileSvg(svg);
    expect(output).toContain('s.circle(');
    expect(output).toContain('s.rect(');
  });

  it('should transpile all test SVGs without error', () => {
    const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(SVG_DIR, file), 'utf-8');
      expect(() => transpileSvg(content)).not.toThrow();
      expect(() => transpileSvgToModule(content)).not.toThrow();
    }
  });
});
