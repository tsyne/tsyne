/**
 * DOMMatrix polyfill for Node.js environments.
 * Full 4×4 matrix implementation used by raw WebGL games (e.g., Charon Jr.)
 * that rely on DOMMatrix for all 3D transforms.
 *
 * Performance: All *Self() methods are zero-alloc (no temporary objects).
 * Non-mutating methods (multiply, inverse, scale, translate, rotate) still
 * return new matrices per DOMMatrix spec.
 */

// Module-level scratch buffer shared by multiplySelf/preMultiplySelf/_rotateAxisSelf.
// Safe because JS is single-threaded — no concurrent access.
const _scratch16 = new Float64Array(16);

export class TsyneDOMMatrix {
  _values: Float64Array;

  constructor(init?: number[] | Float32Array | Float64Array) {
    this._values = new Float64Array(16);
    if (init && init.length === 16) {
      // Column-major: [m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44]
      for (let i = 0; i < 16; i++) this._values[i] = init[i];
    } else {
      // Identity
      this._values[0] = 1;
      this._values[5] = 1;
      this._values[10] = 1;
      this._values[15] = 1;
    }
  }

  // Column-major accessors (matching DOMMatrix spec)
  // Column 1
  get m11() { return this._values[0]; }  set m11(v) { this._values[0] = v; }
  get m12() { return this._values[1]; }  set m12(v) { this._values[1] = v; }
  get m13() { return this._values[2]; }  set m13(v) { this._values[2] = v; }
  get m14() { return this._values[3]; }  set m14(v) { this._values[3] = v; }
  // Column 2
  get m21() { return this._values[4]; }  set m21(v) { this._values[4] = v; }
  get m22() { return this._values[5]; }  set m22(v) { this._values[5] = v; }
  get m23() { return this._values[6]; }  set m23(v) { this._values[6] = v; }
  get m24() { return this._values[7]; }  set m24(v) { this._values[7] = v; }
  // Column 3
  get m31() { return this._values[8]; }  set m31(v) { this._values[8] = v; }
  get m32() { return this._values[9]; }  set m32(v) { this._values[9] = v; }
  get m33() { return this._values[10]; } set m33(v) { this._values[10] = v; }
  get m34() { return this._values[11]; } set m34(v) { this._values[11] = v; }
  // Column 4
  get m41() { return this._values[12]; } set m41(v) { this._values[12] = v; }
  get m42() { return this._values[13]; } set m42(v) { this._values[13] = v; }
  get m43() { return this._values[14]; } set m43(v) { this._values[14] = v; }
  get m44() { return this._values[15]; } set m44(v) { this._values[15] = v; }

  // Aliases (a-f for 2D subset, matching spec)
  get a() { return this.m11; } set a(v) { this.m11 = v; }
  get b() { return this.m12; } set b(v) { this.m12 = v; }
  get c() { return this.m21; } set c(v) { this.m21 = v; }
  get d() { return this.m22; } set d(v) { this.m22 = v; }
  get e() { return this.m41; } set e(v) { this.m41 = v; }
  get f() { return this.m42; } set f(v) { this.m42 = v; }

  get isIdentity(): boolean {
    return this.m11 === 1 && this.m12 === 0 && this.m13 === 0 && this.m14 === 0 &&
           this.m21 === 0 && this.m22 === 1 && this.m23 === 0 && this.m24 === 0 &&
           this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0 &&
           this.m41 === 0 && this.m42 === 0 && this.m43 === 0 && this.m44 === 1;
  }

  get is2D(): boolean {
    return this.m13 === 0 && this.m14 === 0 &&
           this.m23 === 0 && this.m24 === 0 &&
           this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0 &&
           this.m43 === 0 && this.m44 === 1;
  }

  // --- Zero-alloc multiply into scratch, then copy back ---

  /** Compute a × b into the module-level scratch buffer (zero-alloc) */
  private static _multiplyIntoScratch(av: Float64Array, bv: Float64Array): void {
    const r = _scratch16;
    for (let col = 0; col < 4; col++) {
      const bc = col * 4;
      const b0 = bv[bc], b1 = bv[bc + 1], b2 = bv[bc + 2], b3 = bv[bc + 3];
      r[bc]     = av[0] * b0 + av[4] * b1 + av[8]  * b2 + av[12] * b3;
      r[bc + 1] = av[1] * b0 + av[5] * b1 + av[9]  * b2 + av[13] * b3;
      r[bc + 2] = av[2] * b0 + av[6] * b1 + av[10] * b2 + av[14] * b3;
      r[bc + 3] = av[3] * b0 + av[7] * b1 + av[11] * b2 + av[15] * b3;
    }
  }

