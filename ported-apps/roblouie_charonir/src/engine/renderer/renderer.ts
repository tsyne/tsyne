import { gl, lilgl } from "@/engine/renderer/lil-gl";
import { Camera } from "@/engine/renderer/camera";
import { Skybox } from '@/engine/skybox';
import {
  COLOR,
  EMISSIVE,
  MODELVIEWPROJECTION,
  NORMALMATRIX,
  TEXTUREREPEAT,
  U_SKYBOX,
  U_VIEWDIRECTIONPROJECTIONINVERSE, VIEWPROJECTION,
} from '@/engine/shaders/shaders';
import { Scene } from '@/engine/renderer/scene';
import { Mesh } from '@/engine/renderer/mesh';
import { InstancedMesh } from '@/engine/renderer/instanced-mesh';
import { textureLoader } from '@/engine/renderer/texture-loader';

// IMPORTANT! The index of a given buffer in the buffer array must match it's respective data location in the shader.
export const enum AttributeLocation {
  Positions,
  Normals,
  TextureCoords,
  TextureDepth,
  LocalMatrix,
  NormalMatrix = 8,
}

// Pre-allocated scratch objects to avoid per-frame GC pressure
const _scratchViewMatrix = new DOMMatrix();
const _scratchViewMatrixCopy = new DOMMatrix();
const _scratchViewProj = new DOMMatrix();
const _scratchMVP = new DOMMatrix();
const _scratchInvViewProj = new DOMMatrix();
const _scratchNormalMatrix = new DOMMatrix();
const _f32_16 = new Float32Array(16); // reusable buffer for uniformMatrix4fv

// Uniform locations — initialized by setupRenderer()
let modelviewProjectionLocation: WebGLUniformLocation;
let normalMatrixLocation: WebGLUniformLocation;
let colorLocation: WebGLUniformLocation;
let emissiveLocation: WebGLUniformLocation;
let textureRepeatLocation: WebGLUniformLocation;
let skyboxLocation: WebGLUniformLocation;
let viewDirectionProjectionInverseLocation: WebGLUniformLocation;
let viewProjectionLocation: WebGLUniformLocation;
let instancedColorLocation: WebGLUniformLocation;
let instancedEmissiveLocation: WebGLUniformLocation;
let instancedTextureRepeatLocation: WebGLUniformLocation | null;

/** Must be called after lilgl.init() */
export function setupRenderer() {
  const g = gl;
  g.enable(g.CULL_FACE);
  g.enable(g.DEPTH_TEST);
  g.enable(g.BLEND);
  g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
  modelviewProjectionLocation = g.getUniformLocation(lilgl.program, MODELVIEWPROJECTION)!;
  normalMatrixLocation = g.getUniformLocation(lilgl.program, NORMALMATRIX)!;
  colorLocation = g.getUniformLocation(lilgl.program, COLOR)!;
  emissiveLocation = g.getUniformLocation(lilgl.program, EMISSIVE)!;
  textureRepeatLocation = g.getUniformLocation(lilgl.program, TEXTUREREPEAT)!;
  skyboxLocation = g.getUniformLocation(lilgl.skyboxProgram, U_SKYBOX)!;
  viewDirectionProjectionInverseLocation = g.getUniformLocation(lilgl.skyboxProgram, U_VIEWDIRECTIONPROJECTIONINVERSE)!;
  viewProjectionLocation = g.getUniformLocation(lilgl.instancedProgram, VIEWPROJECTION)!;
  instancedColorLocation = g.getUniformLocation(lilgl.instancedProgram, COLOR)!;
  instancedEmissiveLocation = g.getUniformLocation(lilgl.instancedProgram, EMISSIVE)!;
  instancedTextureRepeatLocation = g.getUniformLocation(lilgl.instancedProgram, TEXTUREREPEAT);
}

// Reusable 2-element array for texture repeat
const _texRepeat = [1, 1];

// Skip list for GPU hang elimination testing.
// Set via: globalThis.__CHARON_SKIP = ['floor', 'spirit', ...]
// Or env: CHARON_SKIP=floor,spirit
// Supports exact matches and prefix matches (e.g., 'spirit' skips 'spirit_0_body', 'spirit_1_icon', etc.)
function _shouldSkip(tag: string): boolean {
  const skipList: string[] | undefined = (globalThis as any).__CHARON_SKIP;
  if (!skipList) return false;
  for (const skip of skipList) {
    if (tag === skip || tag.startsWith(skip + '_')) return true;
  }
  return false;
}

