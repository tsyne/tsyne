/**
 * Component harness tests for Tsyne Designer
 *
 * Tests UI components in isolation without loading a full file.
 * Uses a minimal harness to mount and test individual components.
 */

import { test, expect } from '@playwright/test';

test.describe('Widget Palette Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('palette shows container widgets', async ({ page }) => {
    // Palette should show containers section
    await expect(page.locator('.widget-palette h3:has-text("Containers")')).toBeVisible();

    // Should have specific container types (using data-testid for specificity)
    await expect(page.getByTestId('palette-vbox')).toBeVisible();
    await expect(page.getByTestId('palette-hbox')).toBeVisible();
  });

  test('palette shows input widgets', async ({ page }) => {
    await expect(page.locator('.widget-palette h3:has-text("Inputs")')).toBeVisible();

    await expect(page.getByTestId('palette-button')).toBeVisible();
    await expect(page.getByTestId('palette-entry')).toBeVisible();
  });

  test('palette shows display widgets', async ({ page }) => {
    await expect(page.locator('.widget-palette h3:has-text("Display")')).toBeVisible();

    await expect(page.getByTestId('palette-label')).toBeVisible();
  });

  test('palette item hover state', async ({ page }) => {
    const vboxItem = page.getByTestId('palette-vbox');

    // Check initial state
    await expect(vboxItem).toHaveCSS('cursor', 'pointer');

    // Hover should work (visual test - could use screenshots)
    await vboxItem.hover();
  });
});

test.describe('Inspector Tabs Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('inspector has two tabs', async ({ page }) => {
    await expect(page.getByTestId('inspector-tab-widgets')).toBeVisible();
    await expect(page.getByTestId('inspector-tab-properties')).toBeVisible();
  });

  test('clicking tab switches content', async ({ page }) => {
    // Initially on Add Widgets tab
    await expect(page.getByTestId('inspector-widgets')).toHaveClass(/active/);

    // Click Properties tab
    await page.getByTestId('inspector-tab-properties').click();

    // Properties content should now be active
    await expect(page.locator('#inspectorProperties')).toHaveClass(/active/);
  });
});

test.describe('Preview Tabs Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('preview has all tabs', async ({ page }) => {
    await expect(page.getByTestId('tab-preview')).toBeVisible();
    await expect(page.getByTestId('tab-source')).toBeVisible();
    await expect(page.getByTestId('tab-original')).toBeVisible();
    await expect(page.getByTestId('tab-diff')).toBeVisible();
    await expect(page.getByTestId('tab-designer')).toBeVisible();
  });

  test('clicking tab switches preview content', async ({ page }) => {
    // Click Source tab
    await page.getByTestId('tab-source').click();
    await expect(page.locator('#previewTabSource')).toHaveClass(/active/);

    // Click Diff tab
    await page.getByTestId('tab-diff').click();
    await expect(page.locator('#previewTabDiff')).toHaveClass(/active/);
  });
});

test.describe('Toolbar Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('toolbar has required buttons', async ({ page }) => {
    await expect(page.getByTestId('load-btn')).toBeVisible();
    await expect(page.getByTestId('save-btn')).toBeVisible();
    await expect(page.getByTestId('refresh-btn')).toBeVisible();
    await expect(page.getByTestId('undo-btn')).toBeVisible();
    await expect(page.getByTestId('redo-btn')).toBeVisible();
  });

  test('undo/redo buttons disabled initially', async ({ page }) => {
    await expect(page.getByTestId('undo-btn')).toBeDisabled();
    await expect(page.getByTestId('redo-btn')).toBeDisabled();
  });

  test('file selector has options', async ({ page }) => {
    const select = page.getByTestId('file-select');
    await expect(select).toBeVisible();

    // Should have example files
    await expect(select.locator('option[value="examples/hello.ts"]')).toBeAttached();
    await expect(select.locator('option[value="examples/calculator.ts"]')).toBeAttached();
    await expect(select.locator('option[value="examples/todomvc.ts"]')).toBeAttached();
  });
});

test.describe('Tree Item Component', () => {
  test('tree items render after loading file', async ({ page }) => {
    await page.goto('/');

    // Load a file
    await page.getByTestId('file-select').selectOption('examples/hello.ts');
    await page.getByTestId('load-btn').click();

    // Wait for tree to populate
    await page.waitForSelector('.tree-item');

    // Tree items should have proper structure
    const treeItems = page.locator('.tree-item');
    expect(await treeItems.count()).toBeGreaterThan(0);

    // First item should be window
    await expect(treeItems.first()).toContainText('window');
  });

  test('clicking tree item selects it', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-select').selectOption('examples/hello.ts');
    await page.getByTestId('load-btn').click();
    await page.waitForSelector('.tree-item');

    // Click a tree item
    const firstItem = page.locator('.tree-item').first();
    await firstItem.click();

    // Should have selected class
    await expect(firstItem).toHaveClass(/selected/);
  });

  test('tree items show widget type', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-select').selectOption('examples/hello.ts');
    await page.getByTestId('load-btn').click();
    await page.waitForSelector('.tree-item');

    // Should show widget types with styling
    await expect(page.locator('.widget-type')).toHaveCount(await page.locator('.tree-item').count());
  });
});

test.describe('Resize Handles Component', () => {
  test('resize handles are present', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#resizeHandleLeft')).toBeVisible();
    await expect(page.locator('#resizeHandleRight')).toBeVisible();
  });

  test('resize handles have cursor style', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#resizeHandleLeft')).toHaveCSS('cursor', 'col-resize');
    await expect(page.locator('#resizeHandleRight')).toHaveCSS('cursor', 'col-resize');
  });
});

test.describe('Modal Components', () => {
  test('CSS editor modal is initially hidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#cssEditorModal')).not.toHaveClass(/visible/);
  });

  test('Find modal is initially hidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#findModal')).not.toHaveClass(/visible/);
  });
});
