/**
 * Designer library - a drop-in replacement for 'tsyne' that captures metadata
 */

import { DesignerApp } from './designer-app';
import { AppOptions } from '../../src/app';
import { Window, WindowOptions } from '../../src/window';
import { Context } from '../../src/context';
import { Button, Label, Entry, VBox, HBox } from '../../src/widgets';

// Global context for the declarative API (design mode)
let globalDesignerApp: DesignerApp | null = null;
let globalContext: Context | null = null;

/**
 * Create and run an application in design mode
 * This captures metadata instead of running the app normally
 */
export function app(options: AppOptions, builder: (app: DesignerApp) => void): DesignerApp {
  const appInstance = new DesignerApp(options, true); // testMode = true to avoid running

  globalDesignerApp = appInstance;
  globalContext = (appInstance as any).ctx;

  builder(appInstance);

  // Don't run the app in design mode - we just want to build the structure
  // appInstance.run();

  return appInstance;
}

/**
 * Create a window in design mode
 */
export function window(options: WindowOptions, builder: (win: Window) => void): Window {
  if (!globalDesignerApp) {
    throw new Error('window() must be called within an app() context');
  }
  return globalDesignerApp.window(options, builder);
}

/**
 * Create a vertical box container
 */
export function vbox(builder: () => void): VBox {
  if (!globalDesignerApp) {
    throw new Error('vbox() must be called within an app context');
  }
  return globalDesignerApp.vbox(builder);
}

/**
 * Create a horizontal box container
 */
export function hbox(builder: () => void): HBox {
  if (!globalDesignerApp) {
    throw new Error('hbox() must be called within an app context');
  }
  return globalDesignerApp.hbox(builder);
}

/**
 * Create a button widget
 */
export function button(text: string, onClick?: () => void): Button {
  if (!globalDesignerApp) {
    throw new Error('button() must be called within an app context');
  }
  return globalDesignerApp.button(text, onClick);
}

/**
 * Create a label widget
 */
export function label(text: string): Label {
  if (!globalDesignerApp) {
    throw new Error('label() must be called within an app context');
  }
  return globalDesignerApp.label(text);
}

/**
 * Create an entry (text input) widget
 */
export function entry(placeholder?: string, onSubmit?: () => void): Entry {
  if (!globalDesignerApp) {
    throw new Error('entry() must be called within an app context');
  }
  return globalDesignerApp.entry(placeholder, onSubmit);
}

/**
 * Get the current designer app instance
 */
export function getDesignerApp(): DesignerApp | null {
  return globalDesignerApp;
}

/**
 * Reset the designer state
 */
export function resetDesignerState(): void {
  globalDesignerApp = null;
  globalContext = null;
}

// Export everything else from the regular tsyne library
export * from '../../src/app';
export * from '../../src/widgets';
export * from '../../src/window';
export * from './metadata';
export * from './designer-app';
export * from './stack-trace-parser';
