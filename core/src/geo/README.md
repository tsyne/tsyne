# Tsyne Geographic Module

Geographic coordinate types and Web Mercator projection utilities.

## Classes

### LngLat
A longitude/latitude coordinate pair.

```typescript
const paris = new LngLat(2.3522, 48.8566);
paris.distanceTo(london);  // Distance in meters (Haversine)
paris.toBounds(1000);      // Bounding box with 1km radius
paris.wrap();              // Wrap longitude to (-180, 180)
```

### LngLatBounds
Geographic bounding box defined by southwest and northeast corners.

```typescript
const bounds = new LngLatBounds([-10, -10], [10, 10]);
bounds.contains([5, 5]);   // true
bounds.extend([15, 15]);   // Expand bounds
bounds.getCenter();        // Center LngLat
```

### MercatorCoordinate
Web Mercator projected coordinate (0-1 range).

```typescript
const mercator = MercatorCoordinate.fromLngLat(paris);
mercator.toLngLat();       // Back to LngLat
mercator.meterInMercatorCoordinateUnits();
```

## Projection Functions

```typescript
// Longitude/Latitude to Mercator (0-1 range)
mercatorXfromLng(lng);
mercatorYfromLat(lat);

// Mercator to Longitude/Latitude
lngFromMercatorX(x);
latFromMercatorY(y);

// Scale and distance
getMetersPerPixelAtLatitude(lat, zoom);
mercatorScale(lat);
circumferenceAtLatitude(lat);
```

## Tile Coordinates

```typescript
// Convert lng/lat to tile coordinates
const tile = lngLatToTile(-73.5, 40.7, 12);
// { z: 12, x: 1205, y: 1539 }

// Get tile's northwest corner
const corner = tileToLngLat(12, 1205, 1539);
```

## Math Utilities

```typescript
degToRad(180);        // Math.PI
radToDeg(Math.PI);    // 180
clamp(150, 0, 100);   // 100
wrap(-190, -180, 180); // 170
```

## Constants

```typescript
earthRadius;           // 6371008.8 meters
earthCircumference;    // ~40,030,000 meters
MAX_MERCATOR_LATITUDE; // 85.051129
```

## Tests

```bash
cd core && npx jest src/geo/
```
