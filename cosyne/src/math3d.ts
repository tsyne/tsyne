/**
 * 3D Math utilities for Cosyne 3D
 *
 * Provides Vector3, Matrix4, and Quaternion classes for 3D transformations.
 */

/**
 * 3D Vector class
 */
export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  static one(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  static up(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  static down(): Vector3 {
    return new Vector3(0, -1, 0);
  }

  static forward(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  static back(): Vector3 {
    return new Vector3(0, 0, -1);
  }

  static right(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  static left(): Vector3 {
    return new Vector3(-1, 0, 0);
  }

  static fromArray(arr: [number, number, number] | number[]): Vector3 {
    return new Vector3(arr[0] || 0, arr[1] || 0, arr[2] || 0);
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  addScalar(s: number): Vector3 {
    return new Vector3(this.x + s, this.y + s, this.z + s);
  }

  sub(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  subScalar(s: number): Vector3 {
    return new Vector3(this.x - s, this.y - s, this.z - s);
  }

  multiply(v: Vector3): Vector3 {
    return new Vector3(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  multiplyScalar(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  divide(v: Vector3): Vector3 {
    return new Vector3(this.x / v.x, this.y / v.y, this.z / v.z);
  }

  divideScalar(s: number): Vector3 {
    return this.multiplyScalar(1 / s);
  }

  negate(): Vector3 {
    return new Vector3(-this.x, -this.y, -this.z);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return this.divideScalar(len);
  }

  distanceTo(v: Vector3): number {
    return this.sub(v).length();
  }

  distanceToSquared(v: Vector3): number {
    return this.sub(v).lengthSquared();
  }

  lerp(v: Vector3, t: number): Vector3 {
    return new Vector3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  equals(v: Vector3, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon
    );
  }

  applyMatrix4(m: Matrix4): Vector3 {
    const e = m.elements;
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);

    return new Vector3(
      (e[0] * x + e[4] * y + e[8] * z + e[12]) * w,
      (e[1] * x + e[5] * y + e[9] * z + e[13]) * w,
      (e[2] * x + e[6] * y + e[10] * z + e[14]) * w
    );
  }

  applyQuaternion(q: Quaternion): Vector3 {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const qx = q.x;
    const qy = q.y;
    const qz = q.z;
    const qw = q.w;

    // Calculate quat * vector
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    // Calculate result * inverse quat
    return new Vector3(
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx
    );
  }

  reflect(normal: Vector3): Vector3 {
    // I - 2 * dot(I, N) * N
    const d = 2 * this.dot(normal);
    return this.sub(normal.multiplyScalar(d));
  }

  toString(): string {
    return `Vector3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`;
  }
}

/**
 * 4x4 Matrix class for 3D transformations
 * Uses column-major order (like OpenGL/WebGL)
 */
export class Matrix4 {
  elements: Float32Array;

  constructor() {
    this.elements = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  static identity(): Matrix4 {
    return new Matrix4();
  }

  static fromArray(arr: number[]): Matrix4 {
    const m = new Matrix4();
    m.elements.set(arr);
    return m;
  }

  clone(): Matrix4 {
    const m = new Matrix4();
    m.elements.set(this.elements);
    return m;
  }

  copy(m: Matrix4): this {
    this.elements.set(m.elements);
    return this;
  }

  identity(): this {
    this.elements.set([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
    return this;
  }

  multiply(m: Matrix4): Matrix4 {
    return Matrix4.multiply(this, m);
  }

  static multiply(a: Matrix4, b: Matrix4): Matrix4 {
    const ae = a.elements;
    const be = b.elements;
    const result = new Matrix4();
    const re = result.elements;

    const a11 = ae[0], a21 = ae[1], a31 = ae[2], a41 = ae[3];
    const a12 = ae[4], a22 = ae[5], a32 = ae[6], a42 = ae[7];
    const a13 = ae[8], a23 = ae[9], a33 = ae[10], a43 = ae[11];
    const a14 = ae[12], a24 = ae[13], a34 = ae[14], a44 = ae[15];

    const b11 = be[0], b21 = be[1], b31 = be[2], b41 = be[3];
    const b12 = be[4], b22 = be[5], b32 = be[6], b42 = be[7];
    const b13 = be[8], b23 = be[9], b33 = be[10], b43 = be[11];
    const b14 = be[12], b24 = be[13], b34 = be[14], b44 = be[15];

    re[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    re[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    re[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    re[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    re[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    re[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    re[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    re[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    re[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    re[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    re[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    re[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    re[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    re[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    re[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    re[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

    return result;
  }

  premultiply(m: Matrix4): Matrix4 {
    return Matrix4.multiply(m, this);
  }

  determinant(): number {
    const e = this.elements;

    const n11 = e[0], n21 = e[1], n31 = e[2], n41 = e[3];
    const n12 = e[4], n22 = e[5], n32 = e[6], n42 = e[7];
    const n13 = e[8], n23 = e[9], n33 = e[10], n43 = e[11];
    const n14 = e[12], n24 = e[13], n34 = e[14], n44 = e[15];

    return (
      n41 * (
        +n14 * n23 * n32
        - n13 * n24 * n32
        - n14 * n22 * n33
        + n12 * n24 * n33
        + n13 * n22 * n34
        - n12 * n23 * n34
      ) +
      n42 * (
        +n11 * n23 * n34
        - n11 * n24 * n33
        + n14 * n21 * n33
        - n13 * n21 * n34
        + n13 * n24 * n31
        - n14 * n23 * n31
      ) +
      n43 * (
        +n11 * n24 * n32
        - n11 * n22 * n34
        - n14 * n21 * n32
        + n12 * n21 * n34
        + n14 * n22 * n31
        - n12 * n24 * n31
      ) +
      n44 * (
        -n13 * n22 * n31
        - n11 * n23 * n32
        + n11 * n22 * n33
        + n13 * n21 * n32
        - n12 * n21 * n33
        + n12 * n23 * n31
      )
    );
  }

  invert(): Matrix4 {
    const e = this.elements;
    const result = new Matrix4();
    const re = result.elements;

    const n11 = e[0], n21 = e[1], n31 = e[2], n41 = e[3];
    const n12 = e[4], n22 = e[5], n32 = e[6], n42 = e[7];
    const n13 = e[8], n23 = e[9], n33 = e[10], n43 = e[11];
    const n14 = e[12], n24 = e[13], n34 = e[14], n44 = e[15];

    const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
    const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
    const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
    const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

    if (det === 0) {
      return result.identity();
    }

    const detInv = 1 / det;

    re[0] = t11 * detInv;
    re[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
    re[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
    re[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;

    re[4] = t12 * detInv;
    re[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
    re[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
    re[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;

    re[8] = t13 * detInv;
    re[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
    re[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
    re[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;

    re[12] = t14 * detInv;
    re[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
    re[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
    re[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;

    return result;
  }

  transpose(): Matrix4 {
    const result = new Matrix4();
    const e = this.elements;
    const re = result.elements;

    re[0] = e[0];
    re[1] = e[4];
    re[2] = e[8];
    re[3] = e[12];
    re[4] = e[1];
    re[5] = e[5];
    re[6] = e[9];
    re[7] = e[13];
    re[8] = e[2];
    re[9] = e[6];
    re[10] = e[10];
    re[11] = e[14];
    re[12] = e[3];
    re[13] = e[7];
    re[14] = e[11];
    re[15] = e[15];

    return result;
  }

  static translation(x: number, y: number, z: number): Matrix4 {
    const m = new Matrix4();
    m.elements[12] = x;
    m.elements[13] = y;
    m.elements[14] = z;
    return m;
  }

  static scaling(x: number, y: number, z: number): Matrix4 {
    const m = new Matrix4();
    m.elements[0] = x;
    m.elements[5] = y;
    m.elements[10] = z;
    return m;
  }

  static rotationX(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[5] = c;
    m.elements[6] = s;
    m.elements[9] = -s;
    m.elements[10] = c;
    return m;
  }

  static rotationY(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[0] = c;
    m.elements[2] = -s;
    m.elements[8] = s;
    m.elements[10] = c;
    return m;
  }

  static rotationZ(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[0] = c;
    m.elements[1] = s;
    m.elements[4] = -s;
    m.elements[5] = c;
    return m;
  }

  static perspective(fov: number, aspect: number, near: number, far: number): Matrix4 {
    const m = new Matrix4();
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    const e = m.elements;

    e[0] = f / aspect;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;
    e[4] = 0;
    e[5] = f;
    e[6] = 0;
    e[7] = 0;
    e[8] = 0;
    e[9] = 0;
    e[10] = (far + near) * nf;
    e[11] = -1;
    e[12] = 0;
    e[13] = 0;
    e[14] = 2 * far * near * nf;
    e[15] = 0;

    return m;
  }

  static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    const m = new Matrix4();
    const e = m.elements;
    const w = 1.0 / (right - left);
    const h = 1.0 / (top - bottom);
    const p = 1.0 / (far - near);

    e[0] = 2 * w;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;
    e[4] = 0;
    e[5] = 2 * h;
    e[6] = 0;
    e[7] = 0;
    e[8] = 0;
    e[9] = 0;
    e[10] = -2 * p;
    e[11] = 0;
    e[12] = -(right + left) * w;
    e[13] = -(top + bottom) * h;
    e[14] = -(far + near) * p;
    e[15] = 1;

    return m;
  }

  static lookAt(eye: Vector3, target: Vector3, up: Vector3): Matrix4 {
    const zAxis = eye.sub(target).normalize();
    const xAxis = up.cross(zAxis).normalize();
    const yAxis = zAxis.cross(xAxis);

    const m = new Matrix4();
    const e = m.elements;

    e[0] = xAxis.x;
    e[1] = yAxis.x;
    e[2] = zAxis.x;
    e[3] = 0;
    e[4] = xAxis.y;
    e[5] = yAxis.y;
    e[6] = zAxis.y;
    e[7] = 0;
    e[8] = xAxis.z;
    e[9] = yAxis.z;
    e[10] = zAxis.z;
    e[11] = 0;
    e[12] = -xAxis.dot(eye);
    e[13] = -yAxis.dot(eye);
    e[14] = -zAxis.dot(eye);
    e[15] = 1;

    return m;
  }

  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
    const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    const sx = scale.x, sy = scale.y, sz = scale.z;
    const e = this.elements;

    e[0] = (1 - (yy + zz)) * sx;
    e[1] = (xy + wz) * sx;
    e[2] = (xz - wy) * sx;
    e[3] = 0;

    e[4] = (xy - wz) * sy;
    e[5] = (1 - (xx + zz)) * sy;
    e[6] = (yz + wx) * sy;
    e[7] = 0;

    e[8] = (xz + wy) * sz;
    e[9] = (yz - wx) * sz;
    e[10] = (1 - (xx + yy)) * sz;
    e[11] = 0;

    e[12] = position.x;
    e[13] = position.y;
    e[14] = position.z;
    e[15] = 1;

    return this;
  }

  decompose(): { position: Vector3; quaternion: Quaternion; scale: Vector3 } {
    const e = this.elements;

    // Extract scale
    let sx = new Vector3(e[0], e[1], e[2]).length();
    const sy = new Vector3(e[4], e[5], e[6]).length();
    const sz = new Vector3(e[8], e[9], e[10]).length();

    // Handle negative scale
    if (this.determinant() < 0) {
      sx = -sx;
    }

    const position = new Vector3(e[12], e[13], e[14]);
    const scale = new Vector3(sx, sy, sz);

    // Extract rotation (normalize by scale)
    const m = this.clone();
    const me = m.elements;

    const invSX = 1 / sx;
    const invSY = 1 / sy;
    const invSZ = 1 / sz;

    me[0] *= invSX;
    me[1] *= invSX;
    me[2] *= invSX;

    me[4] *= invSY;
    me[5] *= invSY;
    me[6] *= invSY;

    me[8] *= invSZ;
    me[9] *= invSZ;
    me[10] *= invSZ;

    const quaternion = Quaternion.fromRotationMatrix(m);

    return { position, quaternion, scale };
  }

  getPosition(): Vector3 {
    return new Vector3(this.elements[12], this.elements[13], this.elements[14]);
  }

  extractRotation(): Matrix4 {
    const e = this.elements;
    const result = new Matrix4();
    const re = result.elements;

    const scaleX = 1 / new Vector3(e[0], e[1], e[2]).length();
    const scaleY = 1 / new Vector3(e[4], e[5], e[6]).length();
    const scaleZ = 1 / new Vector3(e[8], e[9], e[10]).length();

    re[0] = e[0] * scaleX;
    re[1] = e[1] * scaleX;
    re[2] = e[2] * scaleX;
    re[3] = 0;

    re[4] = e[4] * scaleY;
    re[5] = e[5] * scaleY;
    re[6] = e[6] * scaleY;
    re[7] = 0;

    re[8] = e[8] * scaleZ;
    re[9] = e[9] * scaleZ;
    re[10] = e[10] * scaleZ;
    re[11] = 0;

    re[12] = 0;
    re[13] = 0;
    re[14] = 0;
    re[15] = 1;

    return result;
  }
}

/**
 * Quaternion for rotation
 */
export class Quaternion {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}

  static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  copy(q: Quaternion): this {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }

  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    return new Quaternion(
      axis.x * s,
      axis.y * s,
      axis.z * s,
      Math.cos(halfAngle)
    );
  }

  static fromEuler(x: number, y: number, z: number, order: string = 'XYZ'): Quaternion {
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    const q = new Quaternion();

    switch (order) {
      case 'XYZ':
        q.x = s1 * c2 * c3 + c1 * s2 * s3;
        q.y = c1 * s2 * c3 - s1 * c2 * s3;
        q.z = c1 * c2 * s3 + s1 * s2 * c3;
        q.w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'YXZ':
        q.x = s1 * c2 * c3 + c1 * s2 * s3;
        q.y = c1 * s2 * c3 - s1 * c2 * s3;
        q.z = c1 * c2 * s3 - s1 * s2 * c3;
        q.w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case 'ZXY':
        q.x = s1 * c2 * c3 - c1 * s2 * s3;
        q.y = c1 * s2 * c3 + s1 * c2 * s3;
        q.z = c1 * c2 * s3 + s1 * s2 * c3;
        q.w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'ZYX':
        q.x = s1 * c2 * c3 - c1 * s2 * s3;
        q.y = c1 * s2 * c3 + s1 * c2 * s3;
        q.z = c1 * c2 * s3 - s1 * s2 * c3;
        q.w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case 'YZX':
        q.x = s1 * c2 * c3 + c1 * s2 * s3;
        q.y = c1 * s2 * c3 + s1 * c2 * s3;
        q.z = c1 * c2 * s3 - s1 * s2 * c3;
        q.w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'XZY':
        q.x = s1 * c2 * c3 - c1 * s2 * s3;
        q.y = c1 * s2 * c3 - s1 * c2 * s3;
        q.z = c1 * c2 * s3 + s1 * s2 * c3;
        q.w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
    }

    return q;
  }

  static fromRotationMatrix(m: Matrix4): Quaternion {
    const e = m.elements;
    const m11 = e[0], m12 = e[4], m13 = e[8];
    const m21 = e[1], m22 = e[5], m23 = e[9];
    const m31 = e[2], m32 = e[6], m33 = e[10];

    const trace = m11 + m22 + m33;
    const q = new Quaternion();

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      q.w = 0.25 / s;
      q.x = (m32 - m23) * s;
      q.y = (m13 - m31) * s;
      q.z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
      q.w = (m32 - m23) / s;
      q.x = 0.25 * s;
      q.y = (m12 + m21) / s;
      q.z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
      q.w = (m13 - m31) / s;
      q.x = (m12 + m21) / s;
      q.y = 0.25 * s;
      q.z = (m23 + m32) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
      q.w = (m21 - m12) / s;
      q.x = (m13 + m31) / s;
      q.y = (m23 + m32) / s;
      q.z = 0.25 * s;
    }

    return q;
  }

  toEuler(order: string = 'XYZ'): { x: number; y: number; z: number } {
    // Convert to rotation matrix first, then extract euler angles
    const m = new Matrix4();
    m.compose(Vector3.zero(), this, Vector3.one());
    const e = m.elements;

    const m11 = e[0], m12 = e[4], m13 = e[8];
    const m21 = e[1], m22 = e[5], m23 = e[9];
    const m31 = e[2], m32 = e[6], m33 = e[10];

    let x = 0, y = 0, z = 0;

    switch (order) {
      case 'XYZ':
        y = Math.asin(Math.max(-1, Math.min(1, m13)));
        if (Math.abs(m13) < 0.9999999) {
          x = Math.atan2(-m23, m33);
          z = Math.atan2(-m12, m11);
        } else {
          x = Math.atan2(m32, m22);
          z = 0;
        }
        break;
      case 'YXZ':
        x = Math.asin(-Math.max(-1, Math.min(1, m23)));
        if (Math.abs(m23) < 0.9999999) {
          y = Math.atan2(m13, m33);
          z = Math.atan2(m21, m22);
        } else {
          y = Math.atan2(-m31, m11);
          z = 0;
        }
        break;
      default:
        // Default to XYZ
        y = Math.asin(Math.max(-1, Math.min(1, m13)));
        if (Math.abs(m13) < 0.9999999) {
          x = Math.atan2(-m23, m33);
          z = Math.atan2(-m12, m11);
        } else {
          x = Math.atan2(m32, m22);
          z = 0;
        }
    }

    return { x, y, z };
  }

  multiply(q: Quaternion): Quaternion {
    const ax = this.x, ay = this.y, az = this.z, aw = this.w;
    const bx = q.x, by = q.y, bz = q.z, bw = q.w;

    return new Quaternion(
      ax * bw + aw * bx + ay * bz - az * by,
      ay * bw + aw * by + az * bx - ax * bz,
      az * bw + aw * bz + ax * by - ay * bx,
      aw * bw - ax * bx - ay * by - az * bz
    );
  }

  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }

  invert(): Quaternion {
    return this.conjugate().normalize();
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  normalize(): Quaternion {
    const len = this.length();
    if (len === 0) return new Quaternion(0, 0, 0, 1);
    const invLen = 1 / len;
    return new Quaternion(
      this.x * invLen,
      this.y * invLen,
      this.z * invLen,
      this.w * invLen
    );
  }

  dot(q: Quaternion): number {
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
  }

  slerp(q: Quaternion, t: number): Quaternion {
    if (t === 0) return this.clone();
    if (t === 1) return q.clone();

    let cosHalfTheta = this.dot(q);
    let qb = q;

    // Ensure shortest path
    if (cosHalfTheta < 0) {
      qb = new Quaternion(-q.x, -q.y, -q.z, -q.w);
      cosHalfTheta = -cosHalfTheta;
    }

    if (cosHalfTheta >= 1.0) {
      return this.clone();
    }

    const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;

    if (sqrSinHalfTheta <= Number.EPSILON) {
      const s = 1 - t;
      return new Quaternion(
        s * this.x + t * qb.x,
        s * this.y + t * qb.y,
        s * this.z + t * qb.z,
        s * this.w + t * qb.w
      ).normalize();
    }

    const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quaternion(
      this.x * ratioA + qb.x * ratioB,
      this.y * ratioA + qb.y * ratioB,
      this.z * ratioA + qb.z * ratioB,
      this.w * ratioA + qb.w * ratioB
    );
  }

  equals(q: Quaternion, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(this.x - q.x) < epsilon &&
      Math.abs(this.y - q.y) < epsilon &&
      Math.abs(this.z - q.z) < epsilon &&
      Math.abs(this.w - q.w) < epsilon
    );
  }

  toString(): string {
    return `Quaternion(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)}, ${this.w.toFixed(3)})`;
  }
}

/**
 * Ray for ray casting
 */
export class Ray {
  constructor(
    public origin: Vector3 = new Vector3(),
    public direction: Vector3 = new Vector3(0, 0, -1)
  ) {}

  clone(): Ray {
    return new Ray(this.origin.clone(), this.direction.clone());
  }

  at(t: number): Vector3 {
    return this.origin.add(this.direction.multiplyScalar(t));
  }

  /**
   * Get the point on the ray closest to the given point
   */
  closestPointToPoint(point: Vector3): Vector3 {
    const t = Math.max(0, point.sub(this.origin).dot(this.direction));
    return this.at(t);
  }

  /**
   * Distance from ray to point
   */
  distanceToPoint(point: Vector3): number {
    return this.closestPointToPoint(point).distanceTo(point);
  }

  /**
   * Intersect with sphere
   * Returns distance to intersection, or null if no intersection
   */
  intersectSphere(center: Vector3, radius: number): number | null {
    const oc = this.origin.sub(center);
    const a = this.direction.dot(this.direction);
    const b = 2.0 * oc.dot(this.direction);
    const c = oc.dot(oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    let t = (-b - sqrtDiscriminant) / (2 * a);

    if (t < 0) {
      t = (-b + sqrtDiscriminant) / (2 * a);
    }

    if (t < 0) {
      return null;
    }

    return t;
  }

  /**
   * Intersect with axis-aligned box
   * Handles division by zero for orthogonal rays
   */
  intersectBox(min: Vector3, max: Vector3): number | null {
    const EPSILON = 1e-10;
    const dirX = this.direction.x;
    const dirY = this.direction.y;
    const dirZ = this.direction.z;

    // X slab
    let tmin: number, tmax: number;
    if (Math.abs(dirX) < EPSILON) {
      if (this.origin.x < min.x || this.origin.x > max.x) return null;
      tmin = -Infinity;
      tmax = Infinity;
    } else {
      tmin = (min.x - this.origin.x) / dirX;
      tmax = (max.x - this.origin.x) / dirX;
      if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
    }

    // Y slab
    let tymin: number, tymax: number;
    if (Math.abs(dirY) < EPSILON) {
      if (this.origin.y < min.y || this.origin.y > max.y) return null;
      tymin = -Infinity;
      tymax = Infinity;
    } else {
      tymin = (min.y - this.origin.y) / dirY;
      tymax = (max.y - this.origin.y) / dirY;
      if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
    }

    if (tmin > tymax || tymin > tmax) return null;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    // Z slab
    let tzmin: number, tzmax: number;
    if (Math.abs(dirZ) < EPSILON) {
      if (this.origin.z < min.z || this.origin.z > max.z) return null;
      tzmin = -Infinity;
      tzmax = Infinity;
    } else {
      tzmin = (min.z - this.origin.z) / dirZ;
      tzmax = (max.z - this.origin.z) / dirZ;
      if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
    }

    if (tmin > tzmax || tzmin > tmax) return null;
    if (tzmin > tmin) tmin = tzmin;
    if (tmin < 0) return null;

    return tmin;
  }

  /**
   * Intersect with plane
   */
  intersectPlane(planeNormal: Vector3, planePoint: Vector3): number | null {
    const denom = planeNormal.dot(this.direction);

    if (Math.abs(denom) < 0.0001) {
      return null; // Ray is parallel to plane
    }

    const t = planePoint.sub(this.origin).dot(planeNormal) / denom;

    if (t < 0) {
      return null;
    }

    return t;
  }

  /**
   * Transform ray by matrix
   */
  applyMatrix4(m: Matrix4): Ray {
    return new Ray(
      this.origin.applyMatrix4(m),
      this.direction.applyMatrix4(m.extractRotation()).normalize()
    );
  }
}

/**
 * Bounding box
 */
export class Box3 {
  constructor(
    public min: Vector3 = new Vector3(Infinity, Infinity, Infinity),
    public max: Vector3 = new Vector3(-Infinity, -Infinity, -Infinity)
  ) {}

  static fromCenterSize(center: Vector3, size: Vector3): Box3 {
    const halfSize = size.multiplyScalar(0.5);
    return new Box3(center.sub(halfSize), center.add(halfSize));
  }

  clone(): Box3 {
    return new Box3(this.min.clone(), this.max.clone());
  }

  isEmpty(): boolean {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }

  getCenter(): Vector3 {
    if (this.isEmpty()) return new Vector3();
    return this.min.add(this.max).multiplyScalar(0.5);
  }

  getSize(): Vector3 {
    if (this.isEmpty()) return new Vector3();
    return this.max.sub(this.min);
  }

  expandByPoint(point: Vector3): this {
    this.min = new Vector3(
      Math.min(this.min.x, point.x),
      Math.min(this.min.y, point.y),
      Math.min(this.min.z, point.z)
    );
    this.max = new Vector3(
      Math.max(this.max.x, point.x),
      Math.max(this.max.y, point.y),
      Math.max(this.max.z, point.z)
    );
    return this;
  }

  containsPoint(point: Vector3): boolean {
    return (
      point.x >= this.min.x && point.x <= this.max.x &&
      point.y >= this.min.y && point.y <= this.max.y &&
      point.z >= this.min.z && point.z <= this.max.z
    );
  }

  intersectsBox(box: Box3): boolean {
    return !(
      box.max.x < this.min.x || box.min.x > this.max.x ||
      box.max.y < this.min.y || box.min.y > this.max.y ||
      box.max.z < this.min.z || box.min.z > this.max.z
    );
  }

  applyMatrix4(m: Matrix4): Box3 {
    const points = [
      new Vector3(this.min.x, this.min.y, this.min.z),
      new Vector3(this.min.x, this.min.y, this.max.z),
      new Vector3(this.min.x, this.max.y, this.min.z),
      new Vector3(this.min.x, this.max.y, this.max.z),
      new Vector3(this.max.x, this.min.y, this.min.z),
      new Vector3(this.max.x, this.min.y, this.max.z),
      new Vector3(this.max.x, this.max.y, this.min.z),
      new Vector3(this.max.x, this.max.y, this.max.z),
    ];

    const result = new Box3();
    for (const point of points) {
      result.expandByPoint(point.applyMatrix4(m));
    }
    return result;
  }
}

/**
 * Utility to convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Utility to convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Ray-line segment intersection in 2D
 * Crucial for 2.5D raycasting (DOOM/Wolfenstein style)
 *
 * @param rayX - Ray origin X
 * @param rayY - Ray origin Y
 * @param rayDirX - Ray direction X (normalized or not)
 * @param rayDirY - Ray direction Y (normalized or not)
 * @param lineX1 - Line segment start X
 * @param lineY1 - Line segment start Y
 * @param lineX2 - Line segment end X
 * @param lineY2 - Line segment end Y
 * @returns { t: distance along ray, u: position along line segment [0,1] } or null if no intersection
 */
export function rayLineIntersect2D(
  rayX: number, rayY: number,
  rayDirX: number, rayDirY: number,
  lineX1: number, lineY1: number,
  lineX2: number, lineY2: number
): { t: number; u: number } | null {
  const dx = lineX2 - lineX1;
  const dy = lineY2 - lineY1;

  const denom = rayDirX * dy - rayDirY * dx;

  // Ray is parallel to line
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((lineX1 - rayX) * dy - (lineY1 - rayY) * dx) / denom;
  const u = ((lineX1 - rayX) * rayDirY - (lineY1 - rayY) * rayDirX) / denom;

  // Intersection is behind ray origin or outside line segment
  if (t < 0 || u < 0 || u > 1) return null;

  return { t, u };
}

/**
 * Random number in [-1, 1] range
 * Common for jittering, noise effects
 */
export function urandom(): number {
  return Math.random() * 2 - 1;
}

/**
 * Random Vector3 with components in [-1, 1]
 * Useful for particle systems, AI variation, etc.
 */
export function urandomVector(): Vector3 {
  return new Vector3(urandom(), urandom(), urandom());
}

/**
 * Random unit vector (normalized, on unit sphere)
 * Uses rejection sampling for uniform distribution
 */
export function randomUnitVector(): Vector3 {
  let v: Vector3;
  let lenSq: number;

  // Rejection sampling to get uniform distribution
  do {
    v = urandomVector();
    lenSq = v.lengthSquared();
  } while (lenSq > 1 || lenSq < 0.0001);

  return v.normalize();
}

/**
 * Angle from point a to point b (in radians)
 * Returns angle in [-PI, PI] range where:
 * - 0 points along +X
 * - PI/2 points along +Y
 * - PI points along -X
 * - -PI/2 points along -Y
 *
 * Useful for AI facing, projectile direction, etc.
 */
export function angleBetween(a: Vector3, b: Vector3): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Angle from point a to point b (2D version using x,y coordinates)
 */
export function angleBetween2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(by - ay, bx - ax);
}

/**
 * Normalize an angle to [-PI, PI] range
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Shortest angular difference between two angles
 * Returns value in [-PI, PI]
 */
export function angleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/**
 * Linear interpolation for angles (handles wrapping)
 */
export function lerpAngle(from: number, to: number, t: number): number {
  const diff = angleDiff(from, to);
  return normalizeAngle(from + diff * t);
}

// ============================================================================
// Rotation Functions
// ============================================================================

/**
 * Rotate vector around Z axis (in XY plane)
 * @param v - Vector to rotate
 * @param angle - Rotation angle in radians (counter-clockwise when looking down Z)
 */
export function rotateAroundZ(v: Vector3, angle: number): Vector3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Vector3(
    v.x * cos - v.y * sin,
    v.x * sin + v.y * cos,
    v.z
  );
}

/**
 * Rotate vector around Y axis (in XZ plane)
 * @param v - Vector to rotate
 * @param angle - Rotation angle in radians (counter-clockwise when looking down Y)
 */
export function rotateAroundY(v: Vector3, angle: number): Vector3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Vector3(
    v.x * cos + v.z * sin,
    v.y,
    -v.x * sin + v.z * cos
  );
}

/**
 * Rotate vector around X axis (in YZ plane)
 * @param v - Vector to rotate
 * @param angle - Rotation angle in radians (counter-clockwise when looking down X)
 */
export function rotateAroundX(v: Vector3, angle: number): Vector3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Vector3(
    v.x,
    v.y * cos - v.z * sin,
    v.y * sin + v.z * cos
  );
}

// Aliases for plane-based naming convention
export const rotateXY = rotateAroundZ;
export const rotateXZ = rotateAroundY;
export const rotateYZ = rotateAroundX;

// ============================================================================
// Vector3-based Ray Intersection
// ============================================================================

/**
 * Ray-line intersection using Vector3 parameters
 * Wrapper around rayLineIntersect2D for convenience with Vector3 types.
 * Uses x,y components only (2D intersection in XY plane).
 *
 * @param origin - Ray origin point
 * @param direction - Ray direction vector (does not need to be normalized)
 * @param lineStart - Start point of line segment
 * @param lineEnd - End point of line segment
 * @returns { t, u } where t is distance along ray and u is position along line [0,1], or null if no intersection
 */
export function rayLineIntersect2DV(
  origin: Vector3,
  direction: Vector3,
  lineStart: Vector3,
  lineEnd: Vector3
): { t: number; u: number } | null {
  return rayLineIntersect2D(
    origin.x, origin.y,
    direction.x, direction.y,
    lineStart.x, lineStart.y,
    lineEnd.x, lineEnd.y
  );
}

// ============================================================================
// Game Convention Angles
// ============================================================================

/**
 * Angle from point a to point b using game/compass convention
 * Returns angle in [-PI, PI] range where:
 * - 0 points along +Y (forward/north)
 * - PI/2 points along +X (right/east)
 * - PI or -PI points along -Y (backward/south)
 * - -PI/2 points along -X (left/west)
 *
 * This convention is common in top-down games where +Y is "forward".
 * Contrast with angleBetween() which uses standard math convention (0 = +X).
 */
export function angleBetweenYForward(a: Vector3, b: Vector3): number {
  return Math.atan2(b.x - a.x, b.y - a.y);
}

/**
 * 2D version of angleBetweenYForward using raw coordinates
 */
export function angleBetweenYForward2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(bx - ax, by - ay);
}

// ============================================================================
// Map/Region Utilities
// ============================================================================

/**
 * A polygon defined by an array of Vector3 vertices.
 * For 2D map regions, only x and y components are used.
 */
export type MapPolygon = Vector3[];

/**
 * Check if a position is inside a polygon region using ray casting algorithm.
 * Uses x,y components only (2D point-in-polygon test).
 *
 * The algorithm casts a ray from the test point to infinity (in +X direction)
 * and counts how many polygon edges it crosses. An odd count means inside.
 *
 * @param region - Array of Vector3 vertices defining the polygon (must have at least 3 vertices)
 * @param position - The point to test
 * @returns true if position is inside the polygon region
 */
export function isInRegion(region: MapPolygon, position: Vector3): boolean {
  const n = region.length;
  if (n < 3) return false;

  const x = position.x;
  const y = position.y;

  let inside = false;

  // Ray casting algorithm - count edge crossings
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = region[i].x;
    const yi = region[i].y;
    const xj = region[j].x;
    const yj = region[j].y;

    // Check if edge crosses the horizontal ray from (x, y) to (+infinity, y)
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point (x, y) is inside a polygon using raw coordinates.
 * 2D version of isInRegion.
 *
 * @param vertices - Array of {x, y} points defining the polygon
 * @param x - X coordinate of point to test
 * @param y - Y coordinate of point to test
 * @returns true if point is inside the polygon
 */
export function isInPolygon2D(
  vertices: Array<{ x: number; y: number }>,
  x: number,
  y: number
): boolean {
  const n = vertices.length;
  if (n < 3) return false;

  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersects = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}
