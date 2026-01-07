/**
 * Grid primitive for Cosyne
 * Renders a grid/table with rows and columns
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

export interface GridOptions extends PrimitiveOptions {
  rows?: number;
  cols?: number;
  cellWidth?: number;
  cellHeight?: number;
  gridColor?: string;
  gridWidth?: number;
}

/**
 * Grid primitive - renders a grid/table structure
 */
export class CosyneGrid extends Primitive<any> {
  private x: number;
  private y: number;
  private rows: number;
  private cols: number;
  private cellWidth: number;
  private cellHeight: number;
  private gridColor: string = '#cccccc';
  private gridWidth: number = 1;

  constructor(x: number, y: number, underlying: any, options?: GridOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.rows = options?.rows || 5;
    this.cols = options?.cols || 5;
    this.cellWidth = options?.cellWidth || 40;
    this.cellHeight = options?.cellHeight || 30;
    this.gridColor = options?.gridColor || '#cccccc';
    this.gridWidth = options?.gridWidth || 1;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Get grid dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.cols * this.cellWidth,
      height: this.rows * this.cellHeight,
    };
  }

  /**
   * Set grid size
   */
  setGridSize(rows: number, cols: number): this {
    this.rows = rows;
    this.cols = cols;
    this.updateUnderlying();
    return this;
  }

  /**
   * Set cell size
   */
  setCellSize(width: number, height: number): this {
    this.cellWidth = width;
    this.cellHeight = height;
    this.updateUnderlying();
    return this;
  }

  /**
   * Set grid line color
   */
  setGridColor(color: string): this {
    this.gridColor = color;
    this.updateUnderlying();
    return this;
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
    // Grids don't rotate
  }

  protected applyFill(): void {
    // Grid cells are drawn with grid lines
  }

  protected applyStroke(): void {
    // Grid lines are stroked
  }

  /**
   * Update the underlying widget
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        x: this.x,
        y: this.y,
        rows: this.rows,
        cols: this.cols,
        cellWidth: this.cellWidth,
        cellHeight: this.cellHeight,
        gridColor: this.gridColor,
        gridWidth: this.gridWidth,
      });
    }
  }

  /**
   * Get hit tester for this grid (bounding box)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      return DefaultHitTesters.rect(
        x, y,
        this.x, this.y,
        this.x + this.cols * this.cellWidth,
        this.y + this.rows * this.cellHeight,
        this.gridWidth || 1
      );
    };
  }
}
