/**
 * Transform & Group Showcase - Nested Coordinate Systems
 *
 * Demonstrates Cosyne's group() and transform() for local coordinate systems.
 * Similar to SVG's <g transform="translate(x,y)"> pattern.
 *
 * Features demonstrated:
 * - group(x, y, builder) for translation-only local coordinates
 * - transform({ translate, rotate, scale }, builder) for full transforms
 * - Nested groups with cumulative transforms
 * - Practical examples: labeled buttons, icons, compound shapes
 *
 * Run: npx tsx cosyne/demos/transform-group-showcase-nested-coordinates.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, type CosyneContext, refreshAllCosyneContexts, enableEventHandling } from '../src/index';

const WIDTH = 500;
const HEIGHT = 380;

function createTransformDemo(a: App): void {
  let animationAngle = 0;
  let buttonLog: string[] = [];

  // Helper: draw a small coordinate axis at origin
  function drawAxis(c: CosyneContext, size: number = 30) {
    c.line(0, 0, size, 0, { strokeColor: '#e74c3c', strokeWidth: 2 }); // X axis (red)
    c.line(0, 0, 0, size, { strokeColor: '#27ae60', strokeWidth: 2 }); // Y axis (green)
    c.circle(0, 0, 3, { fillColor: '#333' }); // Origin dot
  }

  // Tab 1: Basic Groups
  function renderBasicGroups() {
    a.canvasStack(() => {
      cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, WIDTH, HEIGHT, { fillColor: '#f8f9fa' });

        c.text(20, 15, 'Basic group(x, y) - Local Coordinates', {
          fillColor: '#2c3e50', fontSize: 16,
        });
        c.text(20, 50, 'Children draw relative to the group origin', {
          fillColor: '#7f8c8d', fontSize: 12,
        });

        c.group(120, 170, (g) => {
          drawAxis(g, 50);
          g.rect(-30, -30, 60, 60, {
            fillColor: '#3498db', strokeColor: '#2980b9', strokeWidth: 2,
          });
          g.text(-40, 55, 'group(120, 170)', { fillColor: '#666', fontSize: 11 });
        });

        c.group(350, 170, (g) => {
          drawAxis(g, 50);
          g.circle(0, 0, 35, {
            fillColor: '#e74c3c', strokeColor: '#c0392b', strokeWidth: 2,
          });
          g.text(-40, 55, 'group(350, 170)', { fillColor: '#666', fontSize: 11 });
        });

        c.rect(20, 270, 460, 95, { fillColor: '#ecf0f1', strokeColor: '#bdc3c7', strokeWidth: 1 });
        c.text(30, 285, 'c.group(120, 170, (g) => {', { fillColor: '#2c3e50', fontSize: 11 });
        c.text(30, 305, '  g.rect(-30, -30, 60, 60, { ... });', { fillColor: '#27ae60', fontSize: 11 });
        c.text(30, 325, '  // rect centered at group origin', { fillColor: '#7f8c8d', fontSize: 11 });
        c.text(30, 345, '});', { fillColor: '#2c3e50', fontSize: 11 });
      });
    });
  }

  // Tab 2: Nested Groups
  function renderNestedGroups() {
    a.canvasStack(() => {
      cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, WIDTH, HEIGHT, { fillColor: '#f8f9fa' });

        c.text(20, 15, 'Nested Groups - Cumulative Transforms', {
          fillColor: '#2c3e50', fontSize: 16,
        });
        c.text(20, 50, 'Inner groups offset relative to outer groups', {
          fillColor: '#7f8c8d', fontSize: 12,
        });

        c.group(250, 170, (outer) => {
          drawAxis(outer, 80);
          outer.circle(0, 0, 70, {
            fillColor: 'rgba(46, 204, 113, 0.2)', strokeColor: '#27ae60', strokeWidth: 2,
          });
          outer.text(-35, -95, 'Outer (250, 170)', { fillColor: '#27ae60', fontSize: 11 });

          outer.group(40, 40, (inner) => {
            drawAxis(inner, 40);
            inner.circle(0, 0, 25, {
              fillColor: '#9b59b6', strokeColor: '#8e44ad', strokeWidth: 2,
            });
            inner.text(5, -45, 'Inner (+40, +40)', { fillColor: '#9b59b6', fontSize: 10 });

            inner.group(25, 25, (deep) => {
              deep.circle(0, 0, 10, {
                fillColor: '#e74c3c', strokeColor: '#c0392b', strokeWidth: 2,
              });
            });
          });
        });

        c.rect(20, 270, 460, 95, { fillColor: '#ecf0f1', strokeColor: '#bdc3c7', strokeWidth: 1 });
        c.text(30, 285, 'c.group(250, 170, (outer) => {', { fillColor: '#2c3e50', fontSize: 11 });
        c.text(30, 305, '  outer.group(40, 40, (inner) => {', { fillColor: '#27ae60', fontSize: 11 });
        c.text(30, 325, '    inner.circle(0, 0, 25);  // at (290, 210)', { fillColor: '#9b59b6', fontSize: 11 });
        c.text(30, 345, '  });', { fillColor: '#2c3e50', fontSize: 11 });
      });
    });
  }

  // Tab 3: Buttons
  // Store references to console text primitives for direct updates
  let consoleLine1: any = null;
  let consoleLine2: any = null;
  let consoleLine3: any = null;
  let consoleLine4: any = null;

  function updateConsoleLines() {
    // Update each console line directly (no rebuild needed)
    const lines = [
      buttonLog[0] || '',
      buttonLog[1] || '',
      buttonLog[2] || '',
      buttonLog[3] || '',
    ];
    if (consoleLine1) consoleLine1.setText(buttonLog.length === 0 ? '(click a button)' : lines[0]);
    if (consoleLine2) consoleLine2.setText(lines[1]);
    if (consoleLine3) consoleLine3.setText(lines[2]);
    if (consoleLine4) consoleLine4.setText(lines[3]);
  }

  function renderButtons() {
    a.canvasStack(() => {
      const ctx = cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, WIDTH, HEIGHT, { fillColor: '#f8f9fa' });

        c.text(20, 15, 'Practical: Reusable Button Components', {
          fillColor: '#2c3e50', fontSize: 16,
        });
        c.text(20, 50, 'Define button shape once, position with group() - click buttons!', {
          fillColor: '#7f8c8d', fontSize: 12,
        });

        function drawButton(g: CosyneContext, label: string, bgColor: string, borderColor: string, onClick: () => void) {
          g.rect(-60, -22, 120, 44, { fillColor: bgColor, strokeColor: borderColor, strokeWidth: 2 })
            .onClick(onClick);
          g.text(-25, -5, label, { fillColor: '#fff', fontSize: 14 }).passthrough();
        }

        function logClick(label: string) {
          buttonLog.unshift(`Clicked: ${label}`);
          if (buttonLog.length > 4) buttonLog.pop();
          updateConsoleLines();
        }

        c.group(100, 110, (g) => drawButton(g, 'Save', '#3498db', '#2980b9', () => logClick('Save')));
        c.group(250, 110, (g) => drawButton(g, 'Cancel', '#e74c3c', '#c0392b', () => logClick('Cancel')));
        c.group(400, 110, (g) => drawButton(g, 'Help', '#9b59b6', '#8e44ad', () => logClick('Help')));
        c.group(100, 170, (g) => drawButton(g, 'New', '#2ecc71', '#27ae60', () => logClick('New')));
        c.group(250, 170, (g) => drawButton(g, 'Open', '#f39c12', '#d68910', () => logClick('Open')));
        c.group(400, 170, (g) => drawButton(g, 'Close', '#1abc9c', '#16a085', () => logClick('Close')));

        // Console log area with black background
        c.rect(20, 210, 200, 90, { fillColor: '#2c3e50', strokeColor: '#1a252f', strokeWidth: 2 });
        c.text(30, 225, '> Console', { fillColor: '#27ae60', fontSize: 11 });
        // Pre-create 4 text lines that we'll update directly
        consoleLine1 = c.text(30, 245, '(click a button)', { fillColor: '#7f8c8d', fontSize: 10 });
        consoleLine2 = c.text(30, 263, '', { fillColor: '#ecf0f1', fontSize: 10 });
        consoleLine3 = c.text(30, 281, '', { fillColor: '#ecf0f1', fontSize: 10 });
        consoleLine4 = c.text(30, 299, '', { fillColor: '#ecf0f1', fontSize: 10 });

        // Code snippet (static)
        c.rect(240, 210, 240, 90, { fillColor: '#ecf0f1', strokeColor: '#bdc3c7', strokeWidth: 1 });
        c.text(250, 225, 'function drawButton(g, label) {', { fillColor: '#2c3e50', fontSize: 10 });
        c.text(250, 245, '  g.rect(...).onClick(() => {', { fillColor: '#27ae60', fontSize: 10 });
        c.text(250, 265, '    console.log(label);', { fillColor: '#e74c3c', fontSize: 10 });
        c.text(250, 285, '  });', { fillColor: '#2c3e50', fontSize: 10 });

        c.text(20, 320, 'group() positions reusable components - onClick works!', { fillColor: '#2c3e50', fontSize: 11 });
      });
      enableEventHandling(ctx, a, { width: WIDTH, height: HEIGHT });
    });
  }

  // Tab 4: Rotation
  // Store references to animated primitives for direct updates (no rebuild flicker)
  let animatedLine: any = null;
  let animatedCircle: any = null;
  const ANIM_CENTER_X = 130;
  const ANIM_CENTER_Y = 295;
  const ANIM_ARM_LENGTH = 50;

  function updateAnimatedPrimitives() {
    if (!animatedLine || !animatedCircle) return;
    const endX = ANIM_CENTER_X + Math.cos(animationAngle) * ANIM_ARM_LENGTH;
    const endY = ANIM_CENTER_Y + Math.sin(animationAngle) * ANIM_ARM_LENGTH;
    animatedLine.updateEndpoints({ x1: ANIM_CENTER_X, y1: ANIM_CENTER_Y, x2: endX, y2: endY });
    animatedCircle.updatePosition({ x: endX, y: endY });
  }

  function renderRotation() {
    a.canvasStack(() => {
      cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, WIDTH, HEIGHT, { fillColor: '#f8f9fa' });

        c.text(20, 15, 'transform() with Rotation', {
          fillColor: '#2c3e50', fontSize: 16,
        });
        c.text(20, 50, 'Rotation affects lines/axes - rects stay axis-aligned', {
          fillColor: '#7f8c8d', fontSize: 12,
        });

        const angles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3];
        const labels = ['0°', '30°', '45°', '60°'];

        for (let i = 0; i < angles.length; i++) {
          const x = 80 + i * 110;
          const y = 140;
          const angle = angles[i];
          // Draw "hello" first - it will be underneath (z-layer behind) the rotation
          c.text(x - 15, 145, 'hello', { fillColor: '#bdc3c7', fontSize: 12 });
          // Draw origin dot (not rotated) to show pivot point
          c.circle(x, y, 6, { fillColor: '#e74c3c', strokeColor: '#c0392b', strokeWidth: 1 });
          // Then draw rotated content - axes show the rotation (on top)
          c.transform({ translate: [x, y], rotate: angle }, (g) => {
            drawAxis(g, 40);
          });
          // Draw bezier curve with manually rotated coordinates (path doesn't support transforms)
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const size = 40;
          // Control point at (size*0.5, -size*0.4) rotated
          const ctrlX = size * 0.5;
          const ctrlY = -size * 0.4;
          const rcx = x + ctrlX * cos - ctrlY * sin;
          const rcy = y + ctrlX * sin + ctrlY * cos;
          // End point at (size, 0) rotated
          const rex = x + size * cos;
          const rey = y + size * sin;
          c.path(`M ${x},${y} Q ${rcx},${rcy} ${rex},${rey}`, {
            strokeColor: '#9b59b6', strokeWidth: 2,
          });
          c.text(x - 12, 195, labels[i], { fillColor: '#666', fontSize: 11 });
        }

        c.text(130, 225, 'Animated:', { fillColor: '#2c3e50', fontSize: 12 });
        // Fixed origin dot
        c.circle(ANIM_CENTER_X, ANIM_CENTER_Y, 8, { fillColor: '#e74c3c', strokeColor: '#c0392b', strokeWidth: 2 });

        // Animated primitives - created once, updated directly (no rebuild)
        animatedLine = c.line(ANIM_CENTER_X, ANIM_CENTER_Y, ANIM_CENTER_X + ANIM_ARM_LENGTH, ANIM_CENTER_Y, {
          strokeColor: '#1abc9c', strokeWidth: 4,
        });
        animatedCircle = c.circle(ANIM_CENTER_X + ANIM_ARM_LENGTH, ANIM_CENTER_Y, 8, {
          fillColor: '#1abc9c', strokeColor: '#16a085', strokeWidth: 2,
        });

        c.rect(250, 230, 220, 110, { fillColor: '#ecf0f1', strokeColor: '#bdc3c7', strokeWidth: 1 });
        c.text(260, 250, 'c.transform({', { fillColor: '#2c3e50', fontSize: 10 });
        c.text(260, 268, '  translate: [x, y],', { fillColor: '#27ae60', fontSize: 10 });
        c.text(260, 284, '  rotate: angle  // radians', { fillColor: '#e74c3c', fontSize: 10 });
        c.text(260, 300, '}, (g) => g.line(...))  // rotates!', { fillColor: '#2c3e50', fontSize: 10 });
        c.text(260, 320, '// Purple bezier: manually rotated', { fillColor: '#9b59b6', fontSize: 10 });
        c.text(260, 336, '// path() coords since path() has', { fillColor: '#9b59b6', fontSize: 10 });
        c.text(260, 350, '// no transform support yet', { fillColor: '#9b59b6', fontSize: 10 });
      });
    });
  }

  // Tab 5: Compound
  function renderCompound() {
    a.canvasStack(() => {
      cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, WIDTH, HEIGHT, { fillColor: '#f8f9fa' });

        c.text(20, 15, 'Compound Shapes - Robot Face', {
          fillColor: '#2c3e50', fontSize: 16,
        });
        c.text(20, 50, 'Build complex shapes from nested groups', {
          fillColor: '#7f8c8d', fontSize: 12,
        });

        function drawRobot(face: CosyneContext, faceColor: string, antennaColor: string) {
          face.rect(-50, -60, 100, 90, {
            fillColor: faceColor, strokeColor: '#7f8c8d', strokeWidth: 3,
          });
          face.group(-22, -30, (eye) => {
            eye.circle(0, 0, 15, { fillColor: '#fff', strokeColor: '#333', strokeWidth: 2 });
            eye.circle(4, 0, 6, { fillColor: '#333' });
          });
          face.group(22, -30, (eye) => {
            eye.circle(0, 0, 15, { fillColor: '#fff', strokeColor: '#333', strokeWidth: 2 });
            eye.circle(4, 0, 6, { fillColor: '#333' });
          });
          face.rect(-25, 8, 50, 10, { fillColor: '#333' });
          face.line(0, -60, 0, -80, { strokeColor: '#7f8c8d', strokeWidth: 3 });
          face.circle(0, -85, 8, { fillColor: antennaColor });
        }

        c.group(130, 200, (face) => drawRobot(face, '#bdc3c7', '#e74c3c'));
        c.group(370, 200, (face) => drawRobot(face, '#f39c12', '#27ae60'));

        c.text(80, 320, 'Same code, different group() position!', { fillColor: '#2c3e50', fontSize: 12 });
      });
    });
  }

  // Tab 6: Scale - with nested tabs for different shapes
  function renderScale() {
    const scales = [
      { s: [0.5, 0.5], label: '0.5x' },
      { s: [0.75, 0.75], label: '0.75x' },
      { s: [1, 1], label: '1x' },
      { s: [1.5, 1.5], label: '1.5x' },
      { s: [2, 2], label: '2x' },
    ];

    const nonUniformScales = [
      { s: [1, 1], label: '1x, 1x' },
      { s: [1.5, 1], label: '1.5x, 1x' },
      { s: [1, 1.5], label: '1x, 1.5x' },
      { s: [2, 0.5], label: '2x, 0.5x' },
    ];

    function renderShapeTab(shapeName: string, drawShape: (g: CosyneContext) => void, scaleList: typeof scales) {
      return () => {
        a.canvasStack(() => {
          cosyne(a, (c: CosyneContext) => {
            c.rect(0, 0, WIDTH, 280, { fillColor: '#f8f9fa' });

            c.text(20, 15, `Scale: ${shapeName}`, { fillColor: '#2c3e50', fontSize: 14 });

            for (let i = 0; i < scaleList.length; i++) {
              const x = 50 + i * 90;
              c.transform({ translate: [x, 120], scale: scaleList[i].s as [number, number] }, (g) => {
                drawShape(g);
              });
              c.text(x - 25, 200, scaleList[i].label, { fillColor: '#666', fontSize: 10 });
            }

            // Code hint
            c.text(20, 240, `c.transform({ scale: [sx, sy] }, (g) => g.${shapeName.toLowerCase()}(...))`, {
              fillColor: '#7f8c8d', fontSize: 10,
            });
          });
        });
      };
    }

    a.vbox(() => {
      a.label('Scale Transform - Shape Gallery');
      a.tabs([
        {
          title: 'Square',
          builder: renderShapeTab('Square', (g) => {
            g.rect(-20, -20, 40, 40, { fillColor: '#3498db', strokeColor: '#2980b9', strokeWidth: 2 });
          }, scales),
        },
        {
          title: 'Rect',
          builder: renderShapeTab('Rect', (g) => {
            g.rect(-30, -15, 60, 30, { fillColor: '#e74c3c', strokeColor: '#c0392b', strokeWidth: 2 });
          }, nonUniformScales),
        },
        {
          title: 'Circle',
          builder: renderShapeTab('Circle', (g) => {
            g.circle(0, 0, 20, { fillColor: '#9b59b6', strokeColor: '#8e44ad', strokeWidth: 2 });
          }, scales),
        },
        {
          title: 'Ellipse',
          builder: () => {
            a.canvasStack(() => {
              cosyne(a, (c: CosyneContext) => {
                c.rect(0, 0, WIDTH, 280, { fillColor: '#f8f9fa' });

                c.text(20, 15, 'Ellipse: True non-uniform radii', { fillColor: '#2c3e50', fontSize: 14 });

                const ellipses = [
                  { rx: 20, ry: 20, label: '20, 20' },
                  { rx: 30, ry: 15, label: '30, 15' },
                  { rx: 15, ry: 30, label: '15, 30' },
                  { rx: 40, ry: 20, label: '40, 20' },
                  { rx: 20, ry: 40, label: '20, 40' },
                ];

                for (let i = 0; i < ellipses.length; i++) {
                  const x = 50 + i * 90;
                  c.ellipse(x, 120, ellipses[i].rx, ellipses[i].ry, {
                    fillColor: '#27ae60', strokeColor: '#1e8449', strokeWidth: 2,
                  });
                  c.text(x - 20, 200, ellipses[i].label, { fillColor: '#666', fontSize: 10 });
                }

                c.text(20, 240, 'c.ellipse(x, y, radiusX, radiusY, options)', {
                  fillColor: '#7f8c8d', fontSize: 10,
                });
              });
            });
          },
        },
        {
          title: 'Line',
          builder: renderShapeTab('Line', (g) => {
            g.line(-25, -15, 25, 15, { strokeColor: '#f39c12', strokeWidth: 3 });
          }, scales),
        },
        {
          title: 'Path',
          builder: () => {
            a.canvasStack(() => {
              cosyne(a, (c: CosyneContext) => {
                c.rect(0, 0, WIDTH, 280, { fillColor: '#f8f9fa' });

                c.text(20, 15, 'Path: Bezier curves at different scales', { fillColor: '#2c3e50', fontSize: 14 });

                const scales = [0.6, 0.8, 1.0, 1.2];
                const labels = ['0.6x', '0.8x', '1x', '1.2x'];

                // Row 1: Quadratic bezier waves (Q command)
                c.text(20, 50, 'Q:', { fillColor: '#666', fontSize: 10 });
                for (let i = 0; i < scales.length; i++) {
                  const s = scales[i];
                  const cx = 80 + i * 105;
                  const cy = 65;
                  const w = 35 * s;
                  const h = 25 * s;
                  c.path(`M ${cx - w},${cy} Q ${cx},${cy - h} ${cx + w},${cy}`, {
                    strokeColor: '#3498db', strokeWidth: 2, fillColor: 'transparent',
                  });
                }

                // Row 2: Cubic bezier S-curves (C command)
                c.text(20, 120, 'C:', { fillColor: '#666', fontSize: 10 });
                for (let i = 0; i < scales.length; i++) {
                  const s = scales[i];
                  const cx = 80 + i * 105;
                  const cy = 135;
                  const w = 30 * s;
                  const h = 20 * s;
                  c.path(`M ${cx - w},${cy} C ${cx - w / 2},${cy - h} ${cx + w / 2},${cy + h} ${cx + w},${cy}`, {
                    strokeColor: '#e74c3c', strokeWidth: 2, fillColor: 'transparent',
                  });
                }

                // Row 3: Closed heart-ish shapes
                c.text(20, 185, 'Z:', { fillColor: '#666', fontSize: 10 });
                for (let i = 0; i < scales.length; i++) {
                  const s = scales[i];
                  const cx = 80 + i * 105;
                  const cy = 200;
                  const sz = 18 * s;
                  c.path(`M ${cx},${cy - sz} C ${cx + sz * 1.5},${cy - sz} ${cx + sz * 1.5},${cy + sz * 0.5} ${cx},${cy + sz} C ${cx - sz * 1.5},${cy + sz * 0.5} ${cx - sz * 1.5},${cy - sz} ${cx},${cy - sz} Z`, {
                    strokeColor: '#9b59b6', strokeWidth: 2, fillColor: 'rgba(155, 89, 182, 0.2)',
                  });
                  c.text(cx - 12, 240, labels[i], { fillColor: '#666', fontSize: 9 });
                }

                c.text(20, 265, 'Q=quadratic, C=cubic, Z=close path', {
                  fillColor: '#7f8c8d', fontSize: 10,
                });
              });
            });
          },
        },
      ]);
    });
  }

  // Tab 7: Patterns
  function renderPattern() {
    a.canvasStack(() => {
      cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, WIDTH, HEIGHT, { fillColor: '#f8f9fa' });

        c.text(20, 15, 'Patterns with Groups', {
          fillColor: '#2c3e50', fontSize: 16,
        });
        c.text(20, 50, 'Generate repetitive patterns using loops + group()', {
          fillColor: '#7f8c8d', fontSize: 12,
        });

        c.text(20, 80, 'Grid:', { fillColor: '#333', fontSize: 12 });
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 6; col++) {
            c.group(80 + col * 35, 115 + row * 35, (g) => {
              const hue = (row * 6 + col) * 15;
              g.circle(0, 0, 12, {
                fillColor: `hsl(${hue}, 70%, 60%)`,
                strokeColor: `hsl(${hue}, 70%, 40%)`,
                strokeWidth: 1,
              });
            });
          }
        }

        c.text(320, 80, 'Radial:', { fillColor: '#333', fontSize: 12 });
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          c.group(400 + Math.cos(angle) * 55, 170 + Math.sin(angle) * 55, (g) => {
            g.circle(0, 0, 10, {
              fillColor: `hsl(${i * 30}, 70%, 60%)`,
              strokeColor: `hsl(${i * 30}, 70%, 40%)`,
              strokeWidth: 1,
            });
          });
        }

        c.text(20, 275, 'Rotated squares:', { fillColor: '#333', fontSize: 12 });
        for (let i = 0; i < 8; i++) {
          c.transform({ translate: [100 + i * 50, 330], rotate: (i * Math.PI) / 8 }, (g) => {
            g.rect(-15, -15, 30, 30, {
              fillColor: `hsl(${i * 45}, 60%, 55%)`,
              strokeColor: `hsl(${i * 45}, 60%, 35%)`,
              strokeWidth: 1,
            });
          });
        }
      });
    });
  }

  // Tab 8: Rounded corners
  function renderRounded() {
    a.canvasStack(() => {
      cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, WIDTH, HEIGHT, { fillColor: '#f8f9fa' });

        c.text(20, 15, 'Corner Radius on Rectangles', {
          fillColor: '#2c3e50', fontSize: 16,
        });
        c.text(20, 50, 'cornerRadius option softens sharp corners', {
          fillColor: '#7f8c8d', fontSize: 12,
        });

        // Row 1: Squares with increasing corner radius
        c.text(20, 80, 'Square:', { fillColor: '#333', fontSize: 11 });
        const radii = [0, 4, 8, 12, 20];
        for (let i = 0; i < radii.length; i++) {
          const x = 80 + i * 85;
          c.rect(x - 25, 90, 50, 50, {
            fillColor: '#3498db', strokeColor: '#2980b9', strokeWidth: 2,
            cornerRadius: radii[i],
          });
          c.text(x - 10, 150, `r=${radii[i]}`, { fillColor: '#666', fontSize: 9 });
        }

        // Row 2: Wide rectangles
        c.text(20, 170, 'Wide:', { fillColor: '#333', fontSize: 11 });
        for (let i = 0; i < radii.length; i++) {
          const x = 80 + i * 85;
          c.rect(x - 35, 180, 70, 35, {
            fillColor: '#e74c3c', strokeColor: '#c0392b', strokeWidth: 2,
            cornerRadius: radii[i],
          });
        }

        // Row 3: Tall rectangles
        c.text(20, 235, 'Tall:', { fillColor: '#333', fontSize: 11 });
        for (let i = 0; i < radii.length; i++) {
          const x = 80 + i * 85;
          c.rect(x - 17, 245, 35, 70, {
            fillColor: '#9b59b6', strokeColor: '#8e44ad', strokeWidth: 2,
            cornerRadius: radii[i],
          });
        }

        // Code hint
        c.rect(20, 325, 460, 40, { fillColor: '#ecf0f1', strokeColor: '#bdc3c7', strokeWidth: 1 });
        c.text(30, 340, 'c.rect(x, y, w, h, { cornerRadius: 8 })  // 0 = sharp, high = pill', {
          fillColor: '#2c3e50', fontSize: 11,
        });
      });
    });
  }

  const renderContent = () => {
    a.vbox(() => {
      // Native Fyne tabs - each with its own canvas
      a.tabs([
        { title: 'Basic Groups', builder: renderBasicGroups },
        { title: 'Nested', builder: renderNestedGroups },
        { title: 'Buttons', builder: renderButtons },
        { title: 'Rotation', builder: renderRotation },
        { title: 'Compound', builder: renderCompound },
        { title: 'Scale', builder: renderScale },
        { title: 'Rounded', builder: renderRounded },
        { title: 'Patterns', builder: renderPattern },
      ]);

      a.label('group(x, y, fn) = transform({ translate: [x, y] }, fn)');
    });
  };

  // Animation loop for rotation tab - direct primitive updates (no flicker)
  const animate = async () => {
    while (true) {
      animationAngle += 0.03;
      updateAnimatedPrimitives();
      await new Promise((r) => setTimeout(r, 32));
    }
  };

  a.window(
    {
      title: 'Transform & Group Showcase',
      width: WIDTH + 40,
      height: HEIGHT + 80,
    },
    (win: any) => {
      win.setContent(renderContent);
      win.show();
      setTimeout(animate, 100);
    }
  );
}

// Main entry point
if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Transform Demo' }, createTransformDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

export { createTransformDemo };
