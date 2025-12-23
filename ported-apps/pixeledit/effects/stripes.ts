/** Generate stripe pattern */
export function stripes(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  stripeWidth: number,
  angle: number = 0,
  color1: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 },
  color2: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
): void {
  const cos = Math.cos(angle * Math.PI / 180);
  const sin = Math.sin(angle * Math.PI / 180);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Project onto perpendicular to stripe direction
      const pos = x * cos + y * sin;
      const stripe = Math.floor(pos / stripeWidth) % 2 === 0;
      const c = stripe ? color1 : color2;
      pixels[idx] = c.r;
      pixels[idx + 1] = c.g;
      pixels[idx + 2] = c.b;
      pixels[idx + 3] = 255;
    }
  }
}
