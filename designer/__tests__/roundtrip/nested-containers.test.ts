/**
 * RoundTrip Test: Nested containers (vbox + hbox)
 * Tests 03-button-spacer.ts - demonstrates nested layout containers
 */

import * as fs from 'fs';
import { loadFile, save, updateWidgetId, getDiff, examplePath, editedPath, cleanupEdited, findWidget } from './helpers';

describe('RoundTrip: Nested containers (03-button-spacer.ts)', () => {
  afterEach(() => {
    cleanupEdited('03-button-spacer.ts');
  });

  test('load and save with no edits produces no diff', async () => {
    const result = await loadFile('tsyne/examples/03-button-spacer.ts');
    expect(result.success).toBe(true);

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const originalFile = examplePath('03-button-spacer.ts');
    const editedFile = editedPath('03-button-spacer.ts');

    expect(fs.existsSync(editedFile)).toBe(true);

    const diff = getDiff(originalFile, editedFile);
    expect(diff).toBe('');
  });

  test('adding .withId() to container and widgets', async () => {
    const result = await loadFile('tsyne/examples/03-button-spacer.ts');
    expect(result.success).toBe(true);

    // Find the vbox container
    const vboxWidget = findWidget(result.metadata, 'vbox');
    expect(vboxWidget).toBeDefined();

    // Find the button
    const buttonWidget = findWidget(result.metadata, 'button');
    expect(buttonWidget).toBeDefined();

    // Add IDs to both container and widget
    await updateWidgetId(vboxWidget.id, null, 'mainContainer');
    await updateWidgetId(buttonWidget.id, null, 'clickButton');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('03-button-spacer.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('mainContainer')");
    expect(editedContent).toContain(".withId('clickButton')");
  });

  test('renaming .withId() on nested widgets', async () => {
    // First add IDs
    const result1 = await loadFile('tsyne/examples/03-button-spacer.ts');
    const labels = result1.metadata.widgets.filter((w: any) => w.widgetType === 'label');

    // Add ID to the first label
    await updateWidgetId(labels[0].id, null, 'statusLabel');
    await save();

    // Now rename it
    const result2 = await loadFile('tsyne/examples/03-button-spacer.edited.ts');
    const statusLabel = result2.metadata.widgets.find((w: any) => w.widgetId === 'statusLabel');
    expect(statusLabel).toBeDefined();

    await updateWidgetId(statusLabel.id, 'statusLabel', 'messageLabel');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('03-button-spacer.edited.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('messageLabel')");
    expect(editedContent).not.toContain(".withId('statusLabel')");
  });

  test('removing .withId() from container', async () => {
    // First add ID to the vbox
    const result1 = await loadFile('tsyne/examples/03-button-spacer.ts');
    const vboxWidget = findWidget(result1.metadata, 'vbox');
    await updateWidgetId(vboxWidget.id, null, 'containerBox');
    await save();

    // Now remove it
    const result2 = await loadFile('tsyne/examples/03-button-spacer.edited.ts');
    const containerBox = result2.metadata.widgets.find((w: any) => w.widgetId === 'containerBox');
    expect(containerBox).toBeDefined();

    await updateWidgetId(containerBox.id, 'containerBox', null);

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('03-button-spacer.edited.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).not.toContain(".withId('containerBox')");
  });
});
