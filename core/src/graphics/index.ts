/**
 * Tsyne Graphics Module
 *
 * Software rendering primitives for canvas-based graphics.
 * Provides geometry utilities, render targets, and rasterization.
 */

// Geometry - Point, bounding boxes, polygon math
export * from './geometry';

// Platform - Animation frames, render targets, pixel buffers
export * from './platform';

// Rasterizer - Drawing primitives (lines, circles, heatmaps, etc.)
export * from './rasterizer';

// DOM stubs - For running browser code in Node.js
export * from './dom';
