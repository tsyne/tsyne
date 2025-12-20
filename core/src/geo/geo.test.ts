import {
  degToRad,
  radToDeg,
  clamp,
  wrap,
  mercatorXfromLng,
  mercatorYfromLat,
  lngFromMercatorX,
  latFromMercatorY,
  getMetersPerPixelAtLatitude,
  mercatorScale,
  LngLat,
  LngLatBounds,
  MercatorCoordinate,
  lngLatToTile,
  tileToLngLat,
  earthRadius,
  earthCircumference
} from './geo';

describe('Constants', () => {
  it('has reasonable earth radius', () => {
    expect(earthRadius).toBeCloseTo(6371008.8, 0);
  });

  it('has reasonable earth circumference', () => {
    expect(earthCircumference).toBeCloseTo(40030000, -4); // ~40,000 km
  });
});

describe('Math utilities', () => {
  describe('degToRad', () => {
    it('converts 0 degrees to 0 radians', () => {
      expect(degToRad(0)).toBe(0);
    });

    it('converts 180 degrees to PI radians', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI);
    });

    it('converts 90 degrees to PI/2 radians', () => {
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('radToDeg', () => {
    it('converts 0 radians to 0 degrees', () => {
      expect(radToDeg(0)).toBe(0);
    });

    it('converts PI radians to 180 degrees', () => {
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
    });
  });

  describe('clamp', () => {
    it('clamps value below min', () => {
      expect(clamp(-10, 0, 100)).toBe(0);
    });

    it('clamps value above max', () => {
      expect(clamp(150, 0, 100)).toBe(100);
    });

    it('returns value when in range', () => {
      expect(clamp(50, 0, 100)).toBe(50);
    });
  });

  describe('wrap', () => {
    it('wraps value below min', () => {
      expect(wrap(-10, 0, 360)).toBeCloseTo(350);
    });

    it('wraps value above max', () => {
      expect(wrap(370, 0, 360)).toBeCloseTo(10);
    });

    it('handles longitude wrapping', () => {
      expect(wrap(-190, -180, 180)).toBeCloseTo(170);
      expect(wrap(190, -180, 180)).toBeCloseTo(-170);
    });
  });
});

describe('Mercator projection', () => {
  describe('mercatorXfromLng', () => {
    it('converts longitude 0 to 0.5', () => {
      expect(mercatorXfromLng(0)).toBe(0.5);
    });

    it('converts longitude -180 to 0', () => {
      expect(mercatorXfromLng(-180)).toBe(0);
    });

    it('converts longitude 180 to 1', () => {
      expect(mercatorXfromLng(180)).toBe(1);
    });
  });

  describe('mercatorYfromLat', () => {
    it('converts latitude 0 to 0.5', () => {
      expect(mercatorYfromLat(0)).toBeCloseTo(0.5);
    });

    it('converts northern latitudes to values < 0.5', () => {
      expect(mercatorYfromLat(45)).toBeLessThan(0.5);
    });

    it('converts southern latitudes to values > 0.5', () => {
      expect(mercatorYfromLat(-45)).toBeGreaterThan(0.5);
    });
  });

  describe('lngFromMercatorX', () => {
    it('is inverse of mercatorXfromLng', () => {
      const lng = -73.5;
      const x = mercatorXfromLng(lng);
      expect(lngFromMercatorX(x)).toBeCloseTo(lng);
    });
  });

  describe('latFromMercatorY', () => {
    it('is inverse of mercatorYfromLat', () => {
      const lat = 40.7;
      const y = mercatorYfromLat(lat);
      expect(latFromMercatorY(y)).toBeCloseTo(lat);
    });
  });

  describe('getMetersPerPixelAtLatitude', () => {
    it('returns larger values at lower zoom levels', () => {
      const zoom0 = getMetersPerPixelAtLatitude(0, 0);
      const zoom10 = getMetersPerPixelAtLatitude(0, 10);
      expect(zoom0).toBeGreaterThan(zoom10);
    });

    it('returns smaller values at higher latitudes', () => {
      const equator = getMetersPerPixelAtLatitude(0, 10);
      const latitude60 = getMetersPerPixelAtLatitude(60, 10);
      expect(latitude60).toBeLessThan(equator);
    });
  });

  describe('mercatorScale', () => {
    it('returns 1 at equator', () => {
      expect(mercatorScale(0)).toBe(1);
    });

    it('returns larger values at higher latitudes', () => {
      expect(mercatorScale(60)).toBeGreaterThan(1);
    });
  });
});

describe('LngLat', () => {
  describe('constructor', () => {
    it('creates a coordinate', () => {
      const coord = new LngLat(-73.5, 40.7);
      expect(coord.lng).toBe(-73.5);
      expect(coord.lat).toBe(40.7);
    });

    it('throws for NaN values', () => {
      expect(() => new LngLat(NaN, 40)).toThrow();
      expect(() => new LngLat(-73, NaN)).toThrow();
    });

    it('throws for invalid latitude', () => {
      expect(() => new LngLat(0, 91)).toThrow();
      expect(() => new LngLat(0, -91)).toThrow();
    });
  });

  describe('wrap', () => {
    it('wraps longitude to (-180, 180)', () => {
      const coord = new LngLat(190, 40);
      const wrapped = coord.wrap();
      expect(wrapped.lng).toBeCloseTo(-170);
      expect(wrapped.lat).toBe(40);
    });
  });

  describe('toArray', () => {
    it('returns [lng, lat] array', () => {
      const coord = new LngLat(-73.5, 40.7);
      expect(coord.toArray()).toEqual([-73.5, 40.7]);
    });
  });

  describe('toString', () => {
    it('returns formatted string', () => {
      const coord = new LngLat(-73.5, 40.7);
      expect(coord.toString()).toBe('LngLat(-73.5, 40.7)');
    });
  });

  describe('distanceTo', () => {
    it('returns 0 for same point', () => {
      const coord = new LngLat(0, 0);
      expect(coord.distanceTo(coord)).toBe(0);
    });

    it('calculates distance between two points', () => {
      // NYC to London is roughly 5,570 km
      const nyc = new LngLat(-74, 40.7);
      const london = new LngLat(-0.1, 51.5);
      const distance = nyc.distanceTo(london);
      expect(distance).toBeGreaterThan(5500000);
      expect(distance).toBeLessThan(5700000);
    });
  });

  describe('toBounds', () => {
    it('creates bounds with radius', () => {
      const coord = new LngLat(0, 0);
      const bounds = coord.toBounds(1000); // 1km radius

      expect(bounds.getSouthWest().lat).toBeLessThan(0);
      expect(bounds.getNorthEast().lat).toBeGreaterThan(0);
    });
  });

  describe('convert', () => {
    it('passes through LngLat instance', () => {
      const coord = new LngLat(-73.5, 40.7);
      expect(LngLat.convert(coord)).toBe(coord);
    });

    it('converts from array', () => {
      const coord = LngLat.convert([-73.5, 40.7]);
      expect(coord.lng).toBe(-73.5);
      expect(coord.lat).toBe(40.7);
    });

    it('converts from object with lng/lat', () => {
      const coord = LngLat.convert({ lng: -73.5, lat: 40.7 });
      expect(coord.lng).toBe(-73.5);
      expect(coord.lat).toBe(40.7);
    });

    it('converts from object with lon/lat', () => {
      const coord = LngLat.convert({ lon: -73.5, lat: 40.7 });
      expect(coord.lng).toBe(-73.5);
      expect(coord.lat).toBe(40.7);
    });
  });
});

describe('LngLatBounds', () => {
  describe('constructor', () => {
    it('creates empty bounds', () => {
      const bounds = new LngLatBounds();
      expect(bounds.isEmpty()).toBe(true);
    });

    it('creates bounds from sw/ne', () => {
      const bounds = new LngLatBounds([-10, -10], [10, 10]);
      expect(bounds.getWest()).toBe(-10);
      expect(bounds.getSouth()).toBe(-10);
      expect(bounds.getEast()).toBe(10);
      expect(bounds.getNorth()).toBe(10);
    });

    it('creates bounds from [west, south, east, north]', () => {
      const bounds = new LngLatBounds([-10, -20, 10, 20]);
      expect(bounds.getWest()).toBe(-10);
      expect(bounds.getSouth()).toBe(-20);
      expect(bounds.getEast()).toBe(10);
      expect(bounds.getNorth()).toBe(20);
    });
  });

  describe('getCenter', () => {
    it('returns center of bounds', () => {
      const bounds = new LngLatBounds([-10, -10], [10, 10]);
      const center = bounds.getCenter();
      expect(center.lng).toBe(0);
      expect(center.lat).toBe(0);
    });
  });

  describe('extend', () => {
    it('extends bounds to include point', () => {
      const bounds = new LngLatBounds([0, 0], [10, 10]);
      bounds.extend(new LngLat(15, 15));

      expect(bounds.getEast()).toBe(15);
      expect(bounds.getNorth()).toBe(15);
    });

    it('extends bounds to include another bounds', () => {
      const bounds = new LngLatBounds([0, 0], [10, 10]);
      bounds.extend(new LngLatBounds([5, 5], [20, 20]));

      expect(bounds.getEast()).toBe(20);
      expect(bounds.getNorth()).toBe(20);
    });
  });

  describe('contains', () => {
    it('returns true for point inside', () => {
      const bounds = new LngLatBounds([-10, -10], [10, 10]);
      expect(bounds.contains([0, 0])).toBe(true);
    });

    it('returns false for point outside', () => {
      const bounds = new LngLatBounds([-10, -10], [10, 10]);
      expect(bounds.contains([20, 20])).toBe(false);
    });
  });

  describe('corner getters', () => {
    it('returns correct corners', () => {
      const bounds = new LngLatBounds([-10, -20], [30, 40]);

      expect(bounds.getSouthWest().lng).toBe(-10);
      expect(bounds.getSouthWest().lat).toBe(-20);

      expect(bounds.getNorthEast().lng).toBe(30);
      expect(bounds.getNorthEast().lat).toBe(40);

      expect(bounds.getNorthWest().lng).toBe(-10);
      expect(bounds.getNorthWest().lat).toBe(40);

      expect(bounds.getSouthEast().lng).toBe(30);
      expect(bounds.getSouthEast().lat).toBe(-20);
    });
  });
});

describe('MercatorCoordinate', () => {
  describe('fromLngLat', () => {
    it('converts origin to (0.5, 0.5)', () => {
      const coord = MercatorCoordinate.fromLngLat(new LngLat(0, 0));
      expect(coord.x).toBeCloseTo(0.5);
      expect(coord.y).toBeCloseTo(0.5);
    });

    it('converts corners correctly', () => {
      const nw = MercatorCoordinate.fromLngLat([-180, 85]);
      expect(nw.x).toBeCloseTo(0);
      expect(nw.y).toBeLessThan(0.1);
    });
  });

  describe('toLngLat', () => {
    it('is inverse of fromLngLat', () => {
      const original = new LngLat(-73.5, 40.7);
      const mercator = MercatorCoordinate.fromLngLat(original);
      const result = mercator.toLngLat();

      expect(result.lng).toBeCloseTo(original.lng);
      expect(result.lat).toBeCloseTo(original.lat);
    });
  });

  describe('meterInMercatorCoordinateUnits', () => {
    it('returns a small positive value', () => {
      const coord = MercatorCoordinate.fromLngLat([0, 0]);
      const meter = coord.meterInMercatorCoordinateUnits();

      expect(meter).toBeGreaterThan(0);
      expect(meter).toBeLessThan(0.001);
    });
  });
});

describe('Tile coordinates', () => {
  describe('lngLatToTile', () => {
    it('converts center to middle tile', () => {
      const tile = lngLatToTile(0, 0, 0);
      expect(tile.z).toBe(0);
      expect(tile.x).toBe(0);
      expect(tile.y).toBe(0);
    });

    it('returns correct tile at zoom 2', () => {
      // At zoom 2, there are 4x4 tiles
      const tile = lngLatToTile(90, 45, 2);
      expect(tile.z).toBe(2);
      expect(tile.x).toBe(3); // Eastern hemisphere
      expect(tile.y).toBe(1); // Northern hemisphere
    });
  });

  describe('tileToLngLat', () => {
    it('returns northwest corner of tile', () => {
      const corner = tileToLngLat(0, 0, 0);
      expect(corner.lng).toBe(-180);
      expect(corner.lat).toBeCloseTo(85.05, 0);
    });

    it('is approximately inverse of lngLatToTile', () => {
      const originalLng = -73.5;
      const originalLat = 40.7;
      const zoom = 10;

      const tile = lngLatToTile(originalLng, originalLat, zoom);
      const corner = tileToLngLat(tile.z, tile.x, tile.y);

      // The corner should be close to but not exactly the original
      expect(Math.abs(corner.lng - originalLng)).toBeLessThan(1);
      expect(Math.abs(corner.lat - originalLat)).toBeLessThan(1);
    });
  });
});
