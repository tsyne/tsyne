/**
 * Raymarching Car Demo
 *
 * A simple 3D car rendered via GLSL raymarching.
 * Shows how complex shapes can be built from SDF primitives.
 *
 * This is a proof-of-concept for GPU-accelerated 3D in Tsyne.
 *
 * Run: npx tsx cosyne/demos/raymarching-car.ts
 */

import { app, resolveTransport, CanvasShader , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 600;
const HEIGHT = 400;

const carShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_rotateY;
uniform vec3 u_carColor;
uniform float u_metallic;
uniform float u_night;

// SDF primitives
float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdCylinder(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// Smooth operations
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
    return -smin(-a, -b, k);
}

// Rotate around Y axis
vec3 rotateY(vec3 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
}

// Material ID: 0=body, 1=windows, 2=wheels, 3=lights, 4=ground
float matId = 0.0;

// Car SDF
float sdCar(vec3 p) {
    // Main body - elongated rounded box
    float body = sdBox(p - vec3(0.0, 0.3, 0.0), vec3(1.8, 0.35, 0.8)) - 0.08;

    // Cabin/roof - smaller box on top
    vec3 cabinP = p - vec3(-0.1, 0.75, 0.0);
    float cabin = sdBox(cabinP, vec3(0.9, 0.3, 0.7)) - 0.1;

    // Smooth blend body and cabin
    float carBody = smin(body, cabin, 0.15);

    // Hood slope (subtract to carve)
    vec3 hoodP = p - vec3(1.0, 0.6, 0.0);
    hoodP.x -= hoodP.y * 0.8;  // Slope
    float hood = sdBox(hoodP, vec3(0.5, 0.5, 1.0));
    carBody = smax(carBody, -hood, 0.05);

    // Trunk slope
    vec3 trunkP = p - vec3(-1.5, 0.6, 0.0);
    trunkP.x += trunkP.y * 0.5;
    float trunk = sdBox(trunkP, vec3(0.5, 0.5, 1.0));
    carBody = smax(carBody, -trunk, 0.05);

    float result = carBody;
    matId = 0.0;

    // Windows (as separate geometry for different material)
    vec3 winP = p - vec3(-0.1, 0.85, 0.0);
    float windows = sdBox(winP, vec3(0.75, 0.2, 0.75)) - 0.02;
    if (windows < result) {
        result = windows;
        matId = 1.0;
    }

    // Wheels (4 cylinders)
    float wheelR = 0.28;
    float wheelW = 0.15;
    vec3 wheelPositions[4];
    wheelPositions[0] = vec3(1.1, 0.0, 0.85);
    wheelPositions[1] = vec3(1.1, 0.0, -0.85);
    wheelPositions[2] = vec3(-1.1, 0.0, 0.85);
    wheelPositions[3] = vec3(-1.1, 0.0, -0.85);

    for (int i = 0; i < 4; i++) {
        vec3 wp = p - wheelPositions[i];
        // Rotate wheel to be horizontal (along Z)
        float wheel = sdCylinder(wp.xzy, wheelR, wheelW);
        if (wheel < result) {
            result = wheel;
            matId = 2.0;
        }
    }

    // Headlights
    vec3 hlP1 = p - vec3(1.85, 0.35, 0.5);
    vec3 hlP2 = p - vec3(1.85, 0.35, -0.5);
    float hl1 = sdSphere(hlP1, 0.12);
    float hl2 = sdSphere(hlP2, 0.12);
    float headlights = min(hl1, hl2);
    if (headlights < result) {
        result = headlights;
        matId = 3.0;
    }

    // Taillights
    vec3 tlP1 = p - vec3(-1.85, 0.35, 0.55);
    vec3 tlP2 = p - vec3(-1.85, 0.35, -0.55);
    float tl1 = sdBox(tlP1, vec3(0.05, 0.08, 0.15));
    float tl2 = sdBox(tlP2, vec3(0.05, 0.08, 0.15));
    float taillights = min(tl1, tl2);
    if (taillights < result) {
        result = taillights;
        matId = 3.5;  // Different from headlights
    }

    return result;
}

// Ground plane
float sdGround(vec3 p) {
    return p.y + 0.28;
}

// Full scene
float sceneSDF(vec3 p) {
    // Rotate car
    vec3 carP = rotateY(p, u_rotateY);

    float car = sdCar(carP);
    float ground = sdGround(p);

    if (ground < car) {
        matId = 4.0;
        return ground;
    }
    return car;
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 24; i++) {
        if (t >= maxt) break;
        float h = sceneSDF(ro + rd * t);
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += h;
    }
    return res;
}

