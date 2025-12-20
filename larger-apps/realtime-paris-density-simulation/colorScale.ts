// Color scale mapping for density visualization
// Maps density values (0-100) to RGBA colors in a smooth gradient

interface ColorStop {
  density: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

// Vibrant gradient: blue → green → yellow → orange → red
const colorStops: ColorStop[] = [
  { density: 0, r: 0, g: 100, b: 200, a: 200 },      // Blue
  { density: 25, r: 0, g: 180, b: 100, a: 200 },     // Cyan-Green
  { density: 50, r: 100, g: 200, b: 0, a: 220 },     // Green
  { density: 65, r: 200, g: 150, b: 0, a: 230 },     // Amber
  { density: 80, r: 255, g: 100, b: 0, a: 240 },     // Orange
  { density: 100, r: 255, g: 0, b: 0, a: 255 }       // Red
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function densityToRGBA(density: number, opacityMul: number = 1.0): [number, number, number, number] {
  density = Math.max(0, Math.min(100, density));

  // Find the two color stops to interpolate between
  let lower = colorStops[0];
  let upper = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (density >= colorStops[i].density && density <= colorStops[i + 1].density) {
      lower = colorStops[i];
      upper = colorStops[i + 1];
      break;
    }
  }

  // Calculate interpolation factor
  const range = upper.density - lower.density;
  const t = range === 0 ? 0 : (density - lower.density) / range;

  // Interpolate RGBA values
  const r = Math.round(lerp(lower.r, upper.r, t));
  const g = Math.round(lerp(lower.g, upper.g, t));
  const b = Math.round(lerp(lower.b, upper.b, t));
  const a = Math.round(lerp(lower.a, upper.a, t * opacityMul));

  return [r, g, b, Math.max(40, Math.min(200, a))];
}

export function densityToElevation(density: number): number {
  // Apply non-linear scaling for dramatic elevation variations
  const normalized = density / 100;
  return Math.pow(normalized, 0.6) * 600;
}

export function densityToCssColor(density: number, opacityMul: number = 1.0): string {
  const [r, g, b, a] = densityToRGBA(density, opacityMul);
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}
