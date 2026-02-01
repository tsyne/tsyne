# SDF Gallery: Complete Shape Reference

Your comprehensive reference guide to Signed Distance Functions used in the Tsyne raymarching demos. This document catalogs all available primitives, boolean operations, and domain transformations.

> **Scope Note:** This reference covers **Signed Distance Functions (SDFs)** for GPU-based raymarching via **OpenGL/GLSL**.
>
> Related systems not covered here:
> - **Canvas 2D primitives**: Circles, rectangles, arcs, text, gauges - implemented in Tsyne native canvas API (planned CANVAS2D_GUIDE.md)
> - **Canvas 2D vector graphics**: Paths, polygons, custom shapes via SVG-like API
> - **System comparison**: SDFs vs Canvas 2D primitives - see planned BACKEND_COMPARISON.md

## Table of Contents

1. [Basic Primitives](#basic-primitives)
2. [Boolean Operations](#boolean-operations)
3. [Domain Operations](#domain-operations)
4. [Performance Reference](#performance-reference)

---

## Basic Primitives

These are the fundamental building blocks for creating raymarched scenes. All primitives return signed distances suitable for sphere tracing.

### Sphere

The simplest and most common primitive.

```glsl
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}
```

**Parameters:**
- `p`: Point in 3D space (relative to sphere center)
- `r`: Radius of the sphere

**Properties:**
- **Performance**: ⚡ Very Fast (1 dot product + 1 sqrt)
- **Precision**: Perfect - mathematically exact
- **Lipschitz**: Yes ✓
- **Used in Demos**: raymarching-intro, materials-showcase

**Examples:**
```glsl
float small_sphere = sdSphere(p - vec3(0.0, 0.5, 0.0), 0.3);
float large_sphere = sdSphere(p - vec3(-1.0, 0.0, 0.0), 2.0);
```

---

### Box (Cube)

Axis-aligned rectangular box.

```glsl
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
```

**Parameters:**
- `p`: Point in 3D space (relative to box center)
- `b`: Half-dimensions (width/2, height/2, depth/2)

**Properties:**
- **Performance**: ⚡ Fast (3 abs, 2 max, 1 min, 1 length)
- **Precision**: Mathematically exact
- **Lipschitz**: Yes ✓
- **Used in Demos**: raymarching-intro, sdf-operations

**Examples:**
```glsl
float small_cube = sdBox(p - vec3(0.0, 0.0, 0.0), vec3(0.5, 0.5, 0.5));
float flat_box = sdBox(p - vec3(1.0, 0.0, 0.0), vec3(2.0, 0.1, 1.5));
```

**Tip:** Rotate points before passing to sdBox if you need arbitrary orientation.

---

### Torus (Donut)

Circular tube shape.

```glsl
float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}
```

**Parameters:**
- `p`: Point in 3D space (relative to torus center)
- `t.x`: Major radius (distance from center to tube)
- `t.y`: Minor radius (tube thickness)

**Properties:**
- **Performance**: ⚡ Fast (1 length for radius, 1 for distance)
- **Precision**: Mathematically exact
- **Lipschitz**: Yes ✓
- **Used in Demos**: raymarching-intro, raymarching-car (wheels)

**Examples:**
```glsl
float donut = sdTorus(p - vec3(0.0, 1.0, 0.0), vec2(1.0, 0.2));
float thin_ring = sdTorus(p, vec2(2.0, 0.1));
```

**Tip:** Vary t.x and t.y for different donut proportions. Large t.x, small t.y = thin ring.

---

### Cylinder

Vertical tube (axis-aligned along Y).

```glsl
float sdCylinder(vec3 p, vec2 h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - h;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
```

**Parameters:**
- `p`: Point in 3D space (relative to cylinder center)
- `h.x`: Radius
- `h.y`: Half-height (total height / 2)

**Properties:**
- **Performance**: ⚡ Fast (1 length + distance math)
- **Precision**: Mathematically exact
- **Lipschitz**: Yes ✓
- **Used in Demos**: raymarching-car (pillars, tubes)

**Examples:**
```glsl
float thin_pole = sdCylinder(p - vec3(0.0, 0.0, 0.0), vec2(0.1, 2.0));
float wide_base = sdCylinder(p - vec3(0.0, 0.0, 0.0), vec2(1.0, 0.5));
```

---

### Capsule (Rounded Line Segment)

A line segment with rounded ends - like a stadium shape in 3D.

```glsl
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}
```

**Parameters:**
- `p`: Point in 3D space
- `a`: Start point of line segment
- `b`: End point of line segment
- `r`: Radius around the line

**Properties:**
- **Performance**: ⚡ Fast (projections and distance)
- **Precision**: Mathematically exact
- **Lipschitz**: Yes ✓
- **Used in Demos**: raymarching-car (axles, connectors)

**Examples:**
```glsl
float link = sdCapsule(p, vec3(-1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0), 0.2);
float leg = sdCapsule(p, vec3(0.0, 1.0, 0.0), vec3(0.0, -1.0, 0.0), 0.15);
```

---

### Cone

Cone shape (pointed or truncated).

```glsl
float sdCone(vec3 p, vec2 c) {
    // c.x = sin(angle), c.y = cos(angle)
    float q = length(p.xy);
    return dot(c, vec2(q, p.z));
}
```

**Parameters:**
- `p`: Point in 3D space
- `c.x`: sin(half_angle) - smaller = pointier
- `c.y`: cos(half_angle)

**Properties:**
- **Performance**: ⚡ Fast
- **Precision**: Approximate
- **Lipschitz**: Yes ✓
- **Used in Demos**: raymarching-car (headlights, custom shapes)

**Examples:**
```glsl
// 45-degree cone
float cone = sdCone(p, vec2(sin(0.785), cos(0.785)));
```

---

## Boolean Operations

Combine multiple SDFs to create complex shapes.

### Union (Combine shapes)

Take the closest surface of multiple objects.

```glsl
float opUnion(float d1, float d2) {
    return min(d1, d2);
}

// Or for multiple shapes
float shape = opUnion(
    opUnion(sdSphere(p, 0.5), sdBox(p - vec3(1.0, 0.0, 0.0), vec3(0.3))),
    sdTorus(p - vec3(-1.0, 0.0, 0.0), vec2(0.8, 0.2))
);
```

**Properties:**
- **Visual Effect**: Takes the outermost/closest surface
- **Performance**: ⚡ Very Fast (1 min operation)
- **Lipschitz**: Yes ✓
- **Used in Demos**: raymarching-intro (combined shapes), sdf-operations

**Result:** Scene with multiple separate objects.

---

### Subtraction (Carve out shapes)

Remove one shape from another.

```glsl
float opSubtract(float d1, float d2) {
    return max(d1, -d2);
}

// Example: Sphere with box carved out
float result = opSubtract(
    sdSphere(p, 1.0),
    sdBox(p, vec3(0.4, 0.4, 0.4))
);
```

**Properties:**
- **Visual Effect**: d1 with d2 carved away
- **Performance**: ⚡ Very Fast (1 max, 1 negate)
- **Lipschitz**: Yes ✓
- **Used in Demos**: sdf-operations, raymarching-car (hollow structures)

**Important:** Invert d2 with `-d2` because inside the subtracted shape, the distance is negative (we're "inside" the void).

---

### Intersection (Overlap only)

Keep only where shapes overlap.

```glsl
float opIntersect(float d1, float d2) {
    return max(d1, d2);
}

// Example: Intersection of sphere and box
float result = opIntersect(
    sdSphere(p, 1.0),
    sdBox(p, vec3(0.6, 0.6, 0.6))
);
```

**Properties:**
- **Visual Effect**: Only the overlapping region
- **Performance**: ⚡ Very Fast (1 max operation)
- **Lipschitz**: Yes ✓
- **Used in Demos**: sdf-operations, raymarching-car (combined surfaces)

**Result:** Volume where both shapes exist.

---

### Smooth Union (Smooth Blend)

Blend shapes together smoothly without sharp edges.

```glsl
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Example: Two spheres blended together
float result = opSmoothUnion(
    sdSphere(p - vec3(-0.5, 0.0, 0.0), 0.5),
    sdSphere(p - vec3(0.5, 0.0, 0.0), 0.5),
    0.3  // Blend amount
);
```

**Parameters:**
- `d1`, `d2`: Two distance values to blend
- `k`: Blend radius (higher = more blending)

**Properties:**
- **Visual Effect**: Smooth, organic merger
- **Performance**: ⚡⚡ Moderate (extra math operations)
- **Lipschitz**: Yes ✓ (with proper k)
- **Used in Demos**: materials-showcase (organic shapes), raymarching-car (body contours)

**Result:** Two shapes meeting smoothly like liquid merging.

---

### Smooth Subtraction

Smooth version of carving.

```glsl
float opSmoothSubtract(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5 * (d1 + d2) / k, 0.0, 1.0);
    return mix(d1, -d2, h) + k * h * (1.0 - h);
}

// Example: Sphere with smooth hollow carved out
float result = opSmoothSubtract(
    sdSphere(p, 1.0),
    sdSphere(p, 0.6),
    0.2
);
```

**Properties:**
- **Visual Effect**: Smooth carving without sharp creases
- **Performance**: ⚡⚡ Moderate (like smooth union)
- **Lipschitz**: Yes ✓
- **Used in Demos**: raymarching-car (body cavities)

---

## Domain Operations

Transform the space before computing distances - useful for positioning, rotating, and repeating objects.

### Translation

Move an object in space.

```glsl
float shape = sceneSDF(p - vec3(1.0, 2.0, 3.0));
```

**Properties:**
- **Performance**: ⚡ Very Fast (1 subtraction per component)
- **Lipschitz**: Preserved ✓

Simply offset `p` by the desired position. All demo objects use this pattern.

---

### Rotation

Rotate the point around an axis before applying SDF.

```glsl
// Rotate around Z axis by angle theta
vec3 rotateZ(vec3 p, float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return vec3(
        c * p.x - s * p.y,
        s * p.x + c * p.y,
        p.z
    );
}

// Rotate around Y axis
vec3 rotateY(vec3 p, float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return vec3(
        c * p.x + s * p.z,
        p.y,
        -s * p.x + c * p.z
    );
}

// Usage
float rotated_box = sdBox(rotateY(p - vec3(1.0, 0.0, 0.0), time), vec3(0.3));
```

**Properties:**
- **Performance**: ⚡⚡ Moderate (6 multiplies, 6 adds per rotation)
- **Lipschitz**: Preserved ✓
- **Used in Demos**: raymarching-intro (rotating objects), raymarching-car (wheel rotation)

---

### Scaling

Change the size of an object.

```glsl
// Scale by factor s
float scaledShape = sdSphere(p / s, r) * s;
```

**Important Caveat:** Scaling a distance field requires multiplying the result by the scale factor to preserve the distance metric!

```glsl
// CORRECT - preserves distances
float scaled_box = sdBox(p / 2.0, vec3(0.5)) * 2.0;

// WRONG - distorts distances
float wrong = sdBox(p / 2.0, vec3(0.5));
```

**Properties:**
- **Performance**: ⚡ Fast (3 divides, 1 multiply)
- **Lipschitz**: Preserved ✓ (if scaled correctly)
- **Used in Demos**: raymarching-car (different component sizes)

---

### Repetition

Repeat an object infinitely in a grid pattern.

```glsl
// Repeat with period 'c' (cell size)
vec3 repeat(vec3 p, vec3 c) {
    return mod(p, c) - 0.5 * c;
}

// Usage - infinite grid of spheres
float repeated_spheres = sdSphere(repeat(p, vec3(2.0, 2.0, 2.0)), 0.4);
```

**Properties:**
- **Performance**: ⚡ Very Fast (3 mod operations)
- **Lipschitz**: Preserved ✓
- **Used in Demos**: procedural-patterns (infinite grids)

**Creative Use Cases:**
```glsl
// Infinite vertical columns
float columns = sdCylinder(repeat(p, vec3(1.0, 999.0, 1.0)), vec2(0.3, 100.0));

// 2D repetition (ground pattern)
float tiles = someShape(vec3(repeat(p.xz, vec2(1.0, 1.0)), p.y));
```

---

### Elongation

Stretch an object along an axis without changing SDF properties.

```glsl
float sdElongatedBox(vec3 p, vec3 l, vec3 r) {
    // l = elongation amount per axis, r = corner radius
    vec3 q = abs(p) - l;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
```

**Used for:** Creating lines, connectors, and elongated shapes while maintaining SDF properties.

---

## Performance Reference

### SDF Computation Cost

| Operation | Cost | Notes |
|-----------|------|-------|
| **Sphere** | ⚡ 1 unit | Cheapest - single length calculation |
| **Box** | ⚡ 1 unit | Fast - basic arithmetic |
| **Torus** | ⚡ 1.2 units | One extra length call |
| **Cylinder** | ⚡ 1.2 units | Similar to torus |
| **Capsule** | ⚡ 1.5 units | Projections + length |
| **Cone** | ⚡ 1 unit | Very fast approximation |
| **Smooth Union** | ⚡⚡ 2 units | Extra conditional blending |
| **Smooth Subtract** | ⚡⚡ 2 units | Like smooth union |
| **Translation** | ⚡ 0.3 units | Just subtracting offset |
| **Rotation** | ⚡⚡ 2 units | 6 multiplies + 6 adds |
| **Scaling** | ⚡ 0.5 units | 3 divides + 1 multiply |
| **Repetition** | ⚡ 0.2 units | Just modulo operations |

### Complexity Guidelines

**Simple Scene** (60 FPS on modern GPU):
- 3-5 primitive shapes
- Basic union operations
- 1-2 rotations
- Total calls per pixel: ~30-50

**Complex Scene** (30-40 FPS):
- 10-20 primitive shapes
- Smooth operations
- Multiple transformations
- Total calls per pixel: ~80-120

**Very Complex Scene** (15-30 FPS):
- 50+ primitives
- Many smooth operations
- Heavy transformations
- Total calls per pixel: ~200+

---

## Quick Reference Table

| Shape | Function | Parameters | Cost | Demos |
|-------|----------|-----------|------|-------|
| Sphere | `sdSphere(p, r)` | radius | ⚡ | intro, car, materials |
| Box | `sdBox(p, b)` | half-dims | ⚡ | intro, operations |
| Torus | `sdTorus(p, t)` | major/minor r | ⚡ | intro, car |
| Cylinder | `sdCylinder(p, h)` | radius, h-height | ⚡ | car |
| Capsule | `sdCapsule(p, a, b, r)` | line seg + radius | ⚡ | car |
| Cone | `sdCone(p, c)` | angle params | ⚡ | custom |
| Union | `min(d1, d2)` | two distances | ⚡ | all |
| Subtract | `max(d1, -d2)` | two distances | ⚡ | operations |
| Intersect | `max(d1, d2)` | two distances | ⚡ | operations |
| S-Union | `opSmoothUnion()` | two d, k | ⚡⚡ | materials |
| S-Subtract | `opSmoothSubtract()` | two d, k | ⚡⚡ | car |
| Translate | `p - offset` | offset vec3 | ⚡ | all |
| Rotate | `rotateX/Y/Z()` | angle | ⚡⚡ | intro, car |
| Scale | `sdf(p/s) * s` | scale factor | ⚡ | all |
| Repeat | `mod(p, cell)` | cell size | ⚡ | patterns |

---

## Combining Operations: Complete Examples

### Example 1: Gear Shape

```glsl
float gear(vec3 p, int teeth) {
    float cyl = sdCylinder(p, vec2(0.8, 0.2));
    float hole = sdSphere(p, 0.2);

    float tooth_angle = 6.283 / float(teeth);
    vec3 tooth_p = p;
    tooth_p.xz = repeat(tooth_p.xz, vec3(tooth_angle, 1.0, 1.0));
    float tooth = sdBox(tooth_p - vec3(1.0, 0.0, 0.0), vec3(0.1, 0.3, 0.2));

    return opSubtract(opUnion(cyl, tooth), hole);
}
```

### Example 2: Twisted Helix

```glsl
float helix(vec3 p) {
    // Translate along helical path
    float phase = atan(p.y, length(p.xz));
    float height = phase / 6.283 * 2.0;  // 2 units per rotation

    vec3 helix_p = p - vec3(0.0, height, 0.0);

    return sdCapsule(helix_p,
                     vec3(cos(phase), 0.0, sin(phase)) * 0.5,
                     vec3(cos(phase + 0.1), 0.1, sin(phase + 0.1)) * 0.5,
                     0.1);
}
```

---

## Advanced: Creating Custom SDFs

When creating your own signed distance functions:

1. **Maintain Lipschitz Continuity**
   - No discontinuous jumps in distance values
   - Test with simple raymarching
   - Use smooth functions, avoid hard `if` statements

2. **Test with Raymarching**
   - Render your SDF to verify it works
   - Check that you don't pass through surfaces
   - Look for discontinuities or artifacts

3. **Verify the Sign**
   - Positive outside, negative inside
   - Test at known points to verify correctness

4. **Performance Profile**
   - Count operations in your SDF
   - Profile it in a real demo
   - Optimize hot paths

---

## See Also

- **[RAYMARCHING_GUIDE.md](./RAYMARCHING_GUIDE.md)**: How raymarching uses SDFs
- **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)**: Optimize complex scenes
- **[EXTENSION_GUIDE.md](./EXTENSION_GUIDE.md)**: Add custom SDFs to demos
- **[README.md](./README.md)**: Documentation index and demo catalog
- **Inigo Quilez's SDF Reference**: [iquilezles.org/articles/distfunctions](https://iquilezles.org/articles/distfunctions/)

---

**Ready to create your own scenes?** Check out **[EXTENSION_GUIDE.md](./EXTENSION_GUIDE.md)** for step-by-step tutorials!
