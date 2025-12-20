/**
 * TsyneMap - Map Implementation
 *
 * A lightweight map class for Tsyne that provides Mapbox-like API
 * for rendering maps to a canvas raster using software rendering.
 */

import {
    TsyneCanvas,
    RenderTarget,
    createRenderTarget,
    clearRenderTarget,
    copyToCanvas,
    Point,
    Color,
    rgba,
    parseColor,
    drawLine,
    drawCircle,
    fillPolygon,
    fillRect,
    renderHeatmap,
    HeatmapPoint,
    HeatmapOptions
} from '../graphics';

import {
    LngLat,
    LngLatLike,
    earthCircumference,
    mercatorXfromLng,
    mercatorYfromLat,
    lngFromMercatorX,
    latFromMercatorY
} from '../geo';

// ============================================================================
// Types
// ============================================================================

export interface TsyneMapOptions {
    canvas: TsyneCanvas;
    width?: number;
    height?: number;
    center?: [number, number];  // [lng, lat]
    zoom?: number;
    bearing?: number;
    pitch?: number;
    accessToken?: string;
    style?: string;
}

export interface TsyneMapState {
    center: { lng: number; lat: number };
    zoom: number;
    bearing: number;
    pitch: number;
}

// ============================================================================
// TsyneMap Class
// ============================================================================

/**
 * A lightweight map implementation for Tsyne that renders to a canvas raster.
 * Provides a Mapbox-like API with Mercator projection support.
 */
export class TsyneMap {
    private canvas: TsyneCanvas;
    private target: RenderTarget;
    private state: TsyneMapState;
    private accessToken: string;
    private styleUrl: string;
    private dirty: boolean = true;

    // Event handlers
    private onMoveListeners: Array<() => void> = [];
    private onZoomListeners: Array<() => void> = [];
    private onLoadListeners: Array<() => void> = [];

    constructor(options: TsyneMapOptions) {
        this.canvas = options.canvas;
        this.target = createRenderTarget(
            options.width || options.canvas.width,
            options.height || options.canvas.height
        );

        this.state = {
            center: {
                lng: options.center?.[0] ?? 0,
                lat: options.center?.[1] ?? 0
            },
            zoom: options.zoom ?? 0,
            bearing: options.bearing ?? 0,
            pitch: options.pitch ?? 0
        };

        this.accessToken = options.accessToken || '';
        this.styleUrl = options.style || '';
    }

    // ========================================================================
    // Map State Getters/Setters
    // ========================================================================

    getCenter(): LngLat {
        return new LngLat(this.state.center.lng, this.state.center.lat);
    }

    setCenter(center: LngLatLike): this {
        const c = LngLat.convert(center);
        this.state.center = { lng: c.lng, lat: c.lat };
        this.dirty = true;
        this.notifyMove();
        return this;
    }

    getZoom(): number {
        return this.state.zoom;
    }

    setZoom(zoom: number): this {
        this.state.zoom = Math.max(0, Math.min(22, zoom));
        this.dirty = true;
        this.notifyZoom();
        return this;
    }

    zoomIn(delta: number = 1): this {
        return this.setZoom(this.state.zoom + delta);
    }

    zoomOut(delta: number = 1): this {
        return this.setZoom(this.state.zoom - delta);
    }

    getBearing(): number {
        return this.state.bearing;
    }

    setBearing(bearing: number): this {
        this.state.bearing = ((bearing % 360) + 360) % 360;
        this.dirty = true;
        return this;
    }

    getPitch(): number {
        return this.state.pitch;
    }

    setPitch(pitch: number): this {
        this.state.pitch = Math.max(0, Math.min(60, pitch));
        this.dirty = true;
        return this;
    }

    getCanvas(): TsyneCanvas {
        return this.canvas;
    }

    // ========================================================================
    // Viewport Properties
    // ========================================================================

    /**
     * Get the world size in pixels at current zoom
     */
    getWorldSize(): number {
        return 512 * Math.pow(2, this.state.zoom);
    }