float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.1 * float(i);
        float d = sceneSDF(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

// Environment reflection (fake)
vec3 envMap(vec3 rd) {
    float t = 0.5 + 0.5 * rd.y;
    vec3 sky = mix(vec3(0.6, 0.7, 0.9), vec3(0.2, 0.4, 0.8), t);
    if (u_night > 0.5) {
        sky = mix(vec3(0.02, 0.02, 0.05), vec3(0.05, 0.05, 0.15), t);
    }
    // Horizon glow
    float horizon = exp(-abs(rd.y) * 5.0);
    sky += vec3(0.3, 0.2, 0.1) * horizon;
    return sky;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;

    // Camera
    vec3 ro = vec3(4.0, 2.0, 4.0);
    vec3 target = vec3(0.0, 0.3, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    // Sky background
    vec3 col = envMap(rd);

    // Raymarch
    float t = 0.0;
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < 0.001) {
            vec3 pos = p;
            vec3 nor = calcNormal(pos);

            // Re-evaluate to get material at hit point
            vec3 carP = rotateY(pos, u_rotateY);
            sdCar(carP);
            if (sdGround(pos) < 0.001) matId = 4.0;

            // Light
            vec3 lig = normalize(vec3(0.5, 0.8, 0.3));
            if (u_night > 0.5) lig = normalize(vec3(-0.3, 0.5, 0.2));

            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            float sha = softShadow(pos + nor * 0.01, lig, 0.01, 8.0, 8.0);
            float ao = calcAO(pos, nor);

            // Fresnel
            float fre = pow(1.0 - clamp(dot(nor, -rd), 0.0, 1.0), 4.0);

            // Material colors
            vec3 matCol;
            float roughness = 0.5;

            if (matId < 0.5) {
                // Car body
                matCol = u_carColor;
                roughness = 1.0 - u_metallic;
            } else if (matId < 1.5) {
                // Windows - dark, reflective
                matCol = vec3(0.05, 0.05, 0.1);
                roughness = 0.1;
                fre *= 2.0;
            } else if (matId < 2.5) {
                // Wheels - dark rubber
                matCol = vec3(0.1, 0.1, 0.1);
                roughness = 0.9;
            } else if (matId < 3.25) {
                // Headlights - bright
                matCol = vec3(1.0, 1.0, 0.9);
                if (u_night > 0.5) {
                    // Glowing at night
                    col = vec3(1.0, 1.0, 0.8);
                    break;
                }
            } else if (matId < 3.75) {
                // Taillights - red
                matCol = vec3(0.8, 0.1, 0.1);
            } else {
                // Ground
                float checker = mod(floor(pos.x * 2.0) + floor(pos.z * 2.0), 2.0);
                matCol = mix(vec3(0.2), vec3(0.3), checker);
                roughness = 0.8;
            }

            // Reflection
            vec3 ref = reflect(rd, nor);
            vec3 envCol = envMap(ref);

            // Combine
            vec3 ambient = vec3(0.1) * ao;
            if (u_night > 0.5) ambient *= 0.3;

            vec3 diffuse = matCol * dif * sha;
            vec3 specular = envCol * fre * (1.0 - roughness);

            col = ambient + diffuse * 0.7 + specular * 0.5;

            // Metallic reflection
            if (matId < 0.5 && u_metallic > 0.5) {
                col = mix(col, envCol * matCol, u_metallic * 0.4);
            }

            break;
        }

        t += d;
        if (t > 20.0) break;
    }

    // Tone mapping
    col = col / (col + vec3(1.0));
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
}
`;

function createCarDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let rotation = 0.5;
  let metallic = 0.7;
  let night = 0;

  const carColors: { name: string; color: [number, number, number] }[] = [
    { name: 'Red', color: [0.8, 0.1, 0.1] },
    { name: 'Blue', color: [0.1, 0.2, 0.8] },
    { name: 'Silver', color: [0.7, 0.7, 0.75] },
    { name: 'Black', color: [0.05, 0.05, 0.05] },
    { name: 'Yellow', color: [0.9, 0.7, 0.1] },
    { name: 'Green', color: [0.1, 0.5, 0.2] },
  ];
  let colorIdx = 0;

  a.window({ title: '3D Car (Raymarching)', width: WIDTH + 40, height: HEIGHT + 140 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Color selection
        a.hbox(() => {
          a.label('Color: ');
          for (const cc of carColors) {
            a.button(cc.name).onClick(() => {
              colorIdx = carColors.indexOf(cc);
              shader?.setUniform('u_carColor', cc.color);
            });
          }
        });

        // Material controls
        a.hbox(() => {
          a.button('Matte').onClick(() => {
            metallic = 0.2;
            shader?.setUniform('u_metallic', metallic);
          });
          a.button('Metallic').onClick(() => {
            metallic = 0.7;
            shader?.setUniform('u_metallic', metallic);
          });
          a.button('Chrome').onClick(() => {
            metallic = 1.0;
            shader?.setUniform('u_metallic', metallic);
          });
          a.button('Day').onClick(() => {
            night = 0;
            shader?.setUniform('u_night', night);
          });
          a.button('Night').onClick(() => {
            night = 1;
            shader?.setUniform('u_night', night);
          });
        });

        // Rotation controls
        a.hbox(() => {
          a.button('< Rotate').onClick(() => {
            rotation -= 0.3;
            shader?.setUniform('u_rotateY', rotation);
          });
          a.button('Reset View').onClick(() => {
            rotation = 0.5;
            shader?.setUniform('u_rotateY', rotation);
          });
          a.button('Rotate >').onClick(() => {
            rotation += 0.3;
            shader?.setUniform('u_rotateY', rotation);
          });
        });

        // Shader canvas
        a.center(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, carShader, {
            uniforms: {
              u_rotateY: rotation,
              u_carColor: carColors[colorIdx].color,
              u_metallic: metallic,
              u_night: night,
            }
          });
        });

        a.label('GPU Raymarched 3D Car - Pure GLSL, No Vertex Buffers');
        a.label('Soft shadows, ambient occlusion, fake reflections');
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: '3D Car Demo' }, createCarDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}

export { createCarDemo };
