import { Context } from '../context';

/**
 * Canvas Line - draws a line between two points
 */
export class CanvasLine {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, x1: number, y1: number, x2: number, y2: number, options?: {
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasline');

    const payload: any = {
      id: this.id,
      x1, y1, x2, y2
    };

    if (options?.strokeColor) {
      payload.strokeColor = options.strokeColor;
    }
    if (options?.strokeWidth) {
      payload.strokeWidth = options.strokeWidth;
    }

    ctx.bridge.send('createCanvasLine', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    x1?: number; y1?: number;
    x2?: number; y2?: number;
    strokeColor?: string;
    strokeWidth?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasLine', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Circle - draws a circle/ellipse
 */
export class CanvasCircle {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    x?: number; y?: number;
    x2?: number; y2?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvascircle');

    const payload: any = { id: this.id };

    if (options) {
      if (options.x !== undefined) payload.x = options.x;
      if (options.y !== undefined) payload.y = options.y;
      if (options.x2 !== undefined) payload.x2 = options.x2;
      if (options.y2 !== undefined) payload.y2 = options.y2;
      if (options.fillColor) payload.fillColor = options.fillColor;
      if (options.strokeColor) payload.strokeColor = options.strokeColor;
      if (options.strokeWidth !== undefined) payload.strokeWidth = options.strokeWidth;
    }

    ctx.bridge.send('createCanvasCircle', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    x?: number; y?: number;
    x2?: number; y2?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasCircle', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Rectangle - draws a rectangle
 */
export class CanvasRectangle {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    width?: number;
    height?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    cornerRadius?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasrectangle');

    const payload: any = { id: this.id };

    if (options) {
      if (options.width !== undefined) payload.width = options.width;
      if (options.height !== undefined) payload.height = options.height;
      if (options.fillColor) payload.fillColor = options.fillColor;
      if (options.strokeColor) payload.strokeColor = options.strokeColor;
      if (options.strokeWidth !== undefined) payload.strokeWidth = options.strokeWidth;
      if (options.cornerRadius !== undefined) payload.cornerRadius = options.cornerRadius;
    }

    ctx.bridge.send('createCanvasRectangle', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    width?: number;
    height?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    cornerRadius?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasRectangle', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Text - draws text on the canvas
 */
export class CanvasText {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, text: string, options?: {
    color?: string;
    textSize?: number;
    bold?: boolean;
    italic?: boolean;
    monospace?: boolean;
    alignment?: 'leading' | 'center' | 'trailing';
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvastext');

    const payload: any = { id: this.id, text };

    if (options) {
      if (options.color) payload.color = options.color;
      if (options.textSize !== undefined) payload.textSize = options.textSize;
      if (options.bold !== undefined) payload.bold = options.bold;
      if (options.italic !== undefined) payload.italic = options.italic;
      if (options.monospace !== undefined) payload.monospace = options.monospace;
      if (options.alignment) payload.alignment = options.alignment;
    }

    ctx.bridge.send('createCanvasText', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    text?: string;
    color?: string;
    textSize?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasText', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Raster - pixel-level drawing
 */
export class CanvasRaster {
  private ctx: Context;
  public id: string;
  private _width: number;
  private _height: number;

  constructor(ctx: Context, width: number, height: number, pixels?: Array<[number, number, number, number]>) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasraster');
    this._width = width;
    this._height = height;

    const payload: any = { id: this.id, width, height };

    if (pixels) {
      payload.pixels = pixels;
    }

    ctx.bridge.send('createCanvasRaster', payload);
    ctx.addToCurrentContainer(this.id);
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }

  /**
   * Update individual pixels
   * @param updates Array of pixel updates {x, y, r, g, b, a}
   */
  async setPixels(updates: Array<{x: number; y: number; r: number; g: number; b: number; a: number}>): Promise<void> {
    await this.ctx.bridge.send('updateCanvasRaster', {
      widgetId: this.id,
      updates
    });
  }

  /**
   * Set a single pixel
   */
  async setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255): Promise<void> {
    await this.setPixels([{x, y, r, g, b, a}]);
  }
}

/**
 * Canvas Linear Gradient - draws a gradient fill
 */
export class CanvasLinearGradient {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    startColor?: string;
    endColor?: string;
    angle?: number;
    width?: number;
    height?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvaslineargradient');

    const payload: any = { id: this.id };

    if (options) {
      if (options.startColor) payload.startColor = options.startColor;
      if (options.endColor) payload.endColor = options.endColor;
      if (options.angle !== undefined) payload.angle = options.angle;
      if (options.width !== undefined) payload.width = options.width;
      if (options.height !== undefined) payload.height = options.height;
    }

    ctx.bridge.send('createCanvasLinearGradient', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    startColor?: string;
    endColor?: string;
    angle?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasLinearGradient', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Arc - draws a filled arc or annular sector
 * Used for pie charts, circular progress indicators, etc.
 */
export class CanvasArc {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    startAngle?: number;
    endAngle?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasarc');

    const payload: any = { id: this.id };

    if (options) {
      if (options.x !== undefined) payload.x = options.x;
      if (options.y !== undefined) payload.y = options.y;
      if (options.x2 !== undefined) payload.x2 = options.x2;
      if (options.y2 !== undefined) payload.y2 = options.y2;
      if (options.startAngle !== undefined) payload.startAngle = options.startAngle;
      if (options.endAngle !== undefined) payload.endAngle = options.endAngle;
      if (options.fillColor) payload.fillColor = options.fillColor;
      if (options.strokeColor) payload.strokeColor = options.strokeColor;
      if (options.strokeWidth !== undefined) payload.strokeWidth = options.strokeWidth;
    }

    ctx.bridge.send('createCanvasArc', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    startAngle?: number;
    endAngle?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasArc', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Polygon - draws a regular polygon primitive
 * The points define the vertices of the polygon
 */
export class CanvasPolygon {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    points?: Array<{x: number; y: number}>;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvaspolygon');

    const payload: any = { id: this.id };

    if (options) {
      if (options.points) payload.points = options.points;
      if (options.fillColor) payload.fillColor = options.fillColor;
      if (options.strokeColor) payload.strokeColor = options.strokeColor;
      if (options.strokeWidth !== undefined) payload.strokeWidth = options.strokeWidth;
    }

    ctx.bridge.send('createCanvasPolygon', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    points?: Array<{x: number; y: number}>;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasPolygon', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Radial Gradient - draws a gradient from center outward
 */
export class CanvasRadialGradient {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    startColor?: string;
    endColor?: string;
    centerOffsetX?: number;
    centerOffsetY?: number;
    width?: number;
    height?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasradialgradient');

    const payload: any = { id: this.id };

    if (options) {
      if (options.startColor) payload.startColor = options.startColor;
      if (options.endColor) payload.endColor = options.endColor;
      if (options.centerOffsetX !== undefined) payload.centerOffsetX = options.centerOffsetX;
      if (options.centerOffsetY !== undefined) payload.centerOffsetY = options.centerOffsetY;
      if (options.width !== undefined) payload.width = options.width;
      if (options.height !== undefined) payload.height = options.height;
    }

    ctx.bridge.send('createCanvasRadialGradient', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    startColor?: string;
    endColor?: string;
    centerOffsetX?: number;
    centerOffsetY?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasRadialGradient', {
      widgetId: this.id,
      ...options
    });
  }
}
