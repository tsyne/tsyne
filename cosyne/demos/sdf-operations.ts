/**
 * SDF Operations Demo
 *
 * Demonstrates combining shapes using SDF operations:
 * - Union (combine shapes)
 * - Subtraction (carve out shapes)
 * - Intersection (overlap)
 * - Smooth blending
 *
 * Run: npx tsx cosyne/demos/sdf-operations.ts
 */

import { app, resolveTransport, CanvasShader } from 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 500;
const HEIGHT = 500;

const sdfShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_operation;  // 0=union, 1=subtract, 2=intersect, 3=blend

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdCylinder(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// SDF operations
float opUnion(float a, float b) {
    return min(a, b);
}

float opSub(float a, float b) {
    return max(a, -b);
}

float opIntersect(float a, float b) {
    return max(a, b);
}

float opSmoothUnion(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float sceneSDF(vec3 p) {
    // Rotate scene
    float a = u_time * 0.3;
    float c = cos(a);
    float s = sin(a);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    float sphere = sdSphere(rp, 0.6);
    float box = sdBox(rp - vec3(0.0, -0.3, 0.0), vec3(0.5)) - 0.05;
    float torus = sdTorus(rp, vec2(0.8, 0.2));
    float cylinder = sdCylinder(rp - vec3(0.0, 0.5, 0.0), 0.3, 0.6);

    float result;

    if (u_operation < 0.5) {
        // Union - combine all shapes
        result = opUnion(opUnion(sphere, box), opUnion(torus, cylinder));
    } else if (u_operation < 1.5) {
        // Subtraction - carve box from sphere
        result = opSub(sphere, box);
    } else if (u_operation < 2.5) {
        // Intersection - only where sphere AND torus overlap
        result = opIntersect(sphere, torus);
    } else {
        // Smooth blend - smooth union of shapes
        result = opSmoothUnion(sphere, box, 0.3);
        result = opSmoothUnion(result, torus, 0.3);
    }

    // Ground plane
    float ground = p.y + 0.9;
    return min(result, ground);
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

vec3 envMap(vec3 rd) {
    float t = 0.5 + 0.5 * rd.y;
    return mix(vec3(0.5, 0.6, 0.7), vec3(0.1, 0.2, 0.4), t);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;

    vec3 ro = vec3(0.0, 0.5, 3.0);
    vec3 target = vec3(0.0, 0.0, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    vec3 col = envMap(rd);

    float t = 0.0;
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < 0.001) {
            vec3 pos = p;
            vec3 nor = calcNormal(pos);

            vec3 lig = normalize(vec3(0.5, 0.8, 0.6));
            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            float sha = softShadow(pos + nor * 0.01, lig, 0.01, 5.0, 16.0);

            float fre = pow(1.0 - clamp(dot(nor, -rd), 0.0, 1.0), 3.0);

            // Color varies with operation
            vec3 baseCol;
            if (u_operation < 0.5) {
                baseCol = vec3(0.2, 0.6, 0.8);  // Blue for union
            } else if (u_operation < 1.5) {
                baseCol = vec3(0.8, 0.3, 0.2);  // Red for subtraction
            } else if (u_operation < 2.5) {
                baseCol = vec3(0.3, 0.8, 0.3);  // Green for intersection
            } else {
                baseCol = vec3(0.8, 0.6, 0.2);  // Yellow for smooth
            }

            // Check if on ground
            if (pos.y < -0.85) {
                float checker = mod(floor(pos.x * 3.0) + floor(pos.z * 3.0), 2.0);
                baseCol = mix(vec3(0.2), vec3(0.35), checker);
            }

            vec3 ambient = vec3(0.2);
            vec3 diffuse = baseCol * dif * sha;
            vec3 specular = vec3(1.0) * fre * 0.4;

            col = ambient + diffuse + specular;
            col = pow(col, vec3(0.4545));
            break;
        }

        t += d;
        if (t > 10.0) break;
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

function createSDFDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let operation = 0;

  const ops = ['Union', 'Subtract', 'Intersect', 'Smooth'];

  a.window({ title: 'SDF Operations', width: WIDTH + 40, height: HEIGHT + 80 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Operation buttons
        a.hbox(() => {
          a.label('Operation: ');
          for (const op of ops) {
            a.button(op).onClick(() => {
              operation = ops.indexOf(op);
              shader?.setUniform('u_operation', operation);
            });
          }
        });

        // Canvas
        a.canvasStack(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, sdfShader, {
            uniforms: {
              u_operation: operation,
            }
          });
        });

        a.label(`Operation: ${ops[operation]} | Sphere + Box + Torus + Cylinder`);
        a.label('Compose complex shapes from simple primitives');
      });
    });

    win.show();
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: 'SDF Operations' }, createSDFDemo);
}

export { createSDFDemo };
