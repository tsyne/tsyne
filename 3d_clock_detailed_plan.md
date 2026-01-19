# 3D Clock Demo - Detailed Implementation Plan

## Goal
Create `examples/cosyne3d-clock.ts`, a fully 3D analog clock that demonstrates **continuous animation loops** combined with **precise time-based rotation bindings**.

## Core Concepts to Showcase
1.  **Time-Based Bindings**: Binding rotation directly to `Date` components (hours, minutes, seconds).
2.  **Hierarchy**: Hands rotating around a common center.
3.  **Camera Controls**: Orbiting the clock to view depth (hands stacked on top of each other).

## Desired Code Style (Pseudo-Declarative)

```typescript
// Observable Time Store
const timeState = {
  now: new Date()
};

// Update loop (1 FPS is enough for second hand, but 60FPS is smoother)
setInterval(() => {
  timeState.now = new Date();
  refreshAllCosyne3dContexts();
}, 1000); // or 16ms for smooth sweep

app(resolveTransport(), { title: '3D Clock' }, (a) => {
  a.window({ width: 600, height: 600 }, (win) => {
    
    // Camera State for Orbiting
    const cameraState = { theta: 0, phi: Math.PI/2, radius: 15 };

    const scene = cosyne3d(a, (ctx) => {
      ctx.setCamera({ fov: 45 }).bindPosition(() => /* calc from cameraState */);

      // Clock Face
      ctx.cylinder({ radius: 5, height: 0.2, color: '#eee', rotation: [Math.PI/2, 0, 0] }); // Flat disk
      
      // Hour Markers (12 boxes)
      for (let i = 0; i < 12; i++) {
         const angle = (i / 12) * Math.PI * 2;
         const x = Math.sin(angle) * 4.5;
         const y = Math.cos(angle) * 4.5;
         ctx.box({ size: [0.2, 0.5, 0.1], position: [x, y, 0.2], color: '#333' })
            .setRotation([0, 0, -angle]);
      }

      // Hour Hand
      ctx.box({ size: [0.3, 3, 0.1], color: '#333' })
         .bindRotation(() => {
            const hrs = timeState.now.getHours() % 12;
            const mins = timeState.now.getMinutes();
            const angle = ((hrs + mins/60) / 12) * Math.PI * 2;
            return [0, 0, -angle];
         })
         .setPosition([0, 0, 0.3]); // Stacked Z

      // Minute Hand
      ctx.box({ size: [0.2, 4.5, 0.1], color: '#666' })
         .bindRotation(() => {
            const mins = timeState.now.getMinutes();
            const angle = (mins / 60) * Math.PI * 2;
            return [0, 0, -angle];
         })
         .setPosition([0, 0, 0.4]); // Stacked Z higher

      // Second Hand
      ctx.box({ size: [0.1, 4.8, 0.1], color: '#f00' })
         .bindRotation(() => {
            const secs = timeState.now.getSeconds();
            const angle = (secs / 60) * Math.PI * 2;
            return [0, 0, -angle];
         })
         .setPosition([0, 0, 0.5]); // Stacked Z highest
    });

    // Interaction Layer (Reused from Orbit/Zoom demo)
    a.max(() => {
        a.canvasStack(() => scene.render(a));
        a.tappableCanvasRaster(..., {
           onDrag: (dx, dy) => { /* Update cameraState */ },
           onScroll: (dx, dy) => { /* Zoom */ }
        });
    });
  });
});
```

## Implementation Steps
1.  **Scaffold**: `examples/cosyne3d-clock.ts`.
2.  **Clock Logic**: Implement the math to convert Time -> Angles. Note that 0 degrees is usually "Up" (12 o'clock), but in standard trigonometry (and Cosyne), 0 is often Right (3 o'clock) or depends on axis. Adjust math accordingly (e.g., subtract Math.PI/2).
3.  **Visuals**: Use `cylinder` for the face and `box` for hands. Ensure Z-fighting is avoided by stacking them on the Z-axis (0.2, 0.3, 0.4, 0.5).
4.  **Smoothness**: Decide between "ticking" (1 sec updates) or "sweeping" (continuous updates). Sweeping looks better in 3D.

## Specific Requirements
*   **Center Pin**: Add a small cylinder/sphere at (0,0,0) to cap the hands.
*   **Orbit Controls**: Must be zoomable and rotatable to inspect the "stack" of hands from the side.
