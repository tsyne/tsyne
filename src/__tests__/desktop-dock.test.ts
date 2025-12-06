/**
 * Unit Tests for Desktop Dock Functionality
 *
 * Tests the dock's pure logic functions in isolation:
 * - Adding/removing apps from dock
 * - Reordering dock items
 * - Persistence via preferences
 */

describe('Desktop Dock Unit Tests', () => {
  // Mock preference storage
  let mockPreferences: Map<string, string>;

  // Simplified dock implementation for unit testing
  class TestDock {
    private dockedApps: string[] = [];
    private preferences: Map<string, string>;
    private readonly DOCK_APPS_KEY = 'desktop.dock.apps';

    constructor(preferences: Map<string, string>) {
      this.preferences = preferences;
      this.loadDockedApps();
    }

    private loadDockedApps() {
      const saved = this.preferences.get(this.DOCK_APPS_KEY);
      if (saved) {
        try {
          this.dockedApps = JSON.parse(saved);
        } catch {
          this.dockedApps = [];
        }
      }
    }

    private saveDockedApps() {
      this.preferences.set(this.DOCK_APPS_KEY, JSON.stringify(this.dockedApps));
    }

    addToDock(appName: string): boolean {
      if (!this.dockedApps.includes(appName)) {
        this.dockedApps.push(appName);
        this.saveDockedApps();
        return true;
      }
      return false;
    }

    removeFromDock(appName: string): boolean {
      const index = this.dockedApps.indexOf(appName);
      if (index >= 0) {
        this.dockedApps.splice(index, 1);
        this.saveDockedApps();
        return true;
      }
      return false;
    }

    isInDock(appName: string): boolean {
      return this.dockedApps.includes(appName);
    }

    moveDockItemLeft(appName: string): boolean {
      const index = this.dockedApps.indexOf(appName);
      if (index <= 0) return false;

      [this.dockedApps[index - 1], this.dockedApps[index]] =
        [this.dockedApps[index], this.dockedApps[index - 1]];
      this.saveDockedApps();
      return true;
    }

    moveDockItemRight(appName: string): boolean {
      const index = this.dockedApps.indexOf(appName);
      if (index < 0 || index >= this.dockedApps.length - 1) return false;

      [this.dockedApps[index], this.dockedApps[index + 1]] =
        [this.dockedApps[index + 1], this.dockedApps[index]];
      this.saveDockedApps();
      return true;
    }

    clearDock() {
      this.dockedApps = [];
      this.saveDockedApps();
    }

    getDockedApps(): string[] {
      return [...this.dockedApps];
    }
  }

  beforeEach(() => {
    mockPreferences = new Map();
  });

  describe('addToDock', () => {
    test('should add app to empty dock', () => {
      const dock = new TestDock(mockPreferences);
      expect(dock.addToDock('Calculator')).toBe(true);
      expect(dock.getDockedApps()).toEqual(['Calculator']);
    });

    test('should add multiple apps to dock', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('Calculator');
      dock.addToDock('Terminal');
      dock.addToDock('Chess');
      expect(dock.getDockedApps()).toEqual(['Calculator', 'Terminal', 'Chess']);
    });

    test('should not add duplicate app', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('Calculator');
      expect(dock.addToDock('Calculator')).toBe(false);
      expect(dock.getDockedApps()).toEqual(['Calculator']);
    });

    test('should persist to preferences', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('Calculator');
      expect(mockPreferences.get('desktop.dock.apps')).toBe('["Calculator"]');
    });
  });

  describe('removeFromDock', () => {
    test('should remove existing app', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('Calculator');
      dock.addToDock('Terminal');
      expect(dock.removeFromDock('Calculator')).toBe(true);
      expect(dock.getDockedApps()).toEqual(['Terminal']);
    });

    test('should return false for non-existent app', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('Calculator');
      expect(dock.removeFromDock('Terminal')).toBe(false);
      expect(dock.getDockedApps()).toEqual(['Calculator']);
    });

    test('should persist removal to preferences', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('Calculator');
      dock.addToDock('Terminal');
      dock.removeFromDock('Calculator');
      expect(mockPreferences.get('desktop.dock.apps')).toBe('["Terminal"]');
    });
  });

  describe('isInDock', () => {
    test('should return true for docked app', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('Calculator');
      expect(dock.isInDock('Calculator')).toBe(true);
    });

    test('should return false for non-docked app', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('Calculator');
      expect(dock.isInDock('Terminal')).toBe(false);
    });
  });

  describe('moveDockItemLeft', () => {
    test('should swap with left neighbor', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('A');
      dock.addToDock('B');
      dock.addToDock('C');
      expect(dock.moveDockItemLeft('B')).toBe(true);
      expect(dock.getDockedApps()).toEqual(['B', 'A', 'C']);
    });

    test('should not move leftmost item', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('A');
      dock.addToDock('B');
      expect(dock.moveDockItemLeft('A')).toBe(false);
      expect(dock.getDockedApps()).toEqual(['A', 'B']);
    });

    test('should return false for non-existent app', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('A');
      expect(dock.moveDockItemLeft('X')).toBe(false);
    });
  });

  describe('moveDockItemRight', () => {
    test('should swap with right neighbor', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('A');
      dock.addToDock('B');
      dock.addToDock('C');
      expect(dock.moveDockItemRight('B')).toBe(true);
      expect(dock.getDockedApps()).toEqual(['A', 'C', 'B']);
    });

    test('should not move rightmost item', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('A');
      dock.addToDock('B');
      expect(dock.moveDockItemRight('B')).toBe(false);
      expect(dock.getDockedApps()).toEqual(['A', 'B']);
    });

    test('should return false for non-existent app', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('A');
      expect(dock.moveDockItemRight('X')).toBe(false);
    });
  });

  describe('clearDock', () => {
    test('should remove all apps', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('A');
      dock.addToDock('B');
      dock.addToDock('C');
      dock.clearDock();
      expect(dock.getDockedApps()).toEqual([]);
    });

    test('should persist empty dock', () => {
      const dock = new TestDock(mockPreferences);
      dock.addToDock('A');
      dock.clearDock();
      expect(mockPreferences.get('desktop.dock.apps')).toBe('[]');
    });
  });

  describe('persistence', () => {
    test('should load saved dock on initialization', () => {
      mockPreferences.set('desktop.dock.apps', '["Calculator","Terminal"]');
      const dock = new TestDock(mockPreferences);
      expect(dock.getDockedApps()).toEqual(['Calculator', 'Terminal']);
    });

    test('should handle corrupted preference data', () => {
      mockPreferences.set('desktop.dock.apps', 'invalid json');
      const dock = new TestDock(mockPreferences);
      expect(dock.getDockedApps()).toEqual([]);
    });

    test('should handle missing preference', () => {
      const dock = new TestDock(mockPreferences);
      expect(dock.getDockedApps()).toEqual([]);
    });
  });
});
