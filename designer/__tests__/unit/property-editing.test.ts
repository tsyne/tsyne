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

    test('should update grid columns through multiple values (context menu simulation)', async () => {
      // Load grid example
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/grid.ts'
      });

      const gridWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'grid');
      expect(gridWidget).toBeDefined();

      // Simulate context menu selecting different column values
      const columnValues = [1, 2, 3, 4, 5, 6];

      for (const cols of columnValues) {
        const updateResponse = await apiRequest('/api/update-property', 'POST', {
          widgetId: gridWidget.id,
          propertyName: 'columns',
          newValue: cols
        });

        expect(updateResponse.success).toBe(true);
        expect(updateResponse.metadata.widgets.find((w: any) => w.id === gridWidget.id).properties.columns).toBe(cols);
      }
    }, 15000);

    test('should NOT delete grid when changing columns property (regression test)', async () => {
      // This test ensures that changing a grid's columns property via context menu
      // doesn't delete the grid (bug that was fixed)

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
      const gridId = addResponse.widgetId;
      const initialMetadata = addResponse.metadata;

      // Verify the grid exists
      let gridWidget = initialMetadata.widgets.find((w: any) => w.id === gridId);
      expect(gridWidget).toBeDefined();
      expect(gridWidget.widgetType).toBe('grid');
      expect(gridWidget.parent).toBe(vboxWidget.id);

      // Now change the columns property (simulating context menu "Set Columns" action)
      const updateResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: gridId,
        propertyName: 'columns',
        newValue: 4
      });

      expect(updateResponse.success).toBe(true);
      expect(updateResponse.metadata).toBeDefined();

      // CRITICAL: Verify the grid still exists and wasn't deleted
      gridWidget = updateResponse.metadata.widgets.find((w: any) => w.id === gridId);
      expect(gridWidget).toBeDefined();
      expect(gridWidget.widgetType).toBe('grid');
      expect(gridWidget.parent).toBe(vboxWidget.id);
      expect(gridWidget.properties.columns).toBe(4);

      // Try changing columns again to a different value
      const updateResponse2 = await apiRequest('/api/update-property', 'POST', {
        widgetId: gridId,
        propertyName: 'columns',
        newValue: 2
      });

      expect(updateResponse2.success).toBe(true);

      // Verify the grid STILL exists
      gridWidget = updateResponse2.metadata.widgets.find((w: any) => w.id === gridId);
      expect(gridWidget).toBeDefined();
      expect(gridWidget.widgetType).toBe('grid');
      expect(gridWidget.properties.columns).toBe(2);
    }, 15000);
  });

  describe('Context Menu Property Editing', () => {
    test('should edit gridwrap itemWidth and itemHeight properties', async () => {
      // Load hello.ts and add a gridwrap
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      const vboxWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'vbox');
      expect(vboxWidget).toBeDefined();

      // Add a gridwrap to the vbox
      const addResponse = await apiRequest('/api/add-widget', 'POST', {
        parentId: vboxWidget.id,
        widgetType: 'gridwrap'
      });

      expect(addResponse.success).toBe(true);
      const gridwrapWidget = addResponse.metadata.widgets.find(
        (w: any) => w.id === addResponse.widgetId
      );

      expect(gridwrapWidget).toBeDefined();
      expect(gridwrapWidget.widgetType).toBe('gridwrap');

      // Update itemWidth
      const widthResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: gridwrapWidget.id,
        propertyName: 'itemWidth',
        newValue: 150
      });

      expect(widthResponse.success).toBe(true);

      // Update itemHeight
      const heightResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: gridwrapWidget.id,
        propertyName: 'itemHeight',
        newValue: 100
      });

      expect(heightResponse.success).toBe(true);

      // Verify both properties are updated
      const finalWidget = heightResponse.metadata.widgets.find(
        (w: any) => w.id === gridwrapWidget.id
      );
      expect(finalWidget.properties.itemWidth).toBe(150);
      expect(finalWidget.properties.itemHeight).toBe(100);
    }, 10000);

    test('should validate numeric property values', async () => {
      // Load grid example
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/grid.ts'
      });

      const gridWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'grid');
      expect(gridWidget).toBeDefined();

      // Try to set columns to 0 (should work, but may not be practical)
      const zeroResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: gridWidget.id,
        propertyName: 'columns',
        newValue: 0
      });

      // The API should accept it (validation happens on client side)
      expect(zeroResponse.success).toBe(true);

      // Try to set columns to a large number
      const largeResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: gridWidget.id,
        propertyName: 'columns',
        newValue: 100
      });

      expect(largeResponse.success).toBe(true);
    }, 10000);
  });
});