  /** Return new matrix = this × other (allocates) */
  multiply(other: TsyneDOMMatrix): TsyneDOMMatrix {
    TsyneDOMMatrix._multiplyIntoScratch(this._values, other._values);
    const result = new TsyneDOMMatrix();
    result._values.set(_scratch16);
    return result;
  }

  /** Mutate this = this × other (zero-alloc) */
  multiplySelf(other: TsyneDOMMatrix): TsyneDOMMatrix {
    TsyneDOMMatrix._multiplyIntoScratch(this._values, other._values);
    this._values.set(_scratch16);
    return this;
  }

  /** Mutate this = other × this (zero-alloc) */
  preMultiplySelf(other: TsyneDOMMatrix): TsyneDOMMatrix {
    TsyneDOMMatrix._multiplyIntoScratch(other._values, this._values);
    this._values.set(_scratch16);
    return this;
  }

  /** Mutate: this = this × T(tx,ty,tz). Zero-alloc — only column 4 changes. */
  translateSelf(tx: number = 0, ty: number = 0, tz: number = 0): TsyneDOMMatrix {
    const v = this._values;
    // M × T: new column 4 = col1*tx + col2*ty + col3*tz + col4
    v[12] += v[0] * tx + v[4] * ty + v[8]  * tz;
    v[13] += v[1] * tx + v[5] * ty + v[9]  * tz;
    v[14] += v[2] * tx + v[6] * ty + v[10] * tz;
    v[15] += v[3] * tx + v[7] * ty + v[11] * tz;
    return this;
  }

  /** Mutate: this = this × S(sx,sy,sz). Zero-alloc — scales columns 1-3. */
  scaleSelf(sx: number = 1, sy?: number, sz: number = 1): TsyneDOMMatrix {
    if (sy === undefined) sy = sx;
    const v = this._values;
    v[0] *= sx; v[1] *= sx; v[2] *= sx; v[3] *= sx;
    v[4] *= sy; v[5] *= sy; v[6] *= sy; v[7] *= sy;
    v[8] *= sz; v[9] *= sz; v[10] *= sz; v[11] *= sz;
    return this;
  }

  /** translate() returns a new matrix (non-mutating) */
  translate(tx: number = 0, ty: number = 0, tz: number = 0): TsyneDOMMatrix {
    const copy = TsyneDOMMatrix.fromMatrix(this);
    return copy.translateSelf(tx, ty, tz);
  }

  /** scale() returns a new matrix (non-mutating) */
  scale(sx: number = 1, sy?: number, sz: number = 1): TsyneDOMMatrix {
    const copy = TsyneDOMMatrix.fromMatrix(this);
    return copy.scaleSelf(sx, sy, sz);
  }

  /** rotate() returns a new matrix (non-mutating) */
  rotate(rotX: number = 0, rotY: number = 0, rotZ: number = 0): TsyneDOMMatrix {
    const copy = TsyneDOMMatrix.fromMatrix(this);
    return copy.rotateSelf(rotX, rotY, rotZ);
  }

  /** rotateAxisAngle() returns a new matrix (non-mutating) */
  rotateAxisAngle(x: number, y: number, z: number, angleDeg: number): TsyneDOMMatrix {
    const copy = TsyneDOMMatrix.fromMatrix(this);
    return copy.rotateAxisAngleSelf(x, y, z, angleDeg);
  }

  rotateSelf(rotX: number = 0, rotY: number = 0, rotZ: number = 0): TsyneDOMMatrix {
    // DOMMatrix.rotateSelf takes degrees
    if (rotX !== 0) this._rotateAxisSelf(1, 0, 0, rotX);
    if (rotY !== 0) this._rotateAxisSelf(0, 1, 0, rotY);
    if (rotZ !== 0) this._rotateAxisSelf(0, 0, 1, rotZ);
    return this;
  }

