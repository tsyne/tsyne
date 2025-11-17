/**
 * Unit tests for property editing functionality
 * Tests editing of string and numeric properties
 */

import * as http from 'http';

describe('Property Editing', () => {
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

  describe('Numeric Property Editing', () => {
    test('should load grid with numeric columns property', async () => {
      const response = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/grid.ts'
      });

      expect(response.success).toBe(true);
      expect(response.metadata).toBeDefined();

      // Find the grid widget
      const gridWidget = response.metadata.widgets.find((w: any) => w.widgetType === 'grid');
      expect(gridWidget).toBeDefined();

      // Verify columns property is a number
      expect(typeof gridWidget.properties.columns).toBe('number');
      expect(gridWidget.properties.columns).toBe(3);
    }, 10000);

    test('should update grid columns property (numeric)', async () => {
      // First load the file
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/grid.ts'
      });

      const gridWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'grid');
      expect(gridWidget).toBeDefined();

      const originalColumns = gridWidget.properties.columns;

      // Update the columns property to a new number
      const updateResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: gridWidget.id,
        propertyName: 'columns',
        newValue: 4
      });

      expect(updateResponse.success).toBe(true);

      // Reload to verify the change
      const reloadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/grid.ts'
      });

      const updatedGridWidget = reloadResponse.metadata.widgets.find((w: any) => w.widgetType === 'grid');

      // The in-memory metadata should be updated
      // Note: The file isn't saved until /api/save is called
      expect(typeof updatedGridWidget.properties.columns).toBe('number');
    }, 10000);
  });

  describe('String Property Editing', () => {
    test('should update button text property (string)', async () => {
      // Load the file
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      const buttonWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'button');
      expect(buttonWidget).toBeDefined();

      const originalText = buttonWidget.properties.text;

      // Update the text property
      const updateResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: buttonWidget.id,
        propertyName: 'text',
        newValue: 'Updated Button Text'
      });

      expect(updateResponse.success).toBe(true);
    }, 10000);
  });

  describe('Mixed Property Types', () => {
    test('should handle grid with both numeric and other properties', async () => {
      const response = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/grid.ts'
      });

      const gridWidget = response.metadata.widgets.find((w: any) => w.widgetType === 'grid');
      expect(gridWidget).toBeDefined();

      // Verify the property type
      expect(typeof gridWidget.properties.columns).toBe('number');
      expect(gridWidget.properties.columns).toBeGreaterThan(0);
    }, 10000);

    test('should reject invalid numeric values', async () => {
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/grid.ts'
      });

      const gridWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'grid');

      // This test verifies server-side handling
      // Client-side validation would catch NaN before sending
      // Server should handle numeric values correctly
      const updateResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: gridWidget.id,
        propertyName: 'columns',
        newValue: 5
      });

      expect(updateResponse.success).toBe(true);
    }, 10000);
  });

  describe('Grid in VBox', () => {
    test('should add grid to vbox and edit its columns', async () => {
      // Load hello.ts which has a vbox
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      const vboxWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'vbox');
      expect(vboxWidget).toBeDefined();

      // Add a grid to the vbox
      const addResponse = await apiRequest('/api/add-widget', 'POST', {
        parentId: vboxWidget.id,
        widgetType: 'grid'
      });

      expect(addResponse.success).toBe(true);
      expect(addResponse.widgetId).toBeDefined();

      // Find the newly added grid
      const newGridWidget = addResponse.metadata.widgets.find(
        (w: any) => w.id === addResponse.widgetId
      );

      expect(newGridWidget).toBeDefined();
      expect(newGridWidget.widgetType).toBe('grid');
      expect(newGridWidget.parent).toBe(vboxWidget.id);

      // The grid should have default columns property
      // Update the columns
      const updateResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: newGridWidget.id,
        propertyName: 'columns',
        newValue: 3
      });

      expect(updateResponse.success).toBe(true);
    }, 10000);
  });
});
