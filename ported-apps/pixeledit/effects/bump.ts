/** Bump effect - localized bulge distortion */
export function bump(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  strength: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const factor = strength / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let srcX: number, srcY: number;

      if (dist < radius) {
        // Smooth bump falloff using cosine
        const normalizedDist = dist / radius;
        const bumpFactor = Math.cos(normalizedDist * Math.PI / 2) * factor;
        const scale = 1 - bumpFactor;

        srcX = Math.round(centerX + dx * scale);
        srcY = Math.round(centerY + dy * scale);
      } else {
        srcX = x;
        srcY = y;
      }

      srcX = Math.max(0, Math.min(width - 1, srcX));
      srcY = Math.max(0, Math.min(height - 1, srcY));

      const dstIdx = (y * width + x) * 4;
      const srcIdx = (srcY * width + srcX) * 4;

      output[dstIdx] = pixels[srcIdx];
      output[dstIdx + 1] = pixels[srcIdx + 1];
      output[dstIdx + 2] = pixels[srcIdx + 2];
      output[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  return output;
}
