/** Digital glitch effect */
export function glitch(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number
): void {
  const numGlitches = Math.floor(intensity / 10);
  for (let g = 0; g < numGlitches; g++) {
    const y = Math.floor(Math.random() * height);
    const sliceHeight = Math.floor(Math.random() * 10) + 1;
    const offset = Math.floor((Math.random() - 0.5) * intensity);
    for (let dy = 0; dy < sliceHeight && y + dy < height; dy++) {
      for (let x = 0; x < width; x++) {
        const srcX = (x + offset + width) % width;
        const dstI = ((y + dy) * width + x) * 4;
        const srcI = ((y + dy) * width + srcX) * 4;
        pixels[dstI] = pixels[srcI];
        pixels[dstI + 1] = pixels[srcI + 1];
        pixels[dstI + 2] = pixels[srcI + 2];
      }
    }
  }
}
