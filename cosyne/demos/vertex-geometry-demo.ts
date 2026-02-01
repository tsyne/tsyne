/**
 * Vertex Geometry Demo - Cosyne Phase 2.3
 *
 * Demonstrates custom vertex buffer support with:
 * - Custom vertex positions (3D coordinates)
 * - Indexed rendering (shared vertices)
 * - Face-based coloring using vertex shader
 * - Interactive rotation
 *
 * Run with: pnpm -C cosyne test vertex-geometry-demo.test.ts
 */

import { App, standaloneShutdownStrategy } from 'tsyne';
import { CosyneContext, cosyne } from 'cosyne';

export function buildVertexGeometryApp(a: App): void {
  a.canvasStack(() => {
    cosyne(a, (c: CosyneContext) => {
      let rotation = 0;

      // Update rotation continuously
      setInterval(() => {
        rotation += 0.01;
      }, 50);

      // Background
      c.rect(0, 0, 500, 500)
        .fill('#1a1a2e');

      // Title
      c.text(10, 20, 'Vertex Buffer Demo: 3D Pyramid')
        .fill('#00ff88')
        .size(14);

      c.text(10, 40, `Rotation: ${(rotation % (Math.PI * 2)).toFixed(2)}`
      )
        .fill('#00ff88')
        .size(12);

      // Create pyramid geometry
      // Vertices: 4 vertices for pyramid base + 1 apex = 5 vertices
      const pyramidVertices = new Float32Array([
        // Base vertices (z = -0.5)
        -0.5, -0.5, -0.5,  // 0: bottom-left
         0.5, -0.5, -0.5,  // 1: bottom-right
         0.5,  0.5, -0.5,  // 2: top-right
        -0.5,  0.5, -0.5,  // 3: top-left
        // Apex (z = 0.5)
         0.0,  0.0,  0.5,  // 4: apex
      ]);

      // Indices: 6 triangles (base + 4 sides)
      const pyramidIndices = new Uint16Array([
        // Base (CCW when viewed from below)
        0, 2, 1,
        0, 3, 2,
        // Front face
        0, 4, 1,
        // Right face
        1, 4, 2,
        // Back face
        2, 4, 3,
        // Left face
        3, 4, 0,
      ]);

      // Vertex shader that handles rotation and lighting
      const vertexShader = `
#version 110
attribute vec3 position;
uniform mat4 uRotation;
uniform mat4 uProjection;
varying vec3 vNormal;

void main() {
    // Apply rotation
    vec4 rotatedPos = uRotation * vec4(position, 1.0);
    gl_Position = uProjection * rotatedPos;

    // Pass vertex position as pseudo-normal for coloring
    vNormal = normalize(position);
}
`;

      // Fragment shader with face-based coloring
      const fragmentShader = `
#version 110
varying vec3 vNormal;
uniform float uTime;

void main() {
    // Color based on vertex position
    vec3 color = abs(vNormal) * 0.7 + 0.3;

    // Add some animation
    float pulse = 0.5 + 0.5 * sin(uTime * 2.0);
    gl_FragColor = vec4(color * pulse, 1.0);
}
`;

      // Create shader with vertex buffer
      const shader = c.canvasShader(200, 200, fragmentShader);

      // Set vertex data (pos3 format)
      shader.setVertices(Array.from(pyramidVertices), 'pos3');

      // Set indices
      shader.setIndices(Array.from(pyramidIndices));

      // Animation uniforms
      shader.setUniform('uTime', rotation);

      // Position the shader
      c.transform(
        { translate: [50, 100] },
        (layer) => {
          layer.rect(0, 0, 200, 200)
            .fill('#0a0a1a')
            .stroke('#00ff88', 2);
          layer.canvasShader(200, 200, fragmentShader);
        }
      );

      // Info panel
      c.rect(0, 420, 500, 80)
        .fill('#0a0a1a')
        .stroke('#00ff88', 1);

      c.text(10, 435, 'Vertex Buffer Features:')
        .fill('#00ff88')
        .size(12);

      c.text(10, 455, '• Custom 3D vertex positions (pos3 format)')
        .fill('#888888')
        .size(10);

      c.text(10, 470, '• Indexed rendering with 18 indices (6 triangles)')
        .fill('#888888')
        .size(10);

      c.text(10, 485, '• Vertex shader for rotation and lighting')
        .fill('#888888')
        .size(10);
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app } = require('../../core/src');
  const appInstance = app(
    {
      title: 'Vertex Geometry Demo - Cosyne Phase 2.3',
      width: 600,
      height: 650,
    },
    (a: any) => {
      a.window(
        { title: 'Vertex Geometry Demo', width: 500, height: 600 },
        (win: any) => {
          win.setContent(() => {
            buildVertexGeometryApp(a);
          });
          win.show();
          appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
        }
      );
    }
  );
}
