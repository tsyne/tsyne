import { gl } from '@/engine/renderer/lil-gl';
import { Texture } from '@/engine/renderer/texture';

class TextureLoader {
  textures: Texture[] = [];
  textureArrayHandle: WebGLTexture | null = null;

  load(textureSource: ImageData | HTMLCanvasElement): Texture {
    const texture = new Texture(this.textures.length, textureSource);
    this.textures.push(texture);
    return texture;
  }

  bindTextures() {
    this.textureArrayHandle = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.textureArrayHandle);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 8, gl.RGBA8, 128, 128, this.textures.length);

    this.textures.forEach((texture, index) => {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, index, 128, 128, 1, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);
    });
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  }

  /** Bind the texture array to unit 0 — must be called each frame before drawing */
  bindForRendering() {
    if (this.textureArrayHandle) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.textureArrayHandle);
    }
  }
}

export const textureLoader = new TextureLoader();
