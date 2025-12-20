/**
 * Tsyne Software Rasterizer
 *
 * Provides software rendering primitives for drawing to a pixel buffer.
 * Includes lines, circles, polygons, heatmaps, and image blitting.
 */

import { RenderTarget, blendPixel, setPixel } from './platform';
import type { Vertex } from './geometry';

// ============================================================================
// Color Types and Utilities
// ============================================================================

export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * Create a color from RGBA values (0-255)
 */
export function rgba(r: number, g: number, b: number, a: number = 255): Color {
    return { r, g, b, a };
}

/**
 * Create a color from RGB values (0-255), fully opaque
 */
export function rgb(r: number, g: number, b: number): Color {
    return { r, g, b, a: 255 };
}

/**
 * Parse a CSS color string to Color
 */
export function parseColor(color: string): Color {
    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            return {
                r: parseInt(hex[0] + hex[0], 16),
                g: parseInt(hex[1] + hex[1], 16),
                b: parseInt(hex[2] + hex[2], 16),
                a: 255
            };
        } else if (hex.length === 6) {
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
                a: 255
            };
        } else if (hex.length === 8) {
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
                a: parseInt(hex.slice(6, 8), 16)
            };
        }
    }

    // Handle rgba()
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1]),
            g: parseInt(rgbaMatch[2]),
            b: parseInt(rgbaMatch[3]),
            a: rgbaMatch[4] ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255
        };
    }

    // Handle named colors (common ones)
    const namedColors: Record<string, Color> = {
        black: { r: 0, g: 0, b: 0, a: 255 },
        white: { r: 255, g: 255, b: 255, a: 255 },
        red: { r: 255, g: 0, b: 0, a: 255 },
        green: { r: 0, g: 128, b: 0, a: 255 },
        blue: { r: 0, g: 0, b: 255, a: 255 },
        yellow: { r: 255, g: 255, b: 0, a: 255 },
        cyan: { r: 0, g: 255, b: 255, a: 255 },
        magenta: { r: 255, g: 0, b: 255, a: 255 },
        orange: { r: 255, g: 165, b: 0, a: 255 },
        transparent: { r: 0, g: 0, b: 0, a: 0 }
    };

    if (color.toLowerCase() in namedColors) {
        return namedColors[color.toLowerCase()];
    }

    // Default: black
    return { r: 0, g: 0, b: 0, a: 255 };
}

/**
 * Convert a Color to hex string (e.g., "#ff8040")
 */
