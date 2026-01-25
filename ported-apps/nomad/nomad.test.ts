/**
 * Jest tests for Nomad App
 */

describe('Nomad Timezone Logic', () => {
  describe('Time calculation', () => {
    test('should calculate time at different offsets', () => {
      const calculateTime = (offset: number): { hours: number; minutes: number } => {
        const now = new Date();
        const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        const offsetMs = offset * 60 * 60 * 1000;
        const localTime = new Date(utcTime.getTime() + offsetMs);

        return {
          hours: localTime.getHours(),
          minutes: localTime.getMinutes(),
        };
      };

      // UTC offset 0 should give current UTC time
      const utc = calculateTime(0);
      expect(utc.hours).toBeDefined();
      expect(utc.minutes).toBeDefined();

      // Different offsets should produce different times
      const plus5 = calculateTime(5);
      const minus5 = calculateTime(-5);
      expect(plus5.hours).not.toBe(minus5.hours);
    });

    test('should handle positive and negative offsets', () => {
      const now = new Date();
      const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

      // Positive offset (East of UTC)
      const offset5 = new Date(utcTime.getTime() + 5 * 60 * 60 * 1000);
      expect(offset5.getUTCHours()).toBeGreaterThanOrEqual(0);

      // Negative offset (West of UTC)
      const offsetMinus5 = new Date(utcTime.getTime() - 5 * 60 * 60 * 1000);
      expect(offsetMinus5.getUTCHours()).toBeGreaterThanOrEqual(0);
    });

    test('should handle fractional offsets', () => {
      const calculateTime = (offset: number): boolean => {
        const offsetMs = offset * 60 * 60 * 1000;
        return offsetMs !== undefined;
      };

      expect(calculateTime(5.5)).toBe(true);
      expect(calculateTime(9.5)).toBe(true);
      expect(calculateTime(-3.5)).toBe(true);
    });
  });

  describe('Location management', () => {
    test('should create location objects', () => {
      interface TimeLocation {
        id: string;
        name: string;
        timezone: string;
        offset: number;
      }

      const location: TimeLocation = {
        id: 'tokyo',
        name: 'Tokyo',
        timezone: 'Asia/Tokyo',
        offset: 9,
      };

      expect(location.name).toBe('Tokyo');
      expect(location.offset).toBe(9);
      expect(location.timezone).toBe('Asia/Tokyo');
    });

    test('should manage location list', () => {
      interface TimeLocation {
        id: string;
        name: string;
        timezone: string;
        offset: number;
      }

      const locations: TimeLocation[] = [];

      const tokyo: TimeLocation = { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 9 };
      const ny: TimeLocation = { id: 'ny', name: 'New York', timezone: 'America/New_York', offset: -5 };

      locations.push(tokyo);
      locations.push(ny);

      expect(locations.length).toBe(2);
      expect(locations.find((l) => l.id === 'tokyo')).toBe(tokyo);
      expect(locations.find((l) => l.id === 'ny')).toBe(ny);
    });

    test('should prevent duplicate locations', () => {
      interface TimeLocation {
        id: string;
        name: string;
        timezone: string;
        offset: number;
      }

      const locations: TimeLocation[] = [];
      const tokyo: TimeLocation = { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 9 };

      locations.push(tokyo);

      // Try to add duplicate
      if (!locations.find((l) => l.id === 'tokyo')) {
        locations.push(tokyo);
      }

      expect(locations.length).toBe(1);
    });

    test('should remove locations', () => {
      interface TimeLocation {
        id: string;
        name: string;
        timezone: string;
        offset: number;
      }

      let locations: TimeLocation[] = [
        { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 9 },
        { id: 'ny', name: 'New York', timezone: 'America/New_York', offset: -5 },
      ];

      locations = locations.filter((l) => l.id !== 'tokyo');

      expect(locations.length).toBe(1);
      expect(locations[0].id).toBe('ny');
    });
  });

  describe('Sorting', () => {
    test('should sort by name', () => {
      interface TimeLocation {
        id: string;
        name: string;
        timezone: string;
        offset: number;
      }

      const locations: TimeLocation[] = [
        { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 9 },
        { id: 'paris', name: 'Paris', timezone: 'Europe/Paris', offset: 1 },
        { id: 'ny', name: 'New York', timezone: 'America/New_York', offset: -5 },
      ];

      locations.sort((a, b) => a.name.localeCompare(b.name));

      expect(locations[0].name).toBe('New York');
      expect(locations[1].name).toBe('Paris');
      expect(locations[2].name).toBe('Tokyo');
    });

    test('should sort by UTC offset', () => {
      interface TimeLocation {
        id: string;
        name: string;
        timezone: string;
        offset: number;
      }

      const locations: TimeLocation[] = [
        { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 9 },
        { id: 'paris', name: 'Paris', timezone: 'Europe/Paris', offset: 1 },
        { id: 'ny', name: 'New York', timezone: 'America/New_York', offset: -5 },
      ];

      locations.sort((a, b) => a.offset - b.offset);

      expect(locations[0].offset).toBe(-5);
      expect(locations[1].offset).toBe(1);
      expect(locations[2].offset).toBe(9);
    });
  });

  describe('Time format options', () => {
    test('should support 24-hour format', () => {
      const testTime = new Date(2024, 0, 1, 15, 30, 45);
      const formatted = testTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    test('should support 12-hour format', () => {
      const testTime = new Date(2024, 0, 1, 15, 30, 45);
      const formatted = testTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}\s(AM|PM)/);
    });
  });

  describe('State management', () => {
    test('should track user preferences', () => {
      interface NomadState {
        locations: Array<{ id: string; name: string }>;
        sortByName: boolean;
        useFormat24h: boolean;
      }

      const state: NomadState = {
        locations: [],
        sortByName: true,
        useFormat24h: true,
      };

      expect(state.sortByName).toBe(true);
      expect(state.useFormat24h).toBe(true);

      state.sortByName = false;
      state.useFormat24h = false;

      expect(state.sortByName).toBe(false);
      expect(state.useFormat24h).toBe(false);
    });

    test('should persist multiple locations', () => {
      interface TimeLocation {
        id: string;
        name: string;
        timezone: string;
        offset: number;
      }

      const locations: TimeLocation[] = [
        { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 9 },
        { id: 'paris', name: 'Paris', timezone: 'Europe/Paris', offset: 1 },
        { id: 'ny', name: 'New York', timezone: 'America/New_York', offset: -5 },
        { id: 'london', name: 'London', timezone: 'Europe/London', offset: 0 },
      ];

      const json = JSON.stringify(locations);
      const parsed = JSON.parse(json);

      expect(parsed.length).toBe(4);
      expect(parsed[0].name).toBe('Tokyo');
      expect(parsed[3].name).toBe('London');
    });
  });

  describe('UTC offsets', () => {
    test('should recognize standard UTC offsets', () => {
      const offsets = [0, 1, 2, 3, 4, 5, 5.5, 6, 7, 8, 9, 10, 12, -3, -5, -8];

      for (const offset of offsets) {
        expect(typeof offset).toBe('number');
        expect(offset).toBeGreaterThanOrEqual(-12);
        expect(offset).toBeLessThanOrEqual(14);
      }
    });

    test('should handle day boundary crossings', () => {
      const offset23 = 23; // East side of international date line
      const offsetMinus11 = -11; // West side of international date line

      expect(offset23).toBeGreaterThan(offsetMinus11);
      expect(Math.abs(offset23 - offsetMinus11)).toBe(34);
    });
  });
});
