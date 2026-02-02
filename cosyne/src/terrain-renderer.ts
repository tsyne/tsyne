/**
 * Terrain Rendering and Material System
 *
 * Utilities for converting terrain heightmaps to visual representations:
 * - Height-based color mapping (biome system)
 * - Mesh generation from heightmaps
 * - Material assignment and properties
 * - 3D mesh data generation
 *
 * Reusable library component for both Canvas 2D and 3D rendering.
 */

/**
 * Biome type definitions
 */
export enum BiomeType {
    Water = 'water',
    Beach = 'beach',
    Grass = 'grass',
    Rock = 'rock',
    Snow = 'snow',
}

/**
 * Material properties for terrain
 */
export interface TerrainMaterial {
    name: string;
    color: [number, number, number]; // RGB
    metalness?: number;
    roughness?: number;
    emissive?: boolean;
}

/**
 * 3D mesh data structure
 */
export interface TerrainMesh {
    vertices: number[]; // Flat array of [x, y, z, ...]
    indices: number[];
    normals: number[];
    colors: number[];
    format: string; // "pos3_norm3_col3"
}

/**
 * Get biome type for a given height
 *
 * @param height - Normalized height (0-1)
 * @param waterLevel - Water level threshold
 * @returns Biome type
 */
export function getBiomeType(height: number, waterLevel: number): BiomeType {
    if (height <= waterLevel) {
        return BiomeType.Water;
    }
    if (height < waterLevel + 0.15) {
        return BiomeType.Beach;
    }
    if (height < 0.5) {
        return BiomeType.Grass;
    }
    if (height < 0.8) {
        return BiomeType.Rock;
    }
    return BiomeType.Snow;
}

/**
 * Get RGB color for terrain height (5-tier biome system)
 *
 * Color mapping:
 * - Water (deep blue): RGB(20, 50, 150)
 * - Beach (sand): RGB(200-255, 180-255, 50-80)
 * - Grass (green): RGB(80-139, 90-150, 40-60)
 * - Rock (stone): RGB(139-180, 90-160, 40-140)
 * - Snow (white): RGB(240, 240, 240)
 *
 * @param height - Normalized height (0-1)
 * @param waterLevel - Water level threshold
 * @returns RGB color as [R, G, B] (0-255)
 */
export function getTerrainColor(height: number, waterLevel: number): [number, number, number] {
    if (height <= waterLevel) {
        // Water - deep blue
        return [20, 50, 150];
    }

    if (height < waterLevel + 0.15) {
        // Beach - sandy gradient
        const t = (height - waterLevel) / 0.15;
        return [
            Math.round(200 + 55 * t),
            Math.round(180 + 75 * t),
            Math.round(80 - 30 * t),
        ];
    }

    if (height < 0.5) {
        // Grass - green
        const t = (height - (waterLevel + 0.15)) / (0.5 - waterLevel - 0.15);
        return [
            Math.round(80 * (1 - t) + 139 * t),
            Math.round(150 * (1 - t) + 90 * t),
            Math.round(60 * (1 - t) + 40 * t),
        ];
    }

    if (height < 0.8) {
        // Rock - grey stone
        const t = (height - 0.5) / 0.3;
        return [
            Math.round(139 * (1 - t) + 180 * t),
            Math.round(90 * (1 - t) + 160 * t),
            Math.round(40 * (1 - t) + 140 * t),
        ];
    }

    // Snow - white
    return [240, 240, 240];
}

/**
 * Get material properties for a given height
 *
 * @param height - Normalized height (0-1)
 * @param waterLevel - Water level threshold
 * @returns Material properties
 */
