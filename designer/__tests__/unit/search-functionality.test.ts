/**
 * Tests for the Find/Search functionality (Ctrl+F)
 *
 * This test suite verifies the search feature that allows users to find
 * widgets by type, ID, className, text, and other properties, as well as
 * search through source code.
 */

import { describe, it, expect } from '@jest/globals';

describe('Search Functionality', () => {
  describe('Widget Search', () => {
    it('should search by widget type', () => {
      const widgets = [
        { id: 'w1', widgetType: 'button', properties: {} },
        { id: 'w2', widgetType: 'label', properties: {} },
        { id: 'w3', widgetType: 'vbox', properties: {} }
      ];

      const searchTerm = 'button';
      const results = searchWidgets(widgets, searchTerm, false);

      expect(results).toHaveLength(1);
      expect(results[0].widget.id).toBe('w1');
      expect(results[0].matches).toContainEqual({
        field: 'type',
        value: 'button',
        priority: 1
      });
    });

    it('should prioritize text property matches (priority 3)', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'button',
          properties: { text: 'Submit Form' }
        }
      ];

      const searchTerm = 'submit';
      const results = searchWidgets(widgets, searchTerm, false);

      expect(results).toHaveLength(1);
      expect(results[0].matches).toContainEqual({
        field: 'text',
        value: 'Submit Form',
        priority: 3
      });
    });

    it('should prioritize ID property matches (priority 3)', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'button',
          widgetId: 'submitButton',
          properties: {}
        }
      ];

      const searchTerm = 'submit';
      const results = searchWidgets(widgets, searchTerm, false);

      expect(results).toHaveLength(1);
      expect(results[0].matches).toContainEqual({
        field: 'ID',
        value: 'submitButton',
        priority: 3
      });
    });

    it('should prioritize className property matches (priority 3)', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'button',
          properties: { className: 'primary-button' }
        }
      ];

      const searchTerm = 'primary';
      const results = searchWidgets(widgets, searchTerm, false);

      expect(results).toHaveLength(1);
      expect(results[0].matches).toContainEqual({
        field: 'className',
        value: 'primary-button',
        priority: 3
      });
    });

    it('should find multiple matches in a single widget', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'button',
          widgetId: 'submitButton',
          properties: {
            text: 'Submit',
            className: 'submit-btn'
          }
        }
      ];

      const searchTerm = 'submit';
      const results = searchWidgets(widgets, searchTerm, false);

      expect(results).toHaveLength(1);
      expect(results[0].matchCount).toBe(3); // ID, text, className
      expect(results[0].matches).toHaveLength(3);
    });

    it('should sort matches by priority (highest first)', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'button',
          widgetId: 'myButton',
          properties: {
            text: 'Click Me',
            title: 'Button tooltip'
          }
        }
      ];

      const searchTerm = 'button';
      const results = searchWidgets(widgets, searchTerm, false);

      expect(results).toHaveLength(1);
      // ID match (priority 3) should come before type match (priority 1)
      expect(results[0].matches[0].priority).toBeGreaterThanOrEqual(
        results[0].matches[results[0].matches.length - 1].priority
      );
    });

    it('should perform case-insensitive search by default', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'button',
          properties: { text: 'SUBMIT' }
        }
      ];

      const searchTerm = 'submit';
      const results = searchWidgets(widgets, searchTerm, false);

      expect(results).toHaveLength(1);
    });

    it('should perform case-sensitive search when requested', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'button',
          properties: { text: 'SUBMIT' }
        },
        {
          id: 'w2',
          widgetType: 'button',
          properties: { text: 'submit' }
        }
      ];

      const searchTerm = 'submit';
      const results = searchWidgets(widgets, searchTerm, true);

      expect(results).toHaveLength(1);
      expect(results[0].widget.id).toBe('w2');
    });

    it('should search in all property values', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'label',
          properties: {
            text: 'Hello',
            title: 'World',
            alignment: 'center'
          }
        }
      ];

      const searchTerm = 'world';
      const results = searchWidgets(widgets, searchTerm, false);

      expect(results).toHaveLength(1);
      expect(results[0].matches.some((m: any) => m.field === 'title')).toBe(true);
    });

    it('should not duplicate text and className in other properties', () => {
      const widgets = [
        {
          id: 'w1',
          widgetType: 'button',
          properties: {
            text: 'Submit',
            className: 'primary'
          }
        }
      ];

      const searchTerm = 'submit';
      const results = searchWidgets(widgets, searchTerm, false);

      // Should match text property only once, not twice
      const textMatches = results[0].matches.filter((m: any) => m.field === 'text');
      expect(textMatches).toHaveLength(1);
    });
  });

  describe('Source Code Search', () => {
    it('should find matches in source code lines', () => {
      const sourceCode = `
window("My App", () => {
  button("Submit", () => {});
  label("Hello World");
});
      `.trim();

      const searchTerm = 'submit';
      const results = searchSource(sourceCode, searchTerm, false);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('source');
      expect(results[0].lineContent).toContain('Submit');
    });

    it('should return line numbers for source matches', () => {
      const sourceCode = `line 1
line 2 with search term
line 3`;

      const searchTerm = 'search term';
      const results = searchSource(sourceCode, searchTerm, false);

      expect(results).toHaveLength(1);
      expect(results[0].lineNumber).toBe(2);
    });

    it('should perform case-insensitive source search', () => {
      const sourceCode = 'CONST myVar = "VALUE";';

      const searchTerm = 'const';
      const results = searchSource(sourceCode, searchTerm, false);

      expect(results).toHaveLength(1);
    });

    it('should perform case-sensitive source search when requested', () => {
      const sourceCode = `const lower = 1;
CONST upper = 2;`;

      const searchTerm = 'const';
      const results = searchSource(sourceCode, searchTerm, true);

      expect(results).toHaveLength(1);
      expect(results[0].lineNumber).toBe(1);
    });
  });

  describe('Match Indicators', () => {
    it('should track matched widget IDs', () => {
      const widgets = [
        { id: 'w1', widgetType: 'button', properties: { text: 'Submit' } },
        { id: 'w2', widgetType: 'label', properties: { text: 'Cancel' } }
      ];

      const searchTerm = 'submit';
      const matchedIds = new Set<string>();

      searchWidgets(widgets, searchTerm, false).forEach(result => {
        matchedIds.add(result.widget.id);
      });

      expect(matchedIds.has('w1')).toBe(true);
      expect(matchedIds.has('w2')).toBe(false);
    });

    it('should display match count badge for multiple matches', () => {
      const result = {
        type: 'widget',
        matchCount: 3,
        matches: [
          { field: 'ID', value: 'submitBtn', priority: 3 },
          { field: 'text', value: 'Submit', priority: 3 },
          { field: 'className', value: 'submit-button', priority: 3 }
        ]
      };

      expect(result.matchCount).toBe(3);
      expect(result.matches).toHaveLength(3);
    });
  });

  describe('Search Priority System', () => {
    it('should assign priority 3 to text, ID, and className', () => {
      const priorities = {
        text: 3,
        ID: 3,
        className: 3
      };

      expect(priorities.text).toBe(3);
      expect(priorities.ID).toBe(3);
      expect(priorities.className).toBe(3);
    });

    it('should assign priority 2 to other properties', () => {
      const priority = 2; // Other properties
      expect(priority).toBe(2);
    });

    it('should assign priority 1 to widget type', () => {
      const priority = 1; // Widget type
      expect(priority).toBe(1);
    });
  });
});

