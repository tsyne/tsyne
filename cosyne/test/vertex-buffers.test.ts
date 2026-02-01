/**
 * Vertex Buffer Unit Tests - Cosyne Phase 2.3
 *
 * Tests for vertex buffer support including:
 * - SetVertices and SetIndices methods
 * - Vertex format descriptors
 * - Index buffer management
 * - VBO/IBO tracking
 * - Integration with shader uniforms
 */

import { describe, it, expect } from '@jest/globals';
import { createShaderTestContext } from './test-utils';

describe('Vertex Buffer Support - Phase 2.3', () => {
  describe('SetVertices Method', () => {
    it('should store vertex data with pos3 format', () => {
      const { shader } = createShaderTestContext();
      const vertices = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);

      shader.setVertices(Array.from(vertices), 'pos3');

      expect(shader.getVertices()).toEqual(Array.from(vertices));
      expect(shader.getVertexFormat()).toBe('pos3');
      expect(shader.getVertexCount()).toBe(3); // 9 floats / 3 = 3 vertices
    });

    it('should store vertex data with pos3_norm3 format', () => {
      const { shader } = createShaderTestContext();
      const vertices = new Float32Array([
        0, 0, 0, 0, 0, 1,  // vertex 1
        1, 0, 0, 1, 0, 0,  // vertex 2
        0, 1, 0, 0, 1, 0,  // vertex 3
      ]);

      shader.setVertices(Array.from(vertices), 'pos3_norm3');

      expect(shader.getVertices()).toEqual(Array.from(vertices));
      expect(shader.getVertexCount()).toBe(3); // 18 floats / 6 = 3 vertices
    });

    it('should store vertex data with pos3_norm3_uv2 format', () => {
      const { shader } = createShaderTestContext();
      const vertices = new Float32Array([
        0, 0, 0, 0, 0, 1, 0, 0,      // vertex 1
        1, 0, 0, 1, 0, 0, 1, 0,      // vertex 2
        0, 1, 0, 0, 1, 0, 0, 1,      // vertex 3
      ]);

      shader.setVertices(Array.from(vertices), 'pos3_norm3_uv2');

      expect(shader.getVertices()).toEqual(Array.from(vertices));
      expect(shader.getVertexCount()).toBe(3); // 24 floats / 8 = 3 vertices
    });

    it('should handle empty vertex data', () => {
      const { shader } = createShaderTestContext();

      shader.setVertices([], 'pos3');

      expect(shader.getVertices()).toEqual([]);
      expect(shader.getVertexCount()).toBe(0);
    });

    it('should handle pos2 format', () => {
      const { shader } = createShaderTestContext();
      const vertices = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
      ]);

      shader.setVertices(Array.from(vertices), 'pos2');

      expect(shader.getVertexCount()).toBe(3); // 6 floats / 2 = 3 vertices
    });

    it('should handle pos2_uv2 format', () => {
      const { shader } = createShaderTestContext();
      const vertices = new Float32Array([
        0, 0, 0, 0,      // vertex 1
        1, 0, 1, 0,      // vertex 2
        0, 1, 0, 1,      // vertex 3
      ]);

      shader.setVertices(Array.from(vertices), 'pos2_uv2');

      expect(shader.getVertexCount()).toBe(3); // 12 floats / 4 = 3 vertices
    });

    it('should handle pos3_col4 format', () => {
      const { shader } = createShaderTestContext();
      const vertices = new Float32Array([
        0, 0, 0, 1, 0, 0, 1,      // vertex 1
        1, 0, 0, 0, 1, 0, 1,      // vertex 2
        0, 1, 0, 0, 0, 1, 1,      // vertex 3
      ]);

      shader.setVertices(Array.from(vertices), 'pos3_col4');

      expect(shader.getVertexCount()).toBe(3); // 21 floats / 7 = 3 vertices
    });

    it('should trigger refresh on SetVertices', () => {
      const { shader, refreshed } = createShaderTestContext();
      refreshed.clear();

      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      shader.setVertices(Array.from(vertices), 'pos3');

      expect(refreshed.has('refresh')).toBe(true);
    });
  });

  describe('SetIndices Method', () => {
    it('should store index data', () => {
      const { shader } = createShaderTestContext();
      const indices = [0, 1, 2, 0, 2, 3];

      shader.setIndices(indices);

      expect(shader.getIndices()).toEqual(indices);
      expect(shader.getIndexCount()).toBe(6);
    });

    it('should handle empty indices', () => {
      const { shader } = createShaderTestContext();

      shader.setIndices([]);

      expect(shader.getIndices()).toEqual([]);
      expect(shader.getIndexCount()).toBe(0);
    });

    it('should trigger refresh on SetIndices', () => {
      const { shader, refreshed } = createShaderTestContext();
      refreshed.clear();

      shader.setIndices([0, 1, 2]);

      expect(refreshed.has('refresh')).toBe(true);
    });

    it('should support large index values', () => {
      const { shader } = createShaderTestContext();
      const indices = [0, 1, 2, 65535]; // Max uint16

      shader.setIndices(indices);

      expect(shader.getIndexCount()).toBe(4);
      expect(shader.getIndices()[3]).toBe(65535);
    });
  });

  describe('Vertex Format Attribute Count', () => {
    it('should calculate pos2 as 2 floats per vertex', () => {
      const { shader } = createShaderTestContext();
      shader.setVertices([1, 2, 3, 4, 5, 6], 'pos2');
      expect(shader.getVertexCount()).toBe(3); // 6 floats / 2 = 3 vertices
    });

    it('should calculate pos3 as 3 floats per vertex', () => {
      const { shader } = createShaderTestContext();
      shader.setVertices([1, 2, 3, 4, 5, 6, 7, 8, 9], 'pos3');
      expect(shader.getVertexCount()).toBe(3); // 9 floats / 3 = 3 vertices
    });

    it('should calculate pos3_norm3 as 6 floats per vertex', () => {
      const { shader } = createShaderTestContext();
      const verts = new Array(18).fill(0); // 3 vertices * 6 floats
      shader.setVertices(verts, 'pos3_norm3');
      expect(shader.getVertexCount()).toBe(3);
    });

    it('should calculate pos3_norm3_uv2 as 8 floats per vertex', () => {
      const { shader } = createShaderTestContext();
      const verts = new Array(24).fill(0); // 3 vertices * 8 floats
      shader.setVertices(verts, 'pos3_norm3_uv2');
      expect(shader.getVertexCount()).toBe(3);
    });

    it('should handle unknown format gracefully', () => {
      const { shader } = createShaderTestContext();
      shader.setVertices([1, 2, 3], 'unknown_format');
      expect(shader.getVertexCount()).toBe(0); // Unknown format returns 0
    });
  });

  describe('VBO/IBO Management', () => {
    it('should store and retrieve VBO ID', () => {
      const { shader } = createShaderTestContext();
      const vboID = 12345;

      shader.setVBO(vboID);

      expect(shader.getVBO()).toBe(vboID);
    });

    it('should store and retrieve IBO ID', () => {
      const { shader } = createShaderTestContext();
      const iboID = 67890;

      shader.setIBO(iboID);

      expect(shader.getIBO()).toBe(iboID);
    });

    it('should start with zero VBO/IBO IDs', () => {
      const { shader } = createShaderTestContext();

      expect(shader.getVBO()).toBe(0);
      expect(shader.getIBO()).toBe(0);
    });

    it('should allow updating VBO ID', () => {
      const { shader } = createShaderTestContext();

      shader.setVBO(111);
      expect(shader.getVBO()).toBe(111);

      shader.setVBO(222);
      expect(shader.getVBO()).toBe(222);
    });
  });

  describe('Integration with Uniforms', () => {
    it('should allow combining vertex data with scalar uniforms', () => {
      const { shader } = createShaderTestContext();

      const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0];
      shader.setVertices(vertices, 'pos3');
      shader.setUniform('color', [1, 0, 0, 1]);

      expect(shader.getVertexCount()).toBe(3);
      expect(shader.getUniforms()['color']).toEqual([1, 0, 0, 1]);
    });

    it('should allow combining vertex data with texture uniforms', () => {
      const { shader } = createShaderTestContext();

      const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0];
      shader.setVertices(vertices, 'pos3');

      // Use a mock object as texture
      const mockImage = { type: 'MockImage', width: 10, height: 10 };
      shader.setTextureUniform('diffuse', mockImage);

      expect(shader.getVertexCount()).toBe(3);
      expect(shader.getTextures()['diffuse']).toBeDefined();
      expect(shader.getTextures()['diffuse'].type).toBe('MockImage');
    });

    it('should maintain separate vertex and uniform state', () => {
      const { shader } = createShaderTestContext();

      shader.setVertices([0, 0, 0, 1, 1, 1], 'pos3');
      shader.setIndices([0, 1]);
      shader.setUniform('time', 42.5);

      expect(shader.getVertexCount()).toBe(2);
      expect(shader.getIndexCount()).toBe(2);
      expect(shader.getUniforms()['time']).toBe(42.5);
    });
  });

  describe('Multiple Vertex Updates', () => {
    it('should update vertices multiple times', () => {
      const { shader } = createShaderTestContext();

      shader.setVertices([0, 0, 0, 1, 0, 0], 'pos3');
      expect(shader.getVertexCount()).toBe(2);

      shader.setVertices([0, 0, 0, 1, 0, 0, 0, 1, 0], 'pos3');
      expect(shader.getVertexCount()).toBe(3);
    });

    it('should update indices independently', () => {
      const { shader } = createShaderTestContext();

      shader.setIndices([0, 1, 2]);
      expect(shader.getIndexCount()).toBe(3);

      shader.setIndices([0, 1]);
      expect(shader.getIndexCount()).toBe(2);
    });

    it('should maintain vertex count after index update', () => {
      const { shader } = createShaderTestContext();

      const vertices = new Array(9).fill(0);
      shader.setVertices(vertices, 'pos3');
      const vertexCount = shader.getVertexCount();

      shader.setIndices([0, 1, 2, 1, 2, 3]);

      expect(shader.getVertexCount()).toBe(vertexCount); // Should not change
      expect(shader.getIndexCount()).toBe(6);
    });
  });

  describe('Vertex Format Edge Cases', () => {
    it('should handle mixed format updates', () => {
      const { shader } = createShaderTestContext();

      shader.setVertices([0, 0, 0, 1, 1, 1], 'pos3');
      expect(shader.getVertexCount()).toBe(2);

      // Switch to pos2
      shader.setVertices([0, 0, 1, 1, 0, 1, 1, 1], 'pos2');
      expect(shader.getVertexCount()).toBe(4);
      expect(shader.getVertexFormat()).toBe('pos2');
    });

    it('should handle large vertex buffers', () => {
      const { shader } = createShaderTestContext();

      // Create 1000 pos3 vertices (3000 floats)
      const vertices = new Array(3000).fill(0);
      shader.setVertices(vertices, 'pos3');

      expect(shader.getVertexCount()).toBe(1000);
    });

    it('should handle large index buffers', () => {
      const { shader } = createShaderTestContext();

      // Create 10000 indices
      const indices = Array.from({ length: 10000 }, (_, i) => i);
      shader.setIndices(indices);

      expect(shader.getIndexCount()).toBe(10000);
    });
  });

  describe('Vertex Data Preservation', () => {
    it('should preserve vertex data across operations', () => {
      const { shader } = createShaderTestContext();

      const originalVertices = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      shader.setVertices(originalVertices, 'pos3');

      // Do other operations
      shader.setUniform('test', 42);
      shader.setIndices([0, 1, 2]);

      // Verify vertices are unchanged
      expect(shader.getVertices()).toEqual(originalVertices);
    });

    it('should preserve index data across operations', () => {
      const { shader } = createShaderTestContext();

      const originalIndices = [0, 1, 2, 1, 2, 3];
      shader.setIndices(originalIndices);

      // Do other operations
      shader.setUniform('test', 42);
      shader.setVertices([0, 0, 0, 1, 1, 1, 2, 2, 2], 'pos3');

      // Verify indices are unchanged
      expect(shader.getIndices()).toEqual(originalIndices);
    });
  });
});
