/** Displacement map effect - distort using luminance of displacement source */
export function displacementMap(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  mapPixels: Uint8ClampedArray,
  scaleX: number,
  scaleY: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Get displacement from map (using red for X, green for Y)
      const mapR = mapPixels[idx];
      const mapG = mapPixels[idx + 1];

      // Map 0-255 to -1 to 1
      const dispX = (mapR / 127.5 - 1) * scaleX;
      const dispY = (mapG / 127.5 - 1) * scaleY;

      const srcX = Math.round(x + dispX);
      const srcY = Math.round(y + dispY);

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4;
        output[idx] = pixels[srcIdx];
        output[idx + 1] = pixels[srcIdx + 1];
        output[idx + 2] = pixels[srcIdx + 2];
        output[idx + 3] = pixels[srcIdx + 3];
      } else {
        output[idx] = pixels[idx];
        output[idx + 1] = pixels[idx + 1];
        output[idx + 2] = pixels[idx + 2];
        output[idx + 3] = pixels[idx + 3];
      }
    }
  }

  return output;
}

/** Generate a simple noise displacement map */
export function generateNoiseMap(width: number, height: number, scale: number): Uint8ClampedArray {
  const map = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Perlin-like noise using sine
      const nx = Math.sin(x * scale / 10) * 127 + 128;
      const ny = Math.sin(y * scale / 10) * 127 + 128;
      map[idx] = nx;
      map[idx + 1] = ny;
      map[idx + 2] = 128;
      map[idx + 3] = 255;
    }
  }

  return map;
}
