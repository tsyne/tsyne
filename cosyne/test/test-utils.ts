/**
 * Test utilities for CanvasShader tests
 */

export interface TestShader {
  // Uniforms
  setUniform(name: string, value: any): void;
  getUniforms(): Record<string, any>;

  // Textures
  setTextureUniform(name: string, value: any): void;
  getTextures(): Record<string, any>;

  // Cubemaps
  setCubemapUniform(name: string, faces: [any, any, any, any, any, any]): void;
  getCubemaps(): Record<string, [any, any, any, any, any, any]>;

  // Vertices (Phase 2.3)
  setVertices(data: number[], format: string): void;
  getVertices(): number[];
  getVertexFormat(): string;
  getVertexCount(): number;

  // Indices (Phase 2.3)
  setIndices(indices: number[]): void;
  getIndices(): number[];
  getIndexCount(): number;

  // VBO/IBO (Phase 2.3)
  setVBO(vbo: number): void;
  getVBO(): number;
  setIBO(ibo: number): void;
  getIBO(): number;

  // Helper
  attributeCountForFormat(format: string): number;
}

export function createShaderTestContext(): {
  shader: TestShader;
  refreshed: Set<string>;
} {
  const uniforms: Record<string, any> = {};
  const textures: Record<string, any> = {};
  const cubemaps: Record<string, [any, any, any, any, any, any]> = {};
  let vertices: number[] = [];
  let vertexFormat: string = '';
  let indices: number[] = [];
  let vbo: number = 0;
  let ibo: number = 0;
  const refreshed = new Set<string>();

  const shader: TestShader = {
    // Uniforms
    setUniform(name: string, value: any) {
      uniforms[name] = value;
      refreshed.add('refresh');
    },
    getUniforms() {
      return uniforms;
    },

    // Textures
    setTextureUniform(name: string, value: any) {
      textures[name] = value;
      refreshed.add('refresh');
    },
    getTextures() {
      return textures;
    },

    // Cubemaps
    setCubemapUniform(name: string, faces: [any, any, any, any, any, any]) {
      cubemaps[name] = faces;
      refreshed.add('refresh');
    },
    getCubemaps() {
      return cubemaps;
    },

    // Vertices (Phase 2.3)
    setVertices(data: number[], format: string) {
      vertices = data;
      vertexFormat = format;
      refreshed.add('refresh');
    },
    getVertices() {
      return vertices;
    },
    getVertexFormat() {
      return vertexFormat;
    },
    getVertexCount() {
      if (vertices.length === 0) return 0;
      const attribCount = this.attributeCountForFormat(vertexFormat);
      return attribCount > 0 ? vertices.length / attribCount : 0;
    },

    // Indices (Phase 2.3)
    setIndices(indices_data: number[]) {
      indices = indices_data;
      refreshed.add('refresh');
    },
    getIndices() {
      return indices;
    },
    getIndexCount() {
      return indices.length;
    },

    // VBO/IBO (Phase 2.3)
    setVBO(vbo_id: number) {
      vbo = vbo_id;
    },
    getVBO() {
      return vbo;
    },
    setIBO(ibo_id: number) {
      ibo = ibo_id;
    },
    getIBO() {
      return ibo;
    },

    // Helper method for attribute count calculation
    attributeCountForFormat(format: string): number {
      switch (format) {
        case 'pos2':
          return 2;
        case 'pos3':
          return 3;
        case 'pos2_uv2':
          return 4;
        case 'pos3_norm3':
          return 6;
        case 'pos3_norm3_uv2':
          return 8;
        case 'pos3_col4':
          return 7;
        default:
          return 0;
      }
    },
  };

  return { shader, refreshed };
}
