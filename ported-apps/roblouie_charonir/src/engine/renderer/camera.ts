import { Object3d } from './object-3d';

export class Camera extends Object3d {
  projection: DOMMatrix;
  fov: number;
  near: number;
  far: number;

  constructor(fieldOfViewRadians: number, aspect: number, near: number, far: number) {
    super();
    this.fov = fieldOfViewRadians;
    this.near = near;
    this.far = far;

    const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewRadians);
    const rangeInv = 1.0 / (near - far);

    this.projection = new DOMMatrix([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  updateProjection(aspect: number) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * this.fov);
    const rangeInv = 1.0 / (this.near - this.far);
    this.projection = new DOMMatrix([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (this.near + this.far) * rangeInv, -1,
      0, 0, this.near * this.far * rangeInv * 2, 0
    ]);
  }
}