export function colorToHex(color: Color): string {
    const r = color.r.toString(16).padStart(2, '0');
    const g = color.g.toString(16).padStart(2, '0');
    const b = color.b.toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Interpolate between two colors
 * @param c1 Start color
 * @param c2 End color
 * @param t Interpolation factor (0-1)
 */
export function interpolateColor(c1: Color, c2: Color, t: number): Color {
    return {
        r: Math.round(c1.r + (c2.r - c1.r) * t),
        g: Math.round(c1.g + (c2.g - c1.g) * t),
        b: Math.round(c1.b + (c2.b - c1.b) * t),
        a: Math.round(c1.a + (c2.a - c1.a) * t)
    };
}

/**
 * Multiply color alpha
 */
export function withAlpha(color: Color, alpha: number): Color {
    return { ...color, a: Math.round(color.a * alpha) };
}

// ============================================================================
// Line Drawing
// ============================================================================

/**
 * Draw a line with optional anti-aliasing
 */
export function drawLine(
    target: RenderTarget,
    x0: number, y0: number,
    x1: number, y1: number,
    color: Color,
    lineWidth: number = 1
): void {
    if (lineWidth <= 1) {
        drawLineWu(target, x0, y0, x1, y1, color);
    } else {
        drawThickLine(target, x0, y0, x1, y1, color, lineWidth);
    }
}

/**
 * Wu's anti-aliased line algorithm
 */
function drawLineWu(
    target: RenderTarget,
    x0: number, y0: number,
    x1: number, y1: number,
    color: Color
): void {
    const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

    if (steep) {
        [x0, y0] = [y0, x0];
        [x1, y1] = [y1, x1];
    }

    if (x0 > x1) {
        [x0, x1] = [x1, x0];
        [y0, y1] = [y1, y0];
    }

    const dx = x1 - x0;
    const dy = y1 - y0;
    const gradient = dx === 0 ? 1 : dy / dx;

    // First endpoint
    let xend = Math.round(x0);
    let yend = y0 + gradient * (xend - x0);
    let xgap = 1 - ((x0 + 0.5) % 1);
    const xpxl1 = xend;
    const ypxl1 = Math.floor(yend);

    if (steep) {
        blendPixel(target, ypxl1, xpxl1, color.r, color.g, color.b,
            Math.round(color.a * (1 - (yend % 1)) * xgap));
        blendPixel(target, ypxl1 + 1, xpxl1, color.r, color.g, color.b,
            Math.round(color.a * (yend % 1) * xgap));
    } else {
        blendPixel(target, xpxl1, ypxl1, color.r, color.g, color.b,
            Math.round(color.a * (1 - (yend % 1)) * xgap));
        blendPixel(target, xpxl1, ypxl1 + 1, color.r, color.g, color.b,
            Math.round(color.a * (yend % 1) * xgap));
    }

    let intery = yend + gradient;

    // Second endpoint
    xend = Math.round(x1);
    yend = y1 + gradient * (xend - x1);
    xgap = (x1 + 0.5) % 1;
    const xpxl2 = xend;
    const ypxl2 = Math.floor(yend);

    if (steep) {
        blendPixel(target, ypxl2, xpxl2, color.r, color.g, color.b,
            Math.round(color.a * (1 - (yend % 1)) * xgap));
        blendPixel(target, ypxl2 + 1, xpxl2, color.r, color.g, color.b,
            Math.round(color.a * (yend % 1) * xgap));
    } else {
        blendPixel(target, xpxl2, ypxl2, color.r, color.g, color.b,
            Math.round(color.a * (1 - (yend % 1)) * xgap));
        blendPixel(target, xpxl2, ypxl2 + 1, color.r, color.g, color.b,
            Math.round(color.a * (yend % 1) * xgap));
    }

    // Main loop
    for (let x = xpxl1 + 1; x < xpxl2; x++) {
        if (steep) {
            blendPixel(target, Math.floor(intery), x, color.r, color.g, color.b,
                Math.round(color.a * (1 - (intery % 1))));
            blendPixel(target, Math.floor(intery) + 1, x, color.r, color.g, color.b,
                Math.round(color.a * (intery % 1)));
        } else {
            blendPixel(target, x, Math.floor(intery), color.r, color.g, color.b,
                Math.round(color.a * (1 - (intery % 1))));
            blendPixel(target, x, Math.floor(intery) + 1, color.r, color.g, color.b,
                Math.round(color.a * (intery % 1)));
        }
        intery += gradient;
    }
}

/**
 * Draw a thick line by creating a polygon
 */
function drawThickLine(
    target: RenderTarget,
    x0: number, y0: number,
    x1: number, y1: number,
    color: Color,
    width: number
): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    // Normal vector
    const nx = -dy / length;
    const ny = dx / length;
    const halfWidth = width / 2;

    // Create polygon vertices for the thick line
    const vertices: Vertex[] = [
        { x: x0 + nx * halfWidth, y: y0 + ny * halfWidth },
        { x: x0 - nx * halfWidth, y: y0 - ny * halfWidth },
        { x: x1 - nx * halfWidth, y: y1 - ny * halfWidth },
        { x: x1 + nx * halfWidth, y: y1 + ny * halfWidth }
    ];

    fillPolygon(target, vertices, color);
}

// ============================================================================
// Circle Drawing
// ============================================================================

/**
 * Draw a circle (filled or stroked)
 */
export function drawCircle(
    target: RenderTarget,
    cx: number, cy: number,
    radius: number,
    color: Color,
    filled: boolean = true
): void {
    if (filled) {
        fillCircle(target, cx, cy, radius, color);
    } else {
        strokeCircle(target, cx, cy, radius, color);
    }
}

function fillCircle(
    target: RenderTarget,
    cx: number, cy: number,
    radius: number,
    color: Color
): void {
    const r2 = radius * radius;
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(target.height - 1, Math.ceil(cy + radius));
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(target.width - 1, Math.ceil(cx + radius));

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d2 = dx * dx + dy * dy;

            if (d2 <= r2) {
                // Anti-alias at the edge
                const edgeDist = radius - Math.sqrt(d2);
                if (edgeDist < 1) {
                    blendPixel(target, x, y, color.r, color.g, color.b,
                        Math.round(color.a * edgeDist));
                } else {
                    blendPixel(target, x, y, color.r, color.g, color.b, color.a);
                }
            }
        }
    }
}

