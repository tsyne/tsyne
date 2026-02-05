/**
 * TsyneTextureLoader - Load images from disk for three.js textures
 *
 * Since we don't have DOM Image elements in Node.js, this uses sharp
 * to load images and returns the raw RGBA pixel data that can be used
 * with THREE.DataTexture.
 */

import * as fs from 'fs';
import * as path from 'path';

// Sharp import (may need dynamic import for ESM compatibility)
let sharp: any = null;

/**
 * Initialize sharp module (lazy loading)
 */
async function getSharp(): Promise<any> {
  if (!sharp) {
    try {
      sharp = (await import('sharp')).default;
    } catch (e) {
      console.error('[TsyneTextureLoader] Failed to load sharp:', e);
      throw new Error('sharp module not available');
    }
  }
  return sharp;
}

/**
 * Loaded texture data
 */
export interface LoadedTexture {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Load an image file and return RGBA pixel data
 *
 * @param filePath - Path to the image file (PNG, JPEG, GIF, WebP, etc.)
 * @returns LoadedTexture with RGBA data, width, and height
 */
export async function loadTextureFile(filePath: string): Promise<LoadedTexture> {
  const sharpModule = await getSharp();

  // Resolve relative paths from the project root
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Texture file not found: ${resolvedPath}`);
  }

  // Load and convert to RGBA
  const image = sharpModule(resolvedPath);
  const metadata = await image.metadata();

  // Ensure we get RGBA output
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height,
  };
}

/**
 * Load a texture from a URL (for compatibility, but downloads to temp file)
 * Not recommended - use loadTextureFile for local files
 */
export async function loadTextureURL(url: string): Promise<LoadedTexture> {
  // For now, only support local files
  // URL loading would need fetch and temp file handling
  throw new Error('URL loading not implemented - use loadTextureFile for local files');
}

/**
 * Create a THREE.DataTexture from loaded texture data
 *
 * @param THREE - three.js module
 * @param loaded - Loaded texture data from loadTextureFile
 * @returns THREE.DataTexture ready for use
 */
export function createDataTexture(THREE: any, loaded: LoadedTexture): any {
  const texture = new THREE.DataTexture(
    loaded.data,
    loaded.width,
    loaded.height,
    THREE.RGBAFormat
  );
  texture.needsUpdate = true;

  // Set sensible defaults matching three.js TextureLoader behavior
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return texture;
}

/**
 * High-level texture loading function
 * Loads an image file and returns a THREE.DataTexture
 *
 * @param THREE - three.js module
 * @param filePath - Path to the image file
 * @returns THREE.DataTexture ready for use
 */
export async function loadTexture(THREE: any, filePath: string): Promise<any> {
  const loaded = await loadTextureFile(filePath);
  return createDataTexture(THREE, loaded);
}
