/** Mosaic/stained glass effect with Voronoi cells */
export function mosaic(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  cellSize: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);

  // Generate random cell centers
  const cellsX = Math.ceil(width / cellSize);
  const cellsY = Math.ceil(height / cellSize);
  const centers: Array<{ x: number; y: number; r: number; g: number; b: number }> = [];

  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      const x = cx * cellSize + Math.random() * cellSize;
      const y = cy * cellSize + Math.random() * cellSize;
      const px = Math.min(width - 1, Math.max(0, Math.floor(x)));
      const py = Math.min(height - 1, Math.max(0, Math.floor(y)));
      const idx = (py * width + px) * 4;
      centers.push({
        x, y,
        r: pixels[idx],
        g: pixels[idx + 1],
        b: pixels[idx + 2]
      });
    }
  }

  // For each pixel, find nearest center
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let nearestCenter = centers[0];

      for (const center of centers) {
        const dist = (x - center.x) ** 2 + (y - center.y) ** 2;
        if (dist < minDist) {
          minDist = dist;
          nearestCenter = center;
        }
      }

      const dstIdx = (y * width + x) * 4;
      output[dstIdx] = nearestCenter.r;
      output[dstIdx + 1] = nearestCenter.g;
      output[dstIdx + 2] = nearestCenter.b;
      output[dstIdx + 3] = 255;
    }
  }

  return output;
}
