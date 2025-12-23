/** Apply swirl distortion */
export function swirl(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels.length);
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(cx, cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dstI = (y * width + x) * 4;

      if (dist < maxRadius) {
        const angle = Math.atan2(dy, dx);
        const twist = strength * (1 - dist / maxRadius);
        const newAngle = angle + twist;
        const srcX = Math.round(cx + dist * Math.cos(newAngle));
        const srcY = Math.round(cy + dist * Math.sin(newAngle));
        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcI = (srcY * width + srcX) * 4;
          for (let c = 0; c < 4; c++) {
            result[dstI + c] = pixels[srcI + c];
          }
        } else {
          for (let c = 0; c < 4; c++) {
            result[dstI + c] = pixels[dstI + c];
          }
        }
      } else {
        for (let c = 0; c < 4; c++) {
          result[dstI + c] = pixels[dstI + c];
        }
      }
    }
  }
  return result;
}
