# Raymarching Guide: Understanding GPU-Based 3D Rendering

Welcome to the comprehensive guide on raymarching! This document explains the theory, algorithms, and practical implementation of raymarching—a powerful technique for rendering 3D scenes using only a GPU fragment shader.

> **Scope Note:** This guide covers GPU-accelerated raymarching via **OpenGL 1.1+ (GLSL 1.10)** running on the Fyne framework. Cosyne also provides:
> - **Canvas 2D rendering**: Tsyne native 2D primitives (circles, text, gauges, trails, particles) - see planned CANVAS2D_GUIDE.md
> - **Architecture overview**: Three-subsystem design (Canvas 2D, GPU raymarching, OpenGL) - see planned COSYNE_ARCHITECTURE.md

## Table of Contents

1. [What is Raymarching?](#what-is-raymarching)
2. [Raymarching vs Traditional Rendering](#raymarching-vs-traditional-rendering)
3. [The Raymarching Algorithm](#the-raymarching-algorithm)
4. [Signed Distance Functions (SDFs)](#signed-distance-functions-sdfs)
5. [Lighting & Shading](#lighting--shading)
6. [Normal Calculation](#normal-calculation)
7. [Shadows & Ambient Occlusion](#shadows--ambient-occlusion)
8. [Running the Demos](#running-the-demos)
9. [Performance Considerations](#performance-considerations)

---

## What is Raymarching?

Raymarching, also known as **sphere tracing**, is a rendering technique that simulates the path of light rays through a 3D scene without explicitly defining geometry as polygons or meshes. Instead, the scene is defined implicitly using **Signed Distance Functions (SDFs)** that describe the distance from any point in 3D space to the nearest surface.

### Key Advantages

- **Implicit Geometry**: Define complex shapes mathematically without polygon counts
- **Boolean Operations**: Combine shapes trivially (union, subtraction, intersection)
- **Procedural Generation**: Generate infinite detail through math expressions
- **Soft Shadows**: Calculate accurate shadows by ray tracing
- **Flexibility**: Easy to add deformations, transformations, and animations
- **Artistic Control**: High-level mathematical descriptions give precise control

### Key Disadvantages

- **Performance**: Requires many ray-surface intersection tests per pixel
- **Limited Hardware Acceleration**: No native GPU support for arbitrary ray-shape intersections
- **Complexity**: Learning curve for understanding SDFs and shader programming
- **Quality Tradeoffs**: Often requires iteration count tuning for visual quality

---

## Raymarching vs Traditional Rendering

### Traditional Rasterization (3D Model/Polygon Rendering)

```
Scene → Mesh/Polygons → Vertex Shader → Rasterization → Fragment Shader → Image
          (explicit)
```

- Defines geometry as **indexed triangles**
- GPU is highly optimized for this pipeline
- Fast but limited to polygon-based shapes
- Used by most game engines (Unity, Unreal)

### Raymarching (Implicit Geometry)

```
Scene → SDF Function → Fragment Shader → Raymarching Loop → Image
        (implicit/mathematical)
```

- Defines geometry as **mathematical distance functions**
- Requires custom algorithm in fragment shader
- Slower but enables unique effects and shapes
- Used for procedural textures, abstract visuals, scientific visualization

---

## The Raymarching Algorithm

### Step-by-Step Walkthrough

The core raymarching algorithm is a loop that marches a ray from the camera through the scene until it hits a surface:

#### 1. **Ray Setup**
For each pixel on screen, create a ray:
- **Ray Origin**: The camera position
- **Ray Direction**: Computed from the pixel's screen position and camera's projection

#### 2. **March the Ray**
Starting from the ray origin, step along the ray direction until we hit something:

```glsl
void main() {
    // 1. Compute ray from camera through this pixel
    vec3 ray_origin = camera_position;
    vec3 ray_direction = normalize(camera_to_pixel_direction);

    // 2. Initialize march variables
    float distance_traveled = 0.0;
    vec3 current_position = ray_origin;
    const float MAX_DISTANCE = 100.0;
    const float HIT_THRESHOLD = 0.001;
    const int MAX_ITERATIONS = 100;

    // 3. March the ray
    for (int i = 0; i < MAX_ITERATIONS; i++) {
        // Sample the SDF at current position
        float distance_to_surface = sceneSDF(current_position);

        // Can we march safely this far?
        if (distance_to_surface < HIT_THRESHOLD) {
            // Hit! Calculate lighting and output color
            break;
        }

        // Exceeded max distance?
        if (distance_traveled > MAX_DISTANCE) {
            // Miss - output background color
            break;
        }

        // March forward by the safe distance
        distance_traveled += distance_to_surface;
        current_position = ray_origin + ray_direction * distance_traveled;
    }
}
```

#### 3. **Hit Detection**
- If distance to surface < `HIT_THRESHOLD` (e.g., 0.001) → **HIT**
- If distance_traveled > `MAX_DISTANCE` → **MISS**
- If iterations exceeded → **MISS** (convergence failure)

#### 4. **Shading**
Once we know if/where the ray hit:
- **HIT**: Calculate normal, apply lighting, output surface color
- **MISS**: Output background or fog color

### Why This Works: Safety

The magic of raymarching is **safety**. Each step in the march is "safe" because:

1. The SDF returns the distance to the **nearest surface**
2. We step exactly that distance forward
3. We're guaranteed not to pass through the surface
4. This converges reliably to the surface

This is why SDFs must be **Lipschitz continuous** (no sharp changes in distance values).

---

## Signed Distance Functions (SDFs)

### What is an SDF?

A Signed Distance Function is a mathematical function that returns:
- **Positive value**: Distance from point to surface (point is outside)
- **Negative value**: Negative distance (point is inside)
- **Zero**: Point is exactly on the surface

Example - Sphere at origin with radius `r`:
```glsl
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}
```

For a point P:
- If `|P| > r`: returns positive (outside)
- If `|P| = r`: returns 0 (on surface)
- If `|P| < r`: returns negative (inside)

### Why Signed Distance Matters

The sign tells us if we're inside or outside. Combined with the magnitude (distance), we get:
1. **Safe march distance**: `distance_traveled += sdf(current_position)`
2. **Surface detection**: Check if SDF is near zero
3. **Shading**: Use SDF sign for material determination
4. **Ambient Occlusion**: Test multiple SDFs along normal

### SDF Properties

**Lipschitz Continuity** (Most Important)
- For raymarching to work reliably, the SDF must not change distance too abruptly
- Mathematically: `|sdf(a) - sdf(b)| ≤ distance(a, b)`
- Practically: No sharp corners with distances that jump
- **Violation Example**: Truncating an SDF or using `max()` without proper blending

**Valid SDF Examples**
```glsl
// Sphere - Lipschitz continuous ✓
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// Box - Lipschitz continuous ✓
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Torus - Lipschitz continuous ✓
float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}
```

---

## Lighting & Shading

### Normal Calculation

After the ray hits a surface, we need the **surface normal** to calculate lighting. Since we only have an implicit function, we compute the normal by sampling the SDF at nearby points:

```glsl
vec3 getNormal(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0.0);

    // Sample SDF at 4 nearby points
    float d = sceneSDF(p);
    float dx = sceneSDF(p + h.xyy) - d;
    float dy = sceneSDF(p + h.yxy) - d;
    float dz = sceneSDF(p + h.yyx) - d;

    // Gradient is the normal
    return normalize(vec3(dx, dy, dz));
}
```

The gradient of the SDF gives us the direction of steepest increase—pointing directly away from the surface (the normal).

### Basic Diffuse Lighting

With a normal, we can calculate how much light hits the surface:

```glsl
vec3 calculateDiffuse(vec3 normal, vec3 lightDir, vec3 lightColor) {
    float intensity = max(0.0, dot(normal, lightDir));
    return lightColor * intensity;
}
```

### Specular Highlights

For shiny surfaces, add specular reflection:

```glsl
vec3 calculateSpecular(vec3 normal, vec3 lightDir, vec3 viewDir,
                       vec3 lightColor, float shininess) {
    vec3 reflected = reflect(-lightDir, normal);
    float intensity = max(0.0, dot(reflected, viewDir));
    intensity = pow(intensity, shininess);
    return lightColor * intensity;
}
```

### Fresnel Effect

Objects appear shinier at grazing angles:

```glsl
float calculateFresnel(vec3 normal, vec3 viewDir, float edge_brightness) {
    float factor = 1.0 - abs(dot(normal, viewDir));
    return mix(0.0, edge_brightness, pow(factor, 2.0));
}
```

---

## Shadows & Ambient Occlusion

### Soft Shadows via Cone Tracing

After hitting a surface, we can check if it's in shadow by marching a ray toward the light source:

```glsl
float calculateShadow(vec3 p, vec3 lightDir, float maxDist) {
    float shadow = 0.0;
    float distToLight = 0.0;

    for (int i = 0; i < 32; i++) {
        vec3 shadowPos = p + lightDir * distToLight;
        float d = sceneSDF(shadowPos);

        if (d < 0.001) {
            // Hit something - in shadow
            return 0.2;
        }

        if (distToLight > maxDist) {
            // Reached light without hitting - no shadow
            return 1.0;
        }

        // March forward
        distToLight += max(d * 0.5, 0.01);  // Use smaller steps toward light
    }

    return mix(0.2, 1.0, distToLight / maxDist);
}
```

### Ambient Occlusion (AO)

Check how many surfaces surround a point - occluded areas are darker:

```glsl
float calculateAO(vec3 p, vec3 normal) {
    float ao = 0.0;
    float sampleRadius = 0.3;

    for (int i = 0; i < 8; i++) {
        float angle = float(i) * 6.283 / 8.0;  // Distribute around normal
        vec3 samplePoint = p + normal * sampleRadius;

        // Rotate around normal
        float c = cos(angle);
        float s = sin(angle);
        // ... apply rotation ...

        float d = sceneSDF(samplePoint);
        float occ = max(0.0, sampleRadius - d) / sampleRadius;
        ao += occ;
    }

    return 1.0 - (ao / 8.0) * 0.7;
}
```

---

## Normal Calculation

The gradient of the SDF gives us a precise surface normal. Here's the implementation with different precision levels:

### High Precision (4 samples)
```glsl
vec3 getNormal(vec3 p) {
    const float eps = 0.001;
    return normalize(vec3(
        sceneSDF(p + vec3(eps, 0, 0)) - sceneSDF(p - vec3(eps, 0, 0)),
        sceneSDF(p + vec3(0, eps, 0)) - sceneSDF(p - vec3(0, eps, 0)),
        sceneSDF(p + vec3(0, 0, eps)) - sceneSDF(p - vec3(0, 0, eps))
    )) / (2.0 * eps);
}
```

### Fast Version (1 sample)
```glsl
vec3 getNormal(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0);
    float d = sceneSDF(p);
    return normalize(vec3(
        sceneSDF(p + h.xyy) - d,
        sceneSDF(p + h.yxy) - d,
        sceneSDF(p + h.yyx) - d
    )) / eps;
}
```

---

## Running the Demos

### Launch Individual Demos

Each demo is a standalone executable TypeScript file:

```bash
# Raymarching Introduction - Learn the basics
npx tsx cosyne/demos/raymarching-intro.ts
# Features: Sphere, Box, Torus, Combined shapes
# Interactive: Light direction controls, color selection, object rotation

# Raymarched Car - Complex geometry example
npx tsx cosyne/demos/raymarching-car.ts
# Features: Detailed car model, materials, day/night lighting
# Interactive: Camera position, material selection, color options

# Material Showcase - Different surface types
npx tsx cosyne/demos/materials-showcase.ts
# Features: Matte, metallic, chrome, glass, emissive materials
# Interactive: Roughness, metallic, color controls

# SDF Operations - Boolean combinations
npx tsx cosyne/demos/sdf-operations.ts
# Features: Union, subtraction, intersection, smooth blending
# Interactive: Switch between operation types

# Lighting Modes - Light direction impact
npx tsx cosyne/demos/lighting-modes.ts
# Features: Front, side, back, multi-light configurations
# Interactive: Switch lighting modes
```

### Demo Discovery Interface

```bash
# Launch the interactive demo browser
npx tsx cosyne/demos/index.ts
# Shows all available demos with descriptions
# Click any demo to launch
# View demo source code inline
```

### Interactive Controls

Most demos include:
- **FPS Counter**: Top-right corner shows real-time performance
- **Color Selector**: Buttons to change object colors
- **Material Controls**: Sliders for roughness, metallic values
- **Light Controls**: Sliders for light direction and intensity
- **Camera Controls**: Position and rotation adjustments
- **Rotation Toggles**: Auto-rotate or manual control

---

## Performance Considerations

### Key Performance Metrics

- **Target FPS**: 60 fps for interactive scenes
- **Iteration Budget**: ~64-100 raymarching steps per pixel
- **Complexity**: Depends on scene geometry and shader operations
- **Resolution**: 600x400 (demos) vs 1920x1080 (high-def)

### Raymarching Parameters

```glsl
const int MAX_ITERATIONS = 100;        // More = better quality, slower
const float MAX_DISTANCE = 100.0;      // How far to march before giving up
const float HIT_THRESHOLD = 0.001;     // When to consider a hit
const float SHADOW_SAMPLES = 32;       // Soft shadow quality
```

### Optimization Strategies

1. **Reduce Iteration Count**: Lower MAX_ITERATIONS for simpler scenes
2. **Decrease Resolution**: Render at 0.75x then upscale
3. **Lower Shadow Samples**: 32 → 16 for 15% speedup
4. **Reduce AO Samples**: 8 → 4 for faster ambient occlusion
5. **Simplify Materials**: Skip expensive calculations (Fresnel, multiple reflections)
6. **Use Lower Precision**: `mediump` in mobile shaders
7. **Distance Fade**: Stop calculating shadows/AO for distant objects

See **PERFORMANCE_GUIDE.md** for detailed optimization strategies and benchmark results.

---

## Key Concepts Summary

| Concept | Purpose | Example |
|---------|---------|---------|
| **SDF** | Defines scene geometry implicitly | `sdSphere(p, 0.5)` |
| **Ray March** | Finds surface intersection | Loop to march forward |
| **Normal** | Gradient of SDF | `∇sceneSDF(p)` |
| **Lighting** | Calculate how light hits surface | Dot product with normal |
| **Shadows** | March toward light to check occlusion | Secondary ray march |
| **Material** | Control specular/diffuse/reflection | Parameter set per surface |

---

## Next Steps

- Read **[SDF_GALLERY.md](./SDF_GALLERY.md)** to learn all available shape primitives
- Read **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)** to optimize your scenes
- Read **[EXTENSION_GUIDE.md](./EXTENSION_GUIDE.md)** to add custom shapes and effects
- Study the demo source code: `cosyne/demos/raymarching-*.ts`
- Experiment with modifying shader code in demos
- Return to **[README.md](./README.md)** for the full learning path

## Resources

- **Inigo Quilez**: [iquilezles.org/articles/distfunctions](https://iquilezles.org/articles/distfunctions/) - Comprehensive SDF reference
- **Shadertoy**: [shadertoy.com](https://shadertoy.com/) - Thousands of raymarching examples
- **The Art of Code**: YouTube channel with raymarching tutorials
- **HackerNews/r/GraphicsProgramming**: Active communities discussing techniques

---

**Continue your journey:** Next, explore [SDF_GALLERY.md](./SDF_GALLERY.md) to see all the shape primitives you can use in your scenes!