    /**
     * Get meters per pixel at the current center
     */
    getMetersPerPixel(): number {
        const lat = this.state.center.lat;
        const scale = Math.pow(2, this.state.zoom);
        return earthCircumference * Math.cos(lat * Math.PI / 180) / (512 * scale);
    }

    // ========================================================================
    // Coordinate Projection
    // ========================================================================

    /**
     * Project a LngLat to pixel coordinates
     */
    project(lngLat: LngLatLike): Point {
        const coord = LngLat.convert(lngLat);

        const worldSize = this.getWorldSize();

        // Point in world coordinates
        const x = mercatorXfromLng(coord.lng) * worldSize;
        const y = mercatorYfromLat(coord.lat) * worldSize;

        // Center in world coordinates
        const centerX = mercatorXfromLng(this.state.center.lng) * worldSize;
        const centerY = mercatorYfromLat(this.state.center.lat) * worldSize;

        return new Point(
            this.target.width / 2 + (x - centerX),
            this.target.height / 2 + (y - centerY)
        );
    }

    /**
     * Unproject pixel coordinates to LngLat
     */
    unproject(point: Point | [number, number]): LngLat {
        const px = Array.isArray(point) ? point[0] : point.x;
        const py = Array.isArray(point) ? point[1] : point.y;

        const worldSize = this.getWorldSize();

        // Center in world coordinates
        const centerX = mercatorXfromLng(this.state.center.lng) * worldSize;
        const centerY = mercatorYfromLat(this.state.center.lat) * worldSize;

        // Convert pixel to world coordinates
        const x = centerX + (px - this.target.width / 2);
        const y = centerY + (py - this.target.height / 2);

        return new LngLat(
            lngFromMercatorX(x / worldSize),
            latFromMercatorY(y / worldSize)
        );
    }

    /**
     * Get the geographic bounds of the current viewport
     */
    getBounds(): { sw: LngLat; ne: LngLat } {
        const sw = this.unproject([0, this.target.height]);
        const ne = this.unproject([this.target.width, 0]);
        return { sw, ne };
    }

    // ========================================================================
    // Rendering
    // ========================================================================

    /**
     * Clear the map to a background color
     */
    clear(color: Color = rgba(240, 240, 240, 255)): void {
        clearRenderTarget(this.target, color.r, color.g, color.b, color.a);
    }

    /**
     * Draw a heatmap layer
     */
    drawHeatmap(points: HeatmapPoint[], options: HeatmapOptions): void {
        renderHeatmap(this.target, points, options);
    }

    /**
     * Draw a line between two geographic coordinates
     */
    drawLine(
        start: LngLatLike,
        end: LngLatLike,
        color: Color | string,
        lineWidth: number = 1
    ): void {
        const p1 = this.project(start);
        const p2 = this.project(end);
        const c = typeof color === 'string' ? parseColor(color) : color;
        drawLine(this.target, p1.x, p1.y, p2.x, p2.y, c, lineWidth);
    }

