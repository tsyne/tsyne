/**
 * three.js webgl - contact shadows
 *
 * Port of: three/examples/webgl_shadow_contact.html
 *
 * Tests:
 * - WebGLRenderTarget (render to texture)
 * - MeshDepthMaterial with onBeforeCompile
 * - scene.overrideMaterial for depth pass
 * - Multi-pass rendering (depth, horizontal blur, vertical blur, final)
 * - OrthographicCamera for shadow projection
 * - MeshNormalMaterial on various geometries
 * - ShaderMaterial for blur passes
 *
 * Adaptations for Tsyne:
 * - Removes DOM/browser APIs (Stats, GUI, OrbitControls, resize)
 * - Inlines HorizontalBlurShader / VerticalBlurShader
 * - Uses Tsyne rendering pipeline
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// =============================================================================
// Blur Shaders (inlined from three/examples/jsm/shaders/)
// =============================================================================

const HorizontalBlurShader = {
  name: 'HorizontalBlurShader',

  uniforms: {
    'tDiffuse': { value: null },
    'h': { value: 1.0 / 512.0 },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {
      vec4 sum = vec4( 0.0 );

      sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
      sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
      sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
      sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
      sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
      sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
      sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
      sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

      gl_FragColor = sum;
    }`,
};

const VerticalBlurShader = {
  name: 'VerticalBlurShader',

  uniforms: {
    'tDiffuse': { value: null },
    'v': { value: 1.0 / 512.0 },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float v;

    varying vec2 vUv;

    void main() {
      vec4 sum = vec4( 0.0 );

      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
      sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

      gl_FragColor = sum;
    }`,
};

// =============================================================================
// Types
// =============================================================================

export interface WebGLShadowContactParams {
  width?: number;
  height?: number;
}

export interface WebGLShadowContactDemo {
  stop: () => void;
  getTime: () => number;
}

// =============================================================================
// Demo Builder
// =============================================================================

/**
 * Build the WebGL Contact Shadows demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() and getTime() methods
 */
