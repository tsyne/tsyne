/** Isolate red channel only */
export function redChannel(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
  }
}