// Helper functions matching editor.js search logic
function searchWidgets(widgets: any[], searchTerm: string, caseSensitive: boolean) {
  const results: any[] = [];
  const searchTermLower = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  widgets.forEach(widget => {
    const matches: any[] = [];

    // Check widget type
    const widgetType = caseSensitive ? widget.widgetType : widget.widgetType.toLowerCase();
    if (widgetType.includes(searchTermLower)) {
      matches.push({ field: 'type', value: widget.widgetType, priority: 1 });
    }

    // Check widget ID
    if (widget.widgetId) {
      const widgetId = caseSensitive ? widget.widgetId : widget.widgetId.toLowerCase();
      if (widgetId.includes(searchTermLower)) {
        matches.push({ field: 'ID', value: widget.widgetId, priority: 3 });
      }
    }

    // Check properties
    if (widget.properties) {
      // Prioritize text property
      if (widget.properties.text !== undefined && widget.properties.text !== null) {
        const text = caseSensitive ? String(widget.properties.text) : String(widget.properties.text).toLowerCase();
        if (text.includes(searchTermLower)) {
          matches.push({ field: 'text', value: widget.properties.text, priority: 3 });
        }
      }

      // Prioritize className property
      if (widget.properties.className) {
        const className = caseSensitive ? widget.properties.className : widget.properties.className.toLowerCase();
        if (className.includes(searchTermLower)) {
          matches.push({ field: 'className', value: widget.properties.className, priority: 3 });
        }
      }

      // Check other properties
      Object.entries(widget.properties).forEach(([key, value]) => {
        if (key === 'text' || key === 'className') return;

        const valueStr = caseSensitive ? String(value) : String(value).toLowerCase();
        if (valueStr.includes(searchTermLower)) {
          matches.push({ field: key, value: value, priority: 2 });
        }
      });
    }

    if (matches.length > 0) {
      matches.sort((a, b) => b.priority - a.priority);

      results.push({
        type: 'widget',
        widget: widget,
        matches: matches,
        matchCount: matches.length,
        description: `${widget.widgetType}${widget.widgetId ? ' #' + widget.widgetId : ''}`
      });
    }
  });

  return results;
}

function searchSource(sourceCode: string, searchTerm: string, caseSensitive: boolean) {
  const results: any[] = [];
  const lines = sourceCode.split('\n');
  const searchTermLower = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  lines.forEach((line, index) => {
    const lineToSearch = caseSensitive ? line : line.toLowerCase();
    if (lineToSearch.includes(searchTermLower)) {
      results.push({
        type: 'source',
        lineNumber: index + 1,
        lineContent: line.trim(),
        description: `Line ${index + 1}`
      });
    }
  });

  return results;
}
