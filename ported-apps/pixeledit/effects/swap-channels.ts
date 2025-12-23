/** Swap color channels */
export function swapChannels(
  pixels: Uint8ClampedArray,
  mode: 'rgb-bgr' | 'rgb-gbr' | 'rgb-brg'
): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    switch (mode) {
      case 'rgb-bgr':
        pixels[i] = b; pixels[i + 2] = r;
        break;
      case 'rgb-gbr':
        pixels[i] = g; pixels[i + 1] = b; pixels[i + 2] = r;
        break;
      case 'rgb-brg':
        pixels[i] = b; pixels[i + 1] = r; pixels[i + 2] = g;
        break;
    }
  }
}
