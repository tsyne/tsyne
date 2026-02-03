/**
 * Real Kaleidoscope Effect using GPU Shader
 *
 * This uses CanvasShader to do proper kaleidoscope mirroring on the GPU.
 * Move the mouse to shift the pattern, use buttons to change segments.
 */

import { app, resolveTransport, CanvasShader , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 500;
const HEIGHT = 500;

// Kaleidoscope fragment shader
// Note: Using GLSL 1.10 for compatibility with desktop OpenGL
// No precision qualifier - that's OpenGL ES syntax only
const kaleidoscopeShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_segments;
uniform vec2 u_offset;

// Create a colorful pattern to mirror
vec3 pattern(vec2 uv) {
    // Animated plasma-like pattern
    float v1 = sin(uv.x * 5.0 + u_time);
    float v2 = sin(uv.y * 5.0 + u_time * 0.7);
    float v3 = sin((uv.x + uv.y) * 5.0 + u_time * 1.3);
    float v4 = sin(length(uv) * 10.0 - u_time * 2.0);

    float v = (v1 + v2 + v3 + v4) * 0.25;

    // Color based on value
    vec3 col;
    col.r = sin(v * 3.14159 + 0.0) * 0.5 + 0.5;
    col.g = sin(v * 3.14159 + 2.094) * 0.5 + 0.5;
    col.b = sin(v * 3.14159 + 4.188) * 0.5 + 0.5;

    return col;
}

void main() {
    // Viewport is set by painter, so gl_FragCoord is already relative to shader quad
    // Normalize coordinates to -1 to 1, centered
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;

    // Apply mouse offset
    uv += u_offset * 0.5;

    // Convert to polar coordinates
    float radius = length(uv);
    float angle = atan(uv.y, uv.x);

    // Number of mirror segments
    float segments = max(2.0, u_segments);
    float segmentAngle = 3.14159 * 2.0 / segments;

    // Which segment are we in?
    float segmentIndex = floor(angle / segmentAngle + segments) ;
    segmentIndex = mod(segmentIndex, segments);

    // Angle within segment
    float localAngle = mod(angle + 3.14159 * 2.0, segmentAngle);

    // Mirror odd segments
    if (mod(segmentIndex, 2.0) >= 1.0) {
        localAngle = segmentAngle - localAngle;
    }

    // Convert back to cartesian for pattern sampling
    vec2 mirroredUV = vec2(cos(localAngle), sin(localAngle)) * radius;

    // Get pattern color
    vec3 col = pattern(mirroredUV);

    // Slight vignette
    col *= 1.0 - radius * 0.3;

    gl_FragColor = vec4(col, 1.0);
}
`;

function createKaleidoscopeDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let segments = 8;
  let mouseX = 0;
  let mouseY = 0;

  a.window({ title: 'GPU Kaleidoscope', width: WIDTH + 40, height: HEIGHT + 80 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Controls
        a.hbox(() => {
          a.button('- Segments', { onClick: () => {
            segments = Math.max(2, segments - 1);
            shader?.setUniform('u_segments', segments);
          } });
          a.label(`Segments: ${segments}`);
          a.button('+ Segments', { onClick: () => {
            segments = Math.min(24, segments + 1);
            shader?.setUniform('u_segments', segments);
          } });
        });

        // Shader canvas
        a.canvasStack(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, kaleidoscopeShader, {
            uniforms: {
              u_segments: segments,
              u_offset: [0, 0],
            }
          });

          // Overlay for mouse tracking
          a.tappableCanvasRaster(WIDTH, HEIGHT, () => {}, {
            onDrag: (x, y, deltaX, deltaY) => {
              mouseX += deltaX / WIDTH;
              mouseY -= deltaY / HEIGHT;  // Flip Y
              shader?.setUniform('u_offset', [mouseX, mouseY]);
            }
          });
        });

        a.label('Drag to shift the pattern');
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Kaleidoscope' }, createKaleidoscopeDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}
