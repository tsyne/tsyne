/**
 * Procedural Noise Generation Library
 *
 * Core noise algorithms for terrain and procedural generation:
 * - Perlin noise (2D/3D implementation)
 * - Fractional Brownian Motion (FBM) multi-octave synthesis
 * - Terrain height map generation
 * - Water level application
 * - Terrain smoothing (cellular automaton)
 * - Statistics calculation
 *
 * Reusable library component for GPU shaders and Canvas rendering.
 */

/**
 * Hash function for pseudo-random number generation
 * @param p - 2D coordinate
 * @returns Pseudo-random value in range [0, 1]
 */
export function hash(p: number[]): number {
    const h = Math.sin(p[0] * 12.9898 + p[1] * 78.233) * 43758.5453;
    return h - Math.floor(h);
}

/**
 * Perlin noise implementation (2D)
 * @param p - 2D coordinate
 * @returns Noise value in range [0, 1]
 */
export function perlin(p: number[]): number {
    const i = [Math.floor(p[0]), Math.floor(p[1])];
    const f = [p[0] - i[0], p[1] - i[1]];

    // Fade function for smooth interpolation: f(t) = t^2(3-2t)
    const u = [f[0] * f[0] * (3 - 2 * f[0]), f[1] * f[1] * (3 - 2 * f[1])];

    // Sample 4 corners
    const a = hash([i[0] + 0, i[1] + 0]);
    const b = hash([i[0] + 1, i[1] + 0]);
    const c = hash([i[0] + 0, i[1] + 1]);
    const d = hash([i[0] + 1, i[1] + 1]);

    // Bilinear interpolation
    const ab = a * (1 - u[0]) + b * u[0];
    const cd = c * (1 - u[0]) + d * u[0];
    return ab * (1 - u[1]) + cd * u[1];
}

/**
 * Fractional Brownian Motion (FBM) - Multi-octave noise synthesis
 * Combines multiple scales of noise for natural variation
 *
 * @param p - 2D coordinate
 * @param octaves - Number of noise octaves (1-10)
 * @param persistence - Amplitude falloff per octave (0.1-0.9)
 * @param lacunarity - Frequency multiplier per octave (1.5-4.0)
 * @returns Synthesized noise value in range [0, 1]
 */
export function fbm(p: number[], octaves: number, persistence: number, lacunarity: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        value += amplitude * perlin([p[0] * frequency, p[1] * frequency]);
        maxValue += amplitude;

        amplitude *= persistence;
        frequency *= lacunarity;
    }

    return value / maxValue;
}

/**
 * Terrain height map generation using FBM
 * Generates a 2D array of height values suitable for terrain visualization
 *
 * @param size - Grid size (e.g., 128 for 128x128 grid)
 * @param scale - Noise scale/frequency (0.001-0.1)
 * @param octaves - Number of FBM octaves (1-10)
 * @param persistence - FBM persistence (0.1-0.9)
 * @param lacunarity - FBM lacunarity (1.5-4.0)
 * @param seed - Random seed for reproducibility
 * @returns Array of height values in range [0, 1]
 */
export function generateTerrainHeightMap(
    size: number,
    scale: number,
    octaves: number,
    persistence: number,
    lacunarity: number,
    seed: number = 0
): number[] {
    const heightMap: number[] = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = (x / size + seed * 0.001) * scale;
            const ny = (y / size + seed * 0.001) * scale;
            const value = fbm([nx, ny], octaves, persistence, lacunarity);
            heightMap.push(Math.max(0, Math.min(1, value)));
        }
    }

    return heightMap;
}

/**
 * Apply water level threshold to heightmap
 * Heights below water level are set to water level
 *
 * @param heightMap - Input height map
 * @param waterLevel - Normalized water level (0-1)
 * @returns Modified height map with water level applied
 */
export function applyWaterLevel(heightMap: number[], waterLevel: number): number[] {
    return heightMap.map((h) => {
        if (h < waterLevel) {
            return waterLevel; // Flatten water areas
        }
        return h;
    });
}

/**
 * Smooth terrain using cellular automaton averaging
 * Reduces noise and creates smoother transitions
 *
 * @param heightMap - Input height map
 * @param size - Grid size (assumes square grid)
 * @param iterations - Number of smoothing passes (0-5)
 * @returns Smoothed height map
 */
export function smoothTerrain(heightMap: number[], size: number, iterations: number): number[] {
    let result = [...heightMap];

    for (let iter = 0; iter < iterations; iter++) {
        const smoothed = [...result];

        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                const idx = y * size + x;
                const neighbors = [
                    result[(y - 1) * size + (x - 1)], // Top-left
                    result[(y - 1) * size + x], // Top
                    result[(y - 1) * size + (x + 1)], // Top-right
                    result[y * size + (x - 1)], // Left
                    result[y * size + x], // Center
                    result[y * size + (x + 1)], // Right
                    result[(y + 1) * size + (x - 1)], // Bottom-left
                    result[(y + 1) * size + x], // Bottom
                    result[(y + 1) * size + (x + 1)], // Bottom-right
                ];

                smoothed[idx] = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
            }
        }

        result = smoothed;
    }

    return result;
}

/**
 * Terrain statistics (min, max, avg, std deviation)
 */
export interface TerrainStats {
    min: number;
    max: number;
    avg: number;
    stdDev: number;
}

/**
 * Calculate statistics for a terrain heightmap
 *
 * @param heightMap - Input height map
 * @returns Statistics object with min, max, avg, stdDev
 */
export function getTerrainStats(heightMap: number[]): TerrainStats {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (const h of heightMap) {
        min = Math.min(min, h);
        max = Math.max(max, h);
        sum += h;
    }

    const avg = sum / heightMap.length;

    let variance = 0;
    for (const h of heightMap) {
        variance += (h - avg) * (h - avg);
    }
    const stdDev = Math.sqrt(variance / heightMap.length);

    return { min, max, avg, stdDev };
}
