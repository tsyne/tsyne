/**
 * GLOverlayApp — CVG adapter for rendering 2D overlays on GL canvases.
 *
 * Implements the subset of the Tsyne `app` interface that CVG uses,
 * creating Fyne canvas primitives (Text, Rectangle) in a WithoutLayout
 * overlay container that sits on top of the GL shader.
 *
 * Canvas primitives are not Tappable/Hoverable, so mouse/keyboard events
 * pass through to the GL shader below.
 */

import { TsyneBridge } from './bridge';

let nextWidgetId = 0;

/**
 * OverlayWidget — wraps a bridge widget ID.
 * CvgElement calls .update(), .hide(), .show() on this object
 * and reads _fillColor, _strokeColor, _opacity for animation start values.
 */
export class OverlayWidget {
  _fillColor?: string;
  _strokeColor?: string;
  _opacity = 1;
  _x = 0;
  _y = 0;
  _width = 0;
  _height = 0;

  constructor(
    private bridge: TsyneBridge,
    public id: string,
    private type: 'text' | 'rectangle',
  ) {}

  update(opts: Record<string, any>): void {
    if (!this.id) return;

    // Track property changes locally for animation readback
    if (opts.fillColor !== undefined) this._fillColor = opts.fillColor;
    if (opts.strokeColor !== undefined) this._strokeColor = opts.strokeColor;
    if (opts.opacity !== undefined) this._opacity = opts.opacity;
    if (opts.x !== undefined) this._x = opts.x;
    if (opts.y !== undefined) this._y = opts.y;
    if (opts.width !== undefined) this._width = opts.width;
    if (opts.height !== undefined) this._height = opts.height;

    if (this.type === 'text') {
      const payload: Record<string, any> = { widgetId: this.id };
      if (opts.text !== undefined) payload.text = opts.text;
      if (opts.fillColor !== undefined || opts.color !== undefined) {
        payload.color = opts.color || opts.fillColor;
      }
      if (opts.textSize !== undefined) payload.textSize = opts.textSize;
      if (opts.x !== undefined) payload.x = opts.x;
      if (opts.y !== undefined) payload.y = opts.y;
      this.bridge.send('updateCanvasText', payload);
    } else {
      // Rectangle updates handled via moveWidget + properties
      const movePayload: Record<string, any> = { widgetId: this.id };
      if (opts.x !== undefined) movePayload.x = opts.x;
      if (opts.y !== undefined) movePayload.y = opts.y;
      if (opts.width !== undefined) movePayload.width = opts.width;
      if (opts.height !== undefined) movePayload.height = opts.height;
      if (Object.keys(movePayload).length > 1) {
        this.bridge.send('moveWidget', movePayload);
      }
    }
  }

  hide(): void {
    if (!this.id) return;
    this.bridge.send('hideWidget', { widgetId: this.id });
  }

  show(): void {
    if (!this.id) return;
    this.bridge.send('showWidget', { widgetId: this.id });
  }
}

/**
 * GLOverlayApp — implements the `app` interface subset that CVG expects.
 * Creates Fyne canvas primitives in the overlay container.
 */
export class GLOverlayApp {
  private widgets: string[] = [];

  constructor(
    private bridge: TsyneBridge,
    private overlayId: string,
  ) {}

  // Container methods — pass-through (overlay IS the container)
  clip(builder: () => any): any { return builder(); }
  stack(builder: () => any): any { return builder(); }
  canvasStack(builder: () => any): any { return builder(); }

  /**
   * Create a canvas text widget in the overlay
   */
  canvasText(text: string, opts: any): OverlayWidget {
    const widgetId = `overlay_text_${nextWidgetId++}`;

    this.bridge.send('createCanvasText', {
      id: widgetId,
      text,
      color: opts.color || '#ffffff',
      textSize: opts.textSize || 14,
      bold: opts.bold || false,
      italic: opts.italic || false,
      monospace: opts.monospace || false,
      alignment: opts.alignment || 'leading',
    });

    // Add to overlay container and position
    this.bridge.send('containerAdd', {
      containerId: this.overlayId,
      childId: widgetId,
    });

    if (opts.x !== undefined && opts.y !== undefined) {
      this.bridge.send('moveWidget', {
        widgetId,
        x: opts.x,
        y: opts.y,
      });
    }

    this.widgets.push(widgetId);

    const widget = new OverlayWidget(this.bridge, widgetId, 'text');
    widget._fillColor = opts.color || '#ffffff';
    widget._x = opts.x || 0;
    widget._y = opts.y || 0;
    return widget;
  }

  /**
   * Create a canvas rectangle widget in the overlay
   * When called with only width/height (no fill), acts as a sizing shim (no-op).
   */
  canvasRectangle(opts: any): OverlayWidget {
    // Sizing shim — transparent rectangle just for layout, skip it
    if (!opts.fillColor && !opts.strokeColor) {
      return new OverlayWidget(this.bridge, '', 'rectangle');
    }

    const widgetId = `overlay_rect_${nextWidgetId++}`;
    const x = opts.x ?? 0;
    const y = opts.y ?? 0;
    const w = opts.width ?? (opts.x2 !== undefined ? opts.x2 - x : 0);
    const h = opts.height ?? (opts.y2 !== undefined ? opts.y2 - y : 0);

    this.bridge.send('createCanvasRectangle', {
      id: widgetId,
      width: w,
      height: h,
      fillColor: opts.fillColor || '',
      strokeColor: opts.strokeColor || '',
      strokeWidth: opts.strokeWidth || 0,
    });

    this.bridge.send('containerAdd', {
      containerId: this.overlayId,
      childId: widgetId,
    });

    this.bridge.send('moveWidget', {
      widgetId,
      x,
      y,
      width: w,
      height: h,
    });

    this.widgets.push(widgetId);

    const widget = new OverlayWidget(this.bridge, widgetId, 'rectangle');
    widget._fillColor = opts.fillColor;
    widget._strokeColor = opts.strokeColor;
    widget._x = x;
    widget._y = y;
    widget._width = w;
    widget._height = h;
    return widget;
  }

  /**
   * Clear all overlay content
   */
  async clear(): Promise<void> {
    await this.bridge.send('containerRemoveAll', { containerId: this.overlayId });
    this.widgets = [];
  }
}
