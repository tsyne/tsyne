/**
 * Tsyne Geometry Utilities
 *
 * Point class and geometric primitives for 2D graphics.
 */

// ============================================================================
// Point Class
// ============================================================================

/**
 * A 2D point with utility methods for vector math
 */
export class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    clone(): Point {
        return new Point(this.x, this.y);
    }

    add(p: Point): Point {
        return new Point(this.x + p.x, this.y + p.y);
    }

    sub(p: Point): Point {
        return new Point(this.x - p.x, this.y - p.y);
    }

    mult(k: number): Point {
        return new Point(this.x * k, this.y * k);
    }

    div(k: number): Point {
        return new Point(this.x / k, this.y / k);
    }

    rotate(angle: number): Point {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Point(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    rotateAround(angle: number, p: Point): Point {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x - p.x;
        const y = this.y - p.y;
        return new Point(
            x * cos - y * sin + p.x,
            x * sin + y * cos + p.y
        );
    }

    mag(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    unit(): Point {
        return this.div(this.mag());
    }

    perp(): Point {
        return new Point(-this.y, this.x);
    }

    round(): Point {
        return new Point(Math.round(this.x), Math.round(this.y));
    }

    floor(): Point {
        return new Point(Math.floor(this.x), Math.floor(this.y));
    }

    ceil(): Point {
        return new Point(Math.ceil(this.x), Math.ceil(this.y));
    }

    equals(p: Point): boolean {
        return this.x === p.x && this.y === p.y;
    }

    dist(p: Point): number {
        return Math.sqrt(this.distSqr(p));
    }

    distSqr(p: Point): number {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        return dx * dx + dy * dy;
    }

    angle(): number {
        return Math.atan2(this.y, this.x);
    }

    angleTo(p: Point): number {
        return Math.atan2(this.y - p.y, this.x - p.x);
    }

    angleWith(p: Point): number {
        return this.angleWithSep(p.x, p.y);
    }

    angleWithSep(x: number, y: number): number {
        return Math.atan2(
            this.x * y - this.y * x,
            this.x * x + this.y * y
        );
    }

    /**
     * Convert from array or Point-like object
     */
    static convert(a: Point | [number, number] | { x: number; y: number }): Point {
        if (a instanceof Point) {
            return a;
        }
        if (Array.isArray(a)) {
            return new Point(a[0], a[1]);
        }
        return new Point(a.x, a.y);
    }
}

// ============================================================================
// Vertex Type (for polygons)
// ============================================================================

export interface Vertex {
    x: number;
    y: number;
}

// ============================================================================
// Bounding Box
// ============================================================================

export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/**
 * Calculate bounding box from vertices
 */
export function getBoundingBox(vertices: Vertex[]): BoundingBox {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const v of vertices) {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
    }

    return { minX, minY, maxX, maxY };
}

/**
 * Check if a point is inside a bounding box
 */
export function pointInBoundingBox(x: number, y: number, box: BoundingBox): boolean {
    return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
}

/**
 * Check if two bounding boxes intersect
 */
export function boundingBoxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return a.minX <= b.maxX && a.maxX >= b.minX &&
           a.minY <= b.maxY && a.maxY >= b.minY;
}

// ============================================================================
// Line Utilities
// ============================================================================

/**
 * Calculate distance from a point to a line segment
 */
export function pointToLineDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
        // Line is a point
        return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    // Project point onto line
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

/**
 * Check if two line segments intersect
 */
export function lineSegmentsIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
): boolean {
    const d1 = direction(x3, y3, x4, y4, x1, y1);
    const d2 = direction(x3, y3, x4, y4, x2, y2);
    const d3 = direction(x1, y1, x2, y2, x3, y3);
    const d4 = direction(x1, y1, x2, y2, x4, y4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
    }

    if (d1 === 0 && onSegment(x3, y3, x4, y4, x1, y1)) return true;
    if (d2 === 0 && onSegment(x3, y3, x4, y4, x2, y2)) return true;
    if (d3 === 0 && onSegment(x1, y1, x2, y2, x3, y3)) return true;
    if (d4 === 0 && onSegment(x1, y1, x2, y2, x4, y4)) return true;

    return false;
}

function direction(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
    return (x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1);
}

function onSegment(x1: number, y1: number, x2: number, y2: number, x: number, y: number): boolean {
    return Math.min(x1, x2) <= x && x <= Math.max(x1, x2) &&
           Math.min(y1, y2) <= y && y <= Math.max(y1, y2);
}

// ============================================================================
// Polygon Utilities
// ============================================================================

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 */
export function pointInPolygon(x: number, y: number, vertices: Vertex[]): boolean {
    let inside = false;
    const n = vertices.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        if (((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * Calculate the area of a polygon (signed, positive if counter-clockwise)
 */
export function polygonArea(vertices: Vertex[]): number {
    let area = 0;
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }

    return area / 2;
}

/**
 * Calculate the centroid of a polygon
 */
export function polygonCentroid(vertices: Vertex[]): Vertex {
    let cx = 0, cy = 0;
    const n = vertices.length;
    const area = polygonArea(vertices);

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const factor = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
        cx += (vertices[i].x + vertices[j].x) * factor;
        cy += (vertices[i].y + vertices[j].y) * factor;
    }

    const areaFactor = 6 * area;
    return { x: cx / areaFactor, y: cy / areaFactor };
}
