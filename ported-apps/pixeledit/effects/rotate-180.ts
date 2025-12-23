/** Rotate image 180 degrees */
export function rotate180(pixels: Uint8ClampedArray, width: number, height: number): void {
  const halfLength = Math.floor(pixels.length / 8);
  for (let i = 0; i < halfLength; i++) {
    const i1 = i * 4;
    const i2 = pixels.length - 4 - i1;
    for (let c = 0; c < 4; c++) {
      const temp = pixels[i1 + c];
      pixels[i1 + c] = pixels[i2 + c];
      pixels[i2 + c] = temp;
    }
  }
}
