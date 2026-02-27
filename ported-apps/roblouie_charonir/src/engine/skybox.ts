import { AttributeLocation } from '@/engine/renderer/renderer';
import { gl } from '@/engine/renderer/lil-gl';
import { MoldableCubeGeometry } from '@/engine/moldable-cube-geometry';

export class Skybox extends MoldableCubeGeometry {
  cubemapTexture: WebGLTexture | null = null;

  constructor(...textureSources: (ImageData | HTMLCanvasElement)[]) {
    super();
    this.cubemapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubemapTexture);
    textureSources.forEach((tex, index) => {
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + index, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    this.setAttribute(AttributeLocation.Positions, new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]), 2);
  }

  /** Bind the cubemap to unit 0 — must be called each frame before skybox rendering */
  bindForRendering() {
    if (this.cubemapTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubemapTexture);
    }
  }
}
