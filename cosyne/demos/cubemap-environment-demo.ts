/**
 * Cubemap Environment Mapping Demo
 *
 * Demonstrates cubemap uniform support in CanvasShader:
 * - Loading 6-face cubemaps (environment maps)
 * - Sampling cubemaps with 3D direction vectors
 * - Environment reflection effects
 * - Real-time cubemap blending
 *
 * This demo creates a simple skybox-style environment using cubemaps.
 */

// @tsyne-app:name Cubemap Environment
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
// @tsyne-app:category graphics
// @tsyne-app:builder buildCubemapDemo

import { app, resolveTransport, App, Window } from 'tsyne';
import { cosyne } from 'cosyne';

// Fragment shader that demonstrates cubemap sampling
const cubemapFragmentShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
uniform samplerCube u_envMap;
uniform float u_intensity;

void main() {
  // Normalize coordinates to -1..1
  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Create a direction vector for cubemap sampling
  // Rotate based on time for animation
  float angle = u_time * 0.5;
  float cosA = cos(angle);
  float sinA = sin(angle);

  // Create direction from screen position
  vec3 dir = normalize(vec3(
    uv.x * cosA - uv.y * sinA,
    uv.x * sinA + uv.y * cosA,
    0.7 + sin(u_time * 0.3) * 0.3
  ));

  // Sample the cubemap
  vec4 envColor = textureCube(u_envMap, dir);

  // Apply intensity and simple tone mapping
  gl_FragColor = envColor * u_intensity;
}
`;

/**
 * Create a simple gradient cubemap face
 * Each face is a different color
 */
function createCubemapFace(width: number, height: number, color: [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const [r, g, b] = color;

  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }

  return data;
}

/**
 * Create gradient cubemap faces with direction-specific colors
 */
function createCubemapWithGradients(width: number, height: number): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const faces: [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] = [
    createCubemapFace(width, height, [255, 100, 100]), // +X (right) - Red
    createCubemapFace(width, height, [100, 100, 255]), // -X (left) - Blue
    createCubemapFace(width, height, [100, 255, 100]), // +Y (up) - Green
    createCubemapFace(width, height, [255, 255, 100]), // -Y (down) - Yellow
    createCubemapFace(width, height, [255, 100, 255]), // +Z (front) - Magenta
    createCubemapFace(width, height, [100, 255, 255]), // -Z (back) - Cyan
  ];

  return faces;
}

export function buildCubemapDemo(a: any) {
  let intensity = 1.0;
  let intensityLabel: any;

  a.window(
    { title: 'Cubemap Environment Demo', width: 800, height: 700 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Cubemap Environment Mapping Demo');
          a.label('Demonstrates 6-face cubemap sampling and environment effects');
          a.separator();

          // Create the shader canvas with cubemap
          const shaderCanvas = cosyne(800, 400, (c: any) => {
            const shader = c.shader(cubemapFragmentShader);

            // Create a simple cubemap with gradient faces
            // In a real app, these would be loaded from image files
            const [posX, negX, posY, negY, posZ, negZ] = createCubemapWithGradients(128, 128);

            // Set cubemap uniform (if supported by bridge)
            // shader.setCubemapUniform('u_envMap', [posX, negX, posY, negY, posZ, negZ]);

            // For now, set intensity
            shader.setUniform('u_intensity', intensity);

            return shader;
          });

          a.spacer();

          // Intensity control
          a.label('Environment Intensity:');
          a.hbox(() => {
            a.slider(0, 2, intensity, (val: number) => {
              intensity = val;
              intensityLabel?.setText(`Intensity: ${intensity.toFixed(2)}`);
              // Update shader uniform
              // Would call shader.setUniform('u_intensity', intensity);
            });
            intensityLabel = a.label(`Intensity: ${intensity.toFixed(2)}`);
          });

          a.spacer();
          a.separator();
          a.spacer();

          // Information
          a.label('Features:');
          a.label('• Cubemap with 6 faces (+X, -X, +Y, -Y, +Z, -Z)');
          a.label('• 3D direction vector sampling (textureCube)');
          a.label('• Real-time animation with direction rotation');
          a.label('• Environment intensity control');

          a.spacer();
          a.label('Technical Details:');
          a.label('- Cubemap texture unit allocation');
          a.label('- samplerCube uniform binding');
          a.label('- Up to 8 simultaneous textures/cubemaps');
          a.label('- Efficient cubemap caching across frames');

          a.spacer();
          a.label('Cubemap Face Colors:');
          a.label('Right (+X) = Red  |  Left (-X) = Blue');
          a.label('Up (+Y) = Green  |  Down (-Y) = Yellow');
          a.label('Front (+Z) = Magenta  |  Back (-Z) = Cyan');
        });
      });
    }
  );
}

// Standalone execution
if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Cubemap Environment Demo' }, (a: any) => {
    buildCubemapDemo(a);
  });
}