export async function buildWebGLShadowContact(
  a: App,
  win: Window,
  params: WebGLShadowContactParams = {}
): Promise<WebGLShadowContactDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // Set up three.js with Tsyne bridge
  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, {
    width,
    height,
    windowId,
  });

  // ---------------------------------------------------------------------------
  // Constants (matching original)
  // ---------------------------------------------------------------------------

  const PLANE_WIDTH = 2.5;
  const PLANE_HEIGHT = 2.5;
  const CAMERA_HEIGHT = 0.3;

  const state = {
    shadow: {
      blur: 3.5,
      darkness: 1,
      opacity: 1,
    },
    plane: {
      color: '#ffffff',
      opacity: 1,
    },
  };

  // ---------------------------------------------------------------------------
  // Scene setup (matches canonical three.js example)
  // ---------------------------------------------------------------------------

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0.5, 1, 2);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Add the example meshes
  const meshes: any[] = [];
  const geometries = [
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.IcosahedronGeometry(0.3),
    new THREE.TorusKnotGeometry(0.4, 0.05, 256, 24, 1, 3),
  ];

  const material = new THREE.MeshNormalMaterial();

  for (let i = 0, l = geometries.length; i < l; i++) {
    const angle = (i / l) * Math.PI * 2;

    const geometry = geometries[i];
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.1;
    mesh.position.x = Math.cos(angle) / 2.0;
    mesh.position.z = Math.sin(angle) / 2.0;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // ---------------------------------------------------------------------------
  // Shadow setup
  // ---------------------------------------------------------------------------

  // The container group -- move this to reposition the shadow plane
  const shadowGroup = new THREE.Group();
  shadowGroup.position.y = -0.3;
  scene.add(shadowGroup);

  // Render target that will show the shadows in the plane texture
  const renderTarget = new THREE.WebGLRenderTarget(512, 512);
  renderTarget.texture.generateMipmaps = false;

  // Render target used to blur the first render target
  const renderTargetBlur = new THREE.WebGLRenderTarget(512, 512);
  renderTargetBlur.texture.generateMipmaps = false;

  // Make a plane and make it face up
  const planeGeometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT).rotateX(Math.PI / 2);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
    opacity: state.shadow.opacity,
    transparent: true,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  // Make sure it's rendered after the fillPlane
  plane.renderOrder = 1;
  shadowGroup.add(plane);

  // The y from the texture is flipped!
  plane.scale.y = -1;

  // The plane onto which to blur the texture
  const blurPlane = new THREE.Mesh(planeGeometry);
  blurPlane.visible = false;
  shadowGroup.add(blurPlane);

  // The plane with the color of the ground
  const fillPlaneMaterial = new THREE.MeshBasicMaterial({
    color: state.plane.color,
    opacity: state.plane.opacity,
    transparent: true,
    depthWrite: false,
  });
  const fillPlane = new THREE.Mesh(planeGeometry, fillPlaneMaterial);
  fillPlane.rotateX(Math.PI);
  shadowGroup.add(fillPlane);

  // The camera to render the depth material from
  const shadowCamera = new THREE.OrthographicCamera(
    -PLANE_WIDTH / 2,
    PLANE_WIDTH / 2,
    PLANE_HEIGHT / 2,
    -PLANE_HEIGHT / 2,
    0,
    CAMERA_HEIGHT
  );
  shadowCamera.rotation.x = Math.PI / 2; // get the camera to look up
  shadowGroup.add(shadowCamera);

  // Like MeshDepthMaterial, but goes from black to transparent
  const depthMaterial = new THREE.MeshDepthMaterial();
  depthMaterial.userData.darkness = { value: state.shadow.darkness };
  depthMaterial.onBeforeCompile = function (shader: any) {
    shader.uniforms.darkness = depthMaterial.userData.darkness;
    shader.fragmentShader = /* glsl */`
      uniform float darkness;
      ${shader.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'
      )}
    `;
  };

  depthMaterial.depthTest = false;
  depthMaterial.depthWrite = false;

  const horizontalBlurMaterial = new THREE.ShaderMaterial(HorizontalBlurShader);
  horizontalBlurMaterial.depthTest = false;

  const verticalBlurMaterial = new THREE.ShaderMaterial(VerticalBlurShader);
  verticalBlurMaterial.depthTest = false;

  // ---------------------------------------------------------------------------
  // Renderer
  // ---------------------------------------------------------------------------

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ---------------------------------------------------------------------------
  // Blur helper
  // ---------------------------------------------------------------------------

  // renderTarget --> blurPlane (horizontalBlur) --> renderTargetBlur --> blurPlane (verticalBlur) --> renderTarget
  function blurShadow(amount: number) {
    blurPlane.visible = true;

    // Blur horizontally and draw in the renderTargetBlur
    blurPlane.material = horizontalBlurMaterial;
    blurPlane.material.uniforms.tDiffuse.value = renderTarget.texture;
    horizontalBlurMaterial.uniforms.h.value = amount * 1 / 256;

    renderer.setRenderTarget(renderTargetBlur);
    renderer.render(blurPlane, shadowCamera);

    // Blur vertically and draw in the main renderTarget
    blurPlane.material = verticalBlurMaterial;
    blurPlane.material.uniforms.tDiffuse.value = renderTargetBlur.texture;
    verticalBlurMaterial.uniforms.v.value = amount * 1 / 256;

    renderer.setRenderTarget(renderTarget);
    renderer.render(blurPlane, shadowCamera);

    blurPlane.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;

      // Rotate the meshes
      meshes.forEach((mesh) => {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.02;
      });

      // Remove the background
      const initialBackground = scene.background;
      scene.background = null;

      // Force the depthMaterial to everything
      scene.overrideMaterial = depthMaterial;

      // Set renderer clear alpha
      const initialClearAlpha = renderer.getClearAlpha();
      renderer.setClearAlpha(0);

      // Render to the render target to get the depths
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, shadowCamera);

      // Reset the override material
      scene.overrideMaterial = null;

      blurShadow(state.shadow.blur);

      // A second pass to reduce the artifacts
      // (0.4 is the minimum blur amount so that the artifacts are gone)
      blurShadow(state.shadow.blur * 0.4);

      // Reset and render the normal scene
      renderer.setRenderTarget(null);
      renderer.setClearAlpha(initialClearAlpha);
      scene.background = initialBackground;

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  // Start animation
  animate();

  return {
    stop: () => {
      running = false;
    },
    getTime: () => currentTime,
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - contact shadows' },
    (a) => {
      a.window(
        { title: 'three.js webgl - contact shadows', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLShadowContact(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// =============================================================================
// Entry Point
// =============================================================================

if (require.main === module) {
  main().catch(console.error);
}
