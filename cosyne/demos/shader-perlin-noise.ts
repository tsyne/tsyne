/**
 * Perlin Noise Visualization - GPU Shader
 *
 * Demonstrates noise generation on GPU:
 * - Single octave Perlin noise
 * - Fractional Brownian motion (multiple octaves)
 * - Noise-based displacement
 * - Animated flow visualization
 *
 * Run: npx tsx cosyne/demos/shader-perlin-noise.ts
 */

import { app, resolveTransport, CanvasShader , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 500;
const HEIGHT = 500;

const noiseShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_noiseType;  // 0=simple, 1=fbm, 2=displacement, 3=flow
uniform vec2 u_offset;

// Hash function
float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

// Improved noise
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

// Fractional Brownian motion
float fbm(vec3 p) {
    float val = 0.0;
    float amp = 1.0;
    float freq = 1.0;

    for (int i = 0; i < 6; i++) {
        val += noise(p * freq) * amp;
        freq *= 2.0;
        amp *= 0.5;
    }

    return val;
}

// Velocity field (for flow)
vec2 velocityField(vec2 p) {
    float n1 = noise(vec3(p * 0.5 + u_time * 0.3, u_time * 0.5));
    float n2 = noise(vec3(p * 0.5 + u_time * 0.3 + vec2(100.0), u_time * 0.5));
    return vec2(n1, n2) - 0.5;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = (gl_FragCoord.xy + u_offset) / u_resolution * 5.0;

    vec3 col = vec3(0.1);

    if (u_noiseType < 0.5) {
        // Simple Perlin noise
        float n = noise(vec3(p, u_time * 0.5));
        col = vec3(n);

    } else if (u_noiseType < 1.5) {
        // Fractional Brownian motion
        float f = fbm(vec3(p + u_time * 0.2, u_time * 0.5));
        col = vec3(f * 0.7 + 0.3);

        // Color gradient
        col = mix(
            vec3(0.1, 0.2, 0.4),  // Blue
            mix(
                vec3(0.4, 0.6, 0.9),  // Light blue
                vec3(0.9, 0.9, 0.1),  // Yellow
                f
            ),
            f
        );

    } else if (u_noiseType < 2.5) {
        // Displacement mapping
        float n = fbm(vec3(p, u_time * 0.3));
        vec2 disp = vec2(
            fbm(vec3(p + vec2(10.0, 0.0), u_time * 0.3)),
            fbm(vec3(p + vec2(0.0, 10.0), u_time * 0.3))
        ) - 0.5;

        vec2 displaced = p + disp * 0.5;
        float n2 = fbm(vec3(displaced, u_time * 0.2));

        col = mix(
            vec3(0.1, 0.1, 0.2),
            vec3(0.9, 0.6, 0.2),
            n2
        );

    } else {
        // Flow visualization
        vec2 pos = uv;
        float flowTime = u_time * 0.5;

        // Trace flow lines
        float flow = 0.0;
        for (int i = 0; i < 8; i++) {
            vec2 grad = normalize(vec2(
                noise(vec3(pos + vec2(0.01, 0.0), flowTime)),
                noise(vec3(pos + vec2(0.0, 0.01), flowTime))
            )) - 0.5) * 2.0;

            float dist = length(fract(pos * 8.0 + vec2(float(i)) * 0.1) - 0.5);
            flow += exp(-dist * 10.0);
        }

        col = mix(
            vec3(0.1, 0.2, 0.4),
            vec3(0.2, 0.8, 0.9),
            flow * 0.5
        );

        // Add noise color
        float n = fbm(vec3(uv * 3.0, flowTime));
        col = mix(col, vec3(n), 0.3);
    }

    // Gamma correction
    col = pow(col, vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}
`;

function createNoiseDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let noiseType = 1;  // Start with FBM
  let offsetX = 0;
  let offsetY = 0;

  const types = ['Simple', 'FBM', 'Displacement', 'Flow'];

  a.window({ title: 'Perlin Noise (GPU)', width: WIDTH + 40, height: HEIGHT + 100 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Type buttons
        a.hbox(() => {
          a.label('Type: ');
          for (const type of types) {
            a.button(type, { onClick: () => {
              noiseType = types.indexOf(type);
              shader?.setUniform('u_noiseType', noiseType);
            } });
          }
        });

        // Pan controls
        a.hbox(() => {
          a.button('< Pan', { onClick: () => {
            offsetX -= 50;
            shader?.setUniform('u_offset', [offsetX, offsetY]);
          } });
          a.button('Reset View', { onClick: () => {
            offsetX = 0;
            offsetY = 0;
            shader?.setUniform('u_offset', [offsetX, offsetY]);
          } });
          a.button('Pan >', { onClick: () => {
            offsetX += 50;
            shader?.setUniform('u_offset', [offsetX, offsetY]);
          } });
        });

        // Canvas
        a.center(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, noiseShader, {
            uniforms: {
              u_noiseType: noiseType,
              u_offset: [offsetX, offsetY],
            }
          });
        });

        a.label(`Type: ${types[noiseType]} | Animated via u_time`);
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Perlin Noise' }, createNoiseDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}

export { createNoiseDemo };
