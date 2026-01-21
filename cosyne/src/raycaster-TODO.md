# Cosyne Raycaster Evolution Plan

This plan outlines the steps to evolve the generic `cosyne/src/raycaster.ts` into a feature-rich 2.5D rendering engine capable of replacing the specialized renderer in `ported-apps/tsyet-another-doom-clone`. The goal is to perform this as a "cleanroom" implementation—building capabilities incrementally without copying the game-specific code verbatim, ensuring a robust and reusable shared library.

## Phase 1: Core Architecture Refactoring

1.  **Extract Math Dependencies:** [x]
    *   Refactor `Raycaster` to import `rayLineIntersect2D` and `Vector3` operations from `math3d.ts` instead of using internal private implementations.
    *   *Goal:* Eliminate code duplication within the library itself.

2.  **Buffers & Context Separation:** [x]
    *   Decouple the rendering context (camera, scene) from the pixel buffer management.
    *   Create a `RenderContext` interface that holds the depth buffer and camera state, allowing for multiple render passes (e.g., world pass, sprite pass, HUD pass).
    *   *Goal:* Flexible pipeline for complex scenes.

## Phase 2: Material & Texture System

3.  **Material Interface:** [x]
    *   Replace simple `[r,g,b]` colors with a `RaycasterMaterial` interface.
    *   Support `type: 'solid' | 'texture' | 'procedural'`.
    *   *Goal:* Unified way to handle different surface types.

4.  **Texture Sampling Support:** [x]
    *   Implement texture mapping support in the wall rendering loop.
    *   Add `u` (horizontal) and `v` (vertical) coordinate calculation for wall strips.
    *   Implement efficient texture sampling (nearest neighbor or bilinear) from a `Texture` interface.
    *   *Goal:* Basic textured walls.

5.  **Procedural Texture Support:** [x]
    *   Allow materials to provide a `sample(u, v)` function instead of a static bitmap.
    *   This enables the "brick" and "tile" generation used in the Doom clone without hardcoding them into the engine.
    *   *Goal:* Support dynamic/generated textures.

## Phase 3: Advanced Camera Features

6.  **Camera Roll (Z-Rotation):** [x]
    *   Add `roll` property to `RaycasterCamera`.
    *   Update the rendering loop to calculate per-column horizon offsets based on roll angle.
    *   *Goal:* Support the "leaning" effect when strafing/turning.

7.  **Vertical Bobbing:** [x]
    *   Ensure camera `height` parameter is correctly factored into the projection math for both walls and sprites.
    *   Verify that changing height per-frame correctly simulates walking bob.
    *   *Goal:* Immersive movement feel.

## Phase 4: Floor & Ceiling Rendering

8.  **Variable Height Sectors (Foundations):** [x]
    *   Instead of hardcoded `floorZ=0`, allow sectors to define floor/ceiling heights.
    *   (Note: Full sector rendering is complex; start by just correctly rendering the floor plane relative to camera Z).

9.  **Textured Floors/Ceilings:** [x]
    *   Implement a "mode 7" style floor casting loop.
    *   Reuse the `RaycasterMaterial` system to allow textured floors.
    *   Implement correct perspective mapping for floors, including support for camera roll (rotating the floor plane).
    *   *Goal:* Replace solid color floors with tiled textures.

## Phase 5: Enhanced Sprite & Model Rendering

10. **Sprite Scaling & Lighting:** [x]
    *   Refine sprite rendering to support distance-based shading (fog/dimming) consistent with walls.
    *   Ensure sprite scaling matches wall perspective exactly.

11. **Procedural Model Support (The "Gun" & "Enemies"):** [x]
    *   The Doom clone renders enemies and guns using compositions of 3D primitives (boxes, cylinders) projected into 2.5D space.
    *   Instead of hardcoding "Gun" or "Enemy", implement a `RenderableObject` interface.
    *   Create `BoxRenderer` and `CylinderRenderer` helpers that project 3D shapes to the 2D buffer using the raycaster's depth buffer for occlusion.
    *   *Goal:* Generic support for "voxel-like" or primitive-based 3D models in the 2.5D scene.

## Phase 6: Post-Processing & Effects

12. **Screen-Space Effects:** [x]
    *   Add support for full-screen color overlays (e.g., red flash on damage, yellow on shoot).
    *   Implement "Screen Shake" by allowing a render offset (x, y) applied during the final buffer copy or during ray generation.
    *   *Goal:* Visual feedback mechanisms.

## Phase 7: Integration Verification

13. **Compliance Test:** [x]
    *   Create a test suite that replicates the "Doom Clone" scene using *only* the new `cosyne/src/raycaster.ts` API.
    *   Verify performance matches or exceeds the specialized renderer.
    *   Verify visual fidelity (no floor tearing, correct texture wrapping).

14. **Migration:** [x]
    *   Refactor `ported-apps/tsyet-another-doom-clone` to import and use the shared raycaster.
    *   (Completed: Migrated `renderer.ts` to use `cosyne` Raycaster, created `texture-gen.ts` and `game-renderables.ts`, and updated `doom-game.ts` to use built-in screen shake).
    *   Delete the custom `renderer.ts` from the app (Refactored/Replaced instead of deleted).
