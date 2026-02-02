/**
 * Procedural Terrain Generator - GPU Raymarched Demo
 *
 * Interactive real-time terrain generation using GPU raymarching with Perlin/FBM noise.
 *
 * Uses the Cosyne library for:
 * - GLSL terrain shader (terrainFragmentShader from shader-terrain.ts)
 *
 * Run: npx tsx cosyne/demos/procedural-terrain-gpu.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy, CanvasShader } from 'tsyne';
import type { App } from 'tsyne';
import { terrainFragmentShader } from '../src/shader-terrain';

const WIDTH = 800;
const HEIGHT = 600;

function createTerrainGPUApp(a: App): void {
    let shader: CanvasShader | null = null;
    let noiseScale = 0.01;
    let octaves = 6;
    let heightMultiplier = 30.0;
    let waterLevel = 0.3;

    a.window({ title: 'GPU Raymarched Terrain', width: WIDTH + 250, height: HEIGHT + 150 }, (win) => {
        win.setContent(() => {
            a.vbox(() => {
                // Controls - using border layout so slider expands
                a.border({
                    left: () => { a.label('Noise Scale:'); },
                    center: () => {
                        a.slider(0.001, 0.1, noiseScale, (v) => {
                            noiseScale = v;
                            shader?.setUniform('u_noiseScale', noiseScale);
                        });
                    }
                });

                a.border({
                    left: () => { a.label('Octaves:'); },
                    center: () => {
                        a.slider(1, 10, octaves, (v) => {
                            octaves = v;
                            shader?.setUniform('u_octaves', octaves);
                        });
                    }
                });

                a.border({
                    left: () => { a.label('Height:'); },
                    center: () => {
                        a.slider(5, 100, heightMultiplier, (v) => {
                            heightMultiplier = v;
                            shader?.setUniform('u_heightMultiplier', heightMultiplier);
                        });
                    }
                });

                a.border({
                    left: () => { a.label('Water Level:'); },
                    center: () => {
                        a.slider(0.0, 1.0, waterLevel, (v) => {
                            waterLevel = v;
                            shader?.setUniform('u_waterLevel', waterLevel);
                        });
                    }
                });

                // Shader canvas
                a.canvasStack(() => {
                    shader = a.canvasShader(WIDTH, HEIGHT, terrainFragmentShader, {
                        uniforms: {
                            u_noiseScale: noiseScale,
                            u_octaves: octaves,
                            u_heightMultiplier: heightMultiplier,
                            u_waterLevel: waterLevel,
                        }
                    });
                });

                a.label('GPU-accelerated terrain with Perlin noise');
            });
        });

        win.show();
    });
}

if (require.main === module) {
    const appInstance = app(resolveTransport(), { title: '🏔️ GPU Raymarched Terrain' }, createTerrainGPUApp);
    appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

export { createTerrainGPUApp };
