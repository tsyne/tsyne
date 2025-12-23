/** Crystallize effect - faceted crystal-like regions */
export function crystallize(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  cellSize: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);

  // Generate crystal centers with some randomness
  const cellsX = Math.ceil(width / cellSize);
  const cellsY = Math.ceil(height / cellSize);
  const centers: Array<{ x: number; y: number; r: number; g: number; b: number }> = [];

  // Use seeded random for consistent results
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      // Crystal centers with triangular offset pattern
      const offsetX = (cy % 2) * (cellSize / 2);
      const x = cx * cellSize + offsetX + random() * cellSize * 0.3;
      const y = cy * cellSize + random() * cellSize * 0.3;
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

  // Assign each pixel to nearest center (Voronoi)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let nearest = centers[0];

      for (const center of centers) {
        const dist = (x - center.x) ** 2 + (y - center.y) ** 2;
        if (dist < minDist) {
          minDist = dist;
          nearest = center;
        }
      }

      const dstIdx = (y * width + x) * 4;
      output[dstIdx] = nearest.r;
      output[dstIdx + 1] = nearest.g;
      output[dstIdx + 2] = nearest.b;
      output[dstIdx + 3] = 255;
    }
  }

  return output;
}
