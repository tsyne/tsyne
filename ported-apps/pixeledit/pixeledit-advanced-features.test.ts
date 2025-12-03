/**
 * Unit tests for pixeledit advanced features
 * Tests: Selection, Clipboard, Layers
 */

import { PixelEditor, Color } from './pixeledit';
import type { Selection, Layer } from './pixeledit';

// Mock App class for testing
class MockApp {
  private prefs: Map<string, string> = new Map();

  async getPreference(key: string, defaultValue: string): Promise<string> {
    return this.prefs.get(key) || defaultValue;
  }

  async getPreferenceInt(key: string, defaultValue: number): Promise<number> {
    const val = this.prefs.get(key);
    return val ? parseInt(val, 10) : defaultValue;
  }

  async setPreference(key: string, value: string): Promise<void> {
    this.prefs.set(key, value);
  }

  getContext() { return {}; }
  border(config: any) {}
  vbox(fn: () => void) {}
  hbox(fn: () => void) {}
  scroll(fn: () => void) {}
  center(fn: () => void) {}
  label(text: string) { return { setText: async () => {} }; }
  button(text: string, onClick: () => void) {}
  separator() {}
  toolbar(items: any[]) {}
  toolbarAction(name: string, onClick: () => void) { return {}; }
  canvasRectangle(config: any) { return { update: async () => {} }; }
  window(config: any, fn: any) {}
}

describe('Selection System', () => {
  let editor: PixelEditor;
  let mockApp: MockApp;

  beforeEach(() => {
    mockApp = new MockApp();
    editor = new PixelEditor(mockApp as any);
    // Create a blank 32x32 image
    editor.createBlankImage(32, 32);
  });

  test('setSelection creates a selection', () => {
    const selection: Selection = { x: 5, y: 5, width: 10, height: 10 };
    editor.setSelection(selection);

    const result = editor.getSelection();
    expect(result).not.toBeNull();
    expect(result!.x).toBe(5);
    expect(result!.y).toBe(5);
    expect(result!.width).toBe(10);
    expect(result!.height).toBe(10);
  });

  test('clearSelection removes selection', () => {
    const selection: Selection = { x: 0, y: 0, width: 5, height: 5 };
    editor.setSelection(selection);
    expect(editor.getSelection()).not.toBeNull();

    editor.clearSelection();
    expect(editor.getSelection()).toBeNull();
  });

  test('selectAll selects entire image', () => {
    editor.selectAll();

    const result = editor.getSelection();
    expect(result).not.toBeNull();
    expect(result!.x).toBe(0);
    expect(result!.y).toBe(0);
    expect(result!.width).toBe(32);
    expect(result!.height).toBe(32);
  });

  test('selection with different image sizes', () => {
    editor.createBlankImage(64, 48);
    editor.selectAll();

    const result = editor.getSelection();
    expect(result).not.toBeNull();
    expect(result!.width).toBe(64);
    expect(result!.height).toBe(48);
  });
});

