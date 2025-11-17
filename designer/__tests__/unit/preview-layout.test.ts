/**
 * Unit tests for WYSIWYG preview layout rendering
 * Tests that containers render with proper CSS layouts
 */

import * as http from 'http';

describe('Preview WYSIWYG Layout', () => {
  const API_URL = 'http://localhost:3000';

  // Helper to make API requests
  async function apiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, API_URL);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  describe('HBox Layout', () => {
    test('should load checkbox example with hbox', async () => {
      const response = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/checkbox.ts'
      });

      expect(response.success).toBe(true);
      expect(response.metadata).toBeDefined();

      // Find the hbox widget
      const hboxWidget = response.metadata.widgets.find((w: any) => w.widgetType === 'hbox');
      expect(hboxWidget).toBeDefined();

      // HBox should have button children
      const hboxChildren = response.metadata.widgets.filter(
        (w: any) => w.parent === hboxWidget.id
      );
      expect(hboxChildren.length).toBeGreaterThan(0);

      // Verify buttons are children of hbox
      const buttonChildren = hboxChildren.filter((w: any) => w.widgetType === 'button');
      expect(buttonChildren.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Grid Layout', () => {
    test('should load grid example with column information', async () => {
      const response = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/grid.ts'
      });

      expect(response.success).toBe(true);
      expect(response.metadata).toBeDefined();

      // Find the grid widget
      const gridWidget = response.metadata.widgets.find((w: any) => w.widgetType === 'grid');
      expect(gridWidget).toBeDefined();

      // Grid should have columns property
      expect(gridWidget.properties.columns).toBe(3);

      // Grid should have button children
      const gridChildren = response.metadata.widgets.filter(
        (w: any) => w.parent === gridWidget.id
      );
      expect(gridChildren.length).toBeGreaterThan(0);

      // Count buttons in grid
      const buttonChildren = gridChildren.filter((w: any) => w.widgetType === 'button');
      expect(buttonChildren.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('VBox Layout', () => {
    test('should load hello example with vbox', async () => {
      const response = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      expect(response.success).toBe(true);
      expect(response.metadata).toBeDefined();

      // Find the vbox widget
      const vboxWidget = response.metadata.widgets.find((w: any) => w.widgetType === 'vbox');
      expect(vboxWidget).toBeDefined();

      // VBox should have children
      const vboxChildren = response.metadata.widgets.filter(
        (w: any) => w.parent === vboxWidget.id
      );
      expect(vboxChildren.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Metadata Properties', () => {
    test('should capture widget properties correctly', async () => {
      const response = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/checkbox.ts'
      });

      const widgets = response.metadata.widgets;

      // Check button properties
      const button = widgets.find((w: any) =>
        w.widgetType === 'button' && w.properties.text === 'Check All'
      );
      expect(button).toBeDefined();
      expect(button.properties.text).toBe('Check All');

      // Check checkbox properties
      const checkbox = widgets.find((w: any) => w.widgetType === 'checkbox');
      expect(checkbox).toBeDefined();
      expect(checkbox.properties.text).toBeDefined();
    }, 10000);
  });
});
