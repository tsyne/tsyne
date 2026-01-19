# Draggable Chess Demo - Detailed Implementation Plan

## Goal
Create an interactive 3D demo (`cosyne3d-drag-objects.ts`) where users can drag 3D objects along a ground plane. This validates raycasting, coordinate unprojection, and object picking.

## Core Concepts to Showcase
1.  **Raycasting from Camera**: Converting 2D screen coordinates (mouse) into a 3D ray.
2.  **Plane Intersection**: Mathematically finding where that ray hits the ground plane ($y=0$).
3.  **Object Picking**: Determining which object was clicked (`.onClick` / `.onDragStart`).
4.  **Drag Logic**: Updating object position based on the intersection point of the ray with the drag plane.

## Desired Code Style (Pseudo-Declarative)

```typescript
interface DraggableObject {
  id: string;
  pos: [number, number, number];
  color: string;
  type: 'sphere' | 'box' | 'cone';
}

const objects: DraggableObject[] = [
  { id: 'p1', pos: [-5, 0, 0], color: '#f00', type: 'sphere' },
  { id: 'p2', pos: [5, 0, 0], color: '#00f', type: 'box' }
];

// Helper to find ground intersection
// (Should be part of framework eventually, but implement here for demo)
function getGroundIntersection(ctx: Cosyne3dContext, screenX: number, screenY: number): [number, number, number] {
  // 1. Get ray from camera
  const ray = ctx.getCamera().pixelToRay(screenX, screenY);
  // 2. Intersect with plane y=0
  // t = -origin.y / direction.y
  if (Math.abs(ray.direction.y) < 0.001) return [0,0,0]; // Parallel
  const t = -ray.origin.y / ray.direction.y;
  const hit = ray.at(t);
  return [hit.x, 0, hit.z];
}

app(resolveTransport(), { title: '3D Drag' }, (a) => {
  a.window({ width: 800, height: 600 }, (win) => {
    
    const scene = cosyne3d(a, (ctx) => {
      ctx.setCamera({ position: [0, 15, 15], lookAt: [0, 0, 0] });
      
      // Checkerboard Ground
      ctx.box({ size: [20, 0.1, 20], position: [0, -0.05, 0], color: '#eee' })
         .onDrag((hit, delta) => { 
            // Optional: Pan camera if dragging ground?
         });

      // Draggable Objects
      for (const obj of objects) {
        // Builder helper based on type
        const builder = obj.type === 'sphere' ? ctx.sphere({ radius: 1 }) : ctx.box({ size: 2 });
        
        builder
          .bindPosition(() => obj.pos) // Reactive position
          .setMaterial({ color: obj.color })
          // Enable dragging
          .onDrag((hit, delta) => { 
             // This is the tricky part - 'delta' is usually 2D screen delta.
             // We need 3D world delta.
             // Better pattern: track drag start intersection vs current intersection.
          });
      }
    });

    // Interaction Layer
    a.max(() => {
        a.canvasStack(() => scene.render(a));
        
        // Input Handling
        // We need to bridge the Tsyne 2D events to the 3D scene manually for complex drags
        // OR rely on Cosyne's internal event router if it supports dragging.
        // Assuming we implement a robust 'onDrag' in the scene:
        
        a.tappableCanvasRaster(800, 600, {
           onDrag: (x, y) => {
              // Calculate new ground position
              const groundPos = getGroundIntersection(scene, x, y);
              
              if (draggingObject) {
                 // Snap object to grid?
                 draggingObject.pos = [groundPos[0], 0, groundPos[2]];
                 refreshAllCosyne3dContexts();
              }
           },
           // ... onTap to select object ...
        });
    });
  });
});
```

## Implementation Steps
1.  **Scaffold**: `examples/cosyne3d-drag-objects.ts`.
2.  **Ray-Plane Intersection**: Implement `getGroundIntersection`. This is pure math using the camera matrices.
3.  **State Management**: Track `selectedObject` and `dragOffset` (offset from object center to click point) to prevent snapping center-to-mouse.
4.  **Event Loop**:
    *   `onTap` (Raster): Raycast scene. If object hit, set `draggingObject`.
    *   `onDrag` (Raster): Raycast ground plane. Update `draggingObject.pos`.
    *   `onDragEnd` (Raster): Clear `draggingObject`.
5.  **Visuals**: Use a checkerboard floor texture or grid to make movement obvious.

## Specific Requirements
*   **Snap-to-grid**: Implement an optional "snap" mode (e.g., toggle with a button) where objects snap to integer coordinates (like Chess).
*   **Highlighting**: Change material color/emissive when an object is being dragged.
