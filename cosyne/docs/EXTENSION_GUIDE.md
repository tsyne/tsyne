# Extension Guide: Customizing and Extending Raymarching Demos

Learn how to extend the raymarching demos with custom shapes, materials, lighting effects, and interactive features. This guide provides step-by-step tutorials with complete working examples.

> **Scope Note:** This guide covers **extending GPU raymarching demos** via **OpenGL/GLSL raymarching**.
>
> Related extension topics not covered here:
> - **Canvas 2D extensions**: Adding to 2D primitive demos, data visualization extensions (planned CANVAS2D_GUIDE.md)
> - **Architecture patterns**: Mixing Canvas 2D and GPU rendering in single demo (planned COSYNE_ARCHITECTURE.md)
> - **System integration**: Using both rendering paths effectively (planned BACKEND_COMPARISON.md)

## Table of Contents

1. [Adding a New SDF Primitive](#adding-a-new-sdf-primitive)
2. [Creating Custom Materials](#creating-custom-materials)
3. [Implementing New Lighting Effects](#implementing-new-lighting-effects)
4. [Building a New Scene](#building-a-new-scene)
5. [Advanced Extensions](#advanced-extensions)
6. [Troubleshooting](#troubleshooting)

---

## Adding a New SDF Primitive

Let's walk through adding a pyramid to the raymarching-intro demo as a complete, working example.

### Step 1: Understanding the Target Demo

First, examine the raymarching-intro demo structure:

```bash
# Location
cosyne/demos/raymarching-intro.ts  (351 lines)

# Key sections:
# - Lines 1-50: Imports and constants
# - Lines 51-150: Fragment shader (defines SDF functions)
# - Lines 151-250: Scene management (scene selection)
# - Lines 251-350: UI controls and event handling
```

### Step 2: Define the Pyramid SDF

A pyramid is a cone-like shape with a square base. Here's the mathematical definition:

```glsl
// Pyramid SDF - efficient cone-based approximation
// p: point in 3D space
// h: pyramid height
float sdPyramid(vec3 p, float h) {
    float m2 = h * h + 0.25;  // Precomputed constant

    p.xz = abs(p.xz);  // Fold coordinates
    p.xz = (p.z > p.x) ? p.zx : p.xz;  // Ensure p.x >= p.z
    p.xz -= 0.5;  // Shift to pyramid center

    // Project point onto pyramid faces
    vec3 q = vec3(p.z, h * p.y - 0.5 * p.x, h * p.x + 0.5 * p.y);
    float s = max(-q.x, 0.0);
    float t = clamp((q.y - 0.5 * p.z) / (m2 + 0.25), 0.0, 1.0);

    // Compute distance
    float a = m2 * (q.x + s) * (q.x + s) + q.y * q.y;
    float b = m2 * (q.x + 0.5 * t) * (q.x + 0.5 * t) +
              (q.y - m2 * t) * (q.y - m2 * t);

    float d2 = min(q.y, -q.x * m2 - q.y * 0.5) > 0.0 ? 0.0 : min(a, b);

    return sqrt((d2 + q.z * q.z) / m2) * sign(max(q.z, -p.y));
}
```

**Why This Works:**
- Uses coordinate folding to reduce computation
- Maintains Lipschitz continuity (safe for marching)
- Returns signed distance (negative inside, positive outside)
- Performance: Similar to box SDF

### Step 3: Modify the Demo's Fragment Shader

Open `cosyne/demos/raymarching-intro.ts` and find the `sceneSDF` function around line 80-100:

```glsl
// Before: Only 3 shapes
float sceneSDF(vec3 p) {
    float sphere = sdSphere(p - vec3(-1.0, 0.0, 0.0), 0.8);
    float box = sdBox(p - vec3(1.0, 0.0, 0.0), vec3(0.6));
    float torus = sdTorus(p - vec3(0.0, 0.0, 0.0), vec2(0.8, 0.2));

    return opUnion(opUnion(sphere, box), torus);
}
```

**After:** Add pyramid option (we'll add scene selection next)

```glsl
// After: Now 4 shapes
float sceneSDF(vec3 p) {
    float sphere = sdSphere(p - vec3(-1.0, 0.0, 0.0), 0.8);
    float box = sdBox(p - vec3(1.0, 0.0, 0.0), vec3(0.6));
    float torus = sdTorus(p - vec3(0.0, 0.0, 0.0), vec2(0.8, 0.2));
    float pyramid = sdPyramid(p - vec3(0.0, -0.3, -1.2), 0.8);

    // Select based on u_scene uniform
    if (u_scene == 0) return sphere;
    if (u_scene == 1) return box;
    if (u_scene == 2) return torus;
    if (u_scene == 3) return pyramid;

    // Default: show all combined
    return opUnion(opUnion(opUnion(sphere, box), torus), pyramid);
}
```

Also add the pyramid SDF function definition earlier in the shader:

```glsl
// Find line ~60 where other SDF functions are defined
// Add this after the other functions:

float sdPyramid(vec3 p, float h) {
    float m2 = h * h + 0.25;
    p.xz = abs(p.xz);
    p.xz = (p.z > p.x) ? p.zx : p.xz;
    p.xz -= 0.5;
    vec3 q = vec3(p.z, h * p.y - 0.5 * p.x, h * p.x + 0.5 * p.y);
    float s = max(-q.x, 0.0);
    float t = clamp((q.y - 0.5 * p.z) / (m2 + 0.25), 0.0, 1.0);
    float a = m2 * (q.x + s) * (q.x + s) + q.y * q.y;
    float b = m2 * (q.x + 0.5 * t) * (q.x + 0.5 * t) +
              (q.y - m2 * t) * (q.y - m2 * t);
    float d2 = min(q.y, -q.x * m2 - q.y * 0.5) > 0.0 ? 0.0 : min(a, b);
    return sqrt((d2 + q.z * q.z) / m2) * sign(max(q.z, -p.y));
}
```

### Step 4: Add UI Button in TypeScript

Find the UI section of the demo (around line 300-340 where buttons are created):

```typescript
// Before: 3 shape buttons
a.button('Sphere').onClick(() => {
    scene = 0;
    shader?.setUniform('u_scene', 0);
});
a.button('Box').onClick(() => {
    scene = 1;
    shader?.setUniform('u_scene', 1);
});
a.button('Torus').onClick(() => {
    scene = 2;
    shader?.setUniform('u_scene', 2);
});
```

**After:** Add pyramid button

```typescript
// After: 4 shape buttons
a.button('Sphere').onClick(() => {
    scene = 0;
    shader?.setUniform('u_scene', 0);
});
a.button('Box').onClick(() => {
    scene = 1;
    shader?.setUniform('u_scene', 1);
});
a.button('Torus').onClick(() => {
    scene = 2;
    shader?.setUniform('u_scene', 2);
});
a.button('Pyramid').onClick(() => {  // NEW
    scene = 3;
    shader?.setUniform('u_scene', 3);
});
```

### Step 5: Test Your Changes

```bash
# Run the modified demo
npx tsx cosyne/demos/raymarching-intro.ts

# Expected result:
# - 4 shape buttons appear (Sphere, Box, Torus, Pyramid)
# - Click "Pyramid" to see the new shape
# - Pyramid should rotate with other objects
# - Lighting and shadows work normally
```

### Step 6: Verification Checklist

- ✅ Pyramid renders (appears as a solid pyramid shape)
- ✅ Lighting works (shaded properly with light direction)
- ✅ Shadows appear (soft shadows on other surfaces)
- ✅ Button click switches to pyramid
- ✅ Combined view shows all 4 shapes
- ✅ FPS maintained (no significant slowdown)

---

## Creating Custom Materials

Materials control how surfaces reflect and transmit light. Let's add a "Wood" material to the materials-showcase demo.

### Step 1: Understanding Material System

Materials in the demos are controlled by these parameters:
- **Base Color**: RGB surface color
- **Roughness**: 0.0 (shiny) to 1.0 (matte)
- **Metallic**: 0.0 (dielectric) to 1.0 (metal)
- **Type**: Matte, Metallic, Chrome, Glass, Emissive

### Step 2: Define Wood Material Properties

Wood has:
- Grain pattern (procedural texture)
- Slight specular reflection
- Non-uniform color (wood rings)

```glsl
// Wood material SDF - returns color based on position
vec3 woodMaterial(vec3 p) {
    // Create wood grain pattern using sine waves
    float grain = sin(p.y * 8.0) * 0.5 + 0.5;  // Vertical grain
    float rings = sin(p.x * 3.0) * sin(p.z * 3.0) * 0.3 + 0.5;

    // Mix dark and light wood
    vec3 dark = vec3(0.4, 0.2, 0.1);
    vec3 light = vec3(0.8, 0.5, 0.2);

    return mix(dark, light, grain * rings);
}

// Wood shader properties
float woodRoughness(vec3 p) {
    return 0.6;  // Moderately rough
}

float woodMetallic(vec3 p) {
    return 0.0;  // Not metallic
}
```

### Step 3: Add to Material Selection

In materials-showcase.ts, find the material selection UI:

```typescript
// Before: 5 materials
a.button('Matte').onClick(() => { materialType = 0; });
a.button('Metallic').onClick(() => { materialType = 1; });
a.button('Chrome').onClick(() => { materialType = 2; });
a.button('Glass').onClick(() => { materialType = 3; });
a.button('Emissive').onClick(() => { materialType = 4; });
```

**After:** Add wood material

```typescript
// After: 6 materials
a.button('Matte').onClick(() => { materialType = 0; });
a.button('Metallic').onClick(() => { materialType = 1; });
a.button('Chrome').onClick(() => { materialType = 2; });
a.button('Glass').onClick(() => { materialType = 3; });
a.button('Emissive').onClick(() => { materialType = 4; });
a.button('Wood').onClick(() => { materialType = 5; });  // NEW
```

### Step 4: Implement Material in Shader

In the fragment shader, find the material calculation section:

```glsl
// Add to getMaterialColor function
vec3 getMaterialColor(vec3 p, vec3 normal, int materialType) {
    if (materialType == 0) {
        // Matte - return base color
        return base_color;
    }
    else if (materialType == 1) {
        // Metallic - partial reflection
        return mix(base_color, reflection, 0.7);
    }
    else if (materialType == 2) {
        // Chrome - high reflection
        return reflection;
    }
    else if (materialType == 3) {
        // Glass - refraction
        return refracted_color;
    }
    else if (materialType == 4) {
        // Emissive - glow
        return base_color * 2.0 + emissive_glow;
    }
    else if (materialType == 5) {
        // Wood - procedural grain
        vec3 wood_color = woodMaterial(p);
        return mix(wood_color, reflection, 0.15);  // Slight reflection
    }
    return base_color;
}
```

### Step 5: Test the Wood Material

```bash
npx tsx cosyne/demos/materials-showcase.ts

# Expected result:
# - Wood button appears
# - Click wood button to see wood grain pattern
# - Pattern shows vertical grain with ring variations
# - Lighting and shadows work with wood material
```

---

## Implementing New Lighting Effects

Let's add **volumetric light rays** to a demo. These rays appear when light passes through particles/fog.

### Step 1: Understanding Volumetric Lighting

Volumetric effects work by:
1. Sampling along the light ray
2. Checking if each sample point is in shadow
3. Accumulating light contributions

### Step 2: Implement Volumetric Light Function

Add this to the fragment shader:

```glsl
// Volumetric light - rays of light through fog
vec3 volumetricLight(vec3 ray_origin, vec3 ray_dir, vec3 light_pos) {
    const int VOLUMETRIC_SAMPLES = 16;
    const float VOLUMETRIC_STEP = 0.5;

    vec3 volumetric = vec3(0.0);

    for (int i = 0; i < VOLUMETRIC_SAMPLES; i++) {
        vec3 sample_pos = ray_origin + ray_dir * float(i) * VOLUMETRIC_STEP;

        // Distance from this point to light
        float dist_to_light = length(light_pos - sample_pos);

        // Check if this point is in shadow
        float shadow = softShadow(sample_pos, normalize(light_pos - sample_pos), 5.0);

        // Accumulate light (stronger the farther from light source)
        volumetric += shadow / (1.0 + dist_to_light * dist_to_light) * 0.1;
    }

    return volumetric * light_color;
}
```

### Step 3: Apply Volumetric Effect to Final Image

In the main shader, after computing surface color:

```glsl
void main() {
    // ... existing raymarching code ...

    vec3 final_color = surfaceColor;

    // Add volumetric rays
    vec3 volumetric = volumetricLight(ray_origin, ray_direction, light_pos);
    final_color += volumetric * 0.5;  // Blend with surface

    gl_FragColor = vec4(final_color, 1.0);
}
```

### Step 4: Add UI Control

```typescript
// Add slider for volumetric intensity
a.slider('Volumetric', 0, 1, 0.5, (v) => {
    shader?.setUniform('u_volumetric_intensity', v);
});

// Modify shader to use uniform
// In shader: volumetric *= u_volumetric_intensity;
```

### Step 5: Test Volumetric Lighting

```bash
npx tsx cosyne/demos/raymarching-intro.ts
# Look for rays of light in the scene
# Adjust volumetric slider to control intensity
```

**Expected Result:**
- Visible rays of light extending from light source
- Rays visible when light passes through fog/particles
- Performance impact: 10-15% FPS reduction (can optimize with fewer samples)

---

## Building a New Scene

Create a complete new demo with multiple objects and custom styling.

### Step 1: Create the Demo File

Create `cosyne/demos/raymarching-showcase.ts`:

```typescript
import { CanvasShader, Context } from '../src/index';

const shader = new CanvasShader(`
    #version 110

    uniform float u_time;
    uniform vec3 u_light_dir;

    // ... (shader code continues below)
`);

const demo = new Context();
demo.render(shader);
```

### Step 2: Design the Scene Geometry

Plan which shapes to include:

```
┌─ Central Sphere (gold, glossy)
│  └─ Rotating torus around it
├─ Four corner boxes (different colors)
└─ Ground plane (checkered pattern)
```

### Step 3: Implement Scene SDF

```glsl
float sceneSDF(vec3 p) {
    // Central animated sphere
    vec3 sphere_pos = vec3(0.0, 0.3, 0.0);
    float sphere = sdSphere(p - sphere_pos, 0.5);

    // Rotating torus
    vec3 torus_p = p - sphere_pos;
    torus_p = rotateY(torus_p, u_time);
    float torus = sdTorus(torus_p, vec2(1.0, 0.15));

    // Four corner boxes
    float box1 = sdBox(p - vec3(2.0, 0.5, 2.0), vec3(0.4));
    float box2 = sdBox(p - vec3(-2.0, 0.5, 2.0), vec3(0.4));
    float box3 = sdBox(p - vec3(2.0, 0.5, -2.0), vec3(0.4));
    float box4 = sdBox(p - vec3(-2.0, 0.5, -2.0), vec3(0.4));

    // Ground plane (pseudo-infinite)
    float ground = p.y + 1.0;

    // Combine all
    float scene = opUnion(
        opUnion(sphere, torus),
        opUnion(opUnion(opUnion(box1, box2), opUnion(box3, box4)), ground)
    );

    return scene;
}
```

### Step 4: Add Material System

```glsl
int getMaterialID(vec3 p) {
    // Central sphere - gold
    if (length(p - vec3(0.0, 0.3, 0.0)) < 0.55) return 1;

    // Torus - silver
    float torus_dist = sdTorus(p - vec3(0.0, 0.3, 0.0), vec2(1.0, 0.15));
    if (torus_dist < 0.01) return 2;

    // Corner boxes - colors based on position
    if (abs(p.x) > 1.6 && abs(p.z) > 1.6) return 3;

    // Ground - checkered pattern
    if (p.y < -0.99) return 4;

    return 0;  // Default
}

vec3 getMaterialColor(vec3 p, int materialID) {
    if (materialID == 1) return vec3(1.0, 0.8, 0.0);      // Gold
    if (materialID == 2) return vec3(0.9, 0.9, 0.95);     // Silver
    if (materialID == 3) return vec3(0.5, 0.3, 0.7);      // Purple
    if (materialID == 4) {
        // Checkered
        vec2 uv = fract(p.xz);
        return mix(vec3(0.2), vec3(0.8),
                   mod(floor(p.x) + floor(p.z), 2.0));
    }
    return vec3(0.5);
}
```

### Step 5: Add Interactive Controls

```typescript
// Add color selector
a.button('Rotate CW').onClick(() => {
    rotation_speed = 1.0;
});
a.button('Stop').onClick(() => {
    rotation_speed = 0.0;
});
a.button('Rotate CCW').onClick(() => {
    rotation_speed = -1.0;
});

// Add light control
a.slider('Light X', -1, 1, 0, (v) => {
    shader?.setUniform('u_light_x', v);
});
a.slider('Light Y', 0, 1, 0.5, (v) => {
    shader?.setUniform('u_light_y', v);
});
```

### Step 6: Test Complete Scene

```bash
npx tsx cosyne/demos/raymarching-showcase.ts

# Expected result:
# - Central gold sphere with rotating silver torus
# - Four purple boxes in corners
# - Checkered ground plane
# - All objects properly shaded and shadowed
# - Interactive controls work smoothly
```

---

## Advanced Extensions

### 1. Mouse Interaction

Make scenes respond to mouse clicks.

```typescript
// Add mouse listener
document.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert screen coordinates to world position
    const world_x = (x / width - 0.5) * 2.0 * aspect;
    const world_y = (y / height - 0.5) * -2.0;

    // Update shader uniform
    shader?.setUniform('u_click_pos', [world_x, world_y]);
});
```

### 2. Animation Paths

Create smooth camera flythrough animations.

```glsl
// In shader - animated camera position
vec3 camera_path(float t) {
    // Circular path around scene
    float radius = 3.0;
    float angle = t * 0.5;
    return vec3(
        cos(angle) * radius,
        1.5 + sin(t * 0.3) * 0.5,
        sin(angle) * radius
    );
}
```

### 3. Post-Processing Effects

Add bloom or color grading after rendering.

```glsl
// Simple bloom effect
vec3 bloom(vec3 color) {
    vec3 bright = max(color - vec3(0.8), vec3(0.0));
    return color + bright * 0.5;
}

void main() {
    vec3 final_color = surfaceColor;
    final_color = bloom(final_color);
    gl_FragColor = vec4(final_color, 1.0);
}
```

### 4. Frame Capture

Export rendered frames as images.

```typescript
// Capture current frame
function captureFrame(filename) {
    const image_data = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image_data;
    link.download = filename;
    link.click();
}

// Capture button
a.button('Capture').onClick(() => {
    captureFrame(`raymarched-${Date.now()}.png`);
});
```

---

## Troubleshooting

### Problem: Shape doesn't render (appears black)

**Causes:**
1. SDF function not defined or has typo
2. Scene position outside camera view (test at origin first)
3. Scene returned distance is always positive (inside logic inverted)

**Solution:**
```glsl
// Test sphere at origin - should always render
float sceneSDF(vec3 p) {
    return sdSphere(p, 0.5);  // Simple test
}
```

### Problem: Jagged edges or artifacts

**Causes:**
1. HIT_THRESHOLD too large
2. MAX_ITERATIONS too low
3. SDF discontinuous (not Lipschitz continuous)

**Solution:**
```glsl
// Tighten threshold
const float HIT_THRESHOLD = 0.0001;

// Increase iterations
const int MAX_ITERATIONS = 128;

// Verify SDF smoothness - no sharp distance changes
```

### Problem: Slow performance

**See:** PERFORMANCE_GUIDE.md for detailed optimization strategies.

**Quick fixes:**
1. Reduce MAX_ITERATIONS
2. Reduce shadow/AO samples
3. Lower canvas resolution

### Problem: Material changes don't apply

**Causes:**
1. Shader not recompiled after changes
2. Uniform value never sent to GPU

**Solution:**
```typescript
// Ensure you call setUniform after shader creation
shader?.setUniform('u_material_type', new_type);

// Test with simple uniform
const testShader = new CanvasShader(`
    uniform float u_test;
    void main() {
        gl_FragColor = vec4(u_test, 0.0, 0.0, 1.0);
    }
`);
testShader.setUniform('u_test', 0.5);
```

---

## Performance Checklist for Extensions

- ✅ Test FPS before and after changes
- ✅ Ensure SDFs are Lipschitz continuous (no artifacts)
- ✅ Minimize branching in shaders
- ✅ Profile with browser GPU tools
- ✅ Document complex algorithms with comments
- ✅ Test on mobile/lower-end hardware
- ✅ Verify visual quality matches original

---

## Example: Complete Working Extension

Here's a minimal complete example - adding a torus knot:

```glsl
// Define torus knot SDF (highly simplified)
float sdTorusKnot(vec3 p, float time) {
    // Parametric curve for knot
    float t = atan(p.y, length(p.xz)) + time;
    float k = 2.0;  // Number of winds
    vec3 knot_center = vec3(
        cos(k * t) * (2.0 + cos((k + 1.0) * t)),
        sin((k + 1.0) * t) * 2.0,
        sin(k * t) * (2.0 + cos((k + 1.0) * t))
    ) * 0.5;

    return length(p - knot_center) - 0.2;
}
```

Add UI button:
```typescript
a.button('Torus Knot').onClick(() => {
    scene = 4;
    shader?.setUniform('u_scene', 4);
});
```

Update sceneSDF:
```glsl
float sceneSDF(vec3 p) {
    // ... existing shapes ...
    if (u_scene == 4) return sdTorusKnot(p, u_time);
    // ...
}
```

---

## Related Documentation

- **[RAYMARCHING_GUIDE.md](./RAYMARCHING_GUIDE.md)**: Understanding raymarching fundamentals
- **[SDF_GALLERY.md](./SDF_GALLERY.md)**: Complete reference of available SDFs
- **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)**: Optimization for your extensions
- **[README.md](./README.md)**: Documentation index and learning paths

## Resources for Further Learning

- Study existing demos: `cosyne/demos/*.ts`
- Inigo Quilez's articles: [iquilezles.org](https://iquilezles.org)
- Shadertoy tutorials: [shadertoy.com](https://shadertoy.com/)
- Browser GPU debugging: Chrome DevTools → Performance

---

**You're now ready to extend the demos!** Start with adding a simple shape (like a cone), then progress to custom materials and effects. Happy raymarching! 🎉