export function render(camera: Camera, scene: Scene) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Re-bind texture array each frame (Tsyne painter resets GL state per paint cycle)
  textureLoader.bindForRendering();
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  // viewMatrix = inverse(camera.worldMatrix) — zero-alloc via copyFrom + inverseSelf
  _scratchViewMatrix.copyFrom(camera.worldMatrix).inverseSelf();
  _scratchViewMatrixCopy.copyFrom(_scratchViewMatrix);
  // viewProjectionMatrix = projection × viewMatrix
  _scratchViewProj.copyFrom(camera.projection).multiplySelf(_scratchViewMatrix);

  const renderSkybox = (skybox: Skybox) => {
    if (_shouldSkip('skybox')) return;
    (gl as any).pushFlat('_drawTag', 'skybox');
    gl.useProgram(lilgl.skyboxProgram);
    skybox.bindForRendering();
    gl.uniform1i(skyboxLocation, 0);
    _scratchViewMatrixCopy.m41 = 0;
    _scratchViewMatrixCopy.m42 = 0;
    _scratchViewMatrixCopy.m43 = 0;
    // inverseViewProjection = inverse(projection × viewMatrixCopy)
    _scratchInvViewProj.copyFrom(camera.projection).multiplySelf(_scratchViewMatrixCopy).inverseSelf();
    _scratchInvViewProj.toFloat32ArrayInto(_f32_16);
    gl.uniformMatrix4fv(viewDirectionProjectionInverseLocation, false, _f32_16);
    gl.bindVertexArray(skybox.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  const renderMesh = (mesh: Mesh | InstancedMesh) => {
    // Tag draw call with mesh name for GPU hang diagnosis
    const tag = (mesh as any)._drawTag;
    if (tag) {
      if (_shouldSkip(tag)) return; // Skip this draw call entirely
      (gl as any).pushFlat('_drawTag', tag);
    }
    // @ts-ignore
    const isInstancedMesh = mesh.count !== undefined;
    gl.useProgram(isInstancedMesh ? lilgl.instancedProgram : lilgl.program);
    // MVP = viewProjection × mesh.worldMatrix
    _scratchMVP.copyFrom(_scratchViewProj).multiplySelf(mesh.worldMatrix);

    gl.uniform4fv(isInstancedMesh ? instancedColorLocation : colorLocation, mesh.material.color);
    gl.uniform4fv(isInstancedMesh ? instancedEmissiveLocation : emissiveLocation, mesh.material.emissive);
    gl.vertexAttrib1f(AttributeLocation.TextureDepth, mesh.material.texture?.id ?? -1.0);
    _texRepeat[0] = mesh.material.texture?.repeat.x ?? 1;
    _texRepeat[1] = mesh.material.texture?.repeat.y ?? 1;
    gl.uniform2fv(isInstancedMesh ? instancedTextureRepeatLocation : textureRepeatLocation, _texRepeat);

    gl.bindVertexArray(mesh.geometry.vao!);

    if (isInstancedMesh) {
      _scratchViewProj.toFloat32ArrayInto(_f32_16);
      gl.uniformMatrix4fv(viewProjectionLocation, false, _f32_16);
      // @ts-ignore
      gl.drawElementsInstanced(gl.TRIANGLES, mesh.geometry.getIndices()!.length, gl.UNSIGNED_SHORT, 0, mesh.count);
    } else {
      // @ts-ignore
      if (mesh.color) {
        // @ts-ignore
        gl.uniformMatrix4fv(normalMatrixLocation, true, mesh.cachedMatrixData);
      } else {
        // normalMatrix = inverse(worldMatrix) — use scratch, zero-alloc
        _scratchNormalMatrix.copyFrom(mesh.worldMatrix).inverseSelf();
        _scratchNormalMatrix.toFloat32ArrayInto(_f32_16);
        gl.uniformMatrix4fv(normalMatrixLocation, true, _f32_16);
      }
      _scratchMVP.toFloat32ArrayInto(_f32_16);
      gl.uniformMatrix4fv(modelviewProjectionLocation, false, _f32_16);
      gl.drawElements(gl.TRIANGLES, mesh.geometry.getIndices()!.length, gl.UNSIGNED_SHORT, 0);
    }
  }

  // Render solid meshes first
  scene.solidMeshes.forEach(renderMesh);

  if (scene.skybox) {
    gl.depthFunc(gl.LEQUAL);
    renderSkybox(scene.skybox!);
    gl.depthFunc(gl.LESS);
  }

  gl.depthMask(false);
  scene.transparentMeshes.forEach(renderMesh);
  gl.depthMask(true);
}
