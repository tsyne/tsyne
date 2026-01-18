/**
 * Tests for Cosyne 3D Material system
 */

import {
  Material,
  MaterialProperties,
  parseColor,
  colorToHex,
  lerpColor,
  applyLighting,
  Materials,
} from '../../src/material';

describe('Cosyne 3D Material', () => {
  describe('parseColor', () => {
    test('parses 6-digit hex', () => {
      const color = parseColor('#ff0000');
      expect(color.r).toBe(255);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
      expect(color.a).toBe(255);
    });

    test('parses 3-digit hex', () => {
      const color = parseColor('#f00');
      expect(color.r).toBe(255);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    });

    test('parses 8-digit hex with alpha', () => {
      const color = parseColor('#ff000080');
      expect(color.r).toBe(255);
      expect(color.a).toBe(128);
    });

    test('parses hex without hash', () => {
      const color = parseColor('00ff00');
      expect(color.g).toBe(255);
    });

    test('parses named colors', () => {
      expect(parseColor('red').r).toBe(255);
      expect(parseColor('green').g).toBe(255);
      expect(parseColor('blue').b).toBe(255);
      expect(parseColor('white').r).toBe(255);
      expect(parseColor('black').r).toBe(0);
    });

    test('handles case insensitivity', () => {
      expect(parseColor('RED').r).toBe(255);
      expect(parseColor('Green').g).toBe(255);
    });
  });

  describe('colorToHex', () => {
    test('converts RGB to hex', () => {
      expect(colorToHex({ r: 255, g: 0, b: 0, a: 255 })).toBe('#ff0000');
      expect(colorToHex({ r: 0, g: 255, b: 0, a: 255 })).toBe('#00ff00');
      expect(colorToHex({ r: 0, g: 0, b: 255, a: 255 })).toBe('#0000ff');
    });

    test('clamps values', () => {
      expect(colorToHex({ r: 300, g: -10, b: 128, a: 255 })).toBe('#ff0080');
    });
  });

  describe('lerpColor', () => {
    test('interpolates between colors', () => {
      const a = { r: 0, g: 0, b: 0, a: 255 };
      const b = { r: 255, g: 255, b: 255, a: 255 };
      const mid = lerpColor(a, b, 0.5);
      expect(mid.r).toBeCloseTo(127.5);
      expect(mid.g).toBeCloseTo(127.5);
      expect(mid.b).toBeCloseTo(127.5);
    });

    test('returns start at t=0', () => {
      const a = { r: 100, g: 100, b: 100, a: 255 };
      const b = { r: 200, g: 200, b: 200, a: 255 };
      const result = lerpColor(a, b, 0);
      expect(result.r).toBe(100);
    });

    test('returns end at t=1', () => {
      const a = { r: 100, g: 100, b: 100, a: 255 };
      const b = { r: 200, g: 200, b: 200, a: 255 };
      const result = lerpColor(a, b, 1);
      expect(result.r).toBe(200);
    });
  });

  describe('applyLighting', () => {
    test('full lighting returns close to original', () => {
      const base = { r: 200, g: 100, b: 50, a: 255 };
      const lit = applyLighting(base, 1.0, 0);
      expect(lit.r).toBeCloseTo(200);
      expect(lit.g).toBeCloseTo(100);
      expect(lit.b).toBeCloseTo(50);
    });

    test('zero lighting returns ambient only', () => {
      const base = { r: 200, g: 100, b: 50, a: 255 };
      const ambient = 0.2;
      const lit = applyLighting(base, 0, ambient);
      expect(lit.r).toBeCloseTo(200 * ambient);
      expect(lit.g).toBeCloseTo(100 * ambient);
      expect(lit.b).toBeCloseTo(50 * ambient);
    });
  });

  describe('Material class', () => {
    describe('creation', () => {
      test('creates with defaults', () => {
        const m = new Material();
        expect(m.color).toBe('#888888');
        expect(m.shininess).toBe(0.5);
        expect(m.opacity).toBe(1.0);
      });

      test('creates with properties', () => {
        const m = new Material({
          color: '#ff0000',
          shininess: 0.8,
          opacity: 0.5,
        });
        expect(m.color).toBe('#ff0000');
        expect(m.shininess).toBe(0.8);
        expect(m.opacity).toBe(0.5);
      });

      test('default factory creates valid material', () => {
        const m = Material.default();
        expect(m).toBeInstanceOf(Material);
      });
    });

    describe('properties', () => {
      test('color can be set', () => {
        const m = new Material();
        m.color = '#00ff00';
        expect(m.color).toBe('#00ff00');
      });

      test('shininess is clamped', () => {
        const m = new Material();
        m.shininess = 1.5;
        expect(m.shininess).toBe(1);
        m.shininess = -0.5;
        expect(m.shininess).toBe(0);
      });

      test('opacity is clamped', () => {
        const m = new Material();
        m.opacity = 1.5;
        expect(m.opacity).toBe(1);
        m.opacity = -0.5;
        expect(m.opacity).toBe(0);
      });

      test('emissive can be set', () => {
        const m = new Material();
        m.emissive = '#ff8800';
        m.emissiveIntensity = 0.8;
        expect(m.emissive).toBe('#ff8800');
        expect(m.emissiveIntensity).toBe(0.8);
      });

      test('boolean properties work', () => {
        const m = new Material();
        m.unlit = true;
        m.wireframe = true;
        m.doubleSided = true;
        m.flatShading = true;
        expect(m.unlit).toBe(true);
        expect(m.wireframe).toBe(true);
        expect(m.doubleSided).toBe(true);
        expect(m.flatShading).toBe(true);
      });
    });

    describe('methods', () => {
      test('clone creates copy', () => {
        const m = new Material({ color: '#ff0000', shininess: 0.9 });
        const c = m.clone();
        expect(c.color).toBe('#ff0000');
        expect(c.shininess).toBe(0.9);
        c.color = '#00ff00';
        expect(m.color).toBe('#ff0000'); // Original unchanged
      });

      test('getParsedColor returns RGBA', () => {
        const m = new Material({ color: '#ff8800' });
        const parsed = m.getParsedColor();
        expect(parsed.r).toBe(255);
        expect(parsed.g).toBe(136);
        expect(parsed.b).toBe(0);
      });

      test('getParsedEmissive returns RGBA', () => {
        const m = new Material({ emissive: '#00ff00' });
        const parsed = m.getParsedEmissive();
        expect(parsed.g).toBe(255);
      });

      test('toProperties returns object', () => {
        const m = new Material({ color: '#ff0000', shininess: 0.7 });
        const props = m.toProperties();
        expect(props.color).toBe('#ff0000');
        expect(props.shininess).toBe(0.7);
      });

      test('setProperties updates material', () => {
        const m = new Material();
        m.setProperties({ color: '#0000ff', opacity: 0.5 });
        expect(m.color).toBe('#0000ff');
        expect(m.opacity).toBe(0.5);
      });

      test('calculateFinalColor applies lighting', () => {
        const m = new Material({ color: '#ffffff', shininess: 0.5 });
        const color = m.calculateFinalColor(1.0, 0, 0);
        expect(color.r).toBeCloseTo(255);
        expect(color.g).toBeCloseTo(255);
        expect(color.b).toBeCloseTo(255);
      });

      test('unlit material ignores lighting', () => {
        const m = new Material({ color: '#ffffff', unlit: true });
        const noLight = m.calculateFinalColor(0, 0, 0);
        const fullLight = m.calculateFinalColor(1, 0, 0);
        expect(noLight.r).toBe(fullLight.r);
      });
    });
  });

  describe('preset Materials', () => {
    test('red creates red material', () => {
      const m = Materials.red();
      expect(m.color).toBe('#ff0000');
    });

    test('green creates green material', () => {
      const m = Materials.green();
      expect(m.color).toBe('#00ff00');
    });

    test('blue creates blue material', () => {
      const m = Materials.blue();
      expect(m.color).toBe('#0000ff');
    });

    test('gold is shiny', () => {
      const m = Materials.gold();
      expect(m.shininess).toBeGreaterThan(0.8);
    });

    test('glass is transparent', () => {
      const m = Materials.glass();
      expect(m.transparent).toBe(true);
      expect(m.opacity).toBeLessThan(0.5);
    });

    test('emissive glows', () => {
      const m = Materials.emissive('#ff0000');
      expect(m.emissiveIntensity).toBeGreaterThan(0);
    });

    test('wireframe is wireframe', () => {
      const m = Materials.wireframe();
      expect(m.wireframe).toBe(true);
    });

    test('unlit is unlit', () => {
      const m = Materials.unlit();
      expect(m.unlit).toBe(true);
    });
  });
});
