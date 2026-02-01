/**
 * Reaction-Diffusion Patterns - GPU Shader
 *
 * Implements Gray-Scott reaction-diffusion system.
 * Creates organic patterns: spots, stripes, mazes, patterns.
 *
 * Note: This is a simplified visualization using noise.
 * True RD would require multiple passes/texture feedback.
 *
 * Run: npx tsx cosyne/demos/shader-reaction-diffusion.ts
 */

import { app, resolveTransport, CanvasShader , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 500;
const HEIGHT = 500;

const reactionDiffusionShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_pattern;  // 0=spots, 1=stripes, 2=maze, 3=swirl
uniform float u_speed;

// Hash and noise for pattern generation
float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n = mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
    return n;
}

float fbm(vec2 p) {
    float val = 0.0;
    float amp = 1.0;
    float freq = 1.0;

    for (int i = 0; i < 5; i++) {
        val += noise(p * freq) * amp;
        freq *= 2.0;
        amp *= 0.5;
    }

    return val;
}

// Simulate reaction-diffusion-like behavior with noise
float reactionDiffusion(vec2 p, float time, float k) {
    // Multiple time-scaled noise layers
    float u = fbm(p + time * 0.1);
    float v = fbm(p + vec2(100.0) + time * 0.15);

    // Simple reaction-diffusion approximation
    float reaction = u * (1.0 - v) - k * v;
    return reaction * 0.5 + 0.5;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    vec3 col = vec3(0.1);

    if (u_pattern < 0.5) {
        // Spots pattern
        float rd = reactionDiffusion(uv * 8.0, u_time * u_speed, 0.05);
        float spots = step(0.5, rd);

        col = mix(
            vec3(0.1, 0.1, 0.2),
            vec3(0.9, 0.8, 0.6),
            spots
        );

        // Add subtle color
        col += vec3(0.1, 0.2, 0.4) * (1.0 - spots) * 0.5;

    } else if (u_pattern < 1.5) {
        // Stripes pattern
        float rd = reactionDiffusion(uv * 5.0, u_time * u_speed, 0.08);
        float wave = sin(uv.x * 10.0 + rd * 5.0 + u_time * u_speed);

        col = mix(
            vec3(0.1, 0.1, 0.2),
            vec3(0.2, 0.8, 0.9),
            smoothstep(0.3, 0.7, rd)
        );

        // Stripe modulation
        col *= 0.8 + 0.2 * sin(wave);

    } else if (u_pattern < 2.5) {
        // Maze pattern
        float scale = 6.0;
        float rd1 = reactionDiffusion(uv * scale, u_time * u_speed, 0.06);
        float rd2 = reactionDiffusion(uv * scale + vec2(50.0), u_time * u_speed * 0.8, 0.04);

        float maze = step(0.4, rd1) * step(0.4, rd2);

        col = mix(
            vec3(0.9, 0.8, 0.6),
            vec3(0.1, 0.1, 0.15),
            maze
        );

    } else {
        // Swirl pattern
        vec2 p = uv;
        float angle = atan(p.y - 0.5, p.x - 0.5);
        float dist = length(p - 0.5);

        float rd = reactionDiffusion(
            vec2(angle + u_time * u_speed * 0.5, dist * 5.0),
            u_time * u_speed,
            0.07
        );

        col = vec3(0.1);
        col += vec3(
            sin(rd * 3.14159 + 0.0) * 0.5 + 0.5,
            sin(rd * 3.14159 + 2.094) * 0.5 + 0.5,
            sin(rd * 3.14159 + 4.188) * 0.5 + 0.5
        );
    }

    // Gamma
    col = pow(col, vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}
`;

function createRDDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let pattern = 0;
  let speed = 1.0;

  const patterns = ['Spots', 'Stripes', 'Maze', 'Swirl'];

  a.window({ title: 'Reaction-Diffusion Patterns', width: WIDTH + 40, height: HEIGHT + 100 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Pattern buttons
        a.hbox(() => {
          a.label('Pattern: ');
          for (const p of patterns) {
            a.button(p).onClick(() => {
              pattern = patterns.indexOf(p);
              shader?.setUniform('u_pattern', pattern);
            });
          }
        });

        // Speed controls
        a.hbox(() => {
          a.button('Slow').onClick(() => {
            speed = 0.5;
            shader?.setUniform('u_speed', speed);
          });
          a.button('Normal').onClick(() => {
            speed = 1.0;
            shader?.setUniform('u_speed', speed);
          });
          a.button('Fast').onClick(() => {
            speed = 2.0;
            shader?.setUniform('u_speed', speed);
          });
        });

        // Canvas
        a.center(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, reactionDiffusionShader, {
            uniforms: {
              u_pattern: pattern,
              u_speed: speed,
            }
          });
        });

        a.label(`Pattern: ${patterns[pattern]} | Speed: ${speed.toFixed(1)}x`);
        a.label('Inspired by Gray-Scott reaction-diffusion');
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Reaction-Diffusion' }, createRDDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}

export { createRDDemo };
