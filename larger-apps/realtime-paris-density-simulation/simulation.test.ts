import { generateDensityGrid, interpolateDensityGrids, TimeOfWeek } from './simulation';

describe('Paris Density Simulation', () => {
  describe('generateDensityGrid', () => {
    test('should generate density points for Paris', () => {
      const time: TimeOfWeek = { hour: 12, day: 0 };
      const grid = generateDensityGrid(time, 0.05); // Coarse resolution for tests

      expect(grid.length).toBeGreaterThan(0);
      expect(grid[0]).toHaveProperty('x');
      expect(grid[0]).toHaveProperty('y');
      expect(grid[0]).toHaveProperty('lat');
      expect(grid[0]).toHaveProperty('lng');
      expect(grid[0]).toHaveProperty('density');
    });

    test('should have density values between 0 and 100', () => {
      const time: TimeOfWeek = { hour: 12, day: 0 };
      const grid = generateDensityGrid(time, 0.05);

      for (const point of grid) {
        expect(point.density).toBeGreaterThanOrEqual(0);
        expect(point.density).toBeLessThanOrEqual(100);
      }
    });

    test('should have normalized x,y coordinates between 0 and 1', () => {
      const time: TimeOfWeek = { hour: 12, day: 0 };
      const grid = generateDensityGrid(time, 0.05);

      for (const point of grid) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
      }
    });

    test('should vary density by hour', () => {
      const day = 3;
      const morningGrid = generateDensityGrid({ hour: 6, day }, 0.05);
      const afternoonGrid = generateDensityGrid({ hour: 14, day }, 0.05);

      // Calculate average density
      const morningAvg = morningGrid.reduce((sum, p) => sum + p.density, 0) / morningGrid.length;
      const afternoonAvg = afternoonGrid.reduce((sum, p) => sum + p.density, 0) / afternoonGrid.length;

      // Afternoon should have different density than morning
      expect(Math.abs(morningAvg - afternoonAvg)).toBeGreaterThan(0.5);
    });

    test('should vary density by day', () => {
      const hour = 12;
      const weekdayGrid = generateDensityGrid({ hour, day: 1 }, 0.05); // Monday
      const weekendGrid = generateDensityGrid({ hour, day: 6 }, 0.05); // Saturday

      const weekdayAvg = weekdayGrid.reduce((sum, p) => sum + p.density, 0) / weekdayGrid.length;
      const weekendAvg = weekendGrid.reduce((sum, p) => sum + p.density, 0) / weekendGrid.length;

      // Patterns should differ between weekday and weekend
      expect(Math.abs(weekdayAvg - weekendAvg)).toBeGreaterThan(0.5);
    });

    test('should handle edge hours gracefully', () => {
      const midnight: TimeOfWeek = { hour: 0, day: 0 };
      const nearMidnight: TimeOfWeek = { hour: 23, day: 6 };

      const grid1 = generateDensityGrid(midnight, 0.05);
      const grid2 = generateDensityGrid(nearMidnight, 0.05);

      expect(grid1.length).toBeGreaterThan(0);
      expect(grid2.length).toBeGreaterThan(0);
    });
  });

  describe('interpolateDensityGrids', () => {
    test('should interpolate between two grids', () => {
      const time1: TimeOfWeek = { hour: 12, day: 0 };
      const time2: TimeOfWeek = { hour: 13, day: 0 };

      const grid1 = generateDensityGrid(time1, 0.05);
      const grid2 = generateDensityGrid(time2, 0.05);

      const interpolated = interpolateDensityGrids(grid1, grid2, 0.5);

      expect(interpolated.length).toBe(grid1.length);

      // At t=0.5, density should be closer to the average
      for (let i = 0; i < interpolated.length; i++) {
        expect(interpolated[i].density).toBeGreaterThanOrEqual(
          Math.min(grid1[i].density, grid2[i].density) - 1
        );
        expect(interpolated[i].density).toBeLessThanOrEqual(
          Math.max(grid1[i].density, grid2[i].density) + 1
        );
      }
    });

    test('should return grid1 at t=0', () => {
      const time1: TimeOfWeek = { hour: 12, day: 0 };
      const time2: TimeOfWeek = { hour: 13, day: 0 };

      const grid1 = generateDensityGrid(time1, 0.05);
      const grid2 = generateDensityGrid(time2, 0.05);

      const interpolated = interpolateDensityGrids(grid1, grid2, 0.0);

      // At t=0, should be very close to grid1 (with rounding)
      for (let i = 0; i < interpolated.length; i++) {
        expect(Math.abs(interpolated[i].density - grid1[i].density)).toBeLessThan(0.1);
      }
    });

    test('should return grid2 at t=1', () => {
      const time1: TimeOfWeek = { hour: 12, day: 0 };
      const time2: TimeOfWeek = { hour: 13, day: 0 };

      const grid1 = generateDensityGrid(time1, 0.05);
      const grid2 = generateDensityGrid(time2, 0.05);

      const interpolated = interpolateDensityGrids(grid1, grid2, 1.0);

      // At t=1, should be very close to grid2 (with rounding)
      for (let i = 0; i < interpolated.length; i++) {
        expect(Math.abs(interpolated[i].density - grid2[i].density)).toBeLessThan(0.1);
      }
    });
  });
});
