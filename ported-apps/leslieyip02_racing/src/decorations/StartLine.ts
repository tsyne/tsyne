import * as THREE from "three";
import * as path from "path";
import { loadTexture } from "../../../../trine/integration/texture-loader";

export default class StartLine extends THREE.Group {
    constructor(position: THREE.Vector3, rotation: THREE.Euler,
        scene: THREE.Scene) {

        super();
        this.loadPoles(position);
        this.loadBanner(position, rotation)
            .then(() => scene.add(this));
    }

    async loadBanner(position: THREE.Vector3, rotation: THREE.Euler) {
        const texturePath = path.resolve(__dirname, "../../assets/textures/checkerboard.jpg");
        try {
            let texture = await loadTexture(THREE, texturePath);
            let bannerMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
            let bannerGeometry = new THREE.PlaneGeometry(36, 5);
            let bannerMesh = new THREE.Mesh(bannerGeometry, bannerMaterial);
            bannerMesh.position.set(position.x, position.y + 8, position.z);
            bannerMesh.setRotationFromEuler(rotation);
            this.add(bannerMesh);
        } catch (e) {
            // Fallback: banner without texture
            let bannerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
            let bannerGeometry = new THREE.PlaneGeometry(36, 5);
            let bannerMesh = new THREE.Mesh(bannerGeometry, bannerMaterial);
            bannerMesh.position.set(position.x, position.y + 8, position.z);
            bannerMesh.setRotationFromEuler(rotation);
            this.add(bannerMesh);
        }
    }

    loadPoles(position: THREE.Vector3) {
        let polePoints = [
            new THREE.Vector3(position.x, -2, position.z + 18),
            new THREE.Vector3(position.x, position.y + 12, position.z + 18)
        ];
        let polePath = new THREE.CatmullRomCurve3(polePoints);
        let poleGeometry = new THREE.TubeGeometry(polePath, 8, 1, 6, true);
        let poleMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc,
            wireframe: true, side: THREE.DoubleSide });
        let poleMesh = new THREE.Mesh(poleGeometry, poleMaterial);
        this.add(poleMesh);

        poleMesh = poleMesh.clone();
        poleMesh.translateZ(-36);
        this.add(poleMesh);
    }
}
