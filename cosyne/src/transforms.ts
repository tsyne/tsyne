/**
 * Transform system for Cosyne
 * Nested coordinate transformations (translate, rotate, scale)
 */

export interface TransformOptions {
  translate?: [number, number];
  rotate?: number;
  scale?: [number, number];
}

/**
 * 2D transformation matrix (3x3 homogeneous coordinates)
 * Supports composition of translate, rotate, scale
 */
export class TransformMatrix {
  // Row-major: [a, b, tx, c, d, ty, 0, 0, 1]
  private matrix: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  constructor(options?: TransformOptions) {
    if (options?.translate) {
      this.translate(options.translate[0], options.translate[1]);
    }
    if (options?.rotate !== undefined) {
      this.rotate(options.rotate);
    }
    if (options?.scale) {
      this.scale(options.scale[0], options.scale[1]);
    }
  }

  /**
   * Translate by (tx, ty)
   */
  translate(tx: number, ty: number): this {
    const m = this.matrix;
    m[6] += m[0] * tx + m[3] * ty;
    m[7] += m[1] * tx + m[4] * ty;
    m[2] += tx;
    return this;
  }

  /**
   * Rotate by angle (in radians)
   */
  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const m = this.matrix;

    // Matrix multiplication: [a, b, 0, c, d, 0] x [cos, sin, 0, -sin, cos, 0]
    const a = m[0];
    const b = m[1];
    const c = m[3];
    const d = m[4];

    m[0] = a * cos + b * -sin;
    m[1] = a * sin + b * cos;
    m[3] = c * cos + d * -sin;
    m[4] = c * sin + d * cos;

    return this;
  }

  /**
   * Scale by (sx, sy)
   */
  scale(sx: number, sy: number): this {
    const m = this.matrix;
    m[0] *= sx;
    m[1] *= sy;
    m[3] *= sx;
    m[4] *= sy;
    m[2] *= sx;
    m[5] *= sy;
    return this;
  }

  /**
   * Transform a point (x, y) using this matrix
   */
  transformPoint(x: number, y: number): [number, number] {
    const m = this.matrix;
    const newX = m[0] * x + m[3] * y + m[6];
    const newY = m[1] * x + m[4] * y + m[7];
    return [newX, newY];
  }

  /**
   * Get matrix values as array
   */
  getMatrix(): readonly number[] {
    return [...this.matrix];
  }

  /**
   * Clone this transform
   */
  clone(): TransformMatrix {
    const clone = new TransformMatrix();
    clone.matrix = [...this.matrix];
    return clone;
  }

  /**
   * Reset to identity
   */
  reset(): this {
    this.matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    return this;
  }
}

/**
 * Stack of transforms for nested coordinate systems
 */
export class TransformStack {
  private stack: TransformMatrix[] = [new TransformMatrix()];

  /**
   * Push a new transform onto the stack
   */
  push(options?: TransformOptions): TransformMatrix {
    const parent = this.stack[this.stack.length - 1];
    const current = parent.clone();

    if (options?.translate) {
      current.translate(options.translate[0], options.translate[1]);
    }
    if (options?.rotate !== undefined) {
      current.rotate(options.rotate);
    }
    if (options?.scale) {
      current.scale(options.scale[0], options.scale[1]);
    }

    this.stack.push(current);
    return current;
  }

  /**
   * Pop the current transform
   */
  pop(): TransformMatrix {
    if (this.stack.length <= 1) {
      throw new Error('Cannot pop root transform');
    }
    return this.stack.pop()!;
  }

  /**
   * Get the current transform
   */
  current(): TransformMatrix {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Get the depth (number of transforms in stack)
   */
  depth(): number {
    return this.stack.length;
  }

  /**
   * Reset to identity (depth 1)
   */
  reset(): void {
    this.stack = [new TransformMatrix()];
  }
}
