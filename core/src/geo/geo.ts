/**
 * Tsyne Geographic Utilities
 *
 * Geographic coordinate types and Web Mercator projection utilities.
 * Includes LngLat, LngLatBounds, MercatorCoordinate, and tile math.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Approximate radius of the earth in meters (WGS-84 average).
 */
export const earthRadius = 6371008.8;

/**
 * The average circumference of the earth in meters.
 */
export const earthCircumference = 2 * Math.PI * earthRadius;

/**
 * Maximum latitude for Web Mercator projection.
 */
export const MAX_MERCATOR_LATITUDE = 85.051129;

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Convert degrees to radians.
 */
export function degToRad(degrees: number): number {
    return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees.
 */
export function radToDeg(radians: number): number {
    return radians * 180 / Math.PI;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}

/**
 * Wrap a number to a range.
 */
export function wrap(n: number, min: number, max: number): number {
    const d = max - min;
    const w = ((((n - min) % d) + d) % d) + min;
    return w;
}

// ============================================================================
// Mercator Projection
// ============================================================================

/**
 * Convert longitude to Mercator X (0-1 range).
 */
export function mercatorXfromLng(lng: number): number {
    return (180 + lng) / 360;
}

/**
 * Convert latitude to Mercator Y (0-1 range).
 */
export function mercatorYfromLat(lat: number): number {
    return (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)))) / 360;
}

/**
 * Convert Mercator X to longitude.
 */
export function lngFromMercatorX(x: number): number {
    return x * 360 - 180;
}

/**
 * Convert Mercator Y to latitude.
 */
export function latFromMercatorY(y: number): number {
    const y2 = 180 - y * 360;
    return 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90;
}

/**
 * Convert altitude to Mercator Z.
 */
export function mercatorZfromAltitude(altitude: number, lat: number): number {
    return altitude / circumferenceAtLatitude(lat);
}

/**
 * Convert Mercator Z to altitude.
 */
export function altitudeFromMercatorZ(z: number, y: number): number {
    return z * circumferenceAtLatitude(latFromMercatorY(y));
}

/**
 * The circumference at a line of latitude in meters.
 */
export function circumferenceAtLatitude(latitude: number): number {
    return earthCircumference * Math.cos(latitude * Math.PI / 180);
}

/**
 * Get the latitude scale factor (for Mercator distortion).
 */
export function getLatitudeScale(lat: number): number {
    return Math.cos(degToRad(clamp(lat, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE)));
}

/**
 * Get meters per pixel at a given latitude and zoom level.
 */
export function getMetersPerPixelAtLatitude(lat: number, zoom: number): number {
    const constrainedZoom = clamp(zoom, 0, 25.5);
    const constrainedScale = Math.pow(2.0, constrainedZoom);
    return getLatitudeScale(lat) * earthCircumference / (constrainedScale * 512.0);
}

/**
 * Mercator scale factor at a given latitude.
 * At the equator the scale factor is 1, increasing at higher latitudes.
 */
export function mercatorScale(lat: number): number {
    return 1 / Math.cos(lat * Math.PI / 180);
}

// ============================================================================
// LngLat Class
// ============================================================================

/**
 * A longitude/latitude coordinate pair.
 */
export class LngLat {
    lng: number;
    lat: number;

    constructor(lng: number, lat: number) {
        if (isNaN(lng) || isNaN(lat)) {
            throw new Error(`Invalid LngLat object: (${lng}, ${lat})`);
        }
        this.lng = +lng;
        this.lat = +lat;
        if (this.lat > 90 || this.lat < -90) {
            throw new Error('Invalid LngLat latitude value: must be between -90 and 90');
        }
    }

    /**
     * Returns a new LngLat with longitude wrapped to (-180, 180).
     */
    wrap(): LngLat {
        return new LngLat(wrap(this.lng, -180, 180), this.lat);
    }

    /**
     * Returns [lng, lat] array.
     */
    toArray(): [number, number] {
        return [this.lng, this.lat];
    }

    /**
     * Returns "LngLat(lng, lat)" string.
     */
    toString(): string {
        return `LngLat(${this.lng}, ${this.lat})`;
    }

    /**
     * Calculate distance to another point in meters (Haversine formula).
     */
    distanceTo(other: LngLat): number {
        const rad = Math.PI / 180;
        const lat1 = this.lat * rad;
        const lat2 = other.lat * rad;
        const a = Math.sin(lat1) * Math.sin(lat2) +
                  Math.cos(lat1) * Math.cos(lat2) * Math.cos((other.lng - this.lng) * rad);
        return earthRadius * Math.acos(Math.min(a, 1));
    }

