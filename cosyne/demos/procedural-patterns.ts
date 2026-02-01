/**
 * Procedural Patterns Demo
 *
 * Demonstrates generating patterns via raymarching:
 * - Checkerboard (UV-mapped patterns)
 * - Stripes (animated)
 * - Waves (displacement mapping)
 * - Fractals (recursive patterns)
 *
 * Run: npx tsx cosyne/demos/procedural-patterns.ts
 */

import { app, resolveTransport, CanvasShader , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 500;
const HEIGHT = 500;

const patternsShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_pattern;  // 0=check, 1=stripe, 2=wave, 3=fractal

// Noise functions
float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n = i.x + i.y * 37.0 + i.z * 119.0;
    return mix(
        mix(
            mix(hash(n), hash(n + 1.0), f.x),
            mix(hash(n + 37.0), hash(n + 38.0), f.x),
            f.y
        ),
        mix(
            mix(hash(n + 119.0), hash(n + 120.0), f.x),
            mix(hash(n + 156.0), hash(n + 157.0), f.x),
            f.y
        ),
        f.z
    );
}

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sceneSDF(vec3 p) {
    // Rotate
    float a = u_time * 0.3;
    float c = cos(a);
    float s = sin(a);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    float obj = sdSphere(rp, 0.7);
    float ground = p.y + 0.8;

    return min(obj, ground);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

// Pattern functions
float checkerPattern(vec3 p, float scale) {
    vec3 sp = p * scale;
    float checker = mod(floor(sp.x) + floor(sp.y) + floor(sp.z), 2.0);
    return checker;
}

float stripePattern(vec3 p, float scale) {
    float stripe = sin((p.x + u_time * 2.0) * scale) * 0.5 + 0.5;
    return stripe;
}

float wavePattern(vec3 p, float scale) {
    float wave = sin(p.x * scale) * cos(p.z * scale + u_time * 2.0);
    wave = wave * 0.5 + 0.5;
    return wave;
}

float fractalPattern(vec3 p) {
    float val = 0.0;
    float amp = 1.0;
    float freq = 1.0;

    for (int i = 0; i < 4; i++) {
        val += noise(p * freq + vec3(u_time * 0.5)) * amp;
        freq *= 2.0;
        amp *= 0.5;
    }

    return val;
}

vec3 getPattern(vec3 p, vec3 nor) {
    vec3 patCol;

    if (u_pattern < 0.5) {
        // Checkerboard
        float pat = checkerPattern(p, 4.0);
        patCol = mix(vec3(0.2, 0.2, 0.3), vec3(0.7, 0.7, 0.8), pat);
    } else if (u_pattern < 1.5) {
        // Stripes
        float pat = stripePattern(p, 6.0);
        patCol = mix(vec3(0.1, 0.3, 0.7), vec3(0.9, 0.7, 0.1), pat);
    } else if (u_pattern < 2.5) {
        // Waves
        float pat = wavePattern(p, 5.0);
        patCol = mix(vec3(0.2, 0.5, 0.8), vec3(0.8, 0.3, 0.2), pat);
    } else {
        // Fractal Brownian motion
        float pat = fractalPattern(p * 2.0);
        patCol = vec3(pat * 0.5, pat * 0.7, pat);
    }

    return patCol;
}

vec3 envMap(vec3 rd) {
    float t = 0.5 + 0.5 * rd.y;
    return mix(vec3(0.4, 0.5, 0.6), vec3(0.1, 0.2, 0.4), t);
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

            // Get pattern color
            vec3 patCol = getPattern(pos, nor);

            // Check if on ground
            if (pos.y < -0.75) {
                float checker = mod(floor(pos.x * 2.0) + floor(pos.z * 2.0), 2.0);
                patCol = mix(vec3(0.15), vec3(0.3), checker);
            }

            vec3 ambient = vec3(0.2);
            vec3 diffuse = patCol * dif * 0.8;

            col = ambient + diffuse;
            col = pow(col, vec3(0.4545));
            break;
        }

        t += d;
        if (t > 10.0) break;
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

function createPatternsDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let pattern = 0;

  const patterns = ['Checkerboard', 'Stripes', 'Waves', 'Fractal'];

  a.window({ title: 'Procedural Patterns', width: WIDTH + 40, height: HEIGHT + 80 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Pattern buttons
        a.hbox(() => {
          a.label('Pattern: ');
          for (const pat of patterns) {
            a.button(pat).onClick(() => {
              pattern = patterns.indexOf(pat);
              shader?.setUniform('u_pattern', pattern);
            });
          }
        });

        // Canvas
        a.canvasStack(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, patternsShader, {
            uniforms: {
              u_pattern: pattern,
            }
          });
        });

        a.label(`Pattern: ${patterns[pattern]}`);
        a.label('Animated procedural patterns on 3D surface');
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Procedural Patterns' }, createPatternsDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}

export { createPatternsDemo };
