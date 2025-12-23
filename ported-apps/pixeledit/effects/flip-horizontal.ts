/** Flip image horizontally (mirror) */
export function flipHorizontal(pixels: Uint8ClampedArray, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width / 2; x++) {
      const i1 = (y * width + x) * 4;
      const i2 = (y * width + (width - 1 - x)) * 4;
      for (let c = 0; c < 4; c++) {
        const temp = pixels[i1 + c];
        pixels[i1 + c] = pixels[i2 + c];
        pixels[i2 + c] = temp;
      }
    }
  }
}