export function getMaterial(height: number, waterLevel: number): TerrainMaterial {
    const biome = getBiomeType(height, waterLevel);
    const color = getTerrainColor(height, waterLevel);

    switch (biome) {
        case BiomeType.Water:
            return {
                name: 'Water',
                color: color as [number, number, number],
                metalness: 0.3,
                roughness: 0.1,
            };
        case BiomeType.Beach:
            return {
                name: 'Sand',
                color: color as [number, number, number],
                metalness: 0,
                roughness: 0.9,
            };
        case BiomeType.Grass:
            return {
                name: 'Grass',
                color: color as [number, number, number],
                metalness: 0,
                roughness: 0.8,
            };
        case BiomeType.Rock:
            return {
                name: 'Rock',
                color: color as [number, number, number],
                metalness: 0.1,
                roughness: 0.7,
            };
        case BiomeType.Snow:
            return {
                name: 'Snow',
                color: color as [number, number, number],
                metalness: 0.05,
                roughness: 0.6,
            };
    }
}

/**
 * Create a color map from heightmap for Canvas visualization
 * Returns array of CSS color strings
 *
 * @param heightMap - Height map data
 * @param size - Grid size (assumes square)
 * @param waterLevel - Water level threshold
 * @returns Array of CSS RGB color strings
 */
export function createTerrainColorMap(heightMap: number[], size: number, waterLevel: number): string[] {
    return heightMap.map((height) => {
        const [r, g, b] = getTerrainColor(height, waterLevel);
        return `rgb(${r},${g},${b})`;
    });
}

/**
 * Convert height map to 3D mesh data
 * Generates vertices, normals, and indices for 3D rendering
 *
 * @param heightMap - Input height map
 * @param size - Grid size (assumes square)
 * @param heightMultiplier - Vertical scale factor
 * @param spacing - Vertex spacing in XZ plane (default 1)
 * @returns Mesh data with vertices, indices, normals
 */
export function heightMapToMesh(
    heightMap: number[],
    size: number,
    heightMultiplier: number = 1,
    spacing: number = 1
): TerrainMesh {
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const waterLevel = 0.3; // Default water level

    // Generate vertices
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = y * size + x;
            const height = heightMap[idx] * heightMultiplier;

            // Position
            vertices.push(x * spacing, height, y * spacing);

            // Color (will be filled after normals)
            colors.push(0, 0, 0);

            // Normal (will be calculated after all vertices)
            normals.push(0, 1, 0);
        }
    }

    // Generate indices (triangles)
    for (let y = 0; y < size - 1; y++) {
        for (let x = 0; x < size - 1; x++) {
            const a = y * size + x;
            const b = y * size + (x + 1);
            const c = (y + 1) * size + x;
            const d = (y + 1) * size + (x + 1);

            // Two triangles per quad
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    // Calculate normals using cross product
    const tempNormals: [number, number, number][] = vertices.map(() => [0, 0, 0]);

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        // Get vertices
        const v0 = [vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]];
        const v1 = [vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]];
        const v2 = [vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]];

        // Calculate edges
        const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        // Cross product
        const normal = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];

        // Accumulate normals
        tempNormals[i0][0] += normal[0];
        tempNormals[i0][1] += normal[1];
        tempNormals[i0][2] += normal[2];
        tempNormals[i1][0] += normal[0];
        tempNormals[i1][1] += normal[1];
        tempNormals[i1][2] += normal[2];
        tempNormals[i2][0] += normal[0];
        tempNormals[i2][1] += normal[1];
        tempNormals[i2][2] += normal[2];
    }

    // Normalize normals and set colors
    for (let i = 0; i < vertices.length / 3; i++) {
        const n = tempNormals[i];
        const len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);

        if (len > 0) {
            normals[i * 3] = n[0] / len;
            normals[i * 3 + 1] = n[1] / len;
            normals[i * 3 + 2] = n[2] / len;
        }

        // Set color based on height
        const height = heightMap[i];
        const [r, g, b] = getTerrainColor(height, waterLevel);
        colors[i * 3] = r / 255;
        colors[i * 3 + 1] = g / 255;
        colors[i * 3 + 2] = b / 255;
    }

    return {
        vertices,
        indices,
        normals,
        colors,
        format: 'pos3_norm3_col3',
    };
}
