/** Oil painting effect using intensity binning */
export function oilPaint(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  levels: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const intensityCount: number[] = new Array(levels).fill(0);
      const avgR: number[] = new Array(levels).fill(0);
      const avgG: number[] = new Array(levels).fill(0);
      const avgB: number[] = new Array(levels).fill(0);

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          const intensity = Math.floor(((pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3) * levels / 256);
          const safeIntensity = Math.min(levels - 1, Math.max(0, intensity));
          intensityCount[safeIntensity]++;
          avgR[safeIntensity] += pixels[idx];
          avgG[safeIntensity] += pixels[idx + 1];
          avgB[safeIntensity] += pixels[idx + 2];
        }
      }

      let maxIndex = 0;
      let maxCount = 0;
      for (let i = 0; i < levels; i++) {
        if (intensityCount[i] > maxCount) {
          maxCount = intensityCount[i];
          maxIndex = i;
        }
      }

      const outIdx = (y * width + x) * 4;
      if (maxCount > 0) {
        output[outIdx] = avgR[maxIndex] / maxCount;
        output[outIdx + 1] = avgG[maxIndex] / maxCount;
        output[outIdx + 2] = avgB[maxIndex] / maxCount;
      } else {
        output[outIdx] = pixels[outIdx];
        output[outIdx + 1] = pixels[outIdx + 1];
        output[outIdx + 2] = pixels[outIdx + 2];
      }
      output[outIdx + 3] = pixels[outIdx + 3];
    }
  }
  return output;
}
