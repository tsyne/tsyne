# Lighting Lab Demo - Detailed Implementation Plan

## Goal
Create `cosyne3d-lighting-lab.ts` to showcase Tsyne's material system, shading models, and dynamic lighting.

## Core Concepts to Showcase
1.  **Multiple Light Types**: Ambient, Directional, and Point lights interacting.
2.  **Material Properties**: How `shininess` (specular), `emissive`, and `color` (diffuse) interact with lights.
3.  **Dynamic Updates**: Moving lights around the scene to show real-time shading changes.

## Desired Code Style (Pseudo-Declarative)

```typescript
const labState = {
  material: 'gold', // gold, plastic, glass
  lightColor: '#ffffff',
  lightOrbitSpeed: 0.02,
  lightAngle: 0
};

app(resolveTransport(), { title: 'Lighting Lab' }, (a) => {
  
  // Animation Loop for lights
  setInterval(() => {
     labState.lightAngle += labState.lightOrbitSpeed;
     refreshAllCosyne3dContexts();
  }, 16);

  a.window({ width: 800, height: 600 }, (win) => {
    
    const scene = cosyne3d(a, (ctx) => {
      ctx.setCamera({ position: [0, 5, 10], lookAt: [0, 0, 0] });
      
      // 1. Moving Point Light (The "Sun")
      ctx.light({ type: 'point', intensity: 1.5 })
         .bindPosition(() => [
            Math.sin(labState.lightAngle) * 8, 
            5, 
            Math.cos(labState.lightAngle) * 8
         ])
         .bindColor(() => labState.lightColor);

      // Visual marker for the light
      ctx.sphere({ radius: 0.2 })
         .bindPosition(() => [
            Math.sin(labState.lightAngle) * 8, 
            5, 
            Math.cos(labState.lightAngle) * 8
         ])
         .setMaterial({ emissive: '#ffffff', color: '#000000' });

      // 2. Central Object (The Subject)
      // Use a sphere with high polygon count for smooth shading
      ctx.sphere({ radius: 2 })
         .bindMaterial(() => {
            switch(labState.material) {
               case 'gold': return Materials.gold();
               case 'plastic': return Materials.redPlastic(); // Define this preset
               case 'matte': return { color: '#888888', shininess: 0 };
               default: return Materials.gold();
            }
         });

      // 3. Ground Plane (to see shadows/lighting falloff)
      ctx.plane({ size: 20, color: '#222' });
    });

    // UI Controls
    win.setContent(() => {
       a.hbox(() => {
          a.canvasStack(() => scene.render(a));
          
          // Sidebar
          a.vbox(() => {
             a.label('Material');
             a.button('Gold').onClick(() => { labState.material = 'gold'; refresh(); });
             a.button('Plastic').onClick(() => { labState.material = 'plastic'; refresh(); });
             a.button('Matte').onClick(() => { labState.material = 'matte'; refresh(); });
             
             a.label('Light Color');
             a.button('White').onClick(() => { labState.lightColor = '#ffffff'; });
             a.button('Red').onClick(() => { labState.lightColor = '#ff0000'; });
             a.button('Blue').onClick(() => { labState.lightColor = '#0000ff'; });
          });
       });
    });
  });
});
```

## Implementation Steps
1.  **Material Presets**: Verify `Materials` class in `cosyne/src/material.ts` has necessary presets (`gold`, `silver`, etc.). Add `plastic` (high specular, low ambient) if missing.
2.  **Light Binding**: Ensure `Light` class supports `.bindPosition()` and `.bindColor()`. (If not, implement them or update `Cosyne3dContext` to allow refreshing lights).
3.  **Shading Logic**: Verify `Renderer3D` (software renderer) actually implements point lights correctly.
    *   *Note:* Software rendering of point lights requires calculating the vector from *every pixel* (or vertex) to the light source. Ensure performance is acceptable (maybe limit tessellation).
4.  **Scaffold**: `examples/cosyne3d-lighting-lab.ts`.

## Specific Requirements
*   Showcase **Specular Highlights**: The moving light must create a shiny spot on the sphere that moves. This proves the normal vectors are correct.
*   **Shadows** (Optional/Advanced): If the engine supports shadow mapping (even simple blob shadows), enable it. If not, don't fake it poorly.
