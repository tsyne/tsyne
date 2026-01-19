# Robot Arm Demo - Detailed Implementation Plan

## Goal
Create an interactive 3D robot arm simulation (`cosyne3d-robot-arm.ts`) that demonstrates hierarchical transforms (forward kinematics) using Cosyne 3D's pseudo-declarative API.

## Core Concepts to Showcase
1.  **Nested Transforms (`ctx.transform`)**: The shoulder moves relative to the base, the elbow relative to the shoulder, etc.
2.  **Reactive Bindings (`.bindRotation`)**: Connecting UI sliders directly to 3D object rotations.
3.  **Composite Objects**: Building complex shapes (like a claw) from multiple primitives grouped together.

## Desired Code Style (Pseudo-Declarative)

The implementation should look like this:

```typescript
// Robot State (Reactive Store or Simple Object)
const robotState = {
  baseRotation: 0,
  shoulderAngle: -0.5,
  elbowAngle: 0.8,
  clawOpen: 0.2
};

app(resolveTransport(), { title: 'Robot Arm' }, (a) => {
  a.window({ title: 'Robot Arm Kinematics', width: 1000, height: 800 }, (win) => {
    
    // 3D Scene Definition
    const scene = cosyne3d(a, (ctx) => {
      // Setup Camera & Lights
      ctx.setCamera({ position: [20, 20, 20], lookAt: [0, 5, 0] });
      ctx.light({ type: 'directional', direction: [-1, -1, -1] });

      // Ground Plane
      ctx.plane({ size: 40, color: '#333' });

      // --- ROBOT HIERARCHY ---
      
      // 1. Base (Static Cylinder)
      ctx.cylinder({ radius: 4, height: 2, color: '#555' });

      // 2. Turret (Rotates Y)
      ctx.transform({ translate: [0, 1, 0] }, (turret) => {
        // Apply rotation from state
        turret.bindRotation(() => [0, robotState.baseRotation, 0]); 
        
        // Turret Visual
        turret.box({ size: [5, 3, 5], color: '#777' });

        // 3. Shoulder Joint (Rotates X)
        turret.transform({ translate: [0, 1.5, 0] }, (shoulder) => {
          shoulder.bindRotation(() => [robotState.shoulderAngle, 0, 0]);
          
          // Upper Arm Visual
          shoulder.box({ size: [2, 8, 2], position: [0, 4, 0], color: '#999' }); // pivot at bottom

          // 4. Elbow Joint (Rotates X)
          shoulder.transform({ translate: [0, 8, 0] }, (elbow) => {
            elbow.bindRotation(() => [robotState.elbowAngle, 0, 0]);
            
            // Forearm Visual
            elbow.box({ size: [1.5, 6, 1.5], position: [0, 3, 0], color: '#AAA' });

            // 5. Wrist/Claw
            elbow.transform({ translate: [0, 6, 0] }, (wrist) => {
               // Claw visual composition...
               wrist.box({ size: [3, 1, 1], color: '#333' }); // Wrist bar
               // Left Finger
               wrist.box({ size: [0.5, 3, 0.5], position: [-1.5, 1.5, 0] })
                    .bindPosition(() => [-1.5 - robotState.clawOpen, 1.5, 0]);
               // Right Finger
               wrist.box({ size: [0.5, 3, 0.5], position: [1.5, 1.5, 0] })
                    .bindPosition(() => [1.5 + robotState.clawOpen, 1.5, 0]);
            });
          });
        });
      });
    });

    // 2D Controls (Overlay or Side Panel)
    const renderControls = () => {
      a.vbox(() => {
        // Scene View
        a.canvasStack(() => scene.render(a));
        
        // Controls
        a.hbox(() => {
          a.label('Base');
          a.slider(0, Math.PI * 2, (val) => { 
             robotState.baseRotation = val; 
             refreshAllCosyne3dContexts(); 
          }).setValue(robotState.baseRotation);
          
          a.label('Shoulder');
          a.slider(-Math.PI/2, Math.PI/2, (val) => {
             robotState.shoulderAngle = val;
             refreshAllCosyne3dContexts();
          }).setValue(robotState.shoulderAngle);
          
          // ... Elbow & Claw sliders
        });
      });
    };

    win.setContent(renderControls);
    win.show();
  });
});
```

## Implementation Steps
1.  **Scaffold App**: Create `examples/cosyne3d-robot-arm.ts`.
2.  **Define State**: Setup the simple state object.
3.  **Build Scene Graph**: Implement the nested `ctx.transform` hierarchy structure.
    *   **Crucial**: Ensure pivots are correct. A generic box rotates around its center. To make an arm rotate around a "joint", you must translate the box *inside* the transformed context so its "bottom" aligns with the origin (0,0,0).
4.  **Add Controls**: Use standard Tsyne sliders to drive the state.
5.  **Verify**: Ensure moving the base rotates the entire assembly, moving the shoulder keeps the elbow attached, etc.

## Specific Requirements
*   Use `cylinder` for joints/base.
*   Use `box` for arm segments.
*   Keep the math simple (Euler angles are fine for this demo).
*   **Do not** use imperative update loops if possible; rely on `refreshAllCosyne3dContexts()` triggered by slider callbacks.
