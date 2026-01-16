import {
  LinearScale,
  LogScale,
  SqrtScale,
  PowerScale,
  OrdinalScale,
  scale,
} from '../src/scales';

describe('Scales', () => {
  describe('LinearScale', () => {
    it('should scale values linearly', () => {
      const s = new LinearScale().domain(0, 100).range(0, 500);
      expect(s.scale(0)).toBe(0);
      expect(s.scale(50)).toBe(250);
      expect(s.scale(100)).toBe(500);
    });

    it('should invert values', () => {
      const s = new LinearScale().domain(0, 100).range(0, 500);
      expect(s.invert(0)).toBe(0);
      expect(s.invert(250)).toBe(50);
      expect(s.invert(500)).toBe(100);
    });

    it('should support clamping', () => {
      const s = new LinearScale().domain(0, 100).range(0, 500).setClamp(true);
      expect(s.scale(150)).toBe(500);
      expect(s.scale(-50)).toBe(0);
    });

    it('should generate ticks', () => {
      const s = new LinearScale().domain(0, 100).range(0, 500);
      const ticks = s.ticks(5);
      expect(ticks).toHaveLength(5);
      expect(ticks[0]).toBe(0);
      expect(ticks[4]).toBe(100);
    });

    it('should support fluent API', () => {
      const s = new LinearScale()
        .domain(10, 110)
        .range(50, 550)
        .setClamp(true);
      expect(s.scale(60)).toBe(300);
    });
  });

  describe('LogScale', () => {
    it('should scale logarithmically', () => {
      const s = new LogScale().domain(1, 100).range(0, 500);
      expect(s.scale(1)).toBe(0);
      expect(s.scale(100)).toBe(500);
      const midpoint = s.scale(10);
      expect(midpoint).toBeLessThan(250);
      expect(midpoint).toBeGreaterThan(0);
    });

    it('should invert logarithmic values', () => {
      const s = new LogScale().domain(1, 100).range(0, 500);
      expect(Math.abs(s.invert(0) - 1)).toBeLessThan(0.01);
      expect(Math.abs(s.invert(500) - 100)).toBeLessThan(0.01);
    });

    it('should throw on invalid domain', () => {
      const s = new LogScale();
      expect(() => s.domain(-10, 100)).toThrow();
      expect(() => s.domain(0, 100)).toThrow();
    });

    it('should support custom base', () => {
      const s = new LogScale().domain(1, 1000).range(0, 300).setBase(10);
      expect(s.scale(1)).toBe(0);
      expect(s.scale(10)).toBeCloseTo(100, 1);
      expect(s.scale(100)).toBeCloseTo(200, 1);
      expect(s.scale(1000)).toBe(300);
    });

    it('should generate logarithmic ticks', () => {
      const s = new LogScale().domain(1, 1000).range(0, 300);
      const ticks = s.ticks(4);
      expect(ticks).toHaveLength(4);
      expect(ticks[0]).toBeCloseTo(1, 1);
      expect(ticks[ticks.length - 1]).toBeCloseTo(1000, 1);
    });
  });

  describe('SqrtScale', () => {
    it('should scale with square root', () => {
      const s = new SqrtScale().domain(0, 100).range(0, 500);
      expect(s.scale(0)).toBe(0);
      expect(s.scale(100)).toBe(500);
      const quarter = s.scale(25);
      expect(quarter).toBeGreaterThan(0);
      expect(quarter).toBeLessThan(250);
    });

    it('should invert square root values', () => {
      const s = new SqrtScale().domain(0, 100).range(0, 500);
      expect(s.invert(0)).toBe(0);
      expect(s.invert(500)).toBe(100);
    });

    it('should throw on invalid domain', () => {
      const s = new SqrtScale();
      expect(() => s.domain(-10, 100)).toThrow();
    });

    it('should support clamping', () => {
      const s = new SqrtScale().domain(0, 100).range(0, 500).setClamp(true);
      expect(s.scale(150)).toBe(500);
    });
  });

  describe('PowerScale', () => {
    it('should scale with power function', () => {
      const s = new PowerScale().domain(0, 10).range(0, 100).setExponent(2);
      expect(s.scale(0)).toBe(0);
      expect(s.scale(10)).toBe(100);
      const half = s.scale(5);
      expect(half).toBeLessThan(50);  // Not linear
    });

    it('should support custom exponent', () => {
      const s2 = new PowerScale().domain(0, 10).range(0, 100).setExponent(2);
      const s3 = new PowerScale().domain(0, 10).range(0, 100).setExponent(3);
      expect(s2.scale(5)).toBeGreaterThan(s3.scale(5));
    });

    it('should invert power values', () => {
      const s = new PowerScale().domain(0, 10).range(0, 100).setExponent(2);
      expect(Math.abs(s.invert(100) - 10)).toBeLessThan(0.01);
    });
  });

  describe('OrdinalScale', () => {
    it('should map discrete values', () => {
      const s = new OrdinalScale()
        .setDomain(['a', 'b', 'c'])
        .range(0, 300);
      expect(s.scale('a')).toBeLessThan(s.scale('b'));
      expect(s.scale('b')).toBeLessThan(s.scale('c'));
    });

    it('should return 0 for unmapped values', () => {
      const s = new OrdinalScale()
        .setDomain(['a', 'b', 'c'])
        .range(0, 300);
      expect(s.scale('d')).toBe(0);
    });

    it('should calculate bandwidth', () => {
      const s = new OrdinalScale()
        .setDomain(['a', 'b', 'c'])
        .range(0, 300)
        .setPadding(0.1);
      expect(s.bandwidth()).toBeGreaterThan(0);
      expect(s.bandwidth()).toBeLessThan(100);
    });

    it('should support padding', () => {
      const noPad = new OrdinalScale()
        .setDomain(['a', 'b', 'c'])
        .range(0, 300)
        .setPadding(0);
      const withPad = new OrdinalScale()
        .setDomain(['a', 'b', 'c'])
        .range(0, 300)
        .setPadding(0.5);
      expect(noPad.bandwidth()).toBeGreaterThan(withPad.bandwidth());
    });

    it('should return domain ticks', () => {
      const domain = ['a', 'b', 'c'];
      const s = new OrdinalScale().setDomain(domain);
      expect(s.ticks()).toEqual(domain);
    });

    it('should support numeric domains', () => {
      const s = new OrdinalScale()
        .setDomain([1, 2, 3])
        .range(0, 300);
      expect(s.scale(1)).toBeLessThan(s.scale(2));
    });
  });

  describe('Scale factory', () => {
    it('should create linear scale', () => {
      const s = scale('linear');
      expect(s).toBeInstanceOf(LinearScale);
    });

    it('should create log scale', () => {
      const s = scale('log');
      expect(s).toBeInstanceOf(LogScale);
    });

    it('should create sqrt scale', () => {
      const s = scale('sqrt');
      expect(s).toBeInstanceOf(SqrtScale);
    });

    it('should create power scale', () => {
      const s = scale('power');
      expect(s).toBeInstanceOf(PowerScale);
    });

    it('should create ordinal scale', () => {
      const s = scale('ordinal');
      expect(s).toBeInstanceOf(OrdinalScale);
    });
  });
});
