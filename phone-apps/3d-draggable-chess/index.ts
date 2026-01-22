#!/usr/bin/env npx tsx
/**
 * Cosyne 3D Demo: Draggable Chess
 *
 * Demonstrates:
 * - Raycasting from camera (pixelToRay)
 * - Ray-plane intersection for ground positioning
 * - Object picking and dragging
 * - Snap-to-grid functionality
 * - Material changes during drag (highlighting)
 * - Interactive camera controls
 *
 * @tsyne-app:name Draggable Chess
 * @tsyne-app:icon content-paste
 * @tsyne-app:category Demos
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport } from '../../core/src/index';
import { cosyne3d, refreshAllCosyne3dContexts, Cosyne3dContext } from '../../cosyne/src/index3d';
import { Vector3 } from '../../cosyne/src/math3d';

// ==================== Types ====================

interface DraggableObject {
  id: string;
  pos: [number, number, number];
  color: string;
  type: 'sphere' | 'box' | 'cylinder';
  isDragging: boolean;
}

interface DragState {
  object: DraggableObject | null;
  offset: [number, number];  // Offset from object center to click point on ground
}

// ==================== State ====================

// Draggable objects (chess-like pieces)
const objects: DraggableObject[] = [
  // White pieces (spheres - like pawns)
  { id: 'w1', pos: [-3, 0.5, 3], color: '#ffffff', type: 'sphere', isDragging: false },
  { id: 'w2', pos: [-1, 0.5, 3], color: '#ffffff', type: 'sphere', isDragging: false },
  { id: 'w3', pos: [1, 0.5, 3], color: '#ffffff', type: 'sphere', isDragging: false },
  { id: 'w4', pos: [3, 0.5, 3], color: '#ffffff', type: 'sphere', isDragging: false },
  // Black pieces (cylinders - like rooks)
  { id: 'b1', pos: [-3, 0.5, -3], color: '#333333', type: 'cylinder', isDragging: false },
  { id: 'b2', pos: [3, 0.5, -3], color: '#333333', type: 'cylinder', isDragging: false },
  // Special pieces (boxes - like kings)
  { id: 'king-w', pos: [0, 0.75, 3], color: '#ffd700', type: 'box', isDragging: false },
  { id: 'king-b', pos: [0, 0.75, -3], color: '#8b4513', type: 'box', isDragging: false },
];

// Drag state
const dragState: DragState = {
  object: null,
  offset: [0, 0],
};

// UI state
let snapToGrid = true;
let statusText = 'Click and drag pieces to move them. Scroll to zoom, drag empty space to orbit.';

// Camera state (spherical coordinates)
const cameraState = {
  radius: 18,
  theta: Math.PI / 4,      // Azimuth
  phi: Math.PI / 3,        // Elevation (angle from Y axis)
  lookAt: [0, 0, 0] as [number, number, number],
};

// ==================== Helper Functions ====================

/**
 * Get camera position from spherical coordinates
 */
function getCameraPosition(): [number, number, number] {
  const x = cameraState.radius * Math.sin(cameraState.phi) * Math.cos(cameraState.theta);
  const z = cameraState.radius * Math.sin(cameraState.phi) * Math.sin(cameraState.theta);
  const y = cameraState.radius * Math.cos(cameraState.phi);
  return [x, y, z];
}

/**
 * Cast a ray from pixel coordinates and find intersection with ground plane (y=0)
 */
function getGroundIntersection(
  scene: Cosyne3dContext,
  screenX: number,
  screenY: number,
  width: number,
  height: number
): [number, number, number] | null {
  const camera = scene.getCamera();
  const ray = camera.pixelToRay(screenX, screenY, width, height);

  // Ground plane: y = 0, normal = (0, 1, 0)
  const planeNormal = new Vector3(0, 1, 0);
  const planePoint = new Vector3(0, 0, 0);

  const t = ray.intersectPlane(planeNormal, planePoint);

  if (t === null || t < 0) {
    return null;
  }

  const hit = ray.at(t);
  return [hit.x, 0, hit.z];
}

/**
 * Snap a position to grid (integer coordinates)
 */
function snapPosition(x: number, z: number): [number, number] {
  if (!snapToGrid) {
    return [x, z];
  }
  // Snap to odd integers for chess-like grid
  return [Math.round(x / 2) * 2 - 1, Math.round(z / 2) * 2 - 1];
}

