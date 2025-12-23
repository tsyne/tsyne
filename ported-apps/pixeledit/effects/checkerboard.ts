/** Generate checkerboard pattern */
export function checkerboard(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  squareSize: number,
  color1: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 },
  color2: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const cx = Math.floor(x / squareSize);
      const cy = Math.floor(y / squareSize);
      const isWhite = (cx + cy) % 2 === 0;
      const c = isWhite ? color1 : color2;
      pixels[idx] = c.r;
      pixels[idx + 1] = c.g;
      pixels[idx + 2] = c.b;
      pixels[idx + 3] = 255;
    }
  }
}
