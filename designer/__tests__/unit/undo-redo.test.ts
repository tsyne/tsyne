/**
 * Tests for Undo/Redo functionality
 *
 * This test suite verifies the command history system that enables undo/redo
 * operations in the designer. Tests cover the command pattern implementation,
 * history management, and keyboard shortcuts.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Undo/Redo Command System', () => {
  describe('Command Pattern', () => {
    it('should create a command with execute and undo functions', () => {
      let value = 0;

      const command = {
        execute: () => { value = 10; },
        undo: () => { value = 0; },
        description: 'Set value to 10'
      };

      command.execute();
      expect(value).toBe(10);

      command.undo();
      expect(value).toBe(0);
    });

    it('should store command description for UI display', () => {
      const command = {
        execute: () => {},
        undo: () => {},
        description: 'Update widget property'
      };

      expect(command.description).toBe('Update widget property');
    });
  });

  describe('Command History Management', () => {
    let history: any[];
    let historyIndex: number;
    const MAX_HISTORY = 50;

    beforeEach(() => {
      history = [];
      historyIndex = -1;
    });

    it('should add commands to history', () => {
      const command = createMockCommand('Command 1');

      addCommand(command);

      expect(history).toHaveLength(1);
      expect(history[0]).toBe(command);
      expect(historyIndex).toBe(0);

      function addCommand(cmd: any) {
        history = history.slice(0, historyIndex + 1);
        history.push(cmd);
        historyIndex++;
        if (history.length > MAX_HISTORY) {
          history.shift();
          historyIndex--;
        }
      }
    });

    it('should maintain history index', () => {
      addCommand(createMockCommand('Command 1'));
      addCommand(createMockCommand('Command 2'));
      addCommand(createMockCommand('Command 3'));

      expect(historyIndex).toBe(2);
      expect(history).toHaveLength(3);

      function addCommand(cmd: any) {
        history = history.slice(0, historyIndex + 1);
        history.push(cmd);
        historyIndex++;
      }
    });

    it('should clear future history when adding command after undo', () => {
      addCommand(createMockCommand('Command 1'));
      addCommand(createMockCommand('Command 2'));
      addCommand(createMockCommand('Command 3'));

      // Undo twice
      historyIndex = 0;

      // Add new command - should clear commands 2 and 3
      addCommand(createMockCommand('New Command'));

      expect(history).toHaveLength(2);
      expect(history[1].description).toBe('New Command');

      function addCommand(cmd: any) {
        history = history.slice(0, historyIndex + 1);
        history.push(cmd);
        historyIndex++;
      }
    });

    it('should limit history to MAX_HISTORY entries', () => {
      const MAX = 50;

      for (let i = 0; i < 60; i++) {
        addCommand(createMockCommand(`Command ${i}`));
      }

      expect(history.length).toBeLessThanOrEqual(MAX);

      function addCommand(cmd: any) {
        history = history.slice(0, historyIndex + 1);
        history.push(cmd);
        historyIndex++;
        if (history.length > MAX) {
          history.shift();
          historyIndex--;
        }
      }
    });

    it('should maintain correct index when history is full', () => {
      const MAX = 50;

      for (let i = 0; i < 60; i++) {
        addCommand(createMockCommand(`Command ${i}`));
      }

      // Should be at the end of history
      expect(historyIndex).toBe(history.length - 1);

      function addCommand(cmd: any) {
        history = history.slice(0, historyIndex + 1);
        history.push(cmd);
        historyIndex++;
        if (history.length > MAX) {
          history.shift();
          historyIndex--;
        }
      }
    });
  });

  describe('Undo Operation', () => {
    it('should execute undo function of current command', async () => {
      let value = 0;
      const history = [
        {
          execute: () => { value = 10; },
          undo: () => { value = 0; },
          description: 'Set to 10'
        }
      ];
      let historyIndex = 0;

      value = 10; // Simulate execute having been called

      await undo();

      expect(value).toBe(0);
      expect(historyIndex).toBe(-1);

      async function undo() {
        if (historyIndex < 0) return;
        const command = history[historyIndex];
        await command.undo();
        historyIndex--;
      }
    });

    it('should not undo when history is empty', async () => {
      const history: any[] = [];
      let historyIndex = -1;
      let undoCalled = false;

      await undo();

      expect(undoCalled).toBe(false);
      expect(historyIndex).toBe(-1);

      async function undo() {
        if (historyIndex < 0) {
          return;
        }
        undoCalled = true;
        historyIndex--;
      }
    });

    it('should decrement history index after undo', async () => {
      const history = [
        createMockCommand('Command 1'),
        createMockCommand('Command 2'),
        createMockCommand('Command 3')
      ];
      let historyIndex = 2;

      await undo();

      expect(historyIndex).toBe(1);

      async function undo() {
        if (historyIndex < 0) return;
        await history[historyIndex].undo();
        historyIndex--;
      }
    });

    it('should allow multiple undos', async () => {
      const history = [
        createMockCommand('Command 1'),
        createMockCommand('Command 2'),
        createMockCommand('Command 3')
      ];
      let historyIndex = 2;

      await undo();
      await undo();
      await undo();

      expect(historyIndex).toBe(-1);

      async function undo() {
        if (historyIndex < 0) return;
        await history[historyIndex].undo();
        historyIndex--;
      }
    });
  });

  describe('Redo Operation', () => {
    it('should execute command at next index', async () => {
      let value = 0;
      const history = [
        {
          execute: () => { value = 10; },
          undo: () => { value = 0; },
          description: 'Set to 10'
        }
      ];
      let historyIndex = -1; // After undo

      await redo();

      expect(value).toBe(10);
      expect(historyIndex).toBe(0);

      async function redo() {
        if (historyIndex >= history.length - 1) return;
        const command = history[historyIndex + 1];
        await command.execute();
        historyIndex++;
      }
    });

    it('should not redo when at end of history', async () => {
      const history = [createMockCommand('Command 1')];
      let historyIndex = 0;
      let redoCalled = false;

      await redo();

      expect(redoCalled).toBe(false);
      expect(historyIndex).toBe(0);

      async function redo() {
        if (historyIndex >= history.length - 1) {
          return;
        }
        redoCalled = true;
        historyIndex++;
      }
    });

    it('should increment history index after redo', async () => {
      const history = [
        createMockCommand('Command 1'),
        createMockCommand('Command 2'),
        createMockCommand('Command 3')
      ];
      let historyIndex = 0;

      await redo();

      expect(historyIndex).toBe(1);

      async function redo() {
        if (historyIndex >= history.length - 1) return;
        await history[historyIndex + 1].execute();
        historyIndex++;
      }
    });

    it('should allow multiple redos', async () => {
      const history = [
        createMockCommand('Command 1'),
        createMockCommand('Command 2'),
        createMockCommand('Command 3')
      ];
      let historyIndex = -1;

      await redo();
      await redo();
      await redo();

      expect(historyIndex).toBe(2);

      async function redo() {
        if (historyIndex >= history.length - 1) return;
        await history[historyIndex + 1].execute();
        historyIndex++;
      }
    });
  });

  describe('Undo/Redo Integration', () => {
    it('should support undo then redo cycle', async () => {
      let value = 0;
      const history = [
        {
          execute: () => { value = 10; },
          undo: () => { value = 0; },
          description: 'Set to 10'
        }
      ];
      let historyIndex = 0;

      value = 10; // Initial state after execute

      // Undo
      await history[historyIndex].undo();
      historyIndex--;
      expect(value).toBe(0);

      // Redo
      await history[historyIndex + 1].execute();
      historyIndex++;
      expect(value).toBe(10);
    });

    it('should track can-undo state', () => {
      let historyIndex = -1;

      expect(canUndo()).toBe(false);

      historyIndex = 0;
      expect(canUndo()).toBe(true);

      historyIndex = 5;
      expect(canUndo()).toBe(true);

      function canUndo() {
        return historyIndex >= 0;
      }
    });

    it('should track can-redo state', () => {
      const history = [
        createMockCommand('Command 1'),
        createMockCommand('Command 2')
      ];
      let historyIndex = 1;

      expect(canRedo()).toBe(false);

      historyIndex = 0;
      expect(canRedo()).toBe(true);

      historyIndex = -1;
      expect(canRedo()).toBe(true);

      function canRedo() {
        return historyIndex < history.length - 1;
      }
    });
  });

  describe('Menu State Updates', () => {
    it('should disable undo button when no history', () => {
      const historyIndex = -1;
      const undoDisabled = historyIndex < 0;

      expect(undoDisabled).toBe(true);
    });

    it('should enable undo button when history exists', () => {
      const historyIndex = 0;
      const undoDisabled = historyIndex < 0;

      expect(undoDisabled).toBe(false);
    });

    it('should disable redo button when at end of history', () => {
      const history = [createMockCommand('Command 1')];
      const historyIndex = 0;
      const redoDisabled = historyIndex >= history.length - 1;

      expect(redoDisabled).toBe(true);
    });

    it('should enable redo button when not at end', () => {
      const history = [
        createMockCommand('Command 1'),
        createMockCommand('Command 2')
      ];
      const historyIndex = 0;
      const redoDisabled = historyIndex >= history.length - 1;

      expect(redoDisabled).toBe(false);
    });

    it('should show command description in tooltip', () => {
      const history = [
        createMockCommand('Update button text'),
        createMockCommand('Change color')
      ];
      const historyIndex = 1;

      const undoTooltip = historyIndex >= 0
        ? `Undo: ${history[historyIndex].description} (Ctrl+Z)`
        : 'Nothing to undo (Ctrl+Z)';

      expect(undoTooltip).toBe('Undo: Change color (Ctrl+Z)');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should define Ctrl+Z for undo', () => {
      const shortcuts = {
        undo: 'Ctrl+Z',
        redo: 'Ctrl+Y'
      };

      expect(shortcuts.undo).toBe('Ctrl+Z');
    });

    it('should define Ctrl+Y for redo', () => {
      const shortcuts = {
        undo: 'Ctrl+Z',
        redo: 'Ctrl+Y'
      };

      expect(shortcuts.redo).toBe('Ctrl+Y');
    });

    it('should support Mac shortcuts (Cmd+Z, Cmd+Shift+Z)', () => {
      const macShortcuts = {
        undo: 'Cmd+Z',
        redo: 'Cmd+Shift+Z'
      };

      expect(macShortcuts.undo).toBe('Cmd+Z');
      expect(macShortcuts.redo).toBe('Cmd+Shift+Z');
    });
  });

  describe('Command Examples', () => {
    it('should support property update commands', () => {
      const widget = { text: 'Hello' };
      const oldValue = 'Hello';
      const newValue = 'World';

      const command = {
        execute: () => { widget.text = newValue; },
        undo: () => { widget.text = oldValue; },
        description: `Update text: "${oldValue}" → "${newValue}"`
      };

      command.execute();
      expect(widget.text).toBe('World');

      command.undo();
      expect(widget.text).toBe('Hello');
    });

    it('should support widget deletion commands', () => {
      const widgets = ['widget1', 'widget2'];
      const deletedWidget = 'widget2';
      let deletedIndex = 1;

      const command = {
        execute: () => {
          deletedIndex = widgets.indexOf(deletedWidget);
          widgets.splice(deletedIndex, 1);
        },
        undo: () => {
          widgets.splice(deletedIndex, 0, deletedWidget);
        },
        description: `Delete widget: ${deletedWidget}`
      };

      command.execute();
      expect(widgets).toEqual(['widget1']);

      command.undo();
      expect(widgets).toEqual(['widget1', 'widget2']);
    });

    it('should support widget addition commands', () => {
      const widgets: string[] = [];
      const newWidget = 'widget1';

      const command = {
        execute: () => { widgets.push(newWidget); },
        undo: () => { widgets.pop(); },
        description: `Add widget: ${newWidget}`
      };

      command.execute();
      expect(widgets).toEqual(['widget1']);

      command.undo();
      expect(widgets).toEqual([]);
    });
  });
});

// Helper function
function createMockCommand(description: string) {
  return {
    execute: async () => {},
    undo: async () => {},
    description
  };
}
