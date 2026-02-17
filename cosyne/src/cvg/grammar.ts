/**
 * CVG (Cosyne Vector Graphics) Grammar — Barrel file.
 *
 * Core classes are split across several files for manageability:
 *   grammar-element.ts   — CvgElement class
 *   grammar-context.ts   — CvgContext class (core: fields, events, animation, resize)
 *   grammar-rendering.ts — CvgContext prototype augmentation: style/transform stacks, coordinate mapping, CSS, event wiring
 *   grammar-shapes.ts    — CvgContext prototype augmentation: SVG shape methods (path, circle, rect, line, etc.)
 *   grammar-defs.ts      — CvgContext prototype augmentation: defs, gradients, filters, text, use, PathBuilder
 *
 * Types, constants, and animation helpers are in grammar-types.ts.
 * Utility functions are in grammar-utils.ts.
 * Factory functions (cvg, cvgBuilder, createCvgContext) are in grammar-factories.ts.
 *
 * This file re-exports everything from those modules so that existing
 * `import { ... } from './grammar'` statements continue to work.
 */

// Core classes
import { CvgElement } from './grammar-element';
import { CvgContext } from './grammar-context';

// Prototype augmentations — side-effect imports that add methods to CvgContext.prototype
import './grammar-rendering';
import './grammar-shapes';
import './grammar-defs';

// PathBuilder is exported from grammar-defs
import { PathBuilder } from './grammar-defs';

export { CvgElement, CvgContext, PathBuilder };

// Re-export support modules
export * from './grammar-types';
export * from './grammar-utils';
export { CvgBuilder, cvgBuilder, cvg, createCvgContext } from './grammar-factories';