function strokeCircle(
    target: RenderTarget,
    cx: number, cy: number,
    radius: number,
    color: Color
): void {
    let x = 0;
    let y = Math.round(radius);
    let d = 3 - 2 * radius;

    const plot = (px: number, py: number) => {
        blendPixel(target, Math.round(cx + px), Math.round(cy + py), color.r, color.g, color.b, color.a);
    };

    while (y >= x) {
        plot(x, y); plot(-x, y); plot(x, -y); plot(-x, -y);
        plot(y, x); plot(-y, x); plot(y, -x); plot(-y, -x);

        x++;
        if (d > 0) {
            y--;
            d = d + 4 * (x - y) + 10;
        } else {
            d = d + 4 * x + 6;
        }
    }
}

// ============================================================================
// Polygon Drawing
// ============================================================================

/**
 * Fill a polygon using scanline algorithm
 */
export function fillPolygon(
    target: RenderTarget,
    vertices: Vertex[],
    color: Color
): void {
    if (vertices.length < 3) return;

    // Find bounds
    let minY = Infinity, maxY = -Infinity;
    for (const v of vertices) {
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
    }

    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(target.height - 1, Math.ceil(maxY));

    // Scanline fill
    for (let y = minY; y <= maxY; y++) {
        const intersections: number[] = [];

        // Find all intersections with edges
        for (let i = 0; i < vertices.length; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % vertices.length];

            if ((v1.y <= y && v2.y > y) || (v2.y <= y && v1.y > y)) {
                const x = v1.x + (y - v1.y) / (v2.y - v1.y) * (v2.x - v1.x);
                intersections.push(x);
            }
        }

        intersections.sort((a, b) => a - b);

        // Fill between pairs
        for (let i = 0; i < intersections.length - 1; i += 2) {
            const x1 = Math.max(0, Math.floor(intersections[i]));
            const x2 = Math.min(target.width - 1, Math.ceil(intersections[i + 1]));

            for (let x = x1; x <= x2; x++) {
                blendPixel(target, x, y, color.r, color.g, color.b, color.a);
            }
        }
    }
}

/**
 * Stroke a polygon outline
 */
export function strokePolygon(
    target: RenderTarget,
    vertices: Vertex[],
    color: Color,
    lineWidth: number = 1
): void {
    for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];
        drawLine(target, v1.x, v1.y, v2.x, v2.y, color, lineWidth);
    }
}

// ============================================================================
// Rectangle Drawing
// ============================================================================

/**
 * Fill a rectangle
 */
export function fillRect(
    target: RenderTarget,
    x: number, y: number,
    width: number, height: number,
    color: Color
): void {
    const x1 = Math.max(0, Math.floor(x));
    const y1 = Math.max(0, Math.floor(y));
    const x2 = Math.min(target.width, Math.ceil(x + width));
    const y2 = Math.min(target.height, Math.ceil(y + height));

    for (let py = y1; py < y2; py++) {
        for (let px = x1; px < x2; px++) {
            blendPixel(target, px, py, color.r, color.g, color.b, color.a);
        }
    }
}

/**
 * Stroke a rectangle outline
 */
export function strokeRect(
    target: RenderTarget,
    x: number, y: number,
    width: number, height: number,
    color: Color,
    lineWidth: number = 1
): void {
    const vertices: Vertex[] = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
    ];
    strokePolygon(target, vertices, color, lineWidth);
}

// ============================================================================
// Heatmap Rendering
// ============================================================================

export interface HeatmapPoint {
    x: number;
    y: number;
    weight: number;
}

export interface HeatmapOptions {
    radius: number;
    radiusY?: number;  // Optional separate Y radius for elliptical shapes
    intensity: number;
    colorStops: Array<{ stop: number; color: Color }>;
}

/**
 * Render a heatmap to the target
 * Supports elliptical radii via radiusY option (for aspect ratio correction)
 */
