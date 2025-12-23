/** Spherize effect (bulge) */
export function spherize(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - centerX) / radius;
      const dy = (y - centerY) / radius;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let srcX: number, srcY: number;

      if (dist < 1) {
        const factor = Math.pow(dist, strength / 100);
        srcX = Math.round(centerX + dx * factor * radius);
        srcY = Math.round(centerY + dy * factor * radius);
      } else {
        srcX = x;
        srcY = y;
      }

      const dstIdx = (y * width + x) * 4;
      srcX = Math.min(width - 1, Math.max(0, srcX));
      srcY = Math.min(height - 1, Math.max(0, srcY));
      const srcIdx = (srcY * width + srcX) * 4;

      output[dstIdx] = pixels[srcIdx];
      output[dstIdx + 1] = pixels[srcIdx + 1];
      output[dstIdx + 2] = pixels[srcIdx + 2];
      output[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return output;
}
