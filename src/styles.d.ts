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
export declare enum FontFamily {
    SANS_SERIF = "sans-serif",
    SERIF = "serif",
    MONOSPACE = "monospace"
}
/**
 * Font styles
 */
export declare enum FontStyle {
    NORMAL = "normal",
    ITALIC = "italic",
    BOLD = "bold",
    BOLD_ITALIC = "bold-italic"
}
/**
 * Style properties that can be applied to widgets
 */
export interface WidgetStyle {
    font_family?: FontFamily | string;
    font_style?: FontStyle | string;
    font_size?: number;
    font_weight?: 'normal' | 'bold';
    color?: number | string;
    background_color?: number | string;
    text_align?: 'left' | 'center' | 'right';
    importance?: 'low' | 'medium' | 'high' | 'danger' | 'warning' | 'success';
}
/**
 * Widget type selectors (includes built-in types and custom class names)
 */
export type WidgetSelector = 'root' | 'button' | 'label' | 'entry' | 'multilineentry' | 'passwordentry' | 'checkbox' | 'select' | 'slider' | 'radiogroup' | 'progressbar' | 'hyperlink' | 'separator' | 'table' | 'list' | string;
/**
 * StyleSheet stores styles for different widget types
 */
export declare class StyleSheet {
    private styles;
    /**
     * Set style for a widget type
     */
    style(selector: WidgetSelector, style: WidgetStyle): void;
    /**
     * Get style for a widget type
     */
    getStyle(selector: WidgetSelector): WidgetStyle | undefined;
    /**
     * Get computed style for a widget, combining root and specific styles
     */
    getComputedStyle(selector: WidgetSelector): WidgetStyle;
    /**
     * Clear all styles
     */
    clear(): void;
}
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
export declare function styles(styleDefinitions: Partial<Record<WidgetSelector, WidgetStyle>>): StyleSheet;
/**
 * Get the global stylesheet
 */
export declare function getStyleSheet(): StyleSheet | null;
/**
 * Clear all styles
 */
export declare function clearStyles(): void;
/**
 * Apply a style to a widget via the bridge
 */
export declare function applyStyleToWidget(ctx: Context, widgetId: string, style: WidgetStyle): Promise<void>;
/**
 * Get computed style for a widget type and apply it
 */
export declare function applyStyleForWidget(ctx: Context, widgetId: string, widgetType: WidgetSelector): Promise<void>;
