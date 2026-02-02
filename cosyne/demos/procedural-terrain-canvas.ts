/**
 * Procedural Terrain Generator - Canvas 2D Heightmap Demo
 *
 * Interactive real-time terrain generation and visualization using Canvas 2D.
 *
 * Uses the Cosyne library for:
 * - Perlin noise generation (generateTerrainHeightMap from noise.ts)
 * - Material color mapping (getTerrainColor from terrain-renderer.ts)
 *
 * Run: npx tsx cosyne/demos/procedural-terrain-canvas.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext } from '../src';
import {
    generateTerrainHeightMap,
    applyWaterLevel,
    smoothTerrain,
} from '../src/noise';
import { getTerrainColor } from '../src/terrain-renderer';

const WIDTH = 800;
const HEIGHT = 400;
const TERRAIN_GRID = 128;

function createTerrainCanvasApp(a: App): void {
    let terrainData: number[] = [];
    let noiseScale = 0.01;
    let octaves = 6;
    let waterLevel = 0.3;
    let seed = 42;

    // Generate terrain using library functions
    function regenerateTerrain() {
        let heights = generateTerrainHeightMap(TERRAIN_GRID, noiseScale, octaves, 0.5, 2.0, seed);
        heights = applyWaterLevel(heights, waterLevel);
        heights = smoothTerrain(heights, TERRAIN_GRID, 1);
        terrainData = heights;
    }

    regenerateTerrain();

    a.window({ title: 'Canvas 2D Terrain', width: WIDTH + 50, height: HEIGHT + 200 }, (win) => {
        win.setContent(() => {
            a.vbox(() => {
                a.hbox(() => {
                    a.label('Noise Scale:');
                    a.slider(0.002, 0.05, noiseScale, (v) => {
                        noiseScale = v;
                        regenerateTerrain();
                    });
                });

                a.hbox(() => {
                    a.label('Octaves:');
                    a.slider(1, 10, octaves, (v) => {
                        octaves = v;
                        regenerateTerrain();
                    });
                });

                a.hbox(() => {
                    a.label('Water Level:');
                    a.slider(0.0, 0.6, waterLevel, (v) => {
                        waterLevel = v;
                        regenerateTerrain();
                    });
                });

                a.button('Randomize').onClick(() => {
                    seed = Math.floor(Math.random() * 10000);
                    regenerateTerrain();
                });

                // Canvas
                a.canvasStack(() => {
                    cosyne(a, (c: CosyneContext) => {
                        // Clear background
                        c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

                        if (terrainData.length === 0) return;

                        const cellSize = Math.max(2, WIDTH / TERRAIN_GRID);

                        // Render heightmap cells
                        for (let y = 0; y < TERRAIN_GRID; y++) {
                            for (let x = 0; x < TERRAIN_GRID; x++) {
                                const idx = y * TERRAIN_GRID + x;
                                const height = terrainData[idx] || 0;
                                const [r, g, b] = getTerrainColor(height, waterLevel);

                                const px = x * cellSize;
                                const py = y * cellSize;

                                c.rect(px, py, cellSize, cellSize)
                                    .fill(`rgb(${r},${g},${b})`);
                            }
                        }
                    });
                });

                a.label('Height-based coloring: blue=water, green=land, brown=hills, white=snow');
            });
        });

        win.show();
    });
}

if (require.main === module) {
    const appInstance = app(resolveTransport(), { title: '🗺️ Canvas 2D Terrain' }, createTerrainCanvasApp);
    appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

export { createTerrainCanvasApp };
