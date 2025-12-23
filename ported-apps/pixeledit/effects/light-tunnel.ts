/** Light tunnel effect - tunnel with light at the end */
export function lightTunnel(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  rotation: number = 0
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const centerX = width / 2;
  const centerY = height / 2;
  const rotRad = rotation * Math.PI / 180;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let angle = Math.atan2(dy, dx) + rotRad;

      const dstIdx = (y * width + x) * 4;

      // Map to tunnel coordinates
      const tunnelDist = radius / (dist + 1);
      const tunnelX = Math.round(centerX + tunnelDist * Math.cos(angle) * width / 4);
      const tunnelY = Math.round(centerY + tunnelDist * Math.sin(angle) * height / 4);

      if (tunnelX >= 0 && tunnelX < width && tunnelY >= 0 && tunnelY < height) {
        const srcIdx = (tunnelY * width + tunnelX) * 4;

        // Add light effect towards center
        const lightFactor = 1 + (1 - Math.min(1, dist / (width / 2))) * 0.5;

        output[dstIdx] = Math.min(255, Math.round(pixels[srcIdx] * lightFactor));
        output[dstIdx + 1] = Math.min(255, Math.round(pixels[srcIdx + 1] * lightFactor));
        output[dstIdx + 2] = Math.min(255, Math.round(pixels[srcIdx + 2] * lightFactor));
        output[dstIdx + 3] = 255;
      } else {
        // Light at the center
        const brightness = Math.max(0, 255 - dist * 2);
        output[dstIdx] = brightness;
        output[dstIdx + 1] = brightness;
        output[dstIdx + 2] = brightness;
        output[dstIdx + 3] = 255;
      }
    }
  }

  return output;
}
