/**
 * Zoom/Pan: D3-style interactive transforms
 */

export interface ZoomPanState {
  translateX: number;
  translateY: number;
  scale: number;
}

export interface ZoomPanOptions {
  minScale?: number;
  maxScale?: number;
  scaleSpeed?: number;  // Multiplier for scroll wheel
  enablePan?: boolean;
  enableZoom?: boolean;
}

/**
 * Zoom/Pan handler for managing interactive transforms
 */
export class ZoomPan {
  private state: ZoomPanState = { translateX: 0, translateY: 0, scale: 1 };
  private minScale: number = 0.1;
  private maxScale: number = 10;
  private scaleSpeed: number = 0.1;
  private enablePan: boolean = true;
  private enableZoom: boolean = true;

  // Internal state for panning
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartTranslateX: number = 0;
  private panStartTranslateY: number = 0;

  // Listeners
  private listeners: Array<(state: ZoomPanState) => void> = [];

  constructor(options: ZoomPanOptions = {}) {
    this.minScale = options.minScale ?? 0.1;
    this.maxScale = options.maxScale ?? 10;
    this.scaleSpeed = options.scaleSpeed ?? 0.1;
    this.enablePan = options.enablePan ?? true;
    this.enableZoom = options.enableZoom ?? true;
  }

  getState(): ZoomPanState {
    return { ...this.state };
  }

  setState(state: Partial<ZoomPanState>): this {
    this.state = { ...this.state, ...state };
    this.notifyListeners();
    return this;
  }

  translate(dx: number, dy: number): this {
    if (!this.enablePan) return this;
    this.state.translateX += dx;
    this.state.translateY += dy;
    this.notifyListeners();
    return this;
  }

  zoom(scaleFactor: number, centerX?: number, centerY?: number): this {
    if (!this.enableZoom) return this;

    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.state.scale * scaleFactor));
    const scaleDelta = newScale / this.state.scale;

    // If center point provided, maintain its position during zoom
    if (centerX !== undefined && centerY !== undefined) {
      this.state.translateX = centerX - (centerX - this.state.translateX) * scaleDelta;
      this.state.translateY = centerY - (centerY - this.state.translateY) * scaleDelta;
    }

    this.state.scale = newScale;
    this.notifyListeners();
    return this;
  }

  handleMouseDown(x: number, y: number): void {
    if (!this.enablePan) return;
    this.isPanning = true;
    this.panStartX = x;
    this.panStartY = y;
    this.panStartTranslateX = this.state.translateX;
    this.panStartTranslateY = this.state.translateY;
  }

  handleMouseMove(x: number, y: number): void {
    if (!this.isPanning || !this.enablePan) return;
    const dx = x - this.panStartX;
    const dy = y - this.panStartY;
    this.state.translateX = this.panStartTranslateX + dx;
    this.state.translateY = this.panStartTranslateY + dy;
    this.notifyListeners();
  }

  handleMouseUp(): void {
    this.isPanning = false;
  }

  handleWheel(deltaY: number, centerX?: number, centerY?: number): void {
    if (!this.enableZoom) return;
    // Negative deltaY = scroll up = zoom in
    const scaleFactor = 1 - (deltaY > 0 ? 1 : -1) * this.scaleSpeed;
    this.zoom(scaleFactor, centerX, centerY);
  }

  reset(): this {
    this.state = { translateX: 0, translateY: 0, scale: 1 };
    this.notifyListeners();
    return this;
  }

  fitBounds(minX: number, minY: number, maxX: number, maxY: number, padding: number = 0): this {
    const width = maxX - minX;
    const height = maxY - minY;

    // Calculate scale to fit bounds
    const scaleX = (100 - padding * 2) / width;  // Assuming 100-unit canvas
    const scaleY = (100 - padding * 2) / height;
    const newScale = Math.min(scaleX, scaleY);

    this.state.scale = newScale;
    this.state.translateX = -minX * newScale + padding;
    this.state.translateY = -minY * newScale + padding;

    this.notifyListeners();
    return this;
  }

  subscribe(listener: (state: ZoomPanState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.getState()));
  }

  /**
   * Get transform matrix as CSS/SVG transform string
   */
  getTransformString(): string {
    return `translate(${this.state.translateX}, ${this.state.translateY}) scale(${this.state.scale})`;
  }

  /**
   * Get transform matrix as array [a, b, c, d, e, f]
   */
  getTransformMatrix(): [number, number, number, number, number, number] {
    return [
      this.state.scale,
      0,
      0,
      this.state.scale,
      this.state.translateX,
      this.state.translateY,
    ];
  }
}

