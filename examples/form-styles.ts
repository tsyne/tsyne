/**
 * Form Stylesheet
 *
 * This stylesheet defines visual styles for the form widgets.
 * Similar to Swiby's styles.rb, this separates presentation from structure.
 *
 * When imported by form-styled.ts, these styles are automatically applied
 * to all widgets based on their type.
 */

import { styles, FontFamily, FontStyle } from '../core/src';

// Define styles for different widget types
styles({
  // Root styles apply to all widgets unless overridden
  root: {
    font_family: FontFamily.SANS_SERIF,
    font_style: FontStyle.NORMAL,
    font_size: 10,
  },

  // Labels are italic with a distinct color
  label: {
    font_style: FontStyle.ITALIC,
    font_size: 12,
  },

  // Entries (text inputs) use monospace font
  entry: {
    font_family: FontFamily.MONOSPACE,
    font_style: FontStyle.NORMAL,
    font_size: 12,
  },

  // Buttons are bold to stand out
  button: {
    font_weight: 'bold',
  },
});

// Note: In Swiby, you could also set colors like:
// label: { color: 0xAA0000 }  (for red text)
// entry: { background_color: 0xFFFFC6 }  (for yellow background)
//
// Fyne has limitations on per-widget color customization in standard widgets,
// but the styling system supports font_family, font_style, and font_weight
// which work across Fyne's widget implementations.
