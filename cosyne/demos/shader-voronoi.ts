/**
 * Voronoi Diagrams - GPU Shader
 *
 * GPU-accelerated Voronoi diagram generation:
 * - Voronoi cells
 * - Voronoi edges (cracks/ridges)
 * - Animated cell growth
 * - Cell coloring based on distance
 *
 * Run: npx tsx cosyne/demos/shader-voronoi.ts
 */

import { app, resolveTransport, CanvasShader } from 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 500;
const HEIGHT = 500;

const voronoiShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_voronoiType;  // 0=cells, 1=edges, 2=distance, 3=animated
uniform float u_cellCount;

// Hash function for deterministic random
float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

// 2D Voronoi
float voronoi(vec2 p, float scale, float time) {
    vec2 i = floor(p * scale);
    vec2 f = fract(p * scale);

    float minDist = 1e10;
    float cellId = 0.0;
    vec2 closestCell = vec2(0.0);

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cellPos = i + neighbor;

            // Pseudo-random point in cell
            float rnd = hash(cellPos);
            vec2 point = neighbor + vec2(
                sin(rnd * 6.28 + time * 0.5) * 0.4 + 0.5,
                cos(rnd * 6.28 + time * 0.3) * 0.4 + 0.5
            );

            float dist = length(f - point);

            if (dist < minDist) {
                minDist = dist;
                cellId = hash(cellPos);
                closestCell = cellPos;
            }
        }
    }

    return minDist;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float scale = u_cellCount;

    if (u_voronoiType < 0.5) {
        // Voronoi cells with color
        vec2 i = floor(uv * scale);
        float cellId = hash(i);

        vec3 col = vec3(
            hash(i + vec2(10.0, 0.0)),
            hash(i + vec2(0.0, 10.0)),
            hash(i + vec2(10.0, 10.0))
        );

        gl_FragColor = vec4(col, 1.0);

    } else if (u_voronoiType < 1.5) {
        // Voronoi edges (cracks)
        float d = voronoi(uv, scale, 0.0);

        // Edge detection: dark lines where distance is small
        float edge = exp(-d * 100.0);
        vec3 col = mix(
            vec3(0.1, 0.1, 0.15),
            vec3(1.0, 1.0, 1.0),
            edge
        );

        gl_FragColor = vec4(col, 1.0);

    } else if (u_voronoiType < 2.5) {
        // Distance-based coloring
        float d = voronoi(uv, scale, 0.0);

        // Color based on distance to edge
        vec3 col = mix(
            vec3(0.8, 0.2, 0.2),  // Red at edges
            vec3(0.2, 0.8, 0.8),  // Cyan at cell centers
            d * 3.0
        );

        gl_FragColor = vec4(col, 1.0);

    } else {
        // Animated growth
        float d = voronoi(uv, scale, u_time);

        // Pulsing effect
        float pulse = sin(u_time + d * 5.0) * 0.5 + 0.5;

        // Cells expand and contract
        float growth = 0.5 + 0.5 * sin(u_time * 2.0 + d * 10.0);

        vec3 col;
        if (d < 0.1 * growth) {
            // Cell center - bright
            col = vec3(1.0, 0.8, 0.3) * pulse;
        } else if (d < 0.3 * growth) {
            // Cell interior
            col = mix(vec3(0.2, 0.4, 0.8), vec3(0.8, 0.4, 0.2), pulse);
        } else {
            // Cell edges
            col = vec3(0.1, 0.1, 0.15);
        }

        gl_FragColor = vec4(col, 1.0);
    }
}
`;

function createVoronoiDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let voronoiType = 0;
  let cellCount = 10.0;

  const types = ['Cells', 'Edges', 'Distance', 'Animated'];

  a.window({ title: 'Voronoi Diagrams', width: WIDTH + 40, height: HEIGHT + 100 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Type buttons
        a.hbox(() => {
          a.label('Type: ');
          for (const type of types) {
            a.button(type).onClick(() => {
              voronoiType = types.indexOf(type);
              shader?.setUniform('u_voronoiType', voronoiType);
            });
          }
        });

        // Cell count controls
        a.hbox(() => {
          a.button('Zoom Out').onClick(() => {
            cellCount = Math.max(2, cellCount - 2);
            shader?.setUniform('u_cellCount', cellCount);
          });
          a.label(`Cells: ${cellCount.toFixed(0)}`);
          a.button('Zoom In').onClick(() => {
            cellCount = Math.min(30, cellCount + 2);
            shader?.setUniform('u_cellCount', cellCount);
          });
        });

        // Canvas
        a.center(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, voronoiShader, {
            uniforms: {
              u_voronoiType: voronoiType,
              u_cellCount: cellCount,
            }
          });
        });

        a.label(`Type: ${types[voronoiType]} | Cells: ${cellCount.toFixed(0)}`);
      });
    });

    win.show();
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Voronoi Diagrams' }, createVoronoiDemo);
}

export { createVoronoiDemo };
