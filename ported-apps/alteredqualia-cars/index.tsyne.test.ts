/**
 * Visual test for Cars Demo
 *
 * The current implementation is a simplified wireframe software renderer.
 * The original alteredqualia demo uses Three.js with:
 * - Real 3D car models (Bugatti, Lamborghini, Ferrari, Camaro)
 * - Environment mapping and reflections
 * - 13+ material presets
 * - Proper PBR lighting
 *
 * This test verifies the basic rendering logic works.
 * Future work: implement proper 3D rendering via CanvasShader.
 */

import { CarsState, Vec3, Car } from './index';

describe('Cars Demo Rendering', () => {
  it('should render day mode with sky blue background', () => {
    const state = new CarsState(600, 400);
    state.render();

    // Day background is [135, 206, 235] (sky blue)
    const pixel = state.pixelBuffer.slice(0, 4);
    expect(pixel[0]).toBe(135); // Red
    expect(pixel[1]).toBe(206); // Green
    expect(pixel[2]).toBe(235); // Blue
    expect(pixel[3]).toBe(255); // Alpha
  });

  it('should render night mode with dark background', () => {
    const state = new CarsState(600, 400);
    state.toggleNight();
    state.render();

    // Night background is [10, 10, 30] (dark blue)
    const pixel = state.pixelBuffer.slice(0, 4);
    expect(pixel[0]).toBe(10);
    expect(pixel[1]).toBe(10);
    expect(pixel[2]).toBe(30);
  });

  it('should have two cars after initialization', () => {
    const state = new CarsState(600, 400);
    expect(state.cars.length).toBe(2);
  });

  it('should project 3D points to 2D screen', () => {
    const state = new CarsState(600, 400);
    const point = new Vec3(0, 0, 0);
    const projected = state.project(point);

    expect(projected).not.toBeNull();
    expect(projected!.x).toBeGreaterThan(0);
    expect(projected!.y).toBeGreaterThan(0);
  });

  it('should fill pixel buffer after render', () => {
    const state = new CarsState(600, 400);
    state.render();

    // Buffer should be 600 * 400 * 4 bytes
    expect(state.pixelBuffer.length).toBe(600 * 400 * 4);

    // Should have some non-background pixels (grid lines)
    let nonBgPixels = 0;
    for (let i = 0; i < state.pixelBuffer.length; i += 4) {
      if (state.pixelBuffer[i] !== 135 ||
          state.pixelBuffer[i + 1] !== 206 ||
          state.pixelBuffer[i + 2] !== 235) {
        nonBgPixels++;
      }
    }
    expect(nonBgPixels).toBeGreaterThan(0);
  });
});