    /**
     * Returns a bounding box extended by a given radius in meters.
     */
    toBounds(radius: number = 0): LngLatBounds {
        const latAccuracy = 360 * radius / earthCircumference;
        const lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * this.lat);

        return new LngLatBounds(
            new LngLat(this.lng - lngAccuracy, this.lat - latAccuracy),
            new LngLat(this.lng + lngAccuracy, this.lat + latAccuracy)
        );
    }

    /**
     * Convert to Mercator coordinate.
     */
    toMercator(): MercatorCoordinate {
        return MercatorCoordinate.fromLngLat(this);
    }

    /**
     * Convert various input formats to LngLat.
     */
    static convert(input: LngLatLike): LngLat {
        if (input instanceof LngLat) {
            return input;
        }
        if (Array.isArray(input) && (input.length === 2 || input.length === 3)) {
            return new LngLat(Number(input[0]), Number(input[1]));
        }
        if (!Array.isArray(input) && typeof input === 'object' && input !== null) {
            return new LngLat(
                Number('lng' in input ? input.lng : (input as {lon: number}).lon),
                Number(input.lat)
            );
        }
        throw new Error(
            "`LngLatLike` argument must be specified as a LngLat instance, " +
            "an object {lng: <lng>, lat: <lat>}, an object {lon: <lng>, lat: <lat>}, " +
            "or an array of [<lng>, <lat>]"
        );
    }
}

/**
 * LngLat-like input types.
 */
export type LngLatLike =
    | LngLat
    | { lng: number; lat: number }
    | { lon: number; lat: number }
    | [number, number];

// ============================================================================
// LngLatBounds Class
// ============================================================================

/**
 * A geographical bounding box defined by southwest and northeast corners.
 */
export class LngLatBounds {
    _sw!: LngLat;
    _ne!: LngLat;

    constructor(sw?: LngLatLike | [LngLatLike, LngLatLike] | [number, number, number, number], ne?: LngLatLike) {
        if (!sw) {
            // Empty bounds - properties remain uninitialized
        } else if (ne) {
            this.setSouthWest(sw as LngLatLike).setNorthEast(ne);
        } else if (Array.isArray(sw)) {
            if (sw.length === 4 && typeof sw[0] === 'number') {
                // [west, south, east, north]
                const arr = sw as [number, number, number, number];
                this.setSouthWest([arr[0], arr[1]]).setNorthEast([arr[2], arr[3]]);
            } else if (sw.length === 2) {
                // [[sw], [ne]]
                const arr = sw as [LngLatLike, LngLatLike];
                this.setSouthWest(arr[0]).setNorthEast(arr[1]);
            }
        }
    }

    setNorthEast(ne: LngLatLike): this {
        this._ne = LngLat.convert(ne);
        return this;
    }

    setSouthWest(sw: LngLatLike): this {
        this._sw = LngLat.convert(sw);
        return this;
    }

    extend(obj: LngLatLike | LngLatBoundsLike): this {
        const sw = this._sw;
        const ne = this._ne;
        let sw2: LngLat | undefined;
        let ne2: LngLat | undefined;

        if (obj instanceof LngLat) {
            sw2 = obj;
            ne2 = obj;
        } else if (obj instanceof LngLatBounds) {
            sw2 = obj._sw;
            ne2 = obj._ne;
            if (!sw2 || !ne2) return this;
        } else if (Array.isArray(obj)) {
            if (obj.length === 4 || (obj.length === 2 && Array.isArray(obj[0]))) {
                return this.extend(LngLatBounds.convert(obj as LngLatBoundsLike));
            } else {
                return this.extend(LngLat.convert(obj as LngLatLike));
            }
        } else if (typeof obj === 'object' && obj !== null) {
            return this.extend(LngLat.convert(obj as LngLatLike));
        } else {
            return this;
        }

        if (!sw && !ne) {
            this._sw = new LngLat(sw2.lng, sw2.lat);
            this._ne = new LngLat(ne2.lng, ne2.lat);
        } else {
            sw.lng = Math.min(sw2.lng, sw.lng);
            sw.lat = Math.min(sw2.lat, sw.lat);
            ne.lng = Math.max(ne2.lng, ne.lng);
            ne.lat = Math.max(ne2.lat, ne.lat);
        }

        return this;
    }

