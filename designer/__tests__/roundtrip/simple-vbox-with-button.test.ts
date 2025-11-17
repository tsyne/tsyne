/**
 * RoundTrip Test: Simple vbox with button
 * Tests hello.ts - a simple layout with vbox containing buttons
 */

import * as fs from 'fs';
import { loadFile, save, updateWidgetId, getDiff, examplePath, editedPath, cleanupEdited, findWidget } from './helpers';

describe('RoundTrip: Simple vbox with button (hello.ts)', () => {
  afterEach(() => {
    cleanupEdited('hello.ts');
  });

  test('load and save with no edits produces no diff', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');
    expect(result.success).toBe(true);

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const originalFile = examplePath('hello.ts');
    const editedFile = editedPath('hello.ts');

    expect(fs.existsSync(editedFile)).toBe(true);

    const diff = getDiff(originalFile, editedFile);
    expect(diff).toBe('');
  });

  test('adding .withId() to button', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');
    expect(result.success).toBe(true);

    // Find a button without an ID
    const buttonWidget = findWidget(result.metadata, 'button');
    expect(buttonWidget).toBeDefined();
    expect(buttonWidget.widgetId).toBeNull();

    // Add .withId('myButton')
    await updateWidgetId(buttonWidget.id, null, 'myButton');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('hello.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('myButton')");
  });

  test('renaming .withId()', async () => {
    // First add a .withId() to the file
    const result1 = await loadFile('tsyne/examples/hello.ts');
    const buttonWidget1 = findWidget(result1.metadata, 'button');
    await updateWidgetId(buttonWidget1.id, null, 'oldButtonId');
    await save();

    // Now load the edited file and rename the ID
    const result2 = await loadFile('tsyne/examples/hello.edited.ts');
    expect(result2.success).toBe(true);

    const buttonWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'oldButtonId');
    expect(buttonWidget2).toBeDefined();

    await updateWidgetId(buttonWidget2.id, 'oldButtonId', 'newButtonId');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('hello.edited.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('newButtonId')");
    expect(editedContent).not.toContain(".withId('oldButtonId')");
  });

  test('removing .withId()', async () => {
    // First add a .withId() to the file
    const result1 = await loadFile('tsyne/examples/hello.ts');
    const buttonWidget1 = findWidget(result1.metadata, 'button');
    await updateWidgetId(buttonWidget1.id, null, 'removeMe');
    await save();

    // Now load the edited file and remove the ID
    const result2 = await loadFile('tsyne/examples/hello.edited.ts');
    expect(result2.success).toBe(true);

    const buttonWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'removeMe');
    expect(buttonWidget2).toBeDefined();

    await updateWidgetId(buttonWidget2.id, 'removeMe', null);

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('hello.edited.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).not.toContain(".withId('removeMe')");
    expect(editedContent).not.toContain('.withId(');
  });

  test('adding .withId() to label widget', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');
    expect(result.success).toBe(true);

    // Find a label without an ID
    const labelWidget = findWidget(result.metadata, 'label');
    expect(labelWidget).toBeDefined();
    expect(labelWidget.widgetId).toBeNull();

    // Add .withId('titleLabel')
    await updateWidgetId(labelWidget.id, null, 'titleLabel');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('hello.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('titleLabel')");
  });

  test('adding .withId() to vbox container', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');
    expect(result.success).toBe(true);

    // Find the vbox container
    const vboxWidget = findWidget(result.metadata, 'vbox');
    expect(vboxWidget).toBeDefined();

    // Add .withId('mainContainer')
    await updateWidgetId(vboxWidget.id, null, 'mainContainer');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('hello.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('mainContainer')");
  });

  test('adding .withId() with special characters in ID', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');
    const buttonWidget = findWidget(result.metadata, 'button');

    // Add ID with underscores and numbers
    await updateWidgetId(buttonWidget.id, null, 'btn_click_01');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('hello.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('btn_click_01')");
  });

  test('renaming .withId() multiple times', async () => {
    // First add
    const result1 = await loadFile('tsyne/examples/hello.ts');
    const buttonWidget1 = findWidget(result1.metadata, 'button');
    await updateWidgetId(buttonWidget1.id, null, 'id1');
    await save();

    // Rename to id2
    const result2 = await loadFile('tsyne/examples/hello.edited.ts');
    const buttonWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'id1');
    await updateWidgetId(buttonWidget2.id, 'id1', 'id2');
    await save();

    // Rename to id3
    const result3 = await loadFile('tsyne/examples/hello.edited.ts');
    const buttonWidget3 = result3.metadata.widgets.find((w: any) => w.widgetId === 'id2');
    await updateWidgetId(buttonWidget3.id, 'id2', 'id3');
    await save();

    const editedFile = editedPath('hello.edited.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('id3')");
    expect(editedContent).not.toContain(".withId('id1')");
    expect(editedContent).not.toContain(".withId('id2')");
  });

  test('adding .withId() to multiple widgets', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result.metadata, 'button');
    const labelWidget = findWidget(result.metadata, 'label');
    const vboxWidget = findWidget(result.metadata, 'vbox');

    // Add IDs to all three
    await updateWidgetId(buttonWidget.id, null, 'actionBtn');
    await updateWidgetId(labelWidget.id, null, 'titleLbl');
    await updateWidgetId(vboxWidget.id, null, 'container');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('hello.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('actionBtn')");
    expect(editedContent).toContain(".withId('titleLbl')");
    expect(editedContent).toContain(".withId('container')");
  });

  test('load/save cycle preserves original file structure', async () => {
    // Load original
    const originalContent = fs.readFileSync(examplePath('hello.ts'), 'utf-8');
    const originalLines = originalContent.split('\n').length;

    // Load and save with no edits
    await loadFile('tsyne/examples/hello.ts');
    await save();

    const editedContent = fs.readFileSync(editedPath('hello.ts'), 'utf-8');
    const editedLines = editedContent.split('\n').length;

    // Line count should be roughly the same (allow small variance for trailing newlines)
    expect(Math.abs(editedLines - originalLines)).toBeLessThanOrEqual(2);
  });

  test('adding then immediately removing .withId()', async () => {
    const result1 = await loadFile('tsyne/examples/hello.ts');
    const buttonWidget1 = findWidget(result1.metadata, 'button');

    // Add ID
    await updateWidgetId(buttonWidget1.id, null, 'tempId');
    await save();

    // Immediately remove it
    const result2 = await loadFile('tsyne/examples/hello.edited.ts');
    const buttonWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'tempId');
    await updateWidgetId(buttonWidget2.id, 'tempId', null);
    await save();

    // Should be back to original (no .withId at all)
    const originalFile = examplePath('hello.ts');
    const editedFile = editedPath('hello.edited.ts');

    const diff = getDiff(originalFile, editedFile);
    expect(diff).toBe('');
  });

  test('verify widget metadata is captured correctly', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');
    expect(result.success).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.widgets).toBeDefined();

    // Should have at least: window, vbox, label(s), button(s)
    const widgetTypes = result.metadata.widgets.map((w: any) => w.widgetType);

    expect(widgetTypes).toContain('window');
    expect(widgetTypes).toContain('vbox');
    expect(widgetTypes).toContain('button');
  });

  test('source location metadata is accurate', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result.metadata, 'button');
    expect(buttonWidget.sourceLocation).toBeDefined();
    expect(buttonWidget.sourceLocation.line).toBeGreaterThan(0);
    expect(buttonWidget.sourceLocation.column).toBeGreaterThan(0);
    expect(buttonWidget.sourceLocation.file).toContain('hello');
  });

  test('widget properties are captured correctly', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const buttonWidget = findWidget(result.metadata, 'button');
    expect(buttonWidget.properties).toBeDefined();
    expect(buttonWidget.properties.text).toBeDefined();
    expect(typeof buttonWidget.properties.text).toBe('string');
  });

  test('parent-child relationships are tracked', async () => {
    const result = await loadFile('tsyne/examples/hello.ts');

    const vboxWidget = findWidget(result.metadata, 'vbox');
    const buttonWidget = findWidget(result.metadata, 'button');

    // Button should have vbox as parent
    expect(buttonWidget.parent).toBe(vboxWidget.id);
  });
});
