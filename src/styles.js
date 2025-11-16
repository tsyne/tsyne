"use strict";
/**
 * Tsyne Styling System
 *
 * Provides CSS-like styling for widgets similar to Swiby's stylesheet approach.
 * Styles can be defined for widget types and are automatically applied when widgets are created.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StyleSheet = exports.FontStyle = exports.FontFamily = void 0;
exports.styles = styles;
exports.getStyleSheet = getStyleSheet;
exports.clearStyles = clearStyles;
exports.applyStyleToWidget = applyStyleToWidget;
exports.applyStyleForWidget = applyStyleForWidget;
/**
 * Font families available in Fyne
 */
var FontFamily;
(function (FontFamily) {
    FontFamily["SANS_SERIF"] = "sans-serif";
    FontFamily["SERIF"] = "serif";
    FontFamily["MONOSPACE"] = "monospace";
})(FontFamily || (exports.FontFamily = FontFamily = {}));
/**
 * Font styles
 */
var FontStyle;
(function (FontStyle) {
    FontStyle["NORMAL"] = "normal";
    FontStyle["ITALIC"] = "italic";
    FontStyle["BOLD"] = "bold";
    FontStyle["BOLD_ITALIC"] = "bold-italic";
})(FontStyle || (exports.FontStyle = FontStyle = {}));
/**
 * StyleSheet stores styles for different widget types
 */
class StyleSheet {
    constructor() {
        this.styles = new Map();
    }
    /**
     * Set style for a widget type
     */
    style(selector, style) {
        // Merge with existing styles for this selector
        const existing = this.styles.get(selector) || {};
        this.styles.set(selector, { ...existing, ...style });
    }
    /**
     * Get style for a widget type
     */
    getStyle(selector) {
        return this.styles.get(selector);
    }
    /**
     * Get computed style for a widget, combining root and specific styles
     */
    getComputedStyle(selector) {
        const rootStyle = this.styles.get('root') || {};
        const specificStyle = this.styles.get(selector) || {};
        return { ...rootStyle, ...specificStyle };
    }
    /**
     * Clear all styles
     */
    clear() {
        this.styles.clear();
    }
}
exports.StyleSheet = StyleSheet;
/**
 * Global stylesheet instance
 */
let globalStyleSheet = null;
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
function styles(styleDefinitions) {
    if (!globalStyleSheet) {
        globalStyleSheet = new StyleSheet();
    }
    // Apply all style definitions
    for (const [selector, style] of Object.entries(styleDefinitions)) {
        if (style) {
            globalStyleSheet.style(selector, style);
        }
    }
    return globalStyleSheet;
}
/**
 * Get the global stylesheet
 */
function getStyleSheet() {
    return globalStyleSheet;
}
/**
 * Clear all styles
 */
function clearStyles() {
    if (globalStyleSheet) {
        globalStyleSheet.clear();
    }
    globalStyleSheet = null;
}
/**
 * Apply a style to a widget via the bridge
 */
async function applyStyleToWidget(ctx, widgetId, style) {
    // Convert style to bridge format
    const stylePayload = { widgetId };
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
        }
        else if (style.font_style === FontStyle.BOLD || style.font_style === 'bold') {
            fontStyle = 'bold';
        }
        else if (style.font_style === FontStyle.BOLD_ITALIC || style.font_style === 'bold-italic') {
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
async function applyStyleForWidget(ctx, widgetId, widgetType) {
    const stylesheet = getStyleSheet();
    if (!stylesheet)
        return;
    const style = stylesheet.getComputedStyle(widgetType);
    if (Object.keys(style).length > 0) {
        await applyStyleToWidget(ctx, widgetId, style);
    }
}
