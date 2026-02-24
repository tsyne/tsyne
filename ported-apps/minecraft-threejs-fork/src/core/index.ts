import * as THREE from 'three'

// TSYNE: Original created scene/camera/renderer internally using window/document APIs.
// Now accepts pre-built objects injected from main.ts (created after initThreeJS patches THREE).
export default class Core {
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.Renderer
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
  }

  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  renderer: THREE.Renderer

  /* TSYNE: Original code below — kept for reference, bypassed at runtime.
  constructor() {
    this.camera = new THREE.PerspectiveCamera()
    this.renderer = new THREE.WebGLRenderer()
    this.scene = new THREE.Scene()
    this.initScene()
    this.initRenderer()
    this.initCamera()
  }

  initCamera = () => {
    this.camera.fov = 50
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.near = 0.01
    this.camera.far = 500
    this.camera.updateProjectionMatrix()
    this.camera.position.set(8, 50, 8)

    this.camera.lookAt(100, 30, 100)

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })
  }

  initScene = () => {
    this.scene = new THREE.Scene()
    const backgroundColor = 0x87ceeb

    this.scene.fog = new THREE.Fog(backgroundColor, 1, 96)
    this.scene.background = new THREE.Color(backgroundColor)

    const sunLight = new THREE.PointLight(0xffffff, 0.5)
    sunLight.position.set(500, 500, 500)
    this.scene.add(sunLight)

    const sunLight2 = new THREE.PointLight(0xffffff, 0.2)
    sunLight2.position.set(-500, 500, -500)
    this.scene.add(sunLight2)

    const reflectionLight = new THREE.AmbientLight(0x404040)
    this.scene.add(reflectionLight)
  }

  initRenderer = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }
  */
}