/**
 * Get object height based on type
 */
function getObjectHeight(type: DraggableObject['type']): number {
  switch (type) {
    case 'sphere': return 0.5;
    case 'box': return 0.75;
    case 'cylinder': return 0.5;
    default: return 0.5;
  }
}

// ==================== App Builder ====================

export function buildDraggableChessApp(a: any) {
  a.window({ title: 'Draggable Chess', width: 900, height: 700 }, (win: any) => {
    const width = 900;
    const height = 600;

    // Create the 3D scene
    const scene = cosyne3d(a, (ctx) => {
      // Configure camera
      ctx.setCamera({
        fov: 60,
        lookAt: cameraState.lookAt,
      }).bindPosition(() => getCameraPosition());

      // Lighting
      ctx.light({ type: 'ambient', intensity: 0.4 });
      ctx.light({ type: 'directional', direction: [-0.5, -1, -0.5], intensity: 0.7 });
      ctx.light({ type: 'point', position: [0, 10, 0], intensity: 0.3 });

      // Checkerboard ground
      const boardSize = 4;  // 8x8 grid
      for (let x = -boardSize; x < boardSize; x++) {
        for (let z = -boardSize; z < boardSize; z++) {
          const isWhite = (x + z) % 2 === 0;
          ctx.box({
            size: [2, 0.1, 2],
            position: [x * 2 + 1, -0.05, z * 2 + 1],
            material: {
              color: isWhite ? '#f0d9b5' : '#b58863',
              shininess: 20,
            },
          })
            .withId(`tile-${x}-${z}`)
            .passthrough(true);  // Don't pick tiles when clicking
        }
      }

      // Board border
      ctx.box({
        size: [17, 0.2, 17],
        position: [0, -0.15, 0],
        material: { color: '#654321', shininess: 10 },
      })
        .withId('board-border')
        .passthrough(true);

      // Draggable objects
      for (const obj of objects) {
        const baseOptions = {
          position: obj.pos,
        };

        const getMaterial = () => {
          if (obj.isDragging) {
            return {
              color: obj.color,
              emissive: '#ffff00',
              emissiveIntensity: 0.5,
              shininess: 100,
            };
          }
          return {
            color: obj.color,
            shininess: 50,
          };
        };

        let primitive: any;

        switch (obj.type) {
          case 'sphere':
            primitive = ctx.sphere({ ...baseOptions, radius: 0.5 });
            break;
          case 'box':
            primitive = ctx.box({ ...baseOptions, size: [1, 1.5, 1] });
            break;
          case 'cylinder':
            primitive = ctx.cylinder({ ...baseOptions, radiusTop: 0.3, radiusBottom: 0.5, height: 1 });
            break;
        }

        primitive
          .withId(obj.id)
          .bindPosition(() => obj.pos)
          .bindMaterial(getMaterial)
          .bindScale(() => obj.isDragging ? 1.1 : 1.0)
          .onClick(() => {
            // Select this object for dragging handled by tap event
          });
      }
    }, {
      width,
      height,
      backgroundColor: '#2a3f5f',
    });

    // Refresh bindings to apply initial positions
    refreshAllCosyne3dContexts();

    // Content render function
    const refreshAndRender = () => {
      refreshAllCosyne3dContexts();
      win.setContent(renderContent);
    };

    const renderContent = () => {
      a.vbox(() => {
        // Control bar
        a.hbox(() => {
          a.label(statusText).withId('status-label');
          a.spacer();
          const snapCheckbox = a.checkbox('Snap to Grid', (checked: boolean) => {
            snapToGrid = checked;
            statusText = `Snap to grid: ${snapToGrid ? 'ON' : 'OFF'}`;
            refreshAndRender();
          }).withId('snap-checkbox');
          // Set initial checked state
          snapCheckbox.setChecked(snapToGrid);

          a.button('Reset').withId('reset-btn').onClick(() => {
            // Reset all piece positions
            objects[0].pos = [-3, 0.5, 3];
            objects[1].pos = [-1, 0.5, 3];
            objects[2].pos = [1, 0.5, 3];
            objects[3].pos = [3, 0.5, 3];
            objects[4].pos = [-3, 0.5, -3];
            objects[5].pos = [3, 0.5, -3];
            objects[6].pos = [0, 0.75, 3];
            objects[7].pos = [0, 0.75, -3];

            for (const obj of objects) {
              obj.isDragging = false;
            }
            dragState.object = null;
            statusText = 'Board reset. Drag pieces to move them.';
            refreshAndRender();
          });
        });

        a.separator();

        // 3D viewport
        a.max(() => {
          a.canvasStack(() => {
            scene.render(a);
          });

          // Transparent overlay for mouse events
          a.tappableCanvasRaster(width, height, {
            onTap: async (x: number, y: number) => {
              // Try to pick an object
              const hits = scene.raycastFromPixel(x, y);

              if (hits.length > 0) {
                const hitId = hits[0].primitive.getId();
                const obj = objects.find(o => o.id === hitId);

                if (obj) {
                  statusText = `Selected: ${obj.id} (${obj.type})`;
                  refreshAndRender();
                }
              }
            },
            onDragStart: (x: number, y: number) => {
              // Check if we're clicking on an object
              const hits = scene.raycastFromPixel(x, y);

              if (hits.length > 0) {
                const hitId = hits[0].primitive.getId();
                const obj = objects.find(o => o.id === hitId);

                if (obj) {
                  // Start dragging this object
                  obj.isDragging = true;
                  dragState.object = obj;

                  // Calculate offset
                  const groundPos = getGroundIntersection(scene, x, y, width, height);
                  if (groundPos) {
                    dragState.offset = [
                      obj.pos[0] - groundPos[0],
                      obj.pos[2] - groundPos[2],
                    ];
                  }

                  statusText = `Dragging: ${obj.id}`;
                  refreshAndRender();
                  return;  // Don't do camera orbit
                }
              }

              // Not clicking on object - prepare for camera orbit (handled in onDrag)
            },
            onDrag: (x: number, y: number, deltaX: number, deltaY: number) => {
              if (dragState.object) {
                // Dragging an object - update its position based on ground intersection
                const groundPos = getGroundIntersection(scene, x, y, width, height);

                if (groundPos) {
                  let newX = groundPos[0] + dragState.offset[0];
                  let newZ = groundPos[2] + dragState.offset[1];

                  // Apply snap-to-grid
                  if (snapToGrid) {
                    [newX, newZ] = snapPosition(newX, newZ);
                  }

                  // Clamp to board bounds
                  newX = Math.max(-7, Math.min(7, newX));
                  newZ = Math.max(-7, Math.min(7, newZ));

                  // Update position (keep y based on object height)
                  const objHeight = getObjectHeight(dragState.object.type);
                  dragState.object.pos = [newX, objHeight, newZ];

                  statusText = `Moving ${dragState.object.id} to (${newX.toFixed(1)}, ${newZ.toFixed(1)})`;
                  refreshAndRender();
                }
              } else {
                // Camera orbit
                const sensitivity = 0.01;
                cameraState.theta -= deltaX * sensitivity;
                cameraState.phi -= deltaY * sensitivity;

                // Clamp phi to avoid flipping
                const epsilon = 0.1;
                cameraState.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraState.phi));

                refreshAndRender();
              }
            },
            onDragEnd: () => {
              if (dragState.object) {
                const obj = dragState.object;
                obj.isDragging = false;
                statusText = `Placed ${obj.id} at (${obj.pos[0].toFixed(1)}, ${obj.pos[2].toFixed(1)})`;
                dragState.object = null;
                refreshAndRender();
              }
            },
            onScroll: (dx: number, dy: number) => {
              // Zoom controls
              const zoomSpeed = 0.05;
              const factor = 1 + (dy > 0 ? 1 : -1) * zoomSpeed;

              cameraState.radius *= factor;
              cameraState.radius = Math.max(5, Math.min(50, cameraState.radius));

              refreshAndRender();
            },
          }).setPixelBuffer(new Uint8Array(width * height * 4));
        });

        // Instructions
        a.label('Controls: Drag pieces to move | Drag empty space to orbit camera | Scroll to zoom', 'instructions');
      });
    };

    // Initial render
    refreshAndRender();
    win.show();
  });
}

// ==================== Main ====================

if (require.main === module) {
  app(resolveTransport(), { title: 'Draggable Chess' }, buildDraggableChessApp);
}
