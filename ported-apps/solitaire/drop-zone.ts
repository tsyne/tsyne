/**
 * Drop zone detection logic for drag and drop operations
 * Extracted for testability
 */

export type DropZoneType = 'foundation' | 'tableau' | 'invalid';

export interface DropZoneResult {
  zone: DropZoneType;
  index: number; // -1 for invalid zones
}

/**
 * Determine which drop zone a drag operation ended in
 *
 * Layout assumptions:
 * - Window dimensions: windowWidth x windowHeight
 * - Toolbar: top ~40px
 * - Draw area: ~40-140px
 * - Foundations: ~140-240px (4 foundation piles in a row)
 * - Tableau: ~240+ (7 tableau stacks in a row)
 *
 * @param x Mouse x coordinate
 * @param y Mouse y coordinate
 * @param windowWidth Total window width (default: 1000)
 * @param windowHeight Total window height (default: 700)
 * @returns Drop zone type and index
 */
export function detectDropZone(
  x: number,
  y: number,
  windowWidth: number = 1000,
  windowHeight: number = 700
): DropZoneResult {
  // Foundation area: y between 140 and 240
  if (y >= 140 && y < 240) {
    // 4 foundations in a row
    const foundationWidth = windowWidth / 4;
    const buildIndex = Math.floor(x / foundationWidth);

    if (buildIndex >= 0 && buildIndex < 4) {
      return { zone: 'foundation', index: buildIndex };
    }
  }

  // Tableau area: y >= 240
  if (y >= 240) {
    // 7 tableau stacks in a row
    const stackWidth = windowWidth / 7;
    const stackIndex = Math.floor(x / stackWidth);

    if (stackIndex >= 0 && stackIndex < 7) {
      return { zone: 'tableau', index: stackIndex };
    }
  }

  // Invalid drop location
  return { zone: 'invalid', index: -1 };
}
