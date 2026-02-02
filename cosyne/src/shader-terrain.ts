/**
 * Terrain Shader Templates
 *
 * GLSL shader source code for GPU-accelerated terrain rendering:
 * - Fragment shaders with Perlin noise and raymarching
 * - Terrain SDF (signed distance functions)
 * - Lighting calculations (soft shadows, AO, Fresnel)
 * - Material presets
 *
 * Reusable shader components for GPU rendering.
 */

/**
 * Default vertex shader for fullscreen quad rendering
 * Used for fragment-shader-only effects
 */
export const defaultVertexShader = `
#version 110
attribute vec2 vert;

void main() {
    gl_Position = vec4(vert, 0.0, 1.0);
}
`;

/**
 * Terrain raymarching fragment shader
 * Full implementation with Perlin noise, FBM, lighting, and materials
 *
 * Uniforms:
 * - u_resolution: Canvas size in pixels
 * - u_time: Time in seconds
 * - u_noiseScale: Noise frequency (0.001-0.05)
 * - u_octaves: FBM octaves (1-10)
 * - u_persistence: FBM persistence (0.1-0.9)
 * - u_lacunarity: FBM lacunarity (1.5-4.0)
 * - u_heightMultiplier: Vertical scale (5-100)
 * - u_waterLevel: Water threshold (0-1)
 * - u_sunDir: Sun direction vector
 * - u_materialType: Material preset (0-3)
 */
export const terrainFragmentShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_noiseScale;
uniform float u_octaves;
uniform float u_persistence;
uniform float u_lacunarity;
uniform float u_heightMultiplier;
uniform float u_waterLevel;
uniform vec3 u_sunDir;
uniform int u_materialType;

varying vec2 v_texCoord;

// ============================================================================
// Perlin Noise Implementation
// ============================================================================

float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
}

float perlin(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    float ab = mix(a, b, f.x);
    float cd = mix(c, d, f.x);
    return mix(ab, cd, f.y);
}

// ============================================================================
// FBM - Fractional Brownian Motion
// ============================================================================

float fbm(vec2 p, int octaves, float persistence, float lacunarity) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;

    for (int i = 0; i < 10; i++) {
        if (i >= octaves) break;

        value += amplitude * (perlin(p * frequency * u_noiseScale) * 2.0 - 1.0);
        maxValue += amplitude;

        amplitude *= persistence;
        frequency *= lacunarity;
    }

    return (value / maxValue + 1.0) * 0.5;
}

// ============================================================================
// Terrain Height Function
// ============================================================================

float terrainHeight(vec2 pos) {
    return fbm(pos, int(u_octaves), u_persistence, u_lacunarity) * u_heightMultiplier;
}

// ============================================================================
// Signed Distance Function (SDF)
// ============================================================================

float sdTerrain(vec3 p) {
    float height = terrainHeight(p.xz);
    return p.y - height;
}

// ============================================================================
// Normal Calculation (Gradient Sampling)
// ============================================================================

vec3 calculateNormal(vec3 p, float eps) {
    vec2 e = vec2(eps, 0.0);
    float d = sdTerrain(p);
    float dx = sdTerrain(p + e.xyy) - d;
    float dy = sdTerrain(p + e.yxy) - d;
    float dz = sdTerrain(p + e.yyx) - d;
    return normalize(vec3(dx, dy, dz));
}

// ============================================================================
// Soft Shadows (Cone-Traced SDF)
// ============================================================================

float softShadow(vec3 p, vec3 lightDir, float maxDist) {
    float shadow = 1.0;
    float t = 0.1;

    for (int i = 0; i < 16; i++) {
        if (t > maxDist) break;

        float d = sdTerrain(p + lightDir * t);
        if (d < 0.001) return 0.0;

        shadow = min(shadow, 8.0 * d / t);
        t += max(0.01, d);
    }

    return shadow;
}

// ============================================================================
// Ambient Occlusion
// ============================================================================

