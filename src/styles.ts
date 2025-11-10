/**
 * Tsyne Styling System
 *
 * Provides CSS-like styling for widgets similar to Swiby's stylesheet approach.
 * Styles can be defined for widget types and are automatically applied when widgets are created.
 */

import { Context } from './context';

/**
 * Font families available in Fyne
 */
export enum FontFamily {
  SANS_SERIF = 'sans-serif',
  SERIF = 'serif',
  MONOSPACE = 'monospace',
}

/**
 * Font styles
 */
export enum FontStyle {
  NORMAL = 'normal',
  ITALIC = 'italic',
  BOLD = 'bold',
  BOLD_ITALIC = 'bold-italic',
}

/**
 * Style properties that can be applied to widgets
 */
export interface WidgetStyle {
  // Font properties
  font_family?: FontFamily | string;
  font_style?: FontStyle | string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';

  // Color properties (hex numbers like 0xRRGGBB or CSS color strings)
  color?: number | string;
  background_color?: number | string;

  // Text properties
  text_align?: 'left' | 'center' | 'right';

  // Button-specific properties (Fyne limitation workaround)
  // Maps to Fyne's importance levels since Fyne doesn't support per-widget colors
  importance?: 'low' | 'medium' | 'high' | 'warning' | 'success';
}

/**
 * Widget type selectors (includes built-in types and custom class names)
 */
export type WidgetSelector =
  | 'root'
  | 'button'
  | 'label'
  | 'entry'
  | 'multilineentry'
  | 'passwordentry'
  | 'checkbox'
  | 'select'
  | 'slider'
  | 'radiogroup'
  | 'progressbar'
  | 'hyperlink'
  | 'separator'
  | 'table'
  | 'list'
  | string; // Allow custom class names

/**
 * StyleSheet stores styles for different widget types
 */
export class StyleSheet {
  private styles: Map<WidgetSelector, WidgetStyle> = new Map();

  /**
   * Set style for a widget type
   */
  style(selector: WidgetSelector, style: WidgetStyle): void {
    // Merge with existing styles for this selector
    const existing = this.styles.get(selector) || {};
    this.styles.set(selector, { ...existing, ...style });
  }

  /**
   * Get style for a widget type
   */
  getStyle(selector: WidgetSelector): WidgetStyle | undefined {
    return this.styles.get(selector);
  }

  /**
   * Get computed style for a widget, combining root and specific styles
   */
  getComputedStyle(selector: WidgetSelector): WidgetStyle {
    const rootStyle = this.styles.get('root') || {};
    const specificStyle = this.styles.get(selector) || {};
    return { ...rootStyle, ...specificStyle };
  }

  /**
   * Clear all styles
   */
  clear(): void {
    this.styles.clear();
  }
}

/**
 * Global stylesheet instance
 */
let globalStyleSheet: StyleSheet | null = null;

/**
 * Define styles using a declarative syntax similar to Swiby
 *
 * @example
 * styles({
 *   root: {
 *     font_family: FontFamily.SANS_SERIF,
 *     font_size: 10
 *   },
 *   label: {
 *     font_style: FontStyle.ITALIC,
 *     color: 0xAA0000
 *   },
 *   button: {
 *     font_weight: 'bold'
 *   }
 * });
 */
export function styles(styleDefinitions: Partial<Record<WidgetSelector, WidgetStyle>>): StyleSheet {
  if (!globalStyleSheet) {
    globalStyleSheet = new StyleSheet();
  }

  // Apply all style definitions
  for (const [selector, style] of Object.entries(styleDefinitions)) {
    if (style) {
      globalStyleSheet.style(selector as WidgetSelector, style);
    }
  }

  return globalStyleSheet;
}

/**
 * Get the global stylesheet
 */
export function getStyleSheet(): StyleSheet | null {
  return globalStyleSheet;
}

/**
 * Clear all styles
 */
export function clearStyles(): void {
  if (globalStyleSheet) {
    globalStyleSheet.clear();
  }
  globalStyleSheet = null;
}

/**
 * Apply a style to a widget via the bridge
 */
export async function applyStyleToWidget(
  ctx: Context,
  widgetId: string,
  style: WidgetStyle
): Promise<void> {
  // Convert style to bridge format
  const stylePayload: any = { widgetId };

  if (style.color !== undefined) {
    stylePayload.color = typeof style.color === 'number'
      ? `#${style.color.toString(16).padStart(6, '0')}`
      : style.color;
  }

  if (style.background_color !== undefined) {
    stylePayload.backgroundColor = typeof style.background_color === 'number'
      ? `#${style.background_color.toString(16).padStart(6, '0')}`
      : style.background_color;
  }

  if (style.font_style !== undefined || style.font_weight !== undefined) {
    let fontStyle = 'normal';

    if (style.font_style === FontStyle.ITALIC || style.font_style === 'italic') {
      fontStyle = 'italic';
    } else if (style.font_style === FontStyle.BOLD || style.font_style === 'bold') {
      fontStyle = 'bold';
    } else if (style.font_style === FontStyle.BOLD_ITALIC || style.font_style === 'bold-italic') {
      fontStyle = 'bold-italic';
    }

    // Override with font_weight if specified
    if (style.font_weight === 'bold') {
      fontStyle = fontStyle === 'italic' ? 'bold-italic' : 'bold';
    }

    stylePayload.fontStyle = fontStyle;
  }

  if (style.font_family !== undefined) {
    stylePayload.fontFamily = style.font_family;
  }

  if (style.font_size !== undefined) {
    stylePayload.fontSize = style.font_size;
  }

  if (style.text_align !== undefined) {
    stylePayload.textAlign = style.text_align;
  }

  // Send style to bridge
  if (Object.keys(stylePayload).length > 1) { // More than just widgetId
    await ctx.bridge.send('setWidgetStyle', stylePayload);
  }
}

/**
 * Get computed style for a widget type and apply it
 */
export async function applyStyleForWidget(
  ctx: Context,
  widgetId: string,
  widgetType: WidgetSelector
): Promise<void> {
  const stylesheet = getStyleSheet();
  if (!stylesheet) return;

  const style = stylesheet.getComputedStyle(widgetType);
  if (Object.keys(style).length > 0) {
    await applyStyleToWidget(ctx, widgetId, style);
  }
}
