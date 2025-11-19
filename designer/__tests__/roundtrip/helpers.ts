/**
 * Common helpers for RoundTrip tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as http from 'http';

const API_BASE = 'http://localhost:3000';

/**
 * Make an HTTP request to the designer API
 */
function apiRequest(endpoint: string, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: data ? 'POST' : 'GET',
      headers: data ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      } : {}
    };

    const req = http.request(options, (res: any) => {
      let body = '';
      res.on('data', (chunk: any) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Load a file in designer mode
 */
export function loadFile(filePath: string): Promise<any> {
  return apiRequest('/api/load', { filePath });
}

/**
 * Load inline source code in designer mode (XStream-style)
 */
export function loadFromString(sourceCode: string, virtualPath: string = 'inline.ts'): Promise<any> {
  return apiRequest('/api/load-string', { sourceCode, virtualPath });
}

/**
 * Save changes back to source
 * @param writer - 'disk' (default) writes to file system, 'memory' captures to memory only
 */
export function save(writer: 'disk' | 'memory' = 'disk'): Promise<any> {
  return apiRequest('/api/save', { writer });
}

/**
 * Update a widget property
 */
export function updateProperty(widgetId: string, propertyName: string, newValue: any): Promise<any> {
  return apiRequest('/api/update-property', { widgetId, propertyName, newValue });
}

/**
 * Update a widget's ID (.withId())
 */
export function updateWidgetId(internalId: string, oldWidgetId: string | null, newWidgetId: string | null): Promise<any> {
  return apiRequest('/api/update-widget-id', { internalId, oldWidgetId, newWidgetId });
}

/**
 * Add a widget to a container
 */
export function addWidget(parentId: string, widgetType: string): Promise<any> {
  return apiRequest('/api/add-widget', { parentId, widgetType });
}

/**
 * Delete a widget
 */
export function deleteWidget(widgetId: string): Promise<any> {
  return apiRequest('/api/delete-widget', { widgetId });
}

/**
 * Update widget accessibility options
 */
export function updateAccessibility(widgetId: string, accessibility: any): Promise<any> {
  return apiRequest('/api/update-accessibility', { widgetId, accessibility });
}

/**
 * Compute diff between original and edited files
 */
export function getDiff(originalPath: string, editedPath: string): string {
  try {
    return execSync(`diff -u "${originalPath}" "${editedPath}"`, { encoding: 'utf-8' });
  } catch (err: any) {
    // diff returns non-zero exit code when files differ
    return err.stdout || '';
  }
}

/**
 * Get the full path to an example file
 */
export function examplePath(filename: string): string {
  return path.join(__dirname, '../../../tsyne/examples', filename);
}

/**
 * Get the path to the edited version of a file
 */
export function editedPath(filename: string): string {
  const dir = path.dirname(filename);
  const base = path.basename(filename, '.ts');
  return path.join(__dirname, '../../../tsyne/examples', dir, `${base}.edited.ts`);
}

/**
 * Clean up edited file if it exists
 */
export function cleanupEdited(filename: string): void {
  const edited = editedPath(filename);
  if (fs.existsSync(edited)) {
    fs.unlinkSync(edited);
  }
}

/**
 * Create a temporary test file
 */
export function createTestFile(filename: string, content: string): string {
  const filePath = examplePath(filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Delete a test file
 */
export function deleteTestFile(filename: string): void {
  const filePath = examplePath(filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Find a widget in metadata by type and optional property
 */
export function findWidget(metadata: any, widgetType: string, property?: { name: string, value: any }): any {
  return metadata.widgets.find((w: any) => {
    if (w.widgetType !== widgetType) return false;
    if (property && w.properties[property.name] !== property.value) return false;
    return true;
  });
}

/**
 * Find a widget by its user-defined ID
 */
export function findWidgetById(metadata: any, widgetId: string): any {
  return metadata.widgets.find((w: any) => w.widgetId === widgetId);
}