/**
 * Brush: D3-style interactive selection area
 */
export interface BrushExtent {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BrushOptions {
  dimension?: 'x' | 'y' | 'xy';
  strokeColor?: string;
  fillColor?: string;
  fillAlpha?: number;
}

export class Brush {
  private extent: BrushExtent | null = null;
  private dimension: 'x' | 'y' | 'xy' = 'xy';
  private strokeColor: string = '#1f77b4';
  private fillColor: string = '#1f77b4';
  private fillAlpha: number = 0.1;

  // Internal state
  private isActive: boolean = false;
  private startX: number = 0;
  private startY: number = 0;

  // Listeners
  private listeners: Array<(extent: BrushExtent | null) => void> = [];
  private moveListeners: Array<(extent: BrushExtent) => void> = [];

  constructor(options: BrushOptions = {}) {
    this.dimension = options.dimension ?? 'xy';
    this.strokeColor = options.strokeColor ?? '#1f77b4';
    this.fillColor = options.fillColor ?? '#1f77b4';
    this.fillAlpha = options.fillAlpha ?? 0.1;
  }

  getExtent(): BrushExtent | null {
    return this.extent ? { ...this.extent } : null;
  }

  handleMouseDown(x: number, y: number): void {
    this.isActive = true;
    this.startX = x;
    this.startY = y;
    this.extent = { x0: x, y0: y, x1: x, y1: y };
  }

  handleMouseMove(x: number, y: number): void {
    if (!this.isActive || !this.extent) return;

    switch (this.dimension) {
      case 'x':
        this.extent.x0 = Math.min(this.startX, x);
        this.extent.x1 = Math.max(this.startX, x);
        this.extent.y0 = this.startY;
        this.extent.y1 = this.startY + 100;  // Arbitrary height
        break;
      case 'y':
        this.extent.x0 = this.startX;
        this.extent.x1 = this.startX + 100;  // Arbitrary width
        this.extent.y0 = Math.min(this.startY, y);
        this.extent.y1 = Math.max(this.startY, y);
        break;
      case 'xy':
      default:
        this.extent.x0 = Math.min(this.startX, x);
        this.extent.x1 = Math.max(this.startX, x);
        this.extent.y0 = Math.min(this.startY, y);
        this.extent.y1 = Math.max(this.startY, y);
    }

    this.moveListeners.forEach((l) => l(this.extent!));
  }

  handleMouseUp(): void {
    this.isActive = false;
    this.listeners.forEach((l) => l(this.extent));
  }

  clear(): this {
    this.extent = null;
    this.isActive = false;
    this.listeners.forEach((l) => l(null));
    return this;
  }

  subscribe(listener: (extent: BrushExtent | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  onMove(listener: (extent: BrushExtent) => void): () => void {
    this.moveListeners.push(listener);
    return () => {
      this.moveListeners = this.moveListeners.filter((l) => l !== listener);
    };
  }

  setDimension(dimension: 'x' | 'y' | 'xy'): this {
    this.dimension = dimension;
    return this;
  }

  getStrokeColor(): string {
    return this.strokeColor;
  }

  getFillColor(): string {
    return this.fillColor;
  }

  getFillAlpha(): number {
    return this.fillAlpha;
  }
}