    getCenter(): LngLat {
        return new LngLat((this._sw.lng + this._ne.lng) / 2, (this._sw.lat + this._ne.lat) / 2);
    }

    getSouthWest(): LngLat { return this._sw; }
    getNorthEast(): LngLat { return this._ne; }
    getNorthWest(): LngLat { return new LngLat(this.getWest(), this.getNorth()); }
    getSouthEast(): LngLat { return new LngLat(this.getEast(), this.getSouth()); }

    getWest(): number { return this._sw.lng; }
    getSouth(): number { return this._sw.lat; }
    getEast(): number { return this._ne.lng; }
    getNorth(): number { return this._ne.lat; }

    toArray(): [[number, number], [number, number]] {
        return [this._sw.toArray(), this._ne.toArray()];
    }

    toString(): string {
        return `LngLatBounds(${this._sw.toString()}, ${this._ne.toString()})`;
    }

    isEmpty(): boolean {
        return !(this._sw && this._ne);
    }

    contains(lnglat: LngLatLike): boolean {
        const { lng, lat } = LngLat.convert(lnglat);
        const containsLatitude = this._sw.lat <= lat && lat <= this._ne.lat;
        let containsLongitude = this._sw.lng <= lng && lng <= this._ne.lng;
        if (this._sw.lng > this._ne.lng) {
            containsLongitude = this._sw.lng >= lng && lng >= this._ne.lng;
        }
        return containsLatitude && containsLongitude;
    }

    static convert(input: LngLatBoundsLike): LngLatBounds {
        if (input instanceof LngLatBounds) return input;
        return new LngLatBounds(input as any);
    }
}

/**
 * LngLatBounds-like input types.
 */
export type LngLatBoundsLike =
    | LngLatBounds
    | [LngLatLike, LngLatLike]
    | [number, number, number, number];

// ============================================================================
// MercatorCoordinate Class
// ============================================================================

/**
 * A projected coordinate in Web Mercator (0-1 range).
 * MercatorCoordinate(0, 0, 0) is the northwest corner,
 * MercatorCoordinate(1, 1, 0) is the southeast corner.
 */
export class MercatorCoordinate {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number = 0) {
        this.x = +x;
        this.y = +y;
        this.z = +z;
    }

    /**
     * Project a LngLat to MercatorCoordinate.
     */
    static fromLngLat(lngLatLike: LngLatLike, altitude: number = 0): MercatorCoordinate {
        const lngLat = LngLat.convert(lngLatLike);
        return new MercatorCoordinate(
            mercatorXfromLng(lngLat.lng),
            mercatorYfromLat(lngLat.lat),
            mercatorZfromAltitude(altitude, lngLat.lat)
        );
    }

    /**
     * Convert to LngLat.
     */
    toLngLat(): LngLat {
        return new LngLat(
            lngFromMercatorX(this.x),
            latFromMercatorY(this.y)
        );
    }

    /**
     * Get altitude in meters.
     */
    toAltitude(): number {
        return altitudeFromMercatorZ(this.z, this.y);
    }

    /**
     * Distance of 1 meter in MercatorCoordinate units at this latitude.
     */
    meterInMercatorCoordinateUnits(): number {
        return 1 / earthCircumference * mercatorScale(latFromMercatorY(this.y));
    }
}

// ============================================================================
// Tile Coordinates
// ============================================================================

/**
 * Convert lng/lat to tile coordinates at a zoom level.
 */
export function lngLatToTile(lng: number, lat: number, zoom: number): { z: number; x: number; y: number } {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
    return { z: zoom, x, y };
}

/**
 * Convert tile coordinates to lng/lat (northwest corner).
 */
export function tileToLngLat(z: number, x: number, y: number): { lng: number; lat: number } {
    const n = Math.pow(2, z);
    const lng = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;
    return { lng, lat };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
    // Constants
    earthRadius,
    earthCircumference,
    MAX_MERCATOR_LATITUDE,

    // Math utilities
    degToRad,
    radToDeg,
    clamp,
    wrap,

    // Mercator projection
    mercatorXfromLng,
    mercatorYfromLat,
    lngFromMercatorX,
    latFromMercatorY,
    mercatorZfromAltitude,
    altitudeFromMercatorZ,
    circumferenceAtLatitude,
    getLatitudeScale,
    getMetersPerPixelAtLatitude,
    mercatorScale,

    // Classes
    LngLat,
    LngLatBounds,
    MercatorCoordinate,

    // Tile coordinates
    lngLatToTile,
    tileToLngLat
};
