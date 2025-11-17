/**
 * RoundTrip Test: Counter with state management
 * Tests 02-counter.ts - demonstrates state management with multiple buttons
 */

import * as fs from 'fs';
import { loadFile, save, updateWidgetId, getDiff, examplePath, editedPath, cleanupEdited, findWidget } from './helpers';

describe('RoundTrip: Counter with state (02-counter.ts)', () => {
  afterEach(() => {
    cleanupEdited('02-counter.ts');
  });

  test('load and save with no edits produces no diff', async () => {
    const result = await loadFile('tsyne/examples/02-counter.ts');
    expect(result.success).toBe(true);

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const originalFile = examplePath('02-counter.ts');
    const editedFile = editedPath('02-counter.ts');

    expect(fs.existsSync(editedFile)).toBe(true);

    const diff = getDiff(originalFile, editedFile);
    expect(diff).toBe('');
  });

  test('adding .withId() to multiple buttons', async () => {
    const result = await loadFile('tsyne/examples/02-counter.ts');
    expect(result.success).toBe(true);

    // Find the increment button
    const incrementBtn = findWidget(result.metadata, 'button', { name: 'text', value: 'Increment' });
    expect(incrementBtn).toBeDefined();

    // Find the decrement button
    const decrementBtn = findWidget(result.metadata, 'button', { name: 'text', value: 'Decrement' });
    expect(decrementBtn).toBeDefined();

    // Add IDs to both
    await updateWidgetId(incrementBtn.id, null, 'incrementBtn');
    await updateWidgetId(decrementBtn.id, null, 'decrementBtn');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('02-counter.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('incrementBtn')");
    expect(editedContent).toContain(".withId('decrementBtn')");
  });

  test('renaming .withId() on specific button', async () => {
    // First add IDs
    const result1 = await loadFile('tsyne/examples/02-counter.ts');
    const resetBtn1 = findWidget(result1.metadata, 'button', { name: 'text', value: 'Reset' });
    await updateWidgetId(resetBtn1.id, null, 'resetButton');
    await save();

    // Now rename it
    const result2 = await loadFile('tsyne/examples/02-counter.edited.ts');
    const resetBtn2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'resetButton');
    expect(resetBtn2).toBeDefined();

    await updateWidgetId(resetBtn2.id, 'resetButton', 'clearButton');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('02-counter.edited.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('clearButton')");
    expect(editedContent).not.toContain(".withId('resetButton')");
  });

  test('removing .withId() from one of many buttons', async () => {
    // First add IDs to all buttons
    const result1 = await loadFile('tsyne/examples/02-counter.ts');
    const buttons = result1.metadata.widgets.filter((w: any) => w.widgetType === 'button');

    await updateWidgetId(buttons[0].id, null, 'btn1');
    await updateWidgetId(buttons[1].id, null, 'btn2');
    await updateWidgetId(buttons[2].id, null, 'btn3');
    await save();

    // Now remove one ID
    const result2 = await loadFile('tsyne/examples/02-counter.edited.ts');
    const btn2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'btn2');
    expect(btn2).toBeDefined();

    await updateWidgetId(btn2.id, 'btn2', null);

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('02-counter.edited.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    // btn1 and btn3 should remain, btn2 should be gone
    expect(editedContent).toContain(".withId('btn1')");
    expect(editedContent).not.toContain(".withId('btn2')");
    expect(editedContent).toContain(".withId('btn3')");
  });
});
