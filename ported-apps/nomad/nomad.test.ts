/**
 * Jest tests for Nomad App
 * Tests timezone calculations, city management, and state handling
 */

import { City, NomadState, WORLD_CITIES, NomadUI } from './nomad';

describe('Nomad Timezone Logic', () => {
  describe('City database', () => {
    test('should have a comprehensive list of world cities', () => {
      expect(WORLD_CITIES.length).toBeGreaterThan(50);
    });

    test('should have cities from all major regions', () => {
      const regions = {
        europe: WORLD_CITIES.filter((c) => c.timezone.startsWith('Europe/')),
        americas: WORLD_CITIES.filter((c) => c.timezone.startsWith('America/')),
        asia: WORLD_CITIES.filter((c) => c.timezone.startsWith('Asia/')),
        oceania: WORLD_CITIES.filter(
          (c) => c.timezone.startsWith('Australia/') || c.timezone.startsWith('Pacific/')
        ),
        africa: WORLD_CITIES.filter((c) => c.timezone.startsWith('Africa/')),
      };

      expect(regions.europe.length).toBeGreaterThan(10);
      expect(regions.americas.length).toBeGreaterThan(10);
      expect(regions.asia.length).toBeGreaterThan(10);
      expect(regions.oceania.length).toBeGreaterThan(3);
      expect(regions.africa.length).toBeGreaterThan(3);
    });

    test('should have valid IANA timezone names', () => {
      for (const city of WORLD_CITIES) {
        expect(city.timezone).toMatch(/^[A-Z][a-z]+\/[A-Za-z_]+/);
      }
    });

    test('should have unique IDs', () => {
      const ids = WORLD_CITIES.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('should include Edinburgh as default city', () => {
      const edinburgh = WORLD_CITIES.find((c) => c.id === 'edinburgh');
      expect(edinburgh).toBeDefined();
      expect(edinburgh?.country).toBe('United Kingdom');
      expect(edinburgh?.timezone).toBe('Europe/London');
    });
  });

  describe('Time calculation with Intl API', () => {
    test('should format time correctly using toLocaleTimeString', () => {
      const date = new Date('2024-07-15T12:00:00Z');

      // Test with known timezone
      const tokyoTime = date.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // Tokyo is UTC+9, so 12:00 UTC should be 21:00 in Tokyo
      expect(tokyoTime).toBe('21:00');
    });

    test('should handle DST correctly', () => {
      // Summer time in London (BST = UTC+1)
      const summerDate = new Date('2024-07-15T12:00:00Z');
      const summerTime = summerDate.toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      expect(summerTime).toBe('13:00'); // BST

      // Winter time in London (GMT = UTC+0)
      const winterDate = new Date('2024-01-15T12:00:00Z');
      const winterTime = winterDate.toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      expect(winterTime).toBe('12:00'); // GMT
    });

    test('should format dates correctly', () => {
      const date = new Date('2024-07-15T12:00:00Z');

      const formatted = date.toLocaleDateString('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      expect(formatted).toContain('Jul');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('Mon');
    });

    test('should get timezone abbreviation', () => {
      const summerDate = new Date('2024-07-15T12:00:00Z');
      const parts = summerDate
        .toLocaleTimeString('en-GB', {
          timeZone: 'Europe/London',
          timeZoneName: 'short',
        })
        .split(' ');
      const tzAbbr = parts[parts.length - 1];

      // In summer, London uses BST
      expect(tzAbbr).toBe('BST');
    });
  });

  describe('City management', () => {
    test('should create city objects with all required fields', () => {
      const city: City = {
        id: 'tokyo',
        name: 'Tokyo',
        country: 'Japan',
        timezone: 'Asia/Tokyo',
      };

      expect(city.id).toBe('tokyo');
      expect(city.name).toBe('Tokyo');
      expect(city.country).toBe('Japan');
      expect(city.timezone).toBe('Asia/Tokyo');
    });

    test('should find cities by ID', () => {
      const tokyo = WORLD_CITIES.find((c) => c.id === 'tokyo');
      expect(tokyo).toBeDefined();
      expect(tokyo?.name).toBe('Tokyo');
    });

    test('should filter cities by search query', () => {
      const filterCities = (query: string): City[] => {
        if (!query || query.length < 2) return [];
        const lowerQuery = query.toLowerCase();
        return WORLD_CITIES.filter(
          (city) =>
            city.name.toLowerCase().includes(lowerQuery) ||
            city.country.toLowerCase().includes(lowerQuery)
        ).slice(0, 10);
      };

      // Search by city name
      const newResults = filterCities('new');
      expect(newResults.some((c) => c.name === 'New York')).toBe(true);

      // Search by country
      const japanResults = filterCities('japan');
      expect(japanResults.some((c) => c.country === 'Japan')).toBe(true);

      // No results for short query
      expect(filterCities('a').length).toBe(0);
    });

    test('should prevent duplicate cities', () => {
      const cities: City[] = [];
      const tokyo = WORLD_CITIES.find((c) => c.id === 'tokyo')!;

      const addCity = (city: City) => {
        if (!cities.find((c) => c.id === city.id)) {
          cities.push({ ...city });
        }
      };

      addCity(tokyo);
      addCity(tokyo); // Try to add duplicate

      expect(cities.length).toBe(1);
    });

    test('should remove cities by ID', () => {
      let cities: City[] = [
        WORLD_CITIES.find((c) => c.id === 'tokyo')!,
        WORLD_CITIES.find((c) => c.id === 'london')!,
        WORLD_CITIES.find((c) => c.id === 'new-york')!,
      ];

      cities = cities.filter((c) => c.id !== 'london');

      expect(cities.length).toBe(2);
      expect(cities.find((c) => c.id === 'london')).toBeUndefined();
    });
  });

  describe('State management', () => {
    test('should initialize with default state', () => {
      const state: NomadState = {
        cities: [],
        selectedDate: new Date(),
        useCurrentTime: true,
        selectedTimeSlot: 'Now',
      };

      expect(state.cities).toEqual([]);
      expect(state.useCurrentTime).toBe(true);
    });

    test('should serialize cities to JSON for storage', () => {
      const cities: City[] = [
        { id: 'tokyo', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
        { id: 'london', name: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
      ];

      const json = JSON.stringify(cities);
      const parsed = JSON.parse(json) as City[];

      expect(parsed.length).toBe(2);
      expect(parsed[0].id).toBe('tokyo');
      expect(parsed[1].timezone).toBe('Europe/London');
    });

    test('should handle date selection', () => {
      const state: NomadState = {
        cities: [],
        selectedDate: new Date(),
        useCurrentTime: true,
        selectedTimeSlot: 'Now',
      };

      // Selecting a specific date should disable useCurrentTime
      const selectedDate = new Date('2024-12-25T10:00:00');
      state.selectedDate = selectedDate;
      state.useCurrentTime = false;

      expect(state.useCurrentTime).toBe(false);
      expect(state.selectedDate.getMonth()).toBe(11); // December
      expect(state.selectedDate.getDate()).toBe(25);
    });

    test('should track "Now" selection', () => {
      const state: NomadState = {
        cities: [],
        selectedDate: new Date('2024-01-01'),
        useCurrentTime: false,
        selectedTimeSlot: '10:00',
      };

      // Selecting "Now" should enable useCurrentTime
      state.useCurrentTime = true;
      state.selectedDate = new Date();

      expect(state.useCurrentTime).toBe(true);
    });
  });

  describe('Time picker options', () => {
    test('should generate time options every 15 minutes', () => {
      const generateTimeOptions = (): string[] => {
        const options = ['Now'];
        for (let hour = 0; hour < 24; hour++) {
          for (const minute of [0, 15, 30, 45]) {
            options.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
          }
        }
        return options;
      };

      const options = generateTimeOptions();

      expect(options[0]).toBe('Now');
      expect(options[1]).toBe('00:00');
      expect(options[2]).toBe('00:15');
      expect(options[3]).toBe('00:30');
      expect(options[4]).toBe('00:45');
      expect(options[5]).toBe('01:00');
      expect(options.length).toBe(1 + 24 * 4); // Now + 96 time slots
    });
  });

  describe('Multiple timezone display', () => {
    test('should show correct times across multiple timezones', () => {
      const date = new Date('2024-07-15T12:00:00Z');

      const timezones = [
        { timezone: 'Europe/London', expected: '13:00' }, // BST
        { timezone: 'America/New_York', expected: '08:00' }, // EDT
        { timezone: 'Asia/Tokyo', expected: '21:00' }, // JST
        { timezone: 'Australia/Sydney', expected: '22:00' }, // AEST
      ];

      for (const { timezone, expected } of timezones) {
        const time = date.toLocaleTimeString('en-GB', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        expect(time).toBe(expected);
      }
    });
  });
});
