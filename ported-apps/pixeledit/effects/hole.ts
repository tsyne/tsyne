/** Hole effect - creates a circular hole/void in the center */
export function hole(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  depth: number = 100
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const centerX = width / 2;
  const centerY = height / 2;
  const factor = depth / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const dstIdx = (y * width + x) * 4;

      if (dist < radius) {
        // Inside hole - stretch from edge
        const normalizedDist = dist / radius;
        const stretchFactor = Math.pow(normalizedDist, 1 / (1 + factor));
        const newDist = radius + (dist - radius) * stretchFactor * 2;

        const angle = Math.atan2(dy, dx);
        const srcX = Math.round(centerX + newDist * Math.cos(angle));
        const srcY = Math.round(centerY + newDist * Math.sin(angle));

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcIdx = (srcY * width + srcX) * 4;
          // Darken towards center
          const darkness = 1 - (1 - normalizedDist) * factor * 0.8;
          output[dstIdx] = Math.round(pixels[srcIdx] * darkness);
          output[dstIdx + 1] = Math.round(pixels[srcIdx + 1] * darkness);
          output[dstIdx + 2] = Math.round(pixels[srcIdx + 2] * darkness);
          output[dstIdx + 3] = pixels[srcIdx + 3];
        } else {
          output[dstIdx] = 0;
          output[dstIdx + 1] = 0;
          output[dstIdx + 2] = 0;
          output[dstIdx + 3] = 255;
        }
      } else {
        output[dstIdx] = pixels[dstIdx];
        output[dstIdx + 1] = pixels[dstIdx + 1];
        output[dstIdx + 2] = pixels[dstIdx + 2];
        output[dstIdx + 3] = pixels[dstIdx + 3];
      }
    }
  }

  return output;
}
