/**
 * Playwright test fixtures for Tsyne Designer
 *
 * Provides:
 * - API helper for model verification
 * - Extended page object with designer-specific methods
 */

import { test as base, expect, Page } from '@playwright/test';

/**
 * API client for interacting with the designer server model
 */
export class DesignerAPI {
  constructor(private baseURL: string) {}

  async request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return response.json();
  }

  /** Get current model metadata from server */
  async getMetadata(): Promise<DesignerMetadata> {
    const response = await this.request('/api/get-metadata');
    // API returns { success, metadata: { widgets }, styles, filePath }
    // Normalize to return { widgets, styles }
    return {
      widgets: response.metadata?.widgets || [],
      styles: response.styles
    };
  }

  /** Load a file into the designer */
  async loadFile(filePath: string): Promise<LoadResponse> {
    return this.request('/api/load', 'POST', { filePath });
  }

  /** Get widget by ID from current metadata */
  async getWidget(widgetId: string): Promise<Widget | undefined> {
    const metadata = await this.getMetadata();
    return metadata.widgets.find(w => w.id === widgetId);
  }

  /** Get widgets by type from current metadata */
  async getWidgetsByType(widgetType: string): Promise<Widget[]> {
    const metadata = await this.getMetadata();
    return metadata.widgets.filter(w => w.widgetType === widgetType);
  }

  /** Get children of a widget */
  async getChildren(parentId: string): Promise<Widget[]> {
    const metadata = await this.getMetadata();
    return metadata.widgets.filter(w => w.parent === parentId);
  }
}

// Type definitions for the API responses
export interface Widget {
  id: string;
  widgetType: string;
  parent: string | null;
  properties: Record<string, any>;
  children?: string[];
}

export interface DesignerMetadata {
  widgets: Widget[];
  styles?: Record<string, any>;
}

export interface LoadResponse {
  success: boolean;
  metadata: DesignerMetadata;
  filePath: string;
  originalSource: string;
}

/**
 * Extended page object with designer-specific helpers
 */
export class DesignerPage {
  constructor(
    public page: Page,
    public api: DesignerAPI
  ) {}

  /** Load a file via UI (select dropdown + click Load) */
  async loadFileViaUI(fileName: string) {
    await this.page.selectOption('#fileSelect', fileName);
    await this.page.click('button:has-text("Load")');
    // Wait for tree to populate
    await this.page.waitForSelector('.tree-item');
  }

  /** Select a widget in the tree by its ID */
  async selectWidgetInTree(widgetId: string) {
    await this.page.click(`[data-widget-id="${widgetId}"]`);
  }

  /** Select a widget in the tree by type (first match) */
  async selectWidgetByType(widgetType: string) {
    await this.page.click(`.tree-item:has-text("${widgetType}")`);
  }

  /** Add widget from palette */
  async addWidgetFromPalette(widgetType: string) {
    // Switch to Add Widgets tab
    await this.page.click('.inspector-tab:has-text("Add Widgets")');
    // Click palette item
    await this.page.click(`.palette-item:has-text("${widgetType}")`);
  }

  /** Update property via inspector */
  async updateProperty(propertyName: string, value: string) {
    // Switch to Properties tab
    await this.page.click('.inspector-tab:has-text("Properties")');
    // Find and update the input
    const label = await this.page.locator('.property-label', { hasText: propertyName });
    const input = label.locator('..').locator('.property-input');
    await input.fill(value);
    await input.press('Enter');
  }

  /** Switch to a preview tab */
  async switchPreviewTab(tabName: 'Preview' | 'Source' | 'Original Source' | 'Source Diffs' | 'Designer File') {
    await this.page.click(`.preview-tab:has-text("${tabName}")`);
  }

  /** Get current source code from source tab */
  async getSourceCode(): Promise<string> {
    await this.switchPreviewTab('Source');
    return this.page.locator('#sourceContent').innerText();
  }

  /** Save via UI */
  async save() {
    await this.page.click('button:has-text("Save")');
  }

  /** Undo via UI */
  async undo() {
    await this.page.click('#undoBtn');
  }

  /** Redo via UI */
  async redo() {
    await this.page.click('#redoBtn');
  }

  /** Delete selected widget */
  async deleteSelectedWidget() {
    await this.page.click('.inspector-tab:has-text("Properties")');
    await this.page.click('.delete-button');
  }

  /** Get count of widgets in tree */
  async getTreeWidgetCount(): Promise<number> {
    return this.page.locator('.tree-item').count();
  }

  /** Check if widget exists in model by type */
  async modelHasWidgetOfType(widgetType: string): Promise<boolean> {
    const widgets = await this.api.getWidgetsByType(widgetType);
    return widgets.length > 0;
  }
}

/**
 * Custom test fixture that provides designer page and API
 */
export const test = base.extend<{ designer: DesignerPage }>({
  designer: async ({ page }, use) => {
    const api = new DesignerAPI('http://localhost:3000');
    const designer = new DesignerPage(page, api);
    await use(designer);
  },
});

export { expect };

/**
 * Model assertion helpers
 */
export const expectModel = (metadata: DesignerMetadata) => ({
  toContainWidgetOfType(widgetType: string) {
    const found = metadata.widgets.some(w => w.widgetType === widgetType);
    expect(found, `Expected model to contain widget of type "${widgetType}"`).toBe(true);
    return this;
  },

  toHaveWidgetCount(count: number) {
    expect(metadata.widgets.length).toBe(count);
    return this;
  },

  toHaveWidgetWithProperty(widgetType: string, property: string, value: any) {
    const widget = metadata.widgets.find(
      w => w.widgetType === widgetType && w.properties[property] === value
    );
    expect(widget, `Expected widget ${widgetType} with ${property}="${value}"`).toBeDefined();
    return this;
  },
});
