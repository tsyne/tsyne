/** Add film grain noise */
export function filmGrain(pixels: Uint8ClampedArray, amount: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount;
    pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + noise));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + noise));
  }
}
