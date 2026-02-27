import * as THREE from "three";
import * as path from "path";
import { toVectorArray } from "../utils/geometry";
import { CurveData } from "../utils/interfaces";
import { loadTexture } from "../../../../trine/integration/texture-loader";

export default class Sign extends THREE.Mesh {
    constructor(data: CurveData, scene: THREE.Scene) {

        super();
        this.loadSign(data)
            .then(() => scene.add(this));
    }

    createCatmullRom(data: CurveData) {
        let points = toVectorArray(data.points);
        let curve = new THREE.CatmullRomCurve3(points);
        return curve;
    }

    createEllipse(data: CurveData) {
        let origin = new THREE.Vector3(...data.points[0]);
        let divisions = 15;

        let ellipse = new THREE.EllipseCurve(origin.x, origin.z,
            data.radius[0], data.radius[1], data.angles[0], data.angles[1], data.clockwise, 0);

        let curve = new THREE.CurvePath<THREE.Vector3>();
        let points = ellipse.getPoints(divisions).map(point =>
            new THREE.Vector3(point.x, origin.y, point.y));

        for (let i = 0; i < divisions; i++)
            curve.add(new THREE.LineCurve3(points[i], points[i + 1]));

        return curve;
    }

    async loadSign(data: CurveData) {
        let curve = data.ellipse ? this.createEllipse(data) : this.createCatmullRom(data);

        let defaultExtrudeOptions = { steps: 15, bevelEnabled: true };
        let extrudeOptions: THREE.ExtrudeGeometryOptions = data.extrudeOptions || defaultExtrudeOptions;
        extrudeOptions.extrudePath = curve;

        this.geometry = new THREE.ExtrudeGeometry(data.extrudeShape, extrudeOptions);

        const texturePath = path.resolve(__dirname, "../../assets/textures/arrow.jpg");
        try {
            let texture = await loadTexture(THREE, texturePath);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;

            if (data.clockwise) {
                texture.rotation = Math.PI / 2;
                texture.repeat = new THREE.Vector2(-0.05, 1);
            } else {
                texture.rotation = -Math.PI / 2;
                texture.repeat = new THREE.Vector2(0.05, 1);
            }

            if (data.textureRotation)
                texture.rotation = data.textureRotation;

            this.material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        } catch (e) {
            // Fallback to solid material if texture loading fails
            this.material = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide });
        }

        this.scale.set(1, 2, 1);
    }
}
