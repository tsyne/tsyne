/**
 * Shared utilities for fractal visualization apps
 *
 * Common color palettes and base rendering infrastructure.
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 */

export type RGBA = [number, number, number, number];
export type ColorPalette = (iteration: number, maxIter: number) => RGBA;

/** Color palettes for fractal rendering */
export const palettes: Record<string, ColorPalette> = {
  classic: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const t = iter / maxIter;
    return [
      Math.floor(9 * (1 - t) * t * t * t * 255),
      Math.floor(15 * (1 - t) * (1 - t) * t * t * 255),
      Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255),
      255
    ];
  },
  fire: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const t = iter / maxIter;
    return [
      Math.min(255, Math.floor(t * 3 * 255)),
      Math.min(255, Math.floor(Math.max(0, t * 3 - 1) * 255)),
      Math.min(255, Math.floor(Math.max(0, t * 3 - 2) * 255)),
      255
    ];
  },
  ice: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const t = iter / maxIter;
    return [
      Math.floor(t * 64),
      Math.floor(t * 192),
      Math.min(255, Math.floor(t * 2 * 255)),
      255
    ];
  },
  rainbow: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const h = (iter / maxIter) * 360;
    const c = 1, x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255), 255];
  },
  ocean: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const t = iter / maxIter;
    return [Math.floor(t * 32), Math.floor(64 + t * 128), Math.floor(128 + t * 127), 255];
  },
  psychedelic: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const t = iter / maxIter;
    const phase = t * Math.PI * 2;
    return [
      Math.floor(128 + 127 * Math.sin(phase)),
      Math.floor(128 + 127 * Math.sin(phase + 2.09)),
      Math.floor(128 + 127 * Math.sin(phase + 4.18)),
      255
    ];
  },
  grayscale: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const v = Math.floor((iter / maxIter) * 255);
    return [v, v, v, 255];
  },
  copper: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const t = iter / maxIter;
    return [
      Math.floor(128 + t * 127),
      Math.floor(64 + t * 96),
      Math.floor(t * 64),
      255
    ];
  }
};

export const paletteNames = Object.keys(palettes);

/** Base interface for fractal iteration functions */
export type FractalFunction = (cx: number, cy: number, maxIter: number, ...params: number[]) => number;

/** Standard Mandelbrot iteration */
export function mandelbrot(cx: number, cy: number, maxIter: number): number {
  let x = 0, y = 0, iter = 0;
  while (x * x + y * y <= 4 && iter < maxIter) {
    const xTemp = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xTemp;
    iter++;
  }
  return iter;
}

/** Julia set iteration - c is the constant parameter */
export function julia(cx: number, cy: number, maxIter: number, cr: number, ci: number): number {
  let x = cx, y = cy, iter = 0;
  while (x * x + y * y <= 4 && iter < maxIter) {
    const xTemp = x * x - y * y + cr;
    y = 2 * x * y + ci;
    x = xTemp;
    iter++;
  }
  return iter;
}

/** Burning Ship fractal - uses absolute values */
export function burningShip(cx: number, cy: number, maxIter: number): number {
  let x = 0, y = 0, iter = 0;
  while (x * x + y * y <= 4 && iter < maxIter) {
    const xTemp = x * x - y * y + cx;
    y = Math.abs(2 * x * y) + cy;
    x = Math.abs(xTemp);
    iter++;
  }
  return iter;
}

/** Tricorn (Mandelbar) - conjugate Mandelbrot */
export function tricorn(cx: number, cy: number, maxIter: number): number {
  let x = 0, y = 0, iter = 0;
  while (x * x + y * y <= 4 && iter < maxIter) {
    const xTemp = x * x - y * y + cx;
    y = -2 * x * y + cy; // Conjugate: negate imaginary
    x = xTemp;
    iter++;
  }
  return iter;
}

/** Newton fractal for z^3 - 1 = 0 */
export function newton(cx: number, cy: number, maxIter: number): number {
  let zr = cx, zi = cy;
  const tolerance = 0.0001;

  for (let iter = 0; iter < maxIter; iter++) {
    const zr2 = zr * zr, zi2 = zi * zi;
    const zr3 = zr * (zr2 - 3 * zi2);
    const zi3 = zi * (3 * zr2 - zi2);

    // f(z) = z^3 - 1
    const fr = zr3 - 1, fi = zi3;

    // f'(z) = 3z^2
    const dfr = 3 * (zr2 - zi2), dfi = 6 * zr * zi;

    // Newton step: z = z - f(z)/f'(z)
    const denom = dfr * dfr + dfi * dfi;
    if (denom < tolerance) return iter;

    const nr = (fr * dfr + fi * dfi) / denom;
    const ni = (fi * dfr - fr * dfi) / denom;

    const newZr = zr - nr, newZi = zi - ni;

    // Check convergence
    const dr = newZr - zr, di = newZi - zi;
    if (dr * dr + di * di < tolerance) return iter;

    zr = newZr;
    zi = newZi;
  }
  return maxIter;
}

/** Mandelbrot^3 - third power */
export function mandelbrot3(cx: number, cy: number, maxIter: number): number {
  let x = 0, y = 0, iter = 0;
  while (x * x + y * y <= 4 && iter < maxIter) {
    const x2 = x * x, y2 = y * y;
    const newX = x * (x2 - 3 * y2) + cx;
    const newY = y * (3 * x2 - y2) + cy;
    x = newX;
    y = newY;
    iter++;
  }
  return iter;
}

/** Phoenix fractal */
export function phoenix(cx: number, cy: number, maxIter: number, pr: number, pi: number): number {
  let x = 0, y = 0, prevX = 0, prevY = 0, iter = 0;
  while (x * x + y * y <= 4 && iter < maxIter) {
    const newX = x * x - y * y + cx + pr * prevX;
    const newY = 2 * x * y + cy + pi * prevY;
    prevX = x;
    prevY = y;
    x = newX;
    y = newY;
    iter++;
  }
  return iter;
}