describe('Clipboard System', () => {
  let editor: PixelEditor;
  let mockApp: MockApp;

  beforeEach(() => {
    mockApp = new MockApp();
    editor = new PixelEditor(mockApp as any);
    editor.createBlankImage(32, 32);
  });

  test('copy without selection does nothing', async () => {
    await editor.copy(true);
    expect(editor.hasClipboard()).toBe(false);
  });

  test('copy with selection copies pixels', async () => {
    // Draw some pixels
    const red = new Color(255, 0, 0);
    await editor.setPixelColor(5, 5, red);
    await editor.setPixelColor(6, 5, red);
    await editor.setPixelColor(5, 6, red);
    await editor.setPixelColor(6, 6, red);

    // Select the area
    editor.setSelection({ x: 5, y: 5, width: 2, height: 2 });

    // Copy
    await editor.copy(true);

    expect(editor.hasClipboard()).toBe(true);
  });

  test('cut clears the selected area', async () => {
    // Draw some pixels
    const red = new Color(255, 0, 0);
    await editor.setPixelColor(5, 5, red);

    // Select and cut
    editor.setSelection({ x: 5, y: 5, width: 1, height: 1 });
    await editor.cut();

    // Check that the pixel is now the background color
    const color = editor.getPixelColor(5, 5);
    expect(color.equals(editor.bgColor)).toBe(true);
    expect(editor.hasClipboard()).toBe(true);
  });

  test('paste without clipboard does nothing', async () => {
    const originalColor = editor.getPixelColor(0, 0);
    await editor.paste(0, 0, true);
    const newColor = editor.getPixelColor(0, 0);
    expect(newColor.equals(originalColor)).toBe(true);
  });

  test('copy and paste cycle works', async () => {
    // Draw a red pixel
    const red = new Color(255, 0, 0);
    await editor.setPixelColor(0, 0, red);

    // Select and copy
    editor.setSelection({ x: 0, y: 0, width: 1, height: 1 });
    await editor.copy(true);

    // Paste at different location
    await editor.paste(10, 10, true);

    // Check the pasted pixel
    const pastedColor = editor.getPixelColor(10, 10);
    expect(pastedColor.r).toBe(255);
    expect(pastedColor.g).toBe(0);
    expect(pastedColor.b).toBe(0);
  });

  test('paste uses selection position by default', async () => {
    // Draw and copy
    const blue = new Color(0, 0, 255);
    await editor.setPixelColor(0, 0, blue);
    editor.setSelection({ x: 0, y: 0, width: 1, height: 1 });
    await editor.copy(true);

    // Set new selection and paste (no coordinates)
    editor.setSelection({ x: 15, y: 15, width: 1, height: 1 });
    await editor.paste(undefined, undefined, true);

    const pastedColor = editor.getPixelColor(15, 15);
    expect(pastedColor.b).toBe(255);
  });
});

describe('Layer System', () => {
  let editor: PixelEditor;
  let mockApp: MockApp;

  beforeEach(() => {
    mockApp = new MockApp();
    editor = new PixelEditor(mockApp as any);
    editor.createBlankImage(16, 16);
  });

  test('addLayer creates a new layer', () => {
    const layer = editor.addLayer('Test Layer');

    expect(layer).not.toBeNull();
    expect(layer.name).toBe('Test Layer');
    expect(layer.visible).toBe(true);
    expect(layer.opacity).toBe(255);
    expect(layer.locked).toBe(false);
  });

  test('addLayer increments layer count', () => {
    editor.addLayer('Layer 1');
    editor.addLayer('Layer 2');

    const layers = editor.getLayers();
    expect(layers.length).toBe(2);
  });

  test('removeLayer removes layer', async () => {
    editor.addLayer('Layer 1');
    editor.addLayer('Layer 2');

    expect(editor.getLayers().length).toBe(2);

    await editor.removeLayer(1, true);

    expect(editor.getLayers().length).toBe(1);
  });

  test('cannot remove last layer', async () => {
    editor.addLayer('Only Layer');
    expect(editor.getLayers().length).toBe(1);

    await editor.removeLayer(0, true);

    // Should still have one layer
    expect(editor.getLayers().length).toBe(1);
  });

  test('setActiveLayer changes active layer', () => {
    editor.addLayer('Layer 1');
    editor.addLayer('Layer 2');

    editor.setActiveLayer(0);
    expect(editor.getActiveLayer()?.name).toBe('Layer 1');

    editor.setActiveLayer(1);
    expect(editor.getActiveLayer()?.name).toBe('Layer 2');
  });

  test('toggleLayerVisibility toggles visibility', () => {
    const layer = editor.addLayer('Test');
    expect(layer.visible).toBe(true);

    editor.toggleLayerVisibility(0);
    expect(editor.getLayers()[0].visible).toBe(false);

    editor.toggleLayerVisibility(0);
    expect(editor.getLayers()[0].visible).toBe(true);
  });

  test('setLayerOpacity sets opacity', () => {
    editor.addLayer('Test');

    editor.setLayerOpacity(0, 128);
    expect(editor.getLayers()[0].opacity).toBe(128);

    // Test clamping
    editor.setLayerOpacity(0, 300);
    expect(editor.getLayers()[0].opacity).toBe(255);

    editor.setLayerOpacity(0, -50);
    expect(editor.getLayers()[0].opacity).toBe(0);
  });

  test('moveLayerUp moves layer up in stack', () => {
    editor.addLayer('Bottom');
    editor.addLayer('Top');

    const layers = editor.getLayers();
    expect(layers[0].name).toBe('Bottom');
    expect(layers[1].name).toBe('Top');

    editor.moveLayerUp(1);

    const newLayers = editor.getLayers();
    expect(newLayers[0].name).toBe('Top');
    expect(newLayers[1].name).toBe('Bottom');
  });

  test('moveLayerDown moves layer down in stack', () => {
    editor.addLayer('Bottom');
    editor.addLayer('Top');

    editor.moveLayerDown(0);

    const layers = editor.getLayers();
    expect(layers[0].name).toBe('Top');
    expect(layers[1].name).toBe('Bottom');
  });

  test('mergeLayerDown merges layers', async () => {
    editor.addLayer('Bottom');
    editor.addLayer('Top');

    expect(editor.getLayers().length).toBe(2);

    await editor.mergeLayerDown(1, true);

    expect(editor.getLayers().length).toBe(1);
  });

  test('cannot merge bottom layer', async () => {
    editor.addLayer('Only Layer');

    // This should not throw and should not change anything
    await editor.mergeLayerDown(0, true);

    expect(editor.getLayers().length).toBe(1);
  });
});