export function renderHeatmap(
    target: RenderTarget,
    points: HeatmapPoint[],
    options: HeatmapOptions
): void {
    const { radius, intensity, colorStops } = options;
    const radiusX = radius;
    const radiusY = options.radiusY ?? radius;
    const maxRadius = Math.max(radiusX, radiusY);

    // Create intensity buffer
    const intensityBuffer = new Float32Array(target.width * target.height);

    // Accumulate intensity from each point
    for (const point of points) {
        const px = Math.round(point.x);
        const py = Math.round(point.y);

        const minDy = Math.max(-radiusY, -py);
        const maxDy = Math.min(radiusY, target.height - 1 - py);
        const minDx = Math.max(-radiusX, -px);
        const maxDx = Math.min(radiusX, target.width - 1 - px);

        for (let dy = minDy; dy <= maxDy; dy++) {
            for (let dx = minDx; dx <= maxDx; dx++) {
                // Normalized distance for ellipse (1.0 at edge)
                const normalizedDist = Math.sqrt(
                    (dx * dx) / (radiusX * radiusX) +
                    (dy * dy) / (radiusY * radiusY)
                );
                if (normalizedDist > 1) continue;

                // Gaussian falloff based on normalized distance
                const sigma = 1 / 3;  // Normalized sigma
                const falloff = Math.exp(-(normalizedDist * normalizedDist) / (2 * sigma * sigma));
                const idx = (py + dy) * target.width + (px + dx);
                intensityBuffer[idx] += point.weight * falloff * intensity;
            }
        }
    }

    // Convert intensity to color
    for (let i = 0; i < intensityBuffer.length; i++) {
        const value = Math.min(1, intensityBuffer[i]);
        if (value > 0.01) {
            const color = getHeatmapColor(value, colorStops);
            const x = i % target.width;
            const y = Math.floor(i / target.width);
            blendPixel(target, x, y, color.r, color.g, color.b, color.a);
        }
    }
}

function getHeatmapColor(
    value: number,
    colorStops: Array<{ stop: number; color: Color }>
): Color {
    // Find the two stops to interpolate between
    let lower = colorStops[0];
    let upper = colorStops[colorStops.length - 1];

    for (let i = 0; i < colorStops.length - 1; i++) {
        if (value >= colorStops[i].stop && value <= colorStops[i + 1].stop) {
            lower = colorStops[i];
            upper = colorStops[i + 1];
            break;
        }
    }

    const range = upper.stop - lower.stop;
    const t = range === 0 ? 0 : (value - lower.stop) / range;

    return interpolateColor(lower.color, upper.color, t);
}

// ============================================================================
// Image/Sprite Drawing
// ============================================================================

/**
 * Draw an image (pixel buffer) to the target
 */
export function drawImage(
    target: RenderTarget,
    image: { width: number; height: number; data: Uint8Array | Uint8ClampedArray },
    dx: number, dy: number,
    dw?: number, dh?: number
): void {
    const destWidth = dw ?? image.width;
    const destHeight = dh ?? image.height;
    const scaleX = image.width / destWidth;
    const scaleY = image.height / destHeight;

    for (let y = 0; y < destHeight; y++) {
        const destY = Math.round(dy + y);
        if (destY < 0 || destY >= target.height) continue;

        for (let x = 0; x < destWidth; x++) {
            const destX = Math.round(dx + x);
            if (destX < 0 || destX >= target.width) continue;

            // Sample from source
            const srcX = Math.floor(x * scaleX);
            const srcY = Math.floor(y * scaleY);
            const srcIdx = (srcY * image.width + srcX) * 4;

            const r = image.data[srcIdx];
            const g = image.data[srcIdx + 1];
            const b = image.data[srcIdx + 2];
            const a = image.data[srcIdx + 3];

            if (a > 0) {
                blendPixel(target, destX, destY, r, g, b, a);
            }
        }
    }
}

// ============================================================================
// Text Rendering (basic bitmap font)
// ============================================================================

// Simple 5x7 bitmap font for basic text rendering
const FONT_WIDTH = 5;
const FONT_HEIGHT = 7;

// Basic character bitmaps (simplified - just for demo)
const CHAR_BITMAPS: Record<string, number[]> = {
    '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
    '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    '2': [0x0E, 0x11, 0x01, 0x0E, 0x10, 0x10, 0x1F],
    '3': [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E],
    '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
    '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    '6': [0x0E, 0x10, 0x1E, 0x11, 0x11, 0x11, 0x0E],
    '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
    '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E],
    ':': [0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00],
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
};

/**
 * Draw text using a simple bitmap font
 */
export function drawText(
    target: RenderTarget,
    text: string,
    x: number, y: number,
    color: Color,
    scale: number = 1
): void {
    let cursorX = x;

    for (const char of text) {
        const bitmap = CHAR_BITMAPS[char];
        if (bitmap) {
            for (let row = 0; row < FONT_HEIGHT; row++) {
                for (let col = 0; col < FONT_WIDTH; col++) {
                    if (bitmap[row] & (1 << (4 - col))) {
                        for (let sy = 0; sy < scale; sy++) {
                            for (let sx = 0; sx < scale; sx++) {
                                blendPixel(
                                    target,
                                    cursorX + col * scale + sx,
                                    y + row * scale + sy,
                                    color.r, color.g, color.b, color.a
                                );
                            }
                        }
                    }
                }
            }
        }
        cursorX += (FONT_WIDTH + 1) * scale;
    }
}
