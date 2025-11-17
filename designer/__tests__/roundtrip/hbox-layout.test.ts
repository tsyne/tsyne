/**
 * RoundTrip Test: HBox Horizontal Layout
 * Tests hbox-example.ts - horizontal layouts and nested containers
 */

import * as fs from 'fs';
import { loadFile, save, updateWidgetId, getDiff, examplePath, editedPath, cleanupEdited, findWidget } from './helpers';

describe('RoundTrip: HBox Horizontal Layout (hbox-example.ts)', () => {
  afterEach(() => {
    cleanupEdited('hbox-example.ts');
  });

  test('load and save with no edits produces no diff', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');
    expect(result.success).toBe(true);

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const originalFile = examplePath('hbox-example.ts');
    const editedFile = editedPath('hbox-example.ts');

    expect(fs.existsSync(editedFile)).toBe(true);

    const diff = getDiff(originalFile, editedFile);
    expect(diff).toBe('');
  });

  test('adding .withId() to hbox container', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');
    expect(result.success).toBe(true);

    // Find first hbox
    const hboxWidget = findWidget(result.metadata, 'hbox');
    expect(hboxWidget).toBeDefined();

    await updateWidgetId(hboxWidget.id, null, 'buttonGroup');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('hbox-example.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('buttonGroup')");
  });

  test('adding .withId() to buttons inside hbox', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    // Find buttons by their text
    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');
    const leftBtn = buttons.find((b: any) => b.properties.text === 'Left');
    const centerBtn = buttons.find((b: any) => b.properties.text === 'Center');
    const rightBtn = buttons.find((b: any) => b.properties.text === 'Right');

    expect(leftBtn).toBeDefined();
    expect(centerBtn).toBeDefined();
    expect(rightBtn).toBeDefined();

    // Add IDs to all three
    await updateWidgetId(leftBtn.id, null, 'leftBtn');
    await updateWidgetId(centerBtn.id, null, 'centerBtn');
    await updateWidgetId(rightBtn.id, null, 'rightBtn');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('hbox-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('leftBtn')");
    expect(editedContent).toContain(".withId('centerBtn')");
    expect(editedContent).toContain(".withId('rightBtn')");
  });

  test('verify hbox parent-child relationships', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    const hboxWidget = findWidget(result.metadata, 'hbox');
    const buttons = result.metadata.widgets.filter((w: any) =>
      w.widgetType === 'button' && w.parent === hboxWidget.id
    );

    // First hbox should have 3 buttons as children
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  test('adding .withId() to nested vbox inside hbox', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    // Find vbox containers (should be nested inside second hbox)
    const vboxes = result.metadata.widgets.filter((w: any) => w.widgetType === 'vbox');

    // Should have at least one vbox (the main container) plus nested ones
    expect(vboxes.length).toBeGreaterThan(1);

    // Find a nested vbox (not the root one)
    const nestedVbox = vboxes.find((v: any) => {
      const parent = result.metadata.widgets.find((w: any) => w.id === v.parent);
      return parent && parent.widgetType === 'hbox';
    });

    expect(nestedVbox).toBeDefined();

    await updateWidgetId(nestedVbox.id, null, 'column1');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('hbox-example.ts'), 'utf-8');
    expect(editedContent).toContain(".withId('column1')");
  });

  test('renaming .withId() on hbox', async () => {
    const result1 = await loadFile('tsyne/examples/hbox-example.ts');
    const hboxWidget = findWidget(result1.metadata, 'hbox');

    await updateWidgetId(hboxWidget.id, null, 'oldHboxId');
    await save();

    const result2 = await loadFile('tsyne/examples/hbox-example.edited.ts');
    const hboxWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'oldHboxId');

    await updateWidgetId(hboxWidget2.id, 'oldHboxId', 'newHboxId');
    await save();

    const editedContent = fs.readFileSync(editedPath('hbox-example.edited.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('newHboxId')");
    expect(editedContent).not.toContain(".withId('oldHboxId')");
  });

  test('removing .withId() from hbox', async () => {
    const result1 = await loadFile('tsyne/examples/hbox-example.ts');
    const hboxWidget = findWidget(result1.metadata, 'hbox');

    await updateWidgetId(hboxWidget.id, null, 'tempHbox');
    await save();

    const result2 = await loadFile('tsyne/examples/hbox-example.edited.ts');
    const hboxWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'tempHbox');

    await updateWidgetId(hboxWidget2.id, 'tempHbox', null);
    await save();

    const editedContent = fs.readFileSync(editedPath('hbox-example.edited.ts'), 'utf-8');

    expect(editedContent).not.toContain(".withId('tempHbox')");
  });

  test('verify multiple hbox containers are tracked', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    const hboxes = result.metadata.widgets.filter((w: any) => w.widgetType === 'hbox');

    // Should have at least 2 hbox containers
    expect(hboxes.length).toBeGreaterThanOrEqual(2);
  });

  test('adding .withId() to all containers in nested layout', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    const mainVbox = result.metadata.widgets.find((w: any) =>
      w.widgetType === 'vbox' && w.parent &&
      result.metadata.widgets.find((p: any) => p.id === w.parent && p.widgetType === 'window')
    );

    const hboxes = result.metadata.widgets.filter((w: any) => w.widgetType === 'hbox');
    const nestedVboxes = result.metadata.widgets.filter((w: any) => {
      if (w.widgetType !== 'vbox') return false;
      const parent = result.metadata.widgets.find((p: any) => p.id === w.parent);
      return parent && parent.widgetType === 'hbox';
    });

    // Add IDs to all containers
    if (mainVbox) await updateWidgetId(mainVbox.id, null, 'mainContainer');
    if (hboxes[0]) await updateWidgetId(hboxes[0].id, null, 'buttonRow');
    if (hboxes[1]) await updateWidgetId(hboxes[1].id, null, 'nestedRow');
    if (nestedVboxes[0]) await updateWidgetId(nestedVboxes[0].id, null, 'col1');
    if (nestedVboxes[1]) await updateWidgetId(nestedVboxes[1].id, null, 'col2');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('hbox-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('buttonRow')");
    expect(editedContent).toContain(".withId('nestedRow')");
  });

  test('verify widget count is consistent across load cycles', async () => {
    const result1 = await loadFile('tsyne/examples/hbox-example.ts');
    const widgetCount1 = result1.metadata.widgets.length;

    await save();

    const result2 = await loadFile('tsyne/examples/hbox-example.edited.ts');
    const widgetCount2 = result2.metadata.widgets.length;

    // Widget count should be identical
    expect(widgetCount2).toBe(widgetCount1);
  });

  test('hbox with empty content preserves structure', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');
    const hboxWidget = findWidget(result.metadata, 'hbox');

    // Just add an ID, no other changes
    await updateWidgetId(hboxWidget.id, null, 'testHbox');
    await save();

    const editedContent = fs.readFileSync(editedPath('hbox-example.ts'), 'utf-8');

    // Should still have the hbox structure
    expect(editedContent).toContain('hbox(() => {');
    expect(editedContent).toContain(".withId('testHbox')");
  });

  test('adding .withId() to labels in different columns', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    // Find labels
    const labels = result.metadata.widgets.filter((w: any) => w.widgetType === 'label');
    const col1Label = labels.find((l: any) => l.properties.text === 'Column 1');
    const col2Label = labels.find((l: any) => l.properties.text === 'Column 2');

    expect(col1Label).toBeDefined();
    expect(col2Label).toBeDefined();

    await updateWidgetId(col1Label.id, null, 'col1Label');
    await updateWidgetId(col2Label.id, null, 'col2Label');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('hbox-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('col1Label')");
    expect(editedContent).toContain(".withId('col2Label')");
  });

  test('complex scenario: IDs on nested hbox and vbox structure', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    // Find second hbox (the one with nested vboxes)
    const hboxes = result.metadata.widgets.filter((w: any) => w.widgetType === 'hbox');
    const nestedHbox = hboxes[1];

    // Find vboxes inside this hbox
    const vboxesInHbox = result.metadata.widgets.filter((w: any) =>
      w.widgetType === 'vbox' && w.parent === nestedHbox.id
    );

    expect(nestedHbox).toBeDefined();
    expect(vboxesInHbox.length).toBeGreaterThanOrEqual(2);

    // Add IDs to the nested structure
    await updateWidgetId(nestedHbox.id, null, 'columnsContainer');
    await updateWidgetId(vboxesInHbox[0].id, null, 'leftColumn');
    await updateWidgetId(vboxesInHbox[1].id, null, 'rightColumn');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('hbox-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('columnsContainer')");
    expect(editedContent).toContain(".withId('leftColumn')");
    expect(editedContent).toContain(".withId('rightColumn')");

    // Verify structure is maintained
    expect(editedContent).toContain('hbox(() => {');
    expect(editedContent).toContain('vbox(() => {');
  });

  test('file structure integrity after nested edits', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    // Make multiple edits across different levels
    const hbox = findWidget(result.metadata, 'hbox');
    const button = findWidget(result.metadata, 'button');
    const label = findWidget(result.metadata, 'label');

    await updateWidgetId(hbox.id, null, 'h1');
    await updateWidgetId(button.id, null, 'b1');
    await updateWidgetId(label.id, null, 'l1');

    await save();

    const originalFile = examplePath('hbox-example.ts');
    const editedFile = editedPath('hbox-example.ts');

    const originalLines = fs.readFileSync(originalFile, 'utf-8').split('\n').length;
    const editedLines = fs.readFileSync(editedFile, 'utf-8').split('\n').length;

    // Line count should be similar (allowing for .withId() additions)
    expect(Math.abs(editedLines - originalLines)).toBeLessThan(10);
  });

  test('verify all buttons maintain event handlers', async () => {
    const result = await loadFile('tsyne/examples/hbox-example.ts');

    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');

    // All buttons should have event handlers
    buttons.forEach((btn: any) => {
      expect(btn.eventHandlers).toBeDefined();
      if (btn.properties.text !== 'Action 1' && btn.properties.text !== 'Action 2') {
        // The main buttons should have onClick handlers
        expect(btn.eventHandlers.onClick).toBeDefined();
      }
    });
  });
});