    /**
     * Draw a polyline
     */
    drawPolyline(
        coordinates: LngLatLike[],
        color: Color | string,
        lineWidth: number = 1
    ): void {
        const c = typeof color === 'string' ? parseColor(color) : color;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const p1 = this.project(coordinates[i]);
            const p2 = this.project(coordinates[i + 1]);
            drawLine(this.target, p1.x, p1.y, p2.x, p2.y, c, lineWidth);
        }
    }

    /**
     * Draw a circle at a geographic coordinate
     */
    drawCircle(
        center: LngLatLike,
        radiusPixels: number,
        color: Color | string,
        filled: boolean = true
    ): void {
        const p = this.project(center);
        const c = typeof color === 'string' ? parseColor(color) : color;
        drawCircle(this.target, p.x, p.y, radiusPixels, c, filled);
    }

    /**
     * Draw a marker (simple circle with border)
     */
    drawMarker(
        position: LngLatLike,
        radius: number = 8,
        fillColor: Color | string = '#3FB1CE',
        strokeColor: Color | string = '#FFFFFF',
        strokeWidth: number = 2
    ): void {
        const p = this.project(position);
        const fc = typeof fillColor === 'string' ? parseColor(fillColor) : fillColor;
        const sc = typeof strokeColor === 'string' ? parseColor(strokeColor) : strokeColor;

        // Draw fill
        drawCircle(this.target, p.x, p.y, radius, fc, true);
        // Draw stroke
        if (strokeWidth > 0) {
            drawCircle(this.target, p.x, p.y, radius, sc, false);
        }
    }

    /**
     * Draw a polygon on the map
     */
    drawPolygon(
        coordinates: LngLatLike[],
        fillColor: Color | string,
        strokeColor?: Color | string,
        strokeWidth: number = 1
    ): void {
        const vertices = coordinates.map(coord => {
            const p = this.project(coord);
            return { x: p.x, y: p.y };
        });

        const fc = typeof fillColor === 'string' ? parseColor(fillColor) : fillColor;
        fillPolygon(this.target, vertices, fc);

        if (strokeColor) {
            const sc = typeof strokeColor === 'string' ? parseColor(strokeColor) : strokeColor;
            for (let i = 0; i < vertices.length; i++) {
                const v1 = vertices[i];
                const v2 = vertices[(i + 1) % vertices.length];
                drawLine(this.target, v1.x, v1.y, v2.x, v2.y, sc, strokeWidth);
            }
        }
    }

    /**
     * Draw a rectangle by geographic bounds
     */
    drawRect(
        bounds: { west: number; south: number; east: number; north: number },
        fillColor: Color | string
    ): void {
        const sw = this.project([bounds.west, bounds.south]);
        const ne = this.project([bounds.east, bounds.north]);
        const fc = typeof fillColor === 'string' ? parseColor(fillColor) : fillColor;

        fillRect(
            this.target,
            Math.min(sw.x, ne.x),
            Math.min(sw.y, ne.y),
            Math.abs(ne.x - sw.x),
            Math.abs(ne.y - sw.y),
            fc
        );
    }

    /**
     * Flush the render target to the Tsyne canvas
     */
    async render(): Promise<void> {
        await copyToCanvas(this.target, this.canvas);
        this.dirty = false;
    }

    /**
     * Get the raw render target for advanced operations
     */
    getRenderTarget(): RenderTarget {
        return this.target;
    }

    // ========================================================================
    // Events
    // ========================================================================

    on(type: 'move', listener: () => void): this;
    on(type: 'zoom', listener: () => void): this;
    on(type: 'load', listener: () => void): this;
    on(type: string, listener: () => void): this {
        switch (type) {
            case 'move':
                this.onMoveListeners.push(listener);
                break;
            case 'zoom':
                this.onZoomListeners.push(listener);
                break;
            case 'load':
                this.onLoadListeners.push(listener);
                break;
        }
        return this;
    }

    off(type: 'move', listener: () => void): this;
    off(type: 'zoom', listener: () => void): this;
    off(type: 'load', listener: () => void): this;
    off(type: string, listener: () => void): this {
        switch (type) {
            case 'move':
                this.onMoveListeners = this.onMoveListeners.filter(l => l !== listener);
                break;
            case 'zoom':
                this.onZoomListeners = this.onZoomListeners.filter(l => l !== listener);
                break;
            case 'load':
                this.onLoadListeners = this.onLoadListeners.filter(l => l !== listener);
                break;
        }
        return this;
    }

    private notifyMove(): void {
        for (const listener of this.onMoveListeners) {
            listener();
        }
    }

    private notifyZoom(): void {
        for (const listener of this.onZoomListeners) {
            listener();
        }
        this.notifyMove();
    }

    /**
     * Trigger the load event (call after initial setup)
     */
    triggerLoad(): void {
        for (const listener of this.onLoadListeners) {
            listener();
        }
    }
}
