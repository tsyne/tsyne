/**
 * Tests for SVG rendering utilities
 */

import { renderSVGToBase64, createCompositeSVG, batchRenderSVGs, clearCache, getCacheStats } from './svg-renderer';
import * as fs from 'fs';
import * as path from 'path';

describe('SVG Renderer', () => {
  const testSVGPath = path.join(__dirname, 'test-circle.svg');
  const testSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';

  beforeAll(() => {
    // Create a test SVG file
    fs.writeFileSync(testSVGPath, testSVG);
  });

  afterAll(() => {
    // Clean up test file
    if (fs.existsSync(testSVGPath)) {
      fs.unlinkSync(testSVGPath);
    }
  });

  beforeEach(() => {
    clearCache();
  });

  describe('renderSVGToBase64', () => {
    it('should render SVG to base64 PNG', () => {
      const result = renderSVGToBase64(testSVGPath);

      expect(result).toMatch(/^data:image\/png;base64,/);
      expect(result.length).toBeGreaterThan(100);
    });

    it('should render with specific dimensions', () => {
      const result = renderSVGToBase64(testSVGPath, 50, 50);

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should cache rendered images', () => {
      const result1 = renderSVGToBase64(testSVGPath);
      const result2 = renderSVGToBase64(testSVGPath);

      // Should return the same cached result
      expect(result1).toBe(result2);

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain(`${testSVGPath}:undefined:undefined`);
    });

    it('should cache different sizes separately', () => {
      renderSVGToBase64(testSVGPath, 100, 100);
      renderSVGToBase64(testSVGPath, 50, 50);

      const stats = getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('createCompositeSVG', () => {
    it('should create composite SVG with multiple elements', () => {
      const composite = createCompositeSVG(100, 100, [
        { type: 'rect', attrs: { width: 100, height: 100, fill: '#f0d9b5' } },
        { type: 'circle', attrs: { cx: 50, cy: 50, r: 30, fill: 'blue' } }
      ]);

      expect(composite).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle empty elements array', () => {
      const composite = createCompositeSVG(100, 100, []);

      expect(composite).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('batchRenderSVGs', () => {
    it('should render multiple SVGs', () => {
      const results = batchRenderSVGs([
        { path: testSVGPath },
        { path: testSVGPath, width: 50, height: 50 }
      ]);

      expect(results.size).toBe(2);
      expect(results.get(testSVGPath)).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      renderSVGToBase64(testSVGPath);
      expect(getCacheStats().size).toBe(1);

      clearCache();
      expect(getCacheStats().size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats1 = getCacheStats();
      expect(stats1.size).toBe(0);
      expect(stats1.keys).toEqual([]);

      renderSVGToBase64(testSVGPath);

      const stats2 = getCacheStats();
      expect(stats2.size).toBe(1);
      expect(stats2.keys.length).toBe(1);
    });
  });
});
