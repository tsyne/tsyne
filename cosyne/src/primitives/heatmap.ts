/**
 * Heatmap primitive for Cosyne
 * Renders a color-mapped 2D grid based on data values
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

export interface HeatmapOptions extends PrimitiveOptions {
  cellWidth?: number;
  cellHeight?: number;
  colorScheme?: 'cool' | 'hot' | 'viridis' | 'custom';
  minValue?: number;
  maxValue?: number;
}

export interface HeatmapData {
  rows: number;
  cols: number;
  data: number[]; // Flat array, row-major order
}

/**
 * Heatmap primitive - renders color-mapped data grid
 */
export class CosyneHeatmap extends Primitive<any> {
  private x: number;
  private y: number;
  private cellWidth: number;
  private cellHeight: number;
  private colorScheme: 'cool' | 'hot' | 'viridis' | 'custom';
  private minValue: number = 0;
  private maxValue: number = 1;
  private data: HeatmapData = { rows: 0, cols: 0, data: [] };

  constructor(x: number, y: number, underlying: any, options?: HeatmapOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.cellWidth = options?.cellWidth || 30;
    this.cellHeight = options?.cellHeight || 30;
    this.colorScheme = options?.colorScheme || 'viridis';
    this.minValue = options?.minValue || 0;
    this.maxValue = options?.maxValue || 1;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Set heatmap data
   */
  setData(data: HeatmapData, minValue?: number, maxValue?: number): this {
    this.data = data;
    if (minValue !== undefined) this.minValue = minValue;
    if (maxValue !== undefined) this.maxValue = maxValue;
    this.updateUnderlying();
    return this;
  }

  /**
   * Get normalized value (0-1) for a data point
   */
  getNormalizedValue(value: number): number {
    if (this.maxValue === this.minValue) return 0.5;
    return (value - this.minValue) / (this.maxValue - this.minValue);
  }

  /**
   * Get color for a normalized value (0-1)
   */
  getColor(normalizedValue: number): string {
    const clamped = Math.max(0, Math.min(1, normalizedValue));

    switch (this.colorScheme) {
      case 'cool': // Blue to cyan
        return `rgb(0, ${Math.floor(clamped * 255)}, 255)`;

      case 'hot': // Red to yellow
        const hval = clamped * 255;
        return `rgb(255, ${Math.floor(hval)}, 0)`;

      case 'viridis': // Purple to green to yellow
        if (clamped < 0.33) {
          const t = clamped / 0.33;
          return `rgb(${Math.floor(68 + 31 * t)}, ${Math.floor(1 + 110 * t)}, ${Math.floor(84 - 84 * t)})`;
        } else if (clamped < 0.67) {
          const t = (clamped - 0.33) / 0.34;
          return `rgb(${Math.floor(99 + 87 * t)}, ${Math.floor(111 + 105 * t)}, 0)`;
        } else {
          const t = (clamped - 0.67) / 0.33;
          return `rgb(${Math.floor(186 + 69 * t)}, ${Math.floor(216 - 94 * t)}, ${Math.floor(0 + 46 * t)})`;
        }

      case 'custom':
      default:
        return '#ffffff';
    }
  }

  updatePosition(pos: PositionBinding): void {
    this.x = pos.x;
    this.y = pos.y;
    this.updateUnderlying();
  }

  updateVisibility(visible: boolean): void {
    // Visibility would be handled by canvas stack
  }

  updateFill(color: string): void {
    this.fillColor = color;
    this.applyFill();
  }

  updateStroke(color: string): void {
    this.strokeColor = color;
    this.applyStroke();
  }

  updateAlpha(alpha: number): void {
    this.alpha = alpha;
  }

  updateRotation(): void {
    // Heatmaps don't rotate
  }

  protected applyFill(): void {
    // Heatmap cells are colored by data
  }

  protected applyStroke(): void {
    // Heatmap can have cell borders
  }

  /**
   * Update the underlying widget
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        x: this.x,
        y: this.y,
        cellWidth: this.cellWidth,
        cellHeight: this.cellHeight,
        data: this.data,
        minValue: this.minValue,
        maxValue: this.maxValue,
        colorScheme: this.colorScheme,
      });
    }
  }

  /**
   * Get hit tester for this heatmap (bounding box)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      if (!this.data) return false;
      return DefaultHitTesters.rect(
        x, y,
        this.x, this.y,
        this.x + this.data.cols * this.cellWidth,
        this.y + this.data.rows * this.cellHeight,
        1
      );
    };
  }
}