float ambientOcclusion(vec3 p, vec3 normal, float radius) {
    float ao = 0.0;

    for (int i = 0; i < 8; i++) {
        float angle = float(i) * 6.28318 / 8.0 + u_time * 0.1;
        vec3 offset = vec3(cos(angle), 0.5, sin(angle)) * (radius * float(i + 1) / 8.0);
        float d = sdTerrain(p + offset);
        ao += max(0.0, (float(i) * radius / 8.0 - d) / (radius / 8.0));
    }

    return 1.0 - (ao / 8.0) * 0.3;
}

// ============================================================================
// Material Color Selection
// ============================================================================

vec3 getMaterialColor(vec3 p, float height) {
    if (height < u_waterLevel) {
        return vec3(0.1, 0.3, 0.8); // Water - blue
    }

    if (u_materialType == 0) {
        // Grass
        if (height < u_waterLevel + 0.15) {
            return mix(vec3(0.8, 0.7, 0.4), vec3(0.2, 0.6, 0.2), (height - u_waterLevel) / 0.15);
        }
        return vec3(0.2, 0.6, 0.2);
    } else if (u_materialType == 1) {
        // Rocky
        return mix(vec3(0.3, 0.3, 0.3), vec3(0.6, 0.6, 0.6), height * 0.5);
    } else if (u_materialType == 2) {
        // Desert
        return mix(vec3(0.9, 0.8, 0.4), vec3(0.7, 0.5, 0.2), height * 0.5);
    } else {
        // Snow
        if (height > 0.8) return vec3(1.0, 1.0, 1.0);
        return mix(vec3(0.2, 0.6, 0.2), vec3(1.0, 1.0, 1.0), (height - 0.5) / 0.3);
    }
}

// ============================================================================
// Raymarching with Adaptive Stepping
// ============================================================================

vec4 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    float maxT = 200.0;

    for (int i = 0; i < 256; i++) {
        vec3 p = ro + rd * t;
        float d = sdTerrain(p);

        if (d < 0.01) {
            // Hit surface
            vec3 hitPos = p;
            vec3 normal = calculateNormal(p, 0.01);
            float height = terrainHeight(p.xz);

            vec3 color = getMaterialColor(p, height);

            // Lighting
            float diffuse = max(0.0, dot(normal, u_sunDir));
            float shadow = softShadow(p, u_sunDir, 50.0);
            float ao = ambientOcclusion(p, normal, 0.1);

            // Combine lighting
            vec3 ambient = vec3(0.2, 0.2, 0.3);
            vec3 diffuseLight = color * diffuse * shadow;
            vec3 finalColor = (ambient + diffuseLight) * ao;

            // Fresnel rim lighting
            float fresnel = pow(1.0 - abs(dot(normal, -rd)), 2.0);
            finalColor += fresnel * vec3(0.5, 0.7, 1.0) * 0.2;

            return vec4(finalColor, 1.0);
        }

        if (d > maxT || t > maxT) {
            break;
        }

        t += d * 0.8; // Adaptive step
    }

    // Sky gradient
    float skySky = 0.5 + 0.5 * rd.y;
    return vec4(mix(vec3(0.5, 0.8, 1.0), vec3(0.2, 0.4, 0.8), skySky), 0.0);
}

// ============================================================================
// Main Fragment Shader
// ============================================================================

