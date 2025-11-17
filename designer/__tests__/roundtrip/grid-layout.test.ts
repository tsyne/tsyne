/**
 * RoundTrip Test: Grid Layout
 * Tests grid-example.ts - grid layouts with multiple columns and nested content
 */

import * as fs from 'fs';
import { loadFile, save, updateWidgetId, getDiff, examplePath, editedPath, cleanupEdited, findWidget } from './helpers';

describe('RoundTrip: Grid Layout (grid-example.ts)', () => {
  afterEach(() => {
    cleanupEdited('grid-example.ts');
  });

  test('load and save with no edits produces no diff', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');
    expect(result.success).toBe(true);

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const originalFile = examplePath('grid-example.ts');
    const editedFile = editedPath('grid-example.ts');

    expect(fs.existsSync(editedFile)).toBe(true);

    const diff = getDiff(originalFile, editedFile);
    expect(diff).toBe('');
  });

  test('adding .withId() to grid container', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');
    expect(result.success).toBe(true);

    // Find first grid
    const gridWidget = findWidget(result.metadata, 'grid');
    expect(gridWidget).toBeDefined();

    await updateWidgetId(gridWidget.id, null, 'labelGrid');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedFile = editedPath('grid-example.ts');
    const editedContent = fs.readFileSync(editedFile, 'utf-8');

    expect(editedContent).toContain(".withId('labelGrid')");
  });

  test('renaming .withId() on grid', async () => {
    const result1 = await loadFile('tsyne/examples/grid-example.ts');
    const gridWidget = findWidget(result1.metadata, 'grid');

    await updateWidgetId(gridWidget.id, null, 'oldGridId');
    await save();

    const result2 = await loadFile('tsyne/examples/grid-example.edited.ts');
    const gridWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'oldGridId');

    await updateWidgetId(gridWidget2.id, 'oldGridId', 'newGridId');
    await save();

    const editedContent = fs.readFileSync(editedPath('grid-example.edited.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('newGridId')");
    expect(editedContent).not.toContain(".withId('oldGridId')");
  });

  test('removing .withId() from grid', async () => {
    const result1 = await loadFile('tsyne/examples/grid-example.ts');
    const gridWidget = findWidget(result1.metadata, 'grid');

    await updateWidgetId(gridWidget.id, null, 'tempGrid');
    await save();

    const result2 = await loadFile('tsyne/examples/grid-example.edited.ts');
    const gridWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'tempGrid');

    await updateWidgetId(gridWidget2.id, 'tempGrid', null);
    await save();

    const editedContent = fs.readFileSync(editedPath('grid-example.edited.ts'), 'utf-8');

    expect(editedContent).not.toContain(".withId('tempGrid')");
  });

  test('verify grid has columns property', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    const gridWidgets = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');

    expect(gridWidgets.length).toBeGreaterThanOrEqual(3);

    // First grid should have 2 columns
    expect(gridWidgets[0].properties.columns).toBe(2);

    // Second grid should have 3 columns
    expect(gridWidgets[1].properties.columns).toBe(3);

    // Third grid should have 2 columns
    expect(gridWidgets[2].properties.columns).toBe(2);
  });

  test('adding .withId() to all grids', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');

    expect(grids.length).toBeGreaterThanOrEqual(3);

    await updateWidgetId(grids[0].id, null, 'labelGrid');
    await updateWidgetId(grids[1].id, null, 'buttonGrid');
    await updateWidgetId(grids[2].id, null, 'nestedGrid');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('labelGrid')");
    expect(editedContent).toContain(".withId('buttonGrid')");
    expect(editedContent).toContain(".withId('nestedGrid')");
  });

  test('adding .withId() to labels in grid cells', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    // Find labels in the first grid
    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');
    const firstGrid = grids[0];

    const labelsInGrid = result.metadata.widgets.filter((w: any) =>
      w.widgetType === 'label' && w.parent === firstGrid.id
    );

    expect(labelsInGrid.length).toBeGreaterThanOrEqual(4);

    // Add IDs to grid cell labels
    await updateWidgetId(labelsInGrid[0].id, null, 'cell_1_1');
    await updateWidgetId(labelsInGrid[1].id, null, 'cell_1_2');
    await updateWidgetId(labelsInGrid[2].id, null, 'cell_2_1');
    await updateWidgetId(labelsInGrid[3].id, null, 'cell_2_2');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('cell_1_1')");
    expect(editedContent).toContain(".withId('cell_1_2')");
    expect(editedContent).toContain(".withId('cell_2_1')");
    expect(editedContent).toContain(".withId('cell_2_2')");
  });

  test('adding .withId() to buttons in 3-column grid', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');

    // Find buttons 1-6 in the button grid
    const btn1 = buttons.find((b: any) => b.properties.text === 'Button 1');
    const btn2 = buttons.find((b: any) => b.properties.text === 'Button 2');
    const btn3 = buttons.find((b: any) => b.properties.text === 'Button 3');
    const btn4 = buttons.find((b: any) => b.properties.text === 'Button 4');
    const btn5 = buttons.find((b: any) => b.properties.text === 'Button 5');
    const btn6 = buttons.find((b: any) => b.properties.text === 'Button 6');

    expect(btn1).toBeDefined();
    expect(btn6).toBeDefined();

    await updateWidgetId(btn1.id, null, 'gridBtn1');
    await updateWidgetId(btn2.id, null, 'gridBtn2');
    await updateWidgetId(btn3.id, null, 'gridBtn3');
    await updateWidgetId(btn4.id, null, 'gridBtn4');
    await updateWidgetId(btn5.id, null, 'gridBtn5');
    await updateWidgetId(btn6.id, null, 'gridBtn6');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('gridBtn1')");
    expect(editedContent).toContain(".withId('gridBtn6')");
  });

  test('verify grid parent-child relationships', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');
    const firstGrid = grids[0];

    const children = result.metadata.widgets.filter((w: any) => w.parent === firstGrid.id);

    // First grid should have 4 children (2x2 grid)
    expect(children.length).toBe(4);
  });

  test('adding .withId() to nested vbox in grid', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    // Find the third grid (nested one)
    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');
    const nestedGrid = grids[2];

    // Find vboxes inside this grid
    const vboxesInGrid = result.metadata.widgets.filter((w: any) =>
      w.widgetType === 'vbox' && w.parent === nestedGrid.id
    );

    expect(vboxesInGrid.length).toBeGreaterThanOrEqual(2);

    await updateWidgetId(vboxesInGrid[0].id, null, 'columnA');
    await updateWidgetId(vboxesInGrid[1].id, null, 'columnB');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('columnA')");
    expect(editedContent).toContain(".withId('columnB')");
  });

  test('complex scenario: IDs on grid and all its children', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');
    const secondGrid = grids[1]; // Button grid

    // Add ID to the grid itself
    await updateWidgetId(secondGrid.id, null, 'buttonMatrix');

    // Add IDs to all buttons in the grid
    const buttonsInGrid = result.metadata.widgets.filter((w: any) =>
      w.widgetType === 'button' && w.parent === secondGrid.id
    );

    for (let i = 0; i < buttonsInGrid.length; i++) {
      await updateWidgetId(buttonsInGrid[i].id, null, `matrixBtn${i + 1}`);
    }

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('buttonMatrix')");
    expect(editedContent).toContain(".withId('matrixBtn1')");
    expect(editedContent).toContain(".withId('matrixBtn6')");
  });

  test('grid structure preserved with different column counts', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');

    // Add IDs to verify structure preservation
    await updateWidgetId(grids[0].id, null, 'grid2col');
    await updateWidgetId(grids[1].id, null, 'grid3col');

    await save();

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    // Verify grid constructor calls preserve column counts
    expect(editedContent).toMatch(/grid\(2,[\s\S]*?\.withId\('grid2col'\)/);
    expect(editedContent).toMatch(/grid\(3,[\s\S]*?\.withId\('grid3col'\)/);
  });

  test('verify widget count consistency in grids', async () => {
    const result1 = await loadFile('tsyne/examples/grid-example.ts');
    const widgetCount1 = result1.metadata.widgets.length;

    await save();

    const result2 = await loadFile('tsyne/examples/grid-example.edited.ts');
    const widgetCount2 = result2.metadata.widgets.length;

    expect(widgetCount2).toBe(widgetCount1);
  });

  test('adding .withId() to buttons in nested grid structure', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    // Find buttons A1, A2, B1, B2
    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');

    const a1 = buttons.find((b: any) => b.properties.text === 'A1');
    const a2 = buttons.find((b: any) => b.properties.text === 'A2');
    const b1 = buttons.find((b: any) => b.properties.text === 'B1');
    const b2 = buttons.find((b: any) => b.properties.text === 'B2');

    expect(a1).toBeDefined();
    expect(b2).toBeDefined();

    await updateWidgetId(a1.id, null, 'btnA1');
    await updateWidgetId(a2.id, null, 'btnA2');
    await updateWidgetId(b1.id, null, 'btnB1');
    await updateWidgetId(b2.id, null, 'btnB2');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('btnA1')");
    expect(editedContent).toContain(".withId('btnA2')");
    expect(editedContent).toContain(".withId('btnB1')");
    expect(editedContent).toContain(".withId('btnB2')");
  });

  test('multiple grids each with different IDs', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');

    expect(grids.length).toBeGreaterThanOrEqual(3);

    // Add unique ID to each grid
    for (let i = 0; i < grids.length; i++) {
      await updateWidgetId(grids[i].id, null, `grid_${i + 1}`);
    }

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('grid_1')");
    expect(editedContent).toContain(".withId('grid_2')");
    expect(editedContent).toContain(".withId('grid_3')");
  });

  test('file structure integrity after grid edits', async () => {
    const originalContent = fs.readFileSync(examplePath('grid-example.ts'), 'utf-8');
    const originalLines = originalContent.split('\n').length;

    const result = await loadFile('tsyne/examples/grid-example.ts');

    const grid = findWidget(result.metadata, 'grid');
    const button = findWidget(result.metadata, 'button');
    const label = findWidget(result.metadata, 'label');

    await updateWidgetId(grid.id, null, 'g1');
    await updateWidgetId(button.id, null, 'b1');
    await updateWidgetId(label.id, null, 'l1');

    await save();

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');
    const editedLines = editedContent.split('\n').length;

    // Should maintain similar line count
    expect(Math.abs(editedLines - originalLines)).toBeLessThan(10);
  });

  test('verify all grid event handlers are preserved', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');

    // Count buttons with onClick handlers
    const buttonsWithHandlers = buttons.filter((b: any) => b.eventHandlers.onClick);

    // Should have at least 6 buttons with handlers (Button 1-6)
    expect(buttonsWithHandlers.length).toBeGreaterThanOrEqual(6);
  });

  test('adding and removing .withId() from grid maintains structure', async () => {
    const result1 = await loadFile('tsyne/examples/grid-example.ts');
    const grid = findWidget(result1.metadata, 'grid');

    await updateWidgetId(grid.id, null, 'tempGrid');
    await save();

    const result2 = await loadFile('tsyne/examples/grid-example.edited.ts');
    const grid2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'tempGrid');

    await updateWidgetId(grid2.id, 'tempGrid', null);
    await save();

    // Should be back to original
    const originalFile = examplePath('grid-example.ts');
    const editedFile = editedPath('grid-example.edited.ts');

    const diff = getDiff(originalFile, editedFile);
    expect(diff).toBe('');
  });

  test('comprehensive: IDs on entire grid hierarchy', async () => {
    const result = await loadFile('tsyne/examples/grid-example.ts');

    // Third grid with nested vboxes
    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');
    const nestedGrid = grids[2];

    const vboxes = result.metadata.widgets.filter((w: any) =>
      w.widgetType === 'vbox' && w.parent === nestedGrid.id
    );

    const labels = result.metadata.widgets.filter((w: any) => w.widgetType === 'label');
    const colALabel = labels.find((l: any) => l.properties.text === 'Column A');
    const colBLabel = labels.find((l: any) => l.properties.text === 'Column B');

    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');
    const a1 = buttons.find((b: any) => b.properties.text === 'A1');
    const b1 = buttons.find((b: any) => b.properties.text === 'B1');

    // Add IDs to entire hierarchy
    await updateWidgetId(nestedGrid.id, null, 'mainGrid');
    await updateWidgetId(vboxes[0].id, null, 'colA');
    await updateWidgetId(vboxes[1].id, null, 'colB');
    await updateWidgetId(colALabel.id, null, 'labelA');
    await updateWidgetId(colBLabel.id, null, 'labelB');
    await updateWidgetId(a1.id, null, 'actionA1');
    await updateWidgetId(b1.id, null, 'actionB1');

    const saveResult = await save();
    expect(saveResult.success).toBe(true);

    const editedContent = fs.readFileSync(editedPath('grid-example.ts'), 'utf-8');

    expect(editedContent).toContain(".withId('mainGrid')");
    expect(editedContent).toContain(".withId('colA')");
    expect(editedContent).toContain(".withId('colB')");
    expect(editedContent).toContain(".withId('labelA')");
    expect(editedContent).toContain(".withId('labelB')");
    expect(editedContent).toContain(".withId('actionA1')");
    expect(editedContent).toContain(".withId('actionB1')");
  });
});
