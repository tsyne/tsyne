/**
 * Transforms Demo - Cosyne Phase 5
 *
 * Demonstrates nested coordinate transformations
 * - Nested transforms: translate, rotate, scale
 * - Geometric patterns with recursive transforms
 * - Complex multi-level transformations
 */

import { App } from '../../core/src';
import { CosyneContext, cosyne, refreshAllCosyneContexts } from '../../cosyne/src';

export function buildTransformsApp(a: App): void {
  a.canvasStack(() => {
    const cosyneCtx = cosyne(a, (c: CosyneContext) => {
      let rotation = 0;

      // Rotate patterns continuously
      setInterval(() => {
        rotation += 0.02;
        refreshAllCosyneContexts();
      }, 50);

      // Background
      c.rect(0, 0, 500, 500)
        .fill('#F0F0F0');

      // =====================================================================
      // PATTERN 1: Rotating Star with Nested Circles
      // =====================================================================

      // Main transform: translate to center, rotate
      c.transform(
        { translate: [100, 100], rotate: rotation },
        (layer1) => {
          // Draw center circle
          layer1.circle(0, 0, 15)
            .fill('#FF6B6B')
            .stroke('#FFFFFF', 2);

          // Draw 5 petals with nested transforms
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const offsetX = Math.cos(angle) * 50;
            const offsetY = Math.sin(angle) * 50;

            // Nested transform for each petal
            layer1.transform(
              { translate: [offsetX, offsetY], rotate: -rotation },
              (petal) => {
                petal.circle(0, 0, 12)
                  .fill('#4ECDC4');

                // Double nested: small circles around petal
                petal.transform(
                  { scale: [0.6, 0.6] },
                  (mini) => {
                    for (let j = 0; j < 3; j++) {
                      const miniAngle = (j / 3) * Math.PI * 2;
                      mini.circle(
                        Math.cos(miniAngle) * 20,
                        Math.sin(miniAngle) * 20,
                        4
                      ).fill('#45B7D1');
                    }
                  }
                );
              }
            );
          }
        }
      );

      // Label
      c.text(100, 30, 'Rotating Star')
        .fill('#2C3E50');

      // =====================================================================
      // PATTERN 2: Nested Rectangles with Progressive Rotation
      // =====================================================================

      c.transform(
        { translate: [300, 100] },
        (rectGroup) => {
          // Draw series of rotating rectangles
          for (let i = 0; i < 5; i++) {
            const size = 60 - i * 10;
            const innerRotation = rotation * (i + 1);

            rectGroup.transform(
              { rotate: innerRotation },
              (rotated) => {
                rotated.rect(-size / 2, -size / 2, size, size)
                  .stroke(['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][i], 2)
                  .fill('transparent');
              }
            );
          }
        }
      );

      c.text(300, 30, 'Nested Rectangles')
        .fill('#2C3E50');

      // =====================================================================
      // PATTERN 3: Spiral with Recursive Transforms
      // =====================================================================

      c.transform(
        { translate: [100, 300] },
        (spiral) => {
          // Create spiral using nested transforms
          const spiralLayers = 8;
          for (let i = 0; i < spiralLayers; i++) {
            const angle = (i / spiralLayers) * Math.PI * 2 + rotation;
            const distance = 20 + i * 8;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            spiral.transform(
              { translate: [x, y], scale: [1 - i * 0.1, 1 - i * 0.1] },
              (point) => {
                point.circle(0, 0, 6)
                  .fill(['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#FF8B94', '#88D8B0'][i]);
              }
            );
          }
        }
      );

      c.text(100, 270, 'Spiral Pattern')
        .fill('#2C3E50');

      // =====================================================================
      // PATTERN 4: Grid with Cell Transforms
      // =====================================================================

      c.transform(
        { translate: [300, 300] },
        (grid) => {
          const gridSize = 4;
          const cellSize = 30;

          for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
              const x = (col - gridSize / 2) * cellSize;
              const y = (row - gridSize / 2) * cellSize;
              const cellRotation = rotation + (row + col) * 0.1;

              grid.transform(
                { translate: [x, y], rotate: cellRotation, scale: [0.8, 0.8] },
                (cell) => {
                  cell.rect(-cellSize / 3, -cellSize / 3, (cellSize * 2) / 3, (cellSize * 2) / 3)
                    .fill(['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][(row + col) % 4])
                    .stroke('#FFFFFF', 1);

                  // Small dot in center
                  cell.circle(0, 0, 2)
                    .fill('#FFFFFF');
                }
              );
            }
          }
        }
      );

      c.text(300, 270, 'Grid Pattern')
        .fill('#2C3E50');

      // =====================================================================
      // Legend
      // =====================================================================

      c.rect(0, 450, 500, 50)
        .fill('#FFFFFF')
        .stroke('#CCCCCC', 1);

      c.text(10, 465, 'Nested coordinate transforms with rotation, translation, and scaling')
        .fill('#2C3E50');

      c.text(10, 485, 'All patterns rotate continuously to show transform composition')
        .fill('#666666');
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app } = require('../../core/src');
  app(
    {
      title: 'Transforms Demo - Cosyne Phase 5',
      width: 600,
      height: 600,
    },
    (a: any) => {
      a.window(
        { title: 'Transforms Demo', width: 500, height: 550 },
        (win: any) => {
          win.setContent(() => {
            buildTransformsApp(a);
          });
          win.show();
        }
      );
    }
  );
}