void main() {
    // Normalize coordinates
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = (uv - 0.5) * 2.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // Camera setup (flythrough animation)
    vec3 camPos = vec3(20.0 * cos(u_time * 0.3), 15.0 + 5.0 * sin(u_time * 0.2), 20.0 * sin(u_time * 0.3));
    vec3 lookAt = vec3(0.0, 5.0, 0.0);
    vec3 forward = normalize(lookAt - camPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = normalize(cross(forward, right));

    // Ray direction
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    // Raymarch
    vec4 result = raymarch(camPos, rd);
    gl_FragColor = result;
}
`;

/**
 * Simple terrain SDF for debugging/testing
 * Renders a simple heightmap without complex lighting
 */
export const simpleTerrainShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_noiseScale;
uniform float u_octaves;
uniform float u_persistence;
uniform float u_lacunarity;
uniform float u_heightMultiplier;

varying vec2 v_texCoord;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float perlin(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;

    for (int i = 0; i < 10; i++) {
        if (i >= int(u_octaves)) break;
        value += amplitude * perlin(p * frequency * u_noiseScale);
        maxValue += amplitude;
        amplitude *= u_persistence;
        frequency *= u_lacunarity;
    }

    return value / maxValue;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float height = fbm(uv * 5.0) * u_heightMultiplier;

    // Simple color mapping
    vec3 color = mix(vec3(0.2, 0.4, 0.8), vec3(0.8, 0.8, 0.8), height);

    gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Heightmap-based terrain shader
 * Reads terrain height from a texture uniform instead of procedural noise.
 * Use with setHeightmapTexture() to pass dungeon/custom heightmaps.
 *
 * Uniforms:
 * - u_heightmap: sampler2D texture containing height in R channel (0-1)
 * - u_resolution: canvas size
 * - u_time: animation time
 * - u_heightMultiplier: vertical scale (default 20)
 * - u_waterLevel: water threshold (0-1)
 */
export const heightmapTerrainShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_heightmap;
uniform float u_heightMultiplier;
uniform float u_waterLevel;

// Get height from texture
float getHeight(vec2 pos) {
    // Map world coords to UV (assuming terrain spans -50 to 50)
    vec2 uv = (pos + 50.0) / 100.0;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return 0.0;
    }
    return texture2D(u_heightmap, uv).r * u_heightMultiplier;
}

// SDF for heightmap terrain
float sdTerrain(vec3 p) {
    float height = getHeight(p.xz);
    return p.y - height;
}

// Normal calculation
vec3 calculateNormal(vec3 p, float eps) {
    vec2 e = vec2(eps, 0.0);
    float d = sdTerrain(p);
    float dx = sdTerrain(p + e.xyy) - d;
    float dy = sdTerrain(p + e.yxy) - d;
    float dz = sdTerrain(p + e.yyx) - d;
    return normalize(vec3(dx, dy, dz));
}

// Material color based on height
vec3 getMaterialColor(float height) {
    float normalizedHeight = height / u_heightMultiplier;

    if (normalizedHeight < u_waterLevel) {
        return vec3(0.1, 0.3, 0.8); // Water - blue
    } else if (normalizedHeight < u_waterLevel + 0.1) {
        return vec3(0.8, 0.7, 0.4); // Beach - sand
    } else if (normalizedHeight < 0.6) {
        return vec3(0.2, 0.5, 0.2); // Grass - green
    } else if (normalizedHeight < 0.8) {
        return vec3(0.4, 0.35, 0.3); // Rock - brown
    } else {
        return vec3(0.9, 0.9, 0.95); // Snow - white
    }
}

// Raymarch
vec4 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    float maxT = 200.0;

    for (int i = 0; i < 128; i++) {
        vec3 p = ro + rd * t;
        float d = sdTerrain(p);

        if (d < 0.05) {
            // Hit surface
            vec3 normal = calculateNormal(p, 0.1);
            float height = getHeight(p.xz);
            vec3 color = getMaterialColor(height);

            // Simple lighting
            vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
            float diffuse = max(0.0, dot(normal, lightDir));
            vec3 ambient = vec3(0.3, 0.3, 0.4);
            vec3 finalColor = ambient + color * diffuse * 0.7;

            return vec4(finalColor, 1.0);
        }

        if (t > maxT) break;
        t += max(0.1, d * 0.5);
    }

    // Sky gradient
    float sky = 0.5 + 0.5 * rd.y;
    return vec4(mix(vec3(0.6, 0.8, 1.0), vec3(0.2, 0.4, 0.8), sky), 0.0);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = (uv - 0.5) * 2.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // Camera setup (orbiting view)
    float camDist = 80.0;
    vec3 camPos = vec3(
        camDist * cos(u_time * 0.2),
        30.0 + 10.0 * sin(u_time * 0.15),
        camDist * sin(u_time * 0.2)
    );
    vec3 lookAt = vec3(0.0, 5.0, 0.0);
    vec3 forward = normalize(lookAt - camPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = normalize(cross(forward, right));

    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    vec4 result = raymarch(camPos, rd);
    gl_FragColor = result;
}
`;

/**
 * Dungeon-specific heightmap shader
 * Optimized for viewing dungeon layouts with walls and floors.
 * Uses closer camera and appropriate dungeon coloring.
 *
 * Uniforms:
 * - u_heightmap: sampler2D texture (walls=1, floors=0)
 * - u_resolution: canvas size
 * - u_time: animation time
 * - u_heightMultiplier: wall height scale (default 20)
 */
export const dungeonHeightmapShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_heightmap;
uniform float u_heightMultiplier;

// Get height from texture
float getHeight(vec2 pos) {
    // Map world coords to UV (terrain spans -30 to 30 for closer view)
    vec2 uv = (pos + 30.0) / 60.0;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return 0.0;
    }
    return texture2D(u_heightmap, uv).r * u_heightMultiplier;
}

