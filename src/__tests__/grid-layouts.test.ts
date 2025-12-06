/**
 * Unit Tests for TabletTop and PhoneTop Grid Layouts
 *
 * Tests the grid positioning logic in isolation:
 * - Page calculation
 * - Grid positioning
 * - App swapping
 * - Navigation
 */

describe('Grid Layout Unit Tests', () => {
  // Grid position interface
  interface GridPosition {
    page: number;
    row: number;
    col: number;
  }

  // Simplified grid layout for testing
  class TestGridLayout {
    private positions: Map<string, GridPosition> = new Map();
    private currentPage: number = 0;
    private totalPages: number = 1;

    constructor(
      private cols: number,
      private rows: number,
      appNames: string[]
    ) {
      this.layoutApps(appNames);
    }

    private layoutApps(appNames: string[]) {
      const appsPerPage = this.cols * this.rows;
      let page = 0;
      let row = 0;
      let col = 0;

      for (const name of appNames) {
        this.positions.set(name, { page, row, col });

        col++;
        if (col >= this.cols) {
          col = 0;
          row++;
          if (row >= this.rows) {
            row = 0;
            page++;
          }
        }
      }

      this.totalPages = Math.max(1, page + (row > 0 || col > 0 ? 1 : 0));
    }

    getPosition(appName: string): GridPosition | undefined {
      return this.positions.get(appName);
    }

    getAppsOnPage(page: number): string[] {
      const apps: string[] = [];
      for (const [name, pos] of this.positions) {
        if (pos.page === page) {
          apps.push(name);
        }
      }
      return apps;
    }

    getAppAt(page: number, row: number, col: number): string | undefined {
      for (const [name, pos] of this.positions) {
        if (pos.page === page && pos.row === row && pos.col === col) {
          return name;
        }
      }
      return undefined;
    }

    swapApps(app1: string, app2: string): boolean {
      const pos1 = this.positions.get(app1);
      const pos2 = this.positions.get(app2);

      if (!pos1 || !pos2) return false;

      this.positions.set(app1, pos2);
      this.positions.set(app2, pos1);
      return true;
    }

    getCurrentPage(): number {
      return this.currentPage;
    }

    getTotalPages(): number {
      return this.totalPages;
    }

    nextPage(): boolean {
      if (this.currentPage < this.totalPages - 1) {
        this.currentPage++;
        return true;
      }
      return false;
    }

    previousPage(): boolean {
      if (this.currentPage > 0) {
        this.currentPage--;
        return true;
      }
      return false;
    }

    goToPage(page: number): boolean {
      if (page >= 0 && page < this.totalPages) {
        this.currentPage = page;
        return true;
      }
      return false;
    }

    getAppsPerPage(): number {
      return this.cols * this.rows;
    }
  }

  describe('TabletTop (4x4 grid)', () => {
    const TABLET_COLS = 4;
    const TABLET_ROWS = 4;
    const APPS_PER_PAGE = 16;

    test('should calculate correct number of pages for 16 apps', () => {
      const apps = Array.from({ length: 16 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(TABLET_COLS, TABLET_ROWS, apps);
      expect(grid.getTotalPages()).toBe(1);
    });

    test('should calculate correct number of pages for 17 apps', () => {
      const apps = Array.from({ length: 17 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(TABLET_COLS, TABLET_ROWS, apps);
      expect(grid.getTotalPages()).toBe(2);
    });

    test('should calculate correct number of pages for 32 apps', () => {
      const apps = Array.from({ length: 32 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(TABLET_COLS, TABLET_ROWS, apps);
      expect(grid.getTotalPages()).toBe(2);
    });

    test('should place first app at page 0, row 0, col 0', () => {
      const apps = ['Calculator', 'Terminal', 'Chess'];
      const grid = new TestGridLayout(TABLET_COLS, TABLET_ROWS, apps);
      expect(grid.getPosition('Calculator')).toEqual({ page: 0, row: 0, col: 0 });
    });

    test('should place 5th app at row 1, col 0', () => {
      const apps = Array.from({ length: 8 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(TABLET_COLS, TABLET_ROWS, apps);
      expect(grid.getPosition('App5')).toEqual({ page: 0, row: 1, col: 0 });
    });

    test('should place 17th app on page 1', () => {
      const apps = Array.from({ length: 20 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(TABLET_COLS, TABLET_ROWS, apps);
      expect(grid.getPosition('App17')).toEqual({ page: 1, row: 0, col: 0 });
    });

    test('should return 16 apps per page', () => {
      const grid = new TestGridLayout(TABLET_COLS, TABLET_ROWS, []);
      expect(grid.getAppsPerPage()).toBe(16);
    });
  });

  describe('PhoneTop (3x4 grid)', () => {
    const PHONE_COLS = 3;
    const PHONE_ROWS = 4;
    const APPS_PER_PAGE = 12;

    test('should calculate correct number of pages for 12 apps', () => {
      const apps = Array.from({ length: 12 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(PHONE_COLS, PHONE_ROWS, apps);
      expect(grid.getTotalPages()).toBe(1);
    });

    test('should calculate correct number of pages for 13 apps', () => {
      const apps = Array.from({ length: 13 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(PHONE_COLS, PHONE_ROWS, apps);
      expect(grid.getTotalPages()).toBe(2);
    });

    test('should place 4th app at row 1, col 0', () => {
      const apps = Array.from({ length: 8 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(PHONE_COLS, PHONE_ROWS, apps);
      expect(grid.getPosition('App4')).toEqual({ page: 0, row: 1, col: 0 });
    });

    test('should place 13th app on page 1', () => {
      const apps = Array.from({ length: 15 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(PHONE_COLS, PHONE_ROWS, apps);
      expect(grid.getPosition('App13')).toEqual({ page: 1, row: 0, col: 0 });
    });

    test('should return 12 apps per page', () => {
      const grid = new TestGridLayout(PHONE_COLS, PHONE_ROWS, []);
      expect(grid.getAppsPerPage()).toBe(12);
    });
  });

  describe('Navigation', () => {
    test('should start on page 0', () => {
      const apps = Array.from({ length: 30 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);
      expect(grid.getCurrentPage()).toBe(0);
    });

    test('should navigate to next page', () => {
      const apps = Array.from({ length: 30 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);
      expect(grid.nextPage()).toBe(true);
      expect(grid.getCurrentPage()).toBe(1);
    });

    test('should not navigate past last page', () => {
      const apps = Array.from({ length: 10 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);
      expect(grid.nextPage()).toBe(false);
      expect(grid.getCurrentPage()).toBe(0);
    });

    test('should navigate to previous page', () => {
      const apps = Array.from({ length: 30 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);
      grid.nextPage();
      expect(grid.previousPage()).toBe(true);
      expect(grid.getCurrentPage()).toBe(0);
    });

    test('should not navigate before first page', () => {
      const apps = Array.from({ length: 30 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);
      expect(grid.previousPage()).toBe(false);
      expect(grid.getCurrentPage()).toBe(0);
    });

    test('should go to specific page', () => {
      const apps = Array.from({ length: 50 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);
      expect(grid.goToPage(2)).toBe(true);
      expect(grid.getCurrentPage()).toBe(2);
    });

    test('should not go to invalid page', () => {
      const apps = Array.from({ length: 20 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);
      expect(grid.goToPage(5)).toBe(false);
      expect(grid.getCurrentPage()).toBe(0);
    });
  });

  describe('App Swapping', () => {
    test('should swap two apps positions', () => {
      const apps = ['A', 'B', 'C', 'D'];
      const grid = new TestGridLayout(2, 2, apps);

      const posA = grid.getPosition('A');
      const posB = grid.getPosition('B');

      expect(grid.swapApps('A', 'B')).toBe(true);

      expect(grid.getPosition('A')).toEqual(posB);
      expect(grid.getPosition('B')).toEqual(posA);
    });

    test('should return false when swapping non-existent app', () => {
      const apps = ['A', 'B'];
      const grid = new TestGridLayout(2, 2, apps);
      expect(grid.swapApps('A', 'X')).toBe(false);
    });

    test('should swap apps across pages', () => {
      const apps = Array.from({ length: 20 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);

      // App1 is on page 0, App17 is on page 1
      expect(grid.swapApps('App1', 'App17')).toBe(true);
      expect(grid.getPosition('App1')?.page).toBe(1);
      expect(grid.getPosition('App17')?.page).toBe(0);
    });
  });

  describe('Query Operations', () => {
    test('should get apps on specific page', () => {
      const apps = Array.from({ length: 20 }, (_, i) => `App${i + 1}`);
      const grid = new TestGridLayout(4, 4, apps);

      const page0Apps = grid.getAppsOnPage(0);
      expect(page0Apps).toHaveLength(16);
      expect(page0Apps).toContain('App1');
      expect(page0Apps).toContain('App16');

      const page1Apps = grid.getAppsOnPage(1);
      expect(page1Apps).toHaveLength(4);
      expect(page1Apps).toContain('App17');
    });

    test('should get app at specific grid position', () => {
      const apps = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
      const grid = new TestGridLayout(3, 3, apps);

      expect(grid.getAppAt(0, 0, 0)).toBe('A');
      expect(grid.getAppAt(0, 0, 2)).toBe('C');
      expect(grid.getAppAt(0, 1, 0)).toBe('D');
      expect(grid.getAppAt(0, 2, 2)).toBe('I');
    });

    test('should return undefined for empty grid position', () => {
      const apps = ['A', 'B'];
      const grid = new TestGridLayout(3, 3, apps);
      expect(grid.getAppAt(0, 2, 2)).toBeUndefined();
    });
  });
});
