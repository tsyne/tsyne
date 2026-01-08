/**
 * Foreign objects - embed Tsyne widgets in Cosyne canvas
 */

import { PositionBinding } from './binding';

export interface ForeignOptions {
  id?: string;
  width?: number;
  height?: number;
}

/**
 * Foreign object - embeds a Tsyne widget at canvas coordinates
 */
export class ForeignObject {
  private id?: string;
  private x: number = 0;
  private y: number = 0;
  private width: number;
  private height: number;
  private positionBinding: (() => PositionBinding) | undefined;
  private visible: boolean = true;

  constructor(
    x: number,
    y: number,
    private builder: (app: any) => void,
    private app: any,
    options?: ForeignOptions
  ) {
    this.x = x;
    this.y = y;
    this.width = options?.width || 100;
    this.height = options?.height || 100;
    this.id = options?.id;
  }

  /**
   * Set custom ID
   */
  withId(id: string): this {
    this.id = id;
    return this;
  }

  /**
   * Get ID
   */
  getId(): string | undefined {
    return this.id;
  }

  /**
   * Get position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Update position from binding
   */
  updatePosition(pos: PositionBinding): void {
    this.x = pos.x;
    this.y = pos.y;
  }

  /**
   * Bind position to a function
   */
  bindPosition(fn: () => PositionBinding): this {
    this.positionBinding = fn;
    return this;
  }

  /**
   * Get position binding if set
   */
  getPositionBinding(): (() => PositionBinding) | undefined {
    return this.positionBinding;
  }

  /**
   * Show/hide foreign object
   */
  setVisible(visible: boolean): this {
    this.visible = visible;
    return this;
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Get dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Set dimensions
   */
  setDimensions(width: number, height: number): this {
    this.width = width;
    this.height = height;
    return this;
  }

  /**
   * Get the builder function for this foreign object
   */
  getBuilder(): (app: any) => void {
    return this.builder;
  }

  /**
   * Get the app reference
   */
  getApp(): any {
    return this.app;
  }
}

/**
 * Collection of foreign objects
 */
export class ForeignObjectCollection {
  private objects: ForeignObject[] = [];
  private objectMap: Map<string, ForeignObject> = new Map();

  /**
   * Add a foreign object
   */
  add(object: ForeignObject): void {
    this.objects.push(object);
    const id = object.getId();
    if (id) {
      this.objectMap.set(id, object);
    }
  }

  /**
   * Get foreign object by ID
   * Note: Searches through all objects since ID may be set after add() via withId()
   */
  getById(id: string): ForeignObject | undefined {
    return this.objects.find(obj => obj.getId() === id);
  }

  /**
   * Get all foreign objects
   */
  getAll(): ForeignObject[] {
    return this.objects;
  }

  /**
   * Clear all foreign objects
   */
  clear(): void {
    this.objects = [];
    this.objectMap.clear();
  }

  /**
   * Get count
   */
  count(): number {
    return this.objects.length;
  }
}