  rotateAxisAngleSelf(x: number, y: number, z: number, angleDeg: number): TsyneDOMMatrix {
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len === 0) return this;
    return this._rotateAxisSelf(x / len, y / len, z / len, angleDeg);
  }

  /** Zero-alloc: builds rotation values in scratch buffer, multiplies in-place */
  private _rotateAxisSelf(x: number, y: number, z: number, angleDeg: number): TsyneDOMMatrix {
    const rad = angleDeg * Math.PI / 180;
    const co = Math.cos(rad);
    const si = Math.sin(rad);
    const t = 1 - co;
    // Build rotation matrix in scratch buffer
    const r = _scratch16;
    r[0]  = t * x * x + co;     r[1]  = t * x * y + si * z; r[2]  = t * x * z - si * y; r[3]  = 0;
    r[4]  = t * x * y - si * z; r[5]  = t * y * y + co;     r[6]  = t * y * z + si * x; r[7]  = 0;
    r[8]  = t * x * z + si * y; r[9]  = t * y * z - si * x; r[10] = t * z * z + co;     r[11] = 0;
    r[12] = 0;                   r[13] = 0;                   r[14] = 0;                   r[15] = 1;

    // Inline this = this × R. Safe: each col reads its own R slice (not yet overwritten)
    // and reads from v (untouched until final copy).
    const v = this._values;
    for (let col = 0; col < 4; col++) {
      const rc = col * 4;
      const r0 = r[rc], r1 = r[rc + 1], r2 = r[rc + 2], r3 = r[rc + 3];
      _scratch16[rc]     = v[0] * r0 + v[4] * r1 + v[8]  * r2 + v[12] * r3;
      _scratch16[rc + 1] = v[1] * r0 + v[5] * r1 + v[9]  * r2 + v[13] * r3;
      _scratch16[rc + 2] = v[2] * r0 + v[6] * r1 + v[10] * r2 + v[14] * r3;
      _scratch16[rc + 3] = v[3] * r0 + v[7] * r1 + v[11] * r2 + v[15] * r3;
    }
    v.set(_scratch16);
    return this;
  }

  /** Return new matrix = inverse of this */
  inverse(): TsyneDOMMatrix {
    const m = this._values;
    const inv = new Float64Array(16);

    inv[0]  =  m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4]  = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8]  =  m[4]*m[9]*m[15]  - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14]  + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];

    inv[1]  = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5]  =  m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9]  = -m[0]*m[9]*m[15]  + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] =  m[0]*m[9]*m[14]  - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];

    inv[2]  =  m[1]*m[6]*m[15]  - m[1]*m[7]*m[14]  - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7]  - m[13]*m[3]*m[6];
    inv[6]  = -m[0]*m[6]*m[15]  + m[0]*m[7]*m[14]  + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7]  + m[12]*m[3]*m[6];
    inv[10] =  m[0]*m[5]*m[15]  - m[0]*m[7]*m[13]  - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7]  - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14]  + m[0]*m[6]*m[13]  + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6]  + m[12]*m[2]*m[5];

    inv[3]  = -m[1]*m[6]*m[11]  + m[1]*m[7]*m[10]  + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7]   + m[9]*m[3]*m[6];
    inv[7]  =  m[0]*m[6]*m[11]  - m[0]*m[7]*m[10]  - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7]   - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11]  + m[0]*m[7]*m[9]   + m[4]*m[1]*m[11] - m[4]*m[3]*m[9]  - m[8]*m[1]*m[7]   + m[8]*m[3]*m[5];
    inv[15] =  m[0]*m[5]*m[10]  - m[0]*m[6]*m[9]   - m[4]*m[1]*m[10] + m[4]*m[2]*m[9]  + m[8]*m[1]*m[6]   - m[8]*m[2]*m[5];

    let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
    if (det === 0) {
      // Return NaN matrix per spec
      const nan = new TsyneDOMMatrix();
      nan._values.fill(NaN);
      return nan;
    }

    det = 1.0 / det;
    const result = new TsyneDOMMatrix();
    for (let i = 0; i < 16; i++) result._values[i] = inv[i] * det;
    return result;
  }

  /** Mutate this = inverse(this). Uses scratch buffer — zero-alloc. */
  inverseSelf(): TsyneDOMMatrix {
    const m = this._values;
    const inv = _scratch16;

    inv[0]  =  m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4]  = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8]  =  m[4]*m[9]*m[15]  - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14]  + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];

    inv[1]  = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5]  =  m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9]  = -m[0]*m[9]*m[15]  + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] =  m[0]*m[9]*m[14]  - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];

    inv[2]  =  m[1]*m[6]*m[15]  - m[1]*m[7]*m[14]  - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7]  - m[13]*m[3]*m[6];
    inv[6]  = -m[0]*m[6]*m[15]  + m[0]*m[7]*m[14]  + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7]  + m[12]*m[3]*m[6];
    inv[10] =  m[0]*m[5]*m[15]  - m[0]*m[7]*m[13]  - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7]  - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14]  + m[0]*m[6]*m[13]  + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6]  + m[12]*m[2]*m[5];

    inv[3]  = -m[1]*m[6]*m[11]  + m[1]*m[7]*m[10]  + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7]   + m[9]*m[3]*m[6];
    inv[7]  =  m[0]*m[6]*m[11]  - m[0]*m[7]*m[10]  - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7]   - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11]  + m[0]*m[7]*m[9]   + m[4]*m[1]*m[11] - m[4]*m[3]*m[9]  - m[8]*m[1]*m[7]   + m[8]*m[3]*m[5];
    inv[15] =  m[0]*m[5]*m[10]  - m[0]*m[6]*m[9]   - m[4]*m[1]*m[10] + m[4]*m[2]*m[9]  + m[8]*m[1]*m[6]   - m[8]*m[2]*m[5];

    let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
    if (det === 0) {
      m.fill(NaN);
      return this;
    }

    det = 1.0 / det;
    for (let i = 0; i < 16; i++) m[i] = inv[i] * det;
    return this;
  }

  /** Transform a DOMPoint by this matrix */
  transformPoint(point?: { x?: number; y?: number; z?: number; w?: number }): any {
    const px = point?.x ?? 0;
    const py = point?.y ?? 0;
    const pz = point?.z ?? 0;
    const pw = point?.w ?? 1;
    const m = this._values;
    return new (globalThis as any).DOMPoint(
      m[0]*px + m[4]*py + m[8]*pz  + m[12]*pw,
      m[1]*px + m[5]*py + m[9]*pz  + m[13]*pw,
      m[2]*px + m[6]*py + m[10]*pz + m[14]*pw,
      m[3]*px + m[7]*py + m[11]*pz + m[15]*pw,
    );
  }

  /** Transform point in-place: writes x,y,z,w into the target object (zero-alloc) */
  transformPointInto(point: { x: number; y: number; z: number; w?: number },
                     target: { x: number; y: number; z: number; w?: number }): void {
    const px = point.x, py = point.y, pz = point.z, pw = point.w ?? 1;
    const m = this._values;
    target.x = m[0]*px + m[4]*py + m[8]*pz  + m[12]*pw;
    target.y = m[1]*px + m[5]*py + m[9]*pz  + m[13]*pw;
    target.z = m[2]*px + m[6]*py + m[10]*pz + m[14]*pw;
  }

  /** Return column-major Float32Array for WebGL uniformMatrix4fv (allocates) */
  toFloat32Array(): Float32Array {
    return new Float32Array(this._values);
  }

  /** Write column-major values into existing Float32Array (zero-alloc) */
  toFloat32ArrayInto(target: Float32Array, offset: number = 0): void {
    const v = this._values;
    for (let i = 0; i < 16; i++) target[offset + i] = v[i];
  }

  toJSON() {
    return {
      m11: this.m11, m12: this.m12, m13: this.m13, m14: this.m14,
      m21: this.m21, m22: this.m22, m23: this.m23, m24: this.m24,
      m31: this.m31, m32: this.m32, m33: this.m33, m34: this.m34,
      m41: this.m41, m42: this.m42, m43: this.m43, m44: this.m44,
    };
  }

  toString(): string {
    return `matrix3d(${Array.from(this._values).join(', ')})`;
  }

  /** Reset to identity matrix (zero-alloc) */
  setIdentity(): TsyneDOMMatrix {
    this._values.fill(0);
    this._values[0] = 1;
    this._values[5] = 1;
    this._values[10] = 1;
    this._values[15] = 1;
    return this;
  }

  /** Copy all values from another matrix (zero-alloc) */
  copyFrom(other: TsyneDOMMatrix): TsyneDOMMatrix {
    this._values.set(other._values);
    return this;
  }

  /** Static: create copy */
  static fromMatrix(other: TsyneDOMMatrix): TsyneDOMMatrix {
    const copy = new TsyneDOMMatrix();
    copy._values.set(other._values);
    return copy;
  }

  static fromFloat32Array(arr: Float32Array): TsyneDOMMatrix {
    const m = new TsyneDOMMatrix();
    for (let i = 0; i < 16 && i < arr.length; i++) m._values[i] = arr[i];
    return m;
  }
}
