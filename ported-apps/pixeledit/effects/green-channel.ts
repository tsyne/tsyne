/** Isolate green channel only */
export function greenChannel(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0;
    pixels[i + 2] = 0;
  }
}
