import { RaycasterTexture } from 'cosyne';

// Brick texture size
const BRICK_TEX_SIZE = 64;

/**
 * Generate a procedural brick texture
 * Returns a RaycasterTexture with RGBA data
 */
export function generateBrickTexture(color: [number, number, number]): RaycasterTexture {
  const data = new Uint8Array(BRICK_TEX_SIZE * BRICK_TEX_SIZE * 4);

  // Simple Perlin-like noise using sin waves
  const noise = (x: number, y: number): number => {
    return (
      Math.sin(x * 0.1) * 0.3 +
      Math.sin(y * 0.15) * 0.3 +
      Math.sin((x + y) * 0.08) * 0.2 +
      Math.sin((x - y) * 0.12) * 0.2
    ) * 0.5 + 0.5;
  };

  for (let y = 0; y < BRICK_TEX_SIZE; y++) {
    for (let x = 0; x < BRICK_TEX_SIZE; x++) {
      // Brick pattern: horizontal lines every 16 pixels, vertical offset every other row
      const brickHeight = 16;
      const brickWidth = 32;
      const mortarWidth = 2;

      const row = Math.floor(y / brickHeight);
      const yInBrick = y % brickHeight;
      const xOffset = (row % 2) * (brickWidth / 2);
      const xInBrick = (x + xOffset) % brickWidth;

      // Check if we're in mortar (gaps between bricks)
      const inHorizontalMortar = yInBrick < mortarWidth;
      const inVerticalMortar = xInBrick < mortarWidth;

      let intensity: number;
      if (inHorizontalMortar || inVerticalMortar) {
        // Mortar is dark gray
        intensity = 0.2 + noise(x, y) * 0.1;
      } else {
        // Brick surface with noise variation
        intensity = 0.6 + noise(x * 2, y * 2) * 0.3;
      }

      // Create RGBA color (tinted)
      const r = Math.floor(color[0] * intensity);
      const g = Math.floor(color[1] * intensity);
      const b = Math.floor(color[2] * intensity);
      
      const idx = (y * BRICK_TEX_SIZE + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  return { width: BRICK_TEX_SIZE, height: BRICK_TEX_SIZE, data };
}

// Tile texture size
const TILE_TEX_SIZE = 64;

/**
 * Generate a procedural tile/floor texture with hexagonal lattice pattern
 * Returns a RaycasterTexture with RGBA data
 */
export function generateTileTexture(color: [number, number, number]): RaycasterTexture {
  const data = new Uint8Array(TILE_TEX_SIZE * TILE_TEX_SIZE * 4);

  // Hexagonal lattice parameters
  const scale = 12;  // Size of hex cells
  const sqrt3 = Math.sqrt(3);

  // Simple noise for variation
  const noise = (x: number, y: number): number => {
    return (
      Math.sin(x * 0.2 + 1.3) * 0.2 +
      Math.sin(y * 0.25 + 2.1) * 0.2 +
      Math.sin((x + y) * 0.15) * 0.15 +
      Math.sin((x - y) * 0.18 + 0.7) * 0.15
    ) * 0.5 + 0.5;
  };

  for (let y = 0; y < TILE_TEX_SIZE; y++) {
    for (let x = 0; x < TILE_TEX_SIZE; x++) {
      // Convert to hexagonal lattice coordinates
      const fx = x / scale;
      const fy = y / (scale * sqrt3);

      // Find closest lattice point (two offset grids)
      const grid1x = Math.round(fx);
      const grid1y = Math.round(fy);
      const dist1 = Math.hypot(fx - grid1x, fy - grid1y);

      const grid2x = Math.round(fx - 0.5) + 0.5;
      const grid2y = Math.round(fy - 0.5) + 0.5;
      const dist2 = Math.hypot(fx - grid2x, fy - grid2y);

      // Minimum distance to nearest lattice point
      const minDist = Math.min(dist1, dist2);

      const lineThreshold = 0.15;  // How close to lattice point for grout line
      let intensity: number;

      if (minDist < lineThreshold) {
        // Grout/edge - dark with some variation
        intensity = 0.25 + noise(x, y) * 0.1;
      } else {
        // Tile surface with noise variation
        const surfaceValue = 0.5 + (minDist - lineThreshold) * 0.8;
        intensity = Math.min(0.85, surfaceValue) + noise(x * 2, y * 2) * 0.15;
      }

      // Create RGBA color (tinted, boost intensity slightly as original did * 1.5)
      const boost = 1.5;
      const r = Math.min(255, Math.floor(color[0] * intensity * boost));
      const g = Math.min(255, Math.floor(color[1] * intensity * boost));
      const b = Math.min(255, Math.floor(color[2] * intensity * boost));

      const idx = (y * TILE_TEX_SIZE + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  return { width: TILE_TEX_SIZE, height: TILE_TEX_SIZE, data };
}