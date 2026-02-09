/**
 * Tests for SVG XML parser
 */

import { parseSvg, parseViewBox } from '../src/svg/parser';
import * as fs from 'fs';
import * as path from 'path';

const SVG_DIR = path.join(__dirname, 'svg');

describe('parseSvg', () => {
  it('should parse a simple element', () => {
    const node = parseSvg('<svg><circle cx="50" cy="50" r="20"/></svg>');
    expect(node.tag).toBe('svg');
    expect(node.children).toHaveLength(1);
    expect(node.children[0].tag).toBe('circle');
    expect(node.children[0].attrs.cx).toBe('50');
    expect(node.children[0].attrs.cy).toBe('50');
    expect(node.children[0].attrs.r).toBe('20');
  });

  it('should parse nested groups', () => {
    const node = parseSvg('<svg><g fill="red"><circle cx="10" cy="10" r="5"/></g></svg>');
    expect(node.children).toHaveLength(1);
    const g = node.children[0];
    expect(g.tag).toBe('g');
    expect(g.attrs.fill).toBe('red');
    expect(g.children).toHaveLength(1);
    expect(g.children[0].tag).toBe('circle');
  });

  it('should parse self-closing tags', () => {
    const node = parseSvg('<svg><path d="M10,10 L20,20"/></svg>');
    expect(node.children).toHaveLength(1);
    expect(node.children[0].tag).toBe('path');
    expect(node.children[0].attrs.d).toBe('M10,10 L20,20');
  });

  it('should parse attributes with single quotes', () => {
    const node = parseSvg("<svg viewBox='0 0 100 100'></svg>");
    expect(node.attrs.viewBox).toBe('0 0 100 100');
  });

  it('should parse attributes with double quotes', () => {
    const node = parseSvg('<svg viewBox="0 0 100 100"></svg>');
    expect(node.attrs.viewBox).toBe('0 0 100 100');
  });

  it('should strip XML declarations', () => {
    const node = parseSvg('<?xml version="1.0" encoding="UTF-8"?><svg></svg>');
    expect(node.tag).toBe('svg');
  });

  it('should strip comments', () => {
    const node = parseSvg('<svg><!-- comment --><circle cx="10" cy="10" r="5"/></svg>');
    expect(node.children).toHaveLength(1);
    expect(node.children[0].tag).toBe('circle');
  });

  it('should parse text content in desc', () => {
    const node = parseSvg('<svg><desc>A description</desc></svg>');
    expect(node.children).toHaveLength(1);
    expect(node.children[0].tag).toBe('desc');
    expect(node.children[0].text).toBe('A description');
  });

  it('should parse multiple children', () => {
    const node = parseSvg('<svg><circle cx="10" cy="10" r="5"/><rect x="20" y="20" width="30" height="30"/></svg>');
    expect(node.children).toHaveLength(2);
    expect(node.children[0].tag).toBe('circle');
    expect(node.children[1].tag).toBe('rect');
  });

  it('should parse stroke-width and other hyphenated attrs', () => {
    const node = parseSvg('<svg><path stroke-width="2" stroke-linecap="round" d="M0,0"/></svg>');
    const p = node.children[0];
    expect(p.attrs['stroke-width']).toBe('2');
    expect(p.attrs['stroke-linecap']).toBe('round');
  });

  it('should handle xmlns attributes', () => {
    const node = parseSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>');
    expect(node.attrs.xmlns).toBe('http://www.w3.org/2000/svg');
    expect(node.attrs.viewBox).toBe('0 0 100 100');
  });

  it('should return default svg node for empty string', () => {
    const node = parseSvg('');
    expect(node.tag).toBe('svg');
    expect(node.children).toHaveLength(0);
  });

  it('should parse id attributes', () => {
    const node = parseSvg('<svg id="Layer_1"><g id="group1"></g></svg>');
    expect(node.attrs.id).toBe('Layer_1');
    expect(node.children[0].attrs.id).toBe('group1');
  });

  // Test all SVG files in the test directory parse without error
  const svgFiles = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));

  for (const file of svgFiles) {
    it(`should parse ${file} without error`, () => {
      const svgPath = path.join(SVG_DIR, file);
      const content = fs.readFileSync(svgPath, 'utf-8');
      const node = parseSvg(content);
      expect(node.tag).toBe('svg');
    });
  }

  it('should parse heart.svg correctly', () => {
    const content = fs.readFileSync(path.join(SVG_DIR, 'heart.svg'), 'utf-8');
    const node = parseSvg(content);
    expect(node.children).toHaveLength(1);
    expect(node.children[0].tag).toBe('path');
    expect(node.children[0].attrs.fill).toBe('#F00');
    expect(node.children[0].attrs.stroke).toBe('#000');
    expect(node.children[0].attrs.d).toContain('M50,30');
  });

  it('should parse mars.svg with group', () => {
    const content = fs.readFileSync(path.join(SVG_DIR, 'mars.svg'), 'utf-8');
    const node = parseSvg(content);
    // Has a g group with children
    const g = node.children[0];
    expect(g.tag).toBe('g');
    expect(g.attrs['stroke-width']).toBe('9');
    expect(g.attrs.stroke).toBe('#B13');
    expect(g.attrs.fill).toBe('none');
    expect(g.children.length).toBeGreaterThanOrEqual(2);
  });

  it('should parse penrose-staircase.svg with desc and many paths', () => {
    const content = fs.readFileSync(path.join(SVG_DIR, 'penrose-staircase.svg'), 'utf-8');
    const node = parseSvg(content);
    expect(node.attrs.viewBox).toBe('0 0 372 283');
    // Should have at least one group with many path children
    const g = node.children.find(c => c.tag === 'g');
    expect(g).toBeTruthy();
    // desc element
    const desc = node.children.find(c => c.tag === 'desc');
    expect(desc).toBeTruthy();
    expect(desc!.text).toContain('Penrose');
  });

  it('should parse multiline attributes correctly', () => {
    const svg = `<svg viewBox="0 0 100 100">
      <path fill="#FFF" stroke="#000" stroke-linecap="round"
        stroke-linejoin="round" d="M10,10 L20,20"/>
    </svg>`;
    const node = parseSvg(svg);
    const p = node.children[0];
    expect(p.attrs.fill).toBe('#FFF');
    expect(p.attrs.stroke).toBe('#000');
    expect(p.attrs['stroke-linecap']).toBe('round');
    expect(p.attrs['stroke-linejoin']).toBe('round');
    expect(p.attrs.d).toBe('M10,10 L20,20');
  });
});

describe('parseViewBox', () => {
  it('should parse "0 0 100 100"', () => {
    expect(parseViewBox('0 0 100 100')).toEqual({ minX: 0, minY: 0, width: 100, height: 100 });
  });

  it('should parse comma-separated', () => {
    expect(parseViewBox('0,0,200,300')).toEqual({ minX: 0, minY: 0, width: 200, height: 300 });
  });

  it('should parse with offset', () => {
    expect(parseViewBox('10 20 300 400')).toEqual({ minX: 10, minY: 20, width: 300, height: 400 });
  });

  it('should return null for invalid', () => {
    expect(parseViewBox('invalid')).toBeNull();
    expect(parseViewBox('0 0')).toBeNull();
  });
});