// SDF for heightmap terrain
float sdTerrain(vec3 p) {
    float height = getHeight(p.xz);
    return p.y - height;
}

// Normal calculation
vec3 calculateNormal(vec3 p, float eps) {
    vec2 e = vec2(eps, 0.0);
    float d = sdTerrain(p);
    float dx = sdTerrain(p + e.xyy) - d;
    float dy = sdTerrain(p + e.yxy) - d;
    float dz = sdTerrain(p + e.yyx) - d;
    return normalize(vec3(dx, dy, dz));
}

// Dungeon material color - floors are stone, walls are darker stone
vec3 getDungeonColor(float height) {
    float normalizedHeight = height / u_heightMultiplier;

    if (normalizedHeight < 0.1) {
        // Floor - light gray stone with slight variation
        return vec3(0.5, 0.48, 0.45);
    } else if (normalizedHeight < 0.5) {
        // Wall base - medium stone
        return vec3(0.35, 0.32, 0.3);
    } else {
        // Wall top - darker stone
        return vec3(0.25, 0.23, 0.22);
    }
}

// Raymarch with dungeon-appropriate settings
vec4 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    float maxT = 150.0;

    for (int i = 0; i < 128; i++) {
        vec3 p = ro + rd * t;
        float d = sdTerrain(p);

        if (d < 0.02) {
            // Hit surface
            vec3 normal = calculateNormal(p, 0.05);
            float height = getHeight(p.xz);
            vec3 color = getDungeonColor(height);

            // Dungeon lighting - overhead with torch-like warmth
            vec3 lightDir = normalize(vec3(0.3, 0.9, 0.2));
            float diffuse = max(0.0, dot(normal, lightDir));

            // Warm ambient for torch-lit dungeon feel
            vec3 ambient = vec3(0.25, 0.2, 0.15);
            vec3 lightColor = vec3(1.0, 0.9, 0.7); // Warm light
            vec3 finalColor = ambient + color * diffuse * lightColor * 0.8;

            // Add slight fog for depth
            float fog = 1.0 - smoothstep(50.0, 100.0, t);
            finalColor = mix(vec3(0.1, 0.1, 0.12), finalColor, fog);

            return vec4(finalColor, 1.0);
        }

        if (t > maxT) break;
        t += max(0.05, d * 0.4);
    }

    // Dark ceiling/void
    return vec4(0.05, 0.05, 0.08, 0.0);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = (uv - 0.5) * 2.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // Camera setup - closer orbit for dungeon detail
    float camDist = 45.0;
    float camHeight = 35.0;
    vec3 camPos = vec3(
        camDist * cos(u_time * 0.15),
        camHeight + 5.0 * sin(u_time * 0.1),
        camDist * sin(u_time * 0.15)
    );
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    vec3 forward = normalize(lookAt - camPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = normalize(cross(forward, right));

    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    vec4 result = raymarch(camPos, rd);
    gl_FragColor = result;
}
`;