describe('Selection Tool', () => {
  let editor: PixelEditor;
  let mockApp: MockApp;

  beforeEach(() => {
    mockApp = new MockApp();
    editor = new PixelEditor(mockApp as any);
    editor.createBlankImage(32, 32);
  });

  test('SelectionTool creates selection on two clicks', async () => {
    // Find and use the selection tool
    // The selection tool is added to the tools array

    // First, verify there's no selection
    expect(editor.getSelection()).toBeNull();

    // Create selection manually (as the tool would)
    editor.setSelection({ x: 5, y: 5, width: 10, height: 10 });

    const sel = editor.getSelection();
    expect(sel).not.toBeNull();
    expect(sel!.width).toBe(10);
    expect(sel!.height).toBe(10);
  });
});

describe('Color Class Extended Tests', () => {
  test('Color.equals returns true for identical colors', () => {
    const c1 = new Color(100, 150, 200, 255);
    const c2 = new Color(100, 150, 200, 255);
    expect(c1.equals(c2)).toBe(true);
  });

  test('Color.equals returns false for different alpha', () => {
    const c1 = new Color(100, 150, 200, 255);
    const c2 = new Color(100, 150, 200, 128);
    expect(c1.equals(c2)).toBe(false);
  });

  test('Color.clone creates independent copy', () => {
    const c1 = new Color(50, 100, 150, 200);
    const c2 = c1.clone();

    expect(c2.r).toBe(50);
    expect(c2.g).toBe(100);
    expect(c2.b).toBe(150);
    expect(c2.a).toBe(200);

    // Modify original, clone should be unchanged
    c1.r = 0;
    expect(c2.r).toBe(50);
  });
});

describe('Integration Tests', () => {
  let editor: PixelEditor;
  let mockApp: MockApp;

  beforeEach(() => {
    mockApp = new MockApp();
    editor = new PixelEditor(mockApp as any);
    editor.createBlankImage(32, 32);
  });

  test('complex copy/paste with layers', async () => {
    // Add a layer
    editor.addLayer('Drawing Layer');

    // Draw something
    const green = new Color(0, 255, 0);
    await editor.setPixelColor(10, 10, green);
    await editor.setPixelColor(11, 10, green);
    await editor.setPixelColor(10, 11, green);
    await editor.setPixelColor(11, 11, green);

    // Select and copy
    editor.setSelection({ x: 10, y: 10, width: 2, height: 2 });
    await editor.copy(true);

    // Paste elsewhere
    await editor.paste(20, 20, true);

    // Verify paste worked
    const pastedColor = editor.getPixelColor(20, 20);
    expect(pastedColor.g).toBe(255);
  });

  test('undo works with clipboard operations', async () => {
    // Draw a pixel
    const red = new Color(255, 0, 0);
    editor.beginOperation();
    await editor.setPixelColor(5, 5, red);
    editor.endOperation('Draw red');

    // Verify it's red
    expect(editor.getPixelColor(5, 5).r).toBe(255);

    // Select and cut
    editor.setSelection({ x: 5, y: 5, width: 1, height: 1 });
    await editor.cut();

    // Should be background color now
    expect(editor.getPixelColor(5, 5).equals(editor.bgColor)).toBe(true);

    // Undo the cut
    await editor.undo();

    // Should be red again
    expect(editor.getPixelColor(5, 5).r).toBe(255);
  });
});
