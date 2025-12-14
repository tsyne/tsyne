/**
 * Widget classes for Tsyne GUI framework
 *
 * This file re-exports all widget classes from the decomposed widget modules.
 * For better performance, the widgets are organized into smaller files:
 *
 * - widgets/base.ts - Widget base class and shared interfaces
 * - widgets/containers.ts - Layout containers (VBox, HBox, Grid, etc.)
 * - widgets/inputs.ts - Input widgets (Button, Entry, Checkbox, etc.)
 * - widgets/display.ts - Display widgets (Label, Image, Table, etc.)
 * - widgets/canvas.ts - Canvas primitives (CanvasLine, CanvasCircle, etc.)
 */

// Re-export everything from the decomposed modules
export * from './widgets/index';
