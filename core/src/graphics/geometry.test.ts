import {
  Point,
  Vertex,
  BoundingBox,
  getBoundingBox,
  pointInBoundingBox,
  boundingBoxesIntersect,
  pointToLineDistance,
  lineSegmentsIntersect,
  pointInPolygon,
  polygonArea,
  polygonCentroid
} from './geometry';

describe('Point', () => {
  describe('constructor and clone', () => {
    it('creates a point with x and y coordinates', () => {
      const p = new Point(3, 4);
      expect(p.x).toBe(3);
      expect(p.y).toBe(4);
    });

    it('clones a point', () => {
      const p = new Point(3, 4);
      const c = p.clone();
      expect(c.x).toBe(3);
      expect(c.y).toBe(4);
      expect(c).not.toBe(p);
    });
  });

  describe('vector operations', () => {
    it('adds two points', () => {
      const p1 = new Point(1, 2);
      const p2 = new Point(3, 4);
      const result = p1.add(p2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('subtracts two points', () => {
      const p1 = new Point(5, 7);
      const p2 = new Point(2, 3);
      const result = p1.sub(p2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('multiplies by scalar', () => {
      const p = new Point(3, 4);
      const result = p.mult(2);
      expect(result.x).toBe(6);
      expect(result.y).toBe(8);
    });

    it('divides by scalar', () => {
      const p = new Point(6, 8);
      const result = p.div(2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });
  });

  describe('magnitude and distance', () => {
    it('calculates magnitude', () => {
      const p = new Point(3, 4);
      expect(p.mag()).toBe(5);
    });

    it('creates unit vector', () => {
      const p = new Point(3, 4);
      const unit = p.unit();
      expect(unit.x).toBeCloseTo(0.6);
      expect(unit.y).toBeCloseTo(0.8);
    });

    it('calculates distance between points', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(3, 4);
      expect(p1.dist(p2)).toBe(5);
    });

    it('calculates squared distance', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(3, 4);
      expect(p1.distSqr(p2)).toBe(25);
    });
  });

  describe('rotation', () => {
    it('rotates point by 90 degrees', () => {
      const p = new Point(1, 0);
      const rotated = p.rotate(Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });

    it('rotates around another point', () => {
      const p = new Point(2, 0);
      const center = new Point(1, 0);
      const rotated = p.rotateAround(Math.PI / 2, center);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(1);
    });
  });

  describe('perpendicular and rounding', () => {
    it('gets perpendicular vector', () => {
      const p = new Point(1, 0);
      const perp = p.perp();
      expect(perp.x).toBe(-0); // perp() returns (-y, x)
      expect(perp.y).toBe(1);
    });

    it('rounds coordinates', () => {
      const p = new Point(1.4, 2.6);
      const rounded = p.round();
      expect(rounded.x).toBe(1);
      expect(rounded.y).toBe(3);
    });

    it('floors coordinates', () => {
      const p = new Point(1.9, 2.1);
      const floored = p.floor();
      expect(floored.x).toBe(1);
      expect(floored.y).toBe(2);
    });

    it('ceils coordinates', () => {
      const p = new Point(1.1, 2.9);
      const ceiled = p.ceil();
      expect(ceiled.x).toBe(2);
      expect(ceiled.y).toBe(3);
    });
  });

  describe('equality and angles', () => {
    it('checks equality', () => {
      const p1 = new Point(1, 2);
      const p2 = new Point(1, 2);
      const p3 = new Point(1, 3);
      expect(p1.equals(p2)).toBe(true);
      expect(p1.equals(p3)).toBe(false);
    });

    it('calculates angle', () => {
      const p = new Point(1, 0);
      expect(p.angle()).toBe(0);

      const p2 = new Point(0, 1);
      expect(p2.angle()).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('convert', () => {
    it('converts from Point instance', () => {
      const p = new Point(1, 2);
      const converted = Point.convert(p);
      expect(converted).toBe(p);
    });

    it('converts from array', () => {
      const converted = Point.convert([3, 4]);
      expect(converted.x).toBe(3);
      expect(converted.y).toBe(4);
    });

    it('converts from object', () => {
      const converted = Point.convert({ x: 5, y: 6 });
      expect(converted.x).toBe(5);
      expect(converted.y).toBe(6);
    });
  });
});

describe('BoundingBox', () => {
  const square: Vertex[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 }
  ];

  it('calculates bounding box from vertices', () => {
    const box = getBoundingBox(square);
    expect(box.minX).toBe(0);
    expect(box.minY).toBe(0);
    expect(box.maxX).toBe(10);
    expect(box.maxY).toBe(10);
  });

  it('checks if point is in bounding box', () => {
    const box: BoundingBox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(pointInBoundingBox(5, 5, box)).toBe(true);
    expect(pointInBoundingBox(0, 0, box)).toBe(true);
    expect(pointInBoundingBox(10, 10, box)).toBe(true);
    expect(pointInBoundingBox(-1, 5, box)).toBe(false);
    expect(pointInBoundingBox(11, 5, box)).toBe(false);
  });

  it('checks if bounding boxes intersect', () => {
    const box1: BoundingBox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    const box2: BoundingBox = { minX: 5, minY: 5, maxX: 15, maxY: 15 };
    const box3: BoundingBox = { minX: 20, minY: 20, maxX: 30, maxY: 30 };

    expect(boundingBoxesIntersect(box1, box2)).toBe(true);
    expect(boundingBoxesIntersect(box1, box3)).toBe(false);
  });
});

describe('Line utilities', () => {
  it('calculates distance from point to line segment', () => {
    // Point directly above the middle of a horizontal line
    const dist = pointToLineDistance(5, 5, 0, 0, 10, 0);
    expect(dist).toBe(5);
  });

  it('calculates distance when point is beyond segment endpoint', () => {
    // Point beyond the right end of a horizontal line
    const dist = pointToLineDistance(15, 0, 0, 0, 10, 0);
    expect(dist).toBe(5);
  });

  it('detects intersecting line segments', () => {
    // X pattern
    expect(lineSegmentsIntersect(0, 0, 10, 10, 0, 10, 10, 0)).toBe(true);
  });

  it('detects non-intersecting line segments', () => {
    // Parallel horizontal lines
    expect(lineSegmentsIntersect(0, 0, 10, 0, 0, 5, 10, 5)).toBe(false);
  });
});

describe('Polygon utilities', () => {
  const square: Vertex[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 }
  ];

  const triangle: Vertex[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 5, y: 10 }
  ];

  it('checks if point is inside polygon', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
    expect(pointInPolygon(15, 5, square)).toBe(false);
    expect(pointInPolygon(5, 5, triangle)).toBe(true);
    expect(pointInPolygon(1, 9, triangle)).toBe(false);
  });

  it('calculates polygon area', () => {
    // Counter-clockwise square: positive area
    const area = polygonArea(square);
    expect(Math.abs(area)).toBe(100);
  });

  it('calculates polygon centroid', () => {
    const centroid = polygonCentroid(square);
    expect(centroid.x).toBeCloseTo(5);
    expect(centroid.y).toBeCloseTo(5);
  });
});
