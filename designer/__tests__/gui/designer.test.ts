/**
 * GUI tests for the Tsyne WYSIWYG Designer
 * These tests run against the designer server and web UI
 */

import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

describe('Tsyne Designer GUI', () => {
  const API_URL = 'http://localhost:3000';

  // Helper to make API requests
  async function apiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    // For Node.js environment without fetch
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, API_URL);
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method,
          headers: options.headers
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          });
        }
      );

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  describe('API Endpoints', () => {
    test('should load a TypeScript file and return metadata', async () => {
      const response = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      expect(response.success).toBe(true);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.widgets).toBeDefined();
      expect(response.metadata.widgets.length).toBeGreaterThan(0);
      expect(response.filePath).toBe('examples/hello.ts');
      expect(response.originalSource).toBeDefined();
      expect(typeof response.originalSource).toBe('string');
      expect(response.originalSource.length).toBeGreaterThan(0);
    }, 10000);

    test('should capture widget hierarchy correctly', async () => {
      const response = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      const widgets = response.metadata.widgets;

      // Should have window, vbox, labels, and buttons
      const windowWidget = widgets.find((w: any) => w.widgetType === 'window');
      const vboxWidget = widgets.find((w: any) => w.widgetType === 'vbox');
      const labelWidgets = widgets.filter((w: any) => w.widgetType === 'label');
      const buttonWidgets = widgets.filter((w: any) => w.widgetType === 'button');

      expect(windowWidget).toBeDefined();
      expect(vboxWidget).toBeDefined();
      expect(labelWidgets.length).toBeGreaterThan(0);
      expect(buttonWidgets.length).toBeGreaterThan(0);

      // VBox should be child of window
      expect(vboxWidget.parent).toBe(windowWidget.id);
    }, 10000);

    test('should add widget to container', async () => {
      // First load the file
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      const vboxWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'vbox');

      // Add a new label to the vbox
      const addResponse = await apiRequest('/api/add-widget', 'POST', {
        parentId: vboxWidget.id,
        widgetType: 'label'
      });

      expect(addResponse.success).toBe(true);
      expect(addResponse.widgetId).toBeDefined();
      expect(addResponse.metadata).toBeDefined();

      // Check that the new widget exists in metadata
      const newWidget = addResponse.metadata.widgets.find((w: any) => w.id === addResponse.widgetId);
      expect(newWidget).toBeDefined();
      expect(newWidget.widgetType).toBe('label');
      expect(newWidget.parent).toBe(vboxWidget.id);
    }, 10000);

    test('should update widget property and reflect in save', async () => {
      // Load file
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      const labelWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'label');

      // Update the label text
      const updateResponse = await apiRequest('/api/update-property', 'POST', {
        widgetId: labelWidget.id,
        propertyName: 'text',
        newValue: 'Updated Text'
      });

      expect(updateResponse.success).toBe(true);

      // Save to get the transformed source
      const saveResponse = await apiRequest('/api/save', 'POST', { writer: 'memory' });
      expect(saveResponse.success).toBe(true);
      expect(saveResponse.content).toBeDefined();
      expect(typeof saveResponse.content).toBe('string');
      expect(saveResponse.content).toContain('Updated Text');
    }, 10000);

    test('should delete widget', async () => {
      // Load file
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      const buttonWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'button');

      // Delete the button
      const deleteResponse = await apiRequest('/api/delete-widget', 'POST', {
        widgetId: buttonWidget.id
      });

      expect(deleteResponse.success).toBe(true);
    }, 10000);

    test('should not allow deleting window widget', async () => {
      // Load file
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      const windowWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'window');

      // Try to delete the window
      const deleteResponse = await apiRequest('/api/delete-widget', 'POST', {
        widgetId: windowWidget.id
      });

      expect(deleteResponse.success).toBe(false);
      expect(deleteResponse.error).toContain('Cannot delete window widget');
    }, 10000);
  });

  describe('Source Code Persistence', () => {
    const testOutputFile = path.join(__dirname, '../../../examples/hello.edited.ts');

    beforeEach(() => {
      // Clean up any existing edited file
      if (fs.existsSync(testOutputFile)) {
        fs.unlinkSync(testOutputFile);
      }
    });

    afterEach(() => {
      // Clean up after test
      if (fs.existsSync(testOutputFile)) {
        fs.unlinkSync(testOutputFile);
      }
    });

    test('should save changes to .edited.ts file', async () => {
      // Load file
      await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });

      // Make a change (this creates a pending edit)
      const loadResponse = await apiRequest('/api/load', 'POST', {
        filePath: 'examples/hello.ts'
      });
      const labelWidget = loadResponse.metadata.widgets.find((w: any) => w.widgetType === 'label');

      await apiRequest('/api/update-property', 'POST', {
        widgetId: labelWidget.id,
        propertyName: 'text',
        newValue: 'Modified Text'
      });

      // Save changes
      const saveResponse = await apiRequest('/api/save', 'POST');

      expect(saveResponse.success).toBe(true);
      expect(saveResponse.outputPath).toBe('examples/hello.edited.ts');

      // Verify file was created
      expect(fs.existsSync(testOutputFile)).toBe(true);

      // Verify content includes the modified text
      const content = fs.readFileSync(testOutputFile, 'utf8');
      expect(content).toContain('Modified Text');
    }, 10000);
  });
});
