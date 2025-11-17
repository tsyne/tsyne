/**
 * RoundTrip Test: Property Edits
 * Tests that property changes (text, className, etc.) are correctly applied and saved
 */

import * as fs from 'fs';
import {
  loadFile,
  save,
  updateProperty,
  updateWidgetId,
  getDiff,
  examplePath,
  editedPath,
  cleanupEdited,
  findWidget
} from './helpers';

describe('RoundTrip: Property Edits', () => {
  afterEach(() => {
    cleanupEdited('hello.ts');
  });

  test('changing button text property', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');
    expect(result.success).toBe(true);

    // Find a button
    const buttonWidget = findWidget(result.metadata, 'button');
    expect(buttonWidget).toBeDefined();

    const originalText = buttonWidget.properties.text;
    expect(originalText).toBeDefined();

    // Change the button text
    await updateProperty(buttonWidget.id, 'text', 'Updated Button Text');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    // Verify the change was saved in the returned content
    expect(saveResult.content).toContain('Updated Button Text');
    expect(saveResult.content).not.toContain(originalText);
  });

  test('changing button className property', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result.metadata, 'button', {
      name: 'className',
      value: 'primaryButton'
    });
    expect(buttonWidget).toBeDefined();
    expect(buttonWidget.properties.className).toBe('primaryButton');

    // Change className from 'primaryButton' to 'dangerButton'
    await updateProperty(buttonWidget.id, 'className', 'dangerButton');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    // Find the button call and verify className changed in returned content
    // Should change from: button("...", ..., "primaryButton")
    // To: button("...", ..., "dangerButton")
    expect(saveResult.content).toContain(', "dangerButton")');
  });

  test('changing label text property', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const labelWidget = findWidget(result.metadata, 'label');
    expect(labelWidget).toBeDefined();

    const originalText = labelWidget.properties.text;

    // Change label text
    await updateProperty(labelWidget.id, 'text', 'Modified Label');

    const saveResult = await save();

    expect(saveResult.content).toContain('Modified Label');
    expect(saveResult.content).not.toContain(originalText);
  });

  test('changing label className property', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const labelWidget = findWidget(result.metadata, 'label', {
      name: 'className',
      value: 'title'
    });
    expect(labelWidget).toBeDefined();

    // Change className
    await updateProperty(labelWidget.id, 'className', 'subtitle');

    const saveResult = await save();

    // Verify className changed in the source
    expect(saveResult.content).toContain('subtitle');
  });

  test('multiple property changes in sequence', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result.metadata, 'button');
    const labelWidget = findWidget(result.metadata, 'label');

    // Change multiple properties
    await updateProperty(buttonWidget.id, 'text', 'New Button');
    await updateProperty(buttonWidget.id, 'className', 'customButton');
    await updateProperty(labelWidget.id, 'text', 'New Label');

    const saveResult = await save();

    expect(saveResult.content).toContain('New Button');
    expect(saveResult.content).toContain('customButton');
    expect(saveResult.content).toContain('New Label');
  });

  test('property change combined with .withId()', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result.metadata, 'button');

    // Change property AND add ID
    await updateProperty(buttonWidget.id, 'text', 'Action Button');
    await updateWidgetId(buttonWidget.id, null, 'actionBtn');

    const saveResult = await save();

    // Both changes should be present
    expect(saveResult.content).toContain('Action Button');
    expect(saveResult.content).toContain(".withId('actionBtn')");
  });

  test('verify property change appears in correct location', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    // Find the "Exit" button specifically
    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');
    const exitButton = buttons.find((b: any) => b.properties.text === 'Exit');

    expect(exitButton).toBeDefined();

    // Change its text
    await updateProperty(exitButton.id, 'text', 'Quit');

    const saveResult = await save();

    // Should have changed "Exit" to "Quit" but not other buttons
    expect(saveResult.content).toContain('Quit');
    expect(saveResult.content).not.toContain('Exit');
  });

  test('property change preserves other properties', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result.metadata, 'button', {
      name: 'className',
      value: 'primaryButton'
    });

    const originalText = buttonWidget.properties.text;

    // Change ONLY className, not text
    await updateProperty(buttonWidget.id, 'className', 'newClass');

    const saveResult = await save();

    // Text should remain unchanged, className should change
    expect(saveResult.content).toContain(originalText);
    expect(saveResult.content).toContain('newClass');
  });

  test('changing text to empty string', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const labelWidget = findWidget(result.metadata, 'label');

    // Set text to empty
    await updateProperty(labelWidget.id, 'text', '');

    const saveResult = await save();

    // Should have label("")
    expect(saveResult.content).toContain('label("")');
  });

  test('changing text with special characters', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result.metadata, 'button');

    // Set text with quotes and special chars
    await updateProperty(buttonWidget.id, 'text', 'Click "Here" & Go!');

    const saveResult = await save();

    // Should properly escape the text
    expect(saveResult.content).toContain('Click "Here" & Go!');
  });

  test('round-trip: change property then revert', async () => {
    const result1 = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result1.metadata, 'button');
    const originalText = buttonWidget.properties.text;

    // Change text
    await updateProperty(buttonWidget.id, 'text', 'Temporary Text');
    await save();

    // Load edited file and change back
    const result2 = await loadFile('tsyne/examples/hello.edited.ts');
    const buttonWidget2 = result2.metadata.widgets.find((w: any) =>
      w.widgetType === 'button' && w.properties.text === 'Temporary Text'
    );

    await updateProperty(buttonWidget2.id, 'text', originalText);
    await save();

    // Should be back to original
    const originalFile = examplePath('hello.ts');
    const editedFile = editedPath('hello.edited.ts');

    const diff = getDiff(originalFile, editedFile);
    expect(diff).toBe('');
  });

  test('verify metadata reflects property change before save', async () => {
    const result1 = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget1 = findWidget(result1.metadata, 'button');
    const originalText = buttonWidget1.properties.text;

    // Update property
    const updateResult = await updateProperty(buttonWidget1.id, 'text', 'New Text');
    expect(updateResult.success).toBe(true);

    // Metadata should be updated immediately
    expect(updateResult.metadata).toBeDefined();
    const buttonWidget2 = updateResult.metadata.widgets.find((w: any) => w.id === buttonWidget1.id);
    expect(buttonWidget2.properties.text).toBe('New Text');
    expect(buttonWidget2.properties.text).not.toBe(originalText);
  });

  test('changing multiple buttons independently', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    // Change different properties on different buttons
    await updateProperty(buttons[0].id, 'text', 'First Button');
    await updateProperty(buttons[1].id, 'text', 'Second Button');

    const saveResult = await save();

    expect(saveResult.content).toContain('First Button');
    expect(saveResult.content).toContain('Second Button');
  });

  test('property change on nested widget', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    // Find a widget inside vbox
    const vboxWidget = findWidget(result.metadata, 'vbox');
    const childWidgets = result.metadata.widgets.filter((w: any) => w.parent === vboxWidget.id);

    expect(childWidgets.length).toBeGreaterThan(0);

    const childButton = childWidgets.find((w: any) => w.widgetType === 'button');
    expect(childButton).toBeDefined();

    // Change property on nested widget
    await updateProperty(childButton.id, 'text', 'Nested Button Text');

    const saveResult = await save();

    expect(saveResult.content).toContain('Nested Button Text');
  });

  test('property change maintains file structure', async () => {
    const originalContent = fs.readFileSync(examplePath('hello.ts'), 'utf-8');
    const originalLines = originalContent.split('\n').length;

    const result = await loadFile('tsyne/examples/hello.ts');
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'text', 'Changed');

    const saveResult = await save();

    const editedLines = saveResult.content.split('\n').length;

    // Line count should be very similar (text changes don't add/remove lines)
    expect(Math.abs(editedLines - originalLines)).toBeLessThanOrEqual(1);
  });
});
