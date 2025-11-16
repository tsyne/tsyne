/**
 * SVG to PNG Rendering Utility
 *
 * This module demonstrates how to convert SVG files to PNG format using @resvg/resvg-js
 * and use them in Tsyne applications. This is useful when you need to:
 * - Pre-process SVG files at specific sizes
 * - Create composite images by layering SVGs
 * - Cache rendered images for performance
 *
 * NOTE: In most cases, you should just use Fyne's native SVG support by passing
 * the SVG file path directly to the image widget. This module is only needed for
 * special cases where you need to manipulate SVGs at runtime.
 */

import * as fs from 'fs';
import { Resvg } from '@resvg/resvg-js';

/**
 * Cache for rendered images
 */
const imageCache = new Map<string, string>();

/**
 * Render an SVG file to a base64-encoded PNG
 * @param svgPath Path to the SVG file
 * @param width Target width (optional, maintains aspect ratio)
 * @param height Target height (optional, maintains aspect ratio)
 * @returns Base64-encoded PNG data with data URI prefix
 */
export function renderSVGToBase64(svgPath: string, width?: number, height?: number): string {
  // Check cache first
  const cacheKey = `${svgPath}:${width}:${height}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  // Read SVG file
  const svgBuffer = fs.readFileSync(svgPath);

  // Render using resvg
  const opts: any = {
    fitTo: {
      mode: width && height ? 'width' : 'original',
      value: width || undefined,
    },
  };

  const resvg = new Resvg(svgBuffer, opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Convert to base64
  const base64 = pngBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  // Cache it
  imageCache.set(cacheKey, dataUri);

  return dataUri;
}

/**
 * Create a composite SVG by layering elements
 * @param width Canvas width
 * @param height Canvas height
 * @param elements Array of SVG elements to layer
 * @returns Base64-encoded PNG of the composite
 *
 * @example
 * const composite = createCompositeSVG(100, 100, [
 *   { type: 'rect', attrs: { width: 100, height: 100, fill: '#f0d9b5' } },
 *   { type: 'image', attrs: { href: pieceData, x: 10, y: 10, width: 80, height: 80 } }
 * ]);
 */
export function createCompositeSVG(
  width: number,
  height: number,
  elements: Array<{ type: string; attrs: Record<string, any> }>
): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  for (const element of elements) {
    svg += `<${element.type}`;
    for (const [key, value] of Object.entries(element.attrs)) {
      svg += ` ${key}="${value}"`;
    }
    svg += '/>';
  }

  svg += '</svg>';

  // Render to PNG
  const svgBuffer = Buffer.from(svg, 'utf-8');
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const base64 = pngBuffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

/**
 * Batch render multiple SVG files
 * @param files Array of { path, width?, height? }
 * @returns Map of path to base64 PNG data
 */
export function batchRenderSVGs(
  files: Array<{ path: string; width?: number; height?: number }>
): Map<string, string> {
  const results = new Map<string, string>();

  for (const file of files) {
    const base64 = renderSVGToBase64(file.path, file.width, file.height);
    results.set(file.path, base64);
  }

  return results;
}

/**
 * Clear the image cache
 */
export function clearCache(): void {
  imageCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: imageCache.size,
    keys: Array.from(imageCache.keys())
  };
}
