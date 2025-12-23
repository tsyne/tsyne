/** Generate procedural cloud pattern using Perlin-like noise */
export function clouds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number = 50,
  octaves: number = 4
): void {
  // Simple noise function
  const noise2D = (x: number, y: number, seed: number): number => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  };

  // Interpolated noise
  const smoothNoise = (x: number, y: number, seed: number): number => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;

    const n00 = noise2D(x0, y0, seed);
    const n10 = noise2D(x0 + 1, y0, seed);
    const n01 = noise2D(x0, y0 + 1, seed);
    const n11 = noise2D(x0 + 1, y0 + 1, seed);

    const nx0 = n00 * (1 - fx) + n10 * fx;
    const nx1 = n01 * (1 - fx) + n11 * fx;
    return nx0 * (1 - fy) + nx1 * fy;
  };

  // Fractal noise
  const fractalNoise = (x: number, y: number): number => {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += smoothNoise(x * frequency / scale, y * frequency / scale, i * 100) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const n = fractalNoise(x, y);
      const v = Math.round(n * 255);
      pixels[idx] = v;
      pixels[idx + 1] = v;
      pixels[idx + 2] = v;
      pixels[idx + 3] = 255;
    }
  }
}
