/**
 * Nomad App - Time zone conversion and management
 *
 * A time conversion application for managing time across multiple timezones
 * and locations. Track current time in different cities and time zones.
 * Features beautiful city cards with background images, calendar date picker,
 * and time selection dropdowns.
 *
 * Ported from Nomad (https://github.com/fynelabs/nomad)
 * Original by Fyne Labs
 *
 * Portions copyright original team and portions copyright Paul Hammant 2025
 * License: BSD 3-Clause
 *
 * @tsyne-app:name Nomad
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="1"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildNomadApp
 * @tsyne-app:args app,win
 * @tsyne-app:count single
 */

import type { App, Window, Label, CompletionEntry } from 'tsyne';

/**
 * City data with proper timezone support
 */
export interface City {
  id: string;
  name: string;
  country: string;
  timezone: string; // IANA timezone name (e.g., 'Europe/London')
  imageUrl?: string; // Unsplash background image URL
}

/**
 * Static photo URLs for cities
 * Using Picsum for reliable placeholder images (no auth required)
 * In production, would use Unsplash API with proper authentication
 */
const CITY_IMAGES: Record<string, string> = {
  'edinburgh': 'https://picsum.photos/seed/edinburgh/400/200',
  'london': 'https://picsum.photos/seed/london/400/200',
  'paris': 'https://picsum.photos/seed/paris/400/200',
  'berlin': 'https://picsum.photos/seed/berlin/400/200',
  'rome': 'https://picsum.photos/seed/rome/400/200',
  'new-york': 'https://picsum.photos/seed/newyork/400/200',
  'tokyo': 'https://picsum.photos/seed/tokyo/400/200',
  'sydney': 'https://picsum.photos/seed/sydney/400/200',
  'dubai': 'https://picsum.photos/seed/dubai/400/200',
  'singapore': 'https://picsum.photos/seed/singapore/400/200',
};

/**
 * App state
 */
export interface NomadState {
  cities: City[];
  selectedDate: Date; // The date/time being viewed (can be past/future)
  useCurrentTime: boolean; // Whether to track current time or show selected time
  selectedTimeSlot: string; // The time slot selected in dropdown ('Now' or 'HH:MM')
}

/**
 * Comprehensive list of world cities with timezones
 * Searchable via autocomplete
 */
export const WORLD_CITIES: City[] = [
  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { id: 'paris', name: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin' },
  { id: 'rome', name: 'Rome', country: 'Italy', timezone: 'Europe/Rome' },
  { id: 'madrid', name: 'Madrid', country: 'Spain', timezone: 'Europe/Madrid' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
  { id: 'vienna', name: 'Vienna', country: 'Austria', timezone: 'Europe/Vienna' },
  { id: 'zurich', name: 'Zurich', country: 'Switzerland', timezone: 'Europe/Zurich' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { id: 'oslo', name: 'Oslo', country: 'Norway', timezone: 'Europe/Oslo' },
  { id: 'copenhagen', name: 'Copenhagen', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { id: 'helsinki', name: 'Helsinki', country: 'Finland', timezone: 'Europe/Helsinki' },
  { id: 'warsaw', name: 'Warsaw', country: 'Poland', timezone: 'Europe/Warsaw' },
  { id: 'prague', name: 'Prague', country: 'Czech Republic', timezone: 'Europe/Prague' },
  { id: 'budapest', name: 'Budapest', country: 'Hungary', timezone: 'Europe/Budapest' },
  { id: 'athens', name: 'Athens', country: 'Greece', timezone: 'Europe/Athens' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon' },
  { id: 'dublin', name: 'Dublin', country: 'Ireland', timezone: 'Europe/Dublin' },
  { id: 'edinburgh', name: 'Edinburgh', country: 'United Kingdom', timezone: 'Europe/London' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', timezone: 'Europe/Moscow' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul' },

  // Americas
  { id: 'new-york', name: 'New York', country: 'United States', timezone: 'America/New_York' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles' },
  { id: 'chicago', name: 'Chicago', country: 'United States', timezone: 'America/Chicago' },
  { id: 'houston', name: 'Houston', country: 'United States', timezone: 'America/Chicago' },
  { id: 'phoenix', name: 'Phoenix', country: 'United States', timezone: 'America/Phoenix' },
  { id: 'denver', name: 'Denver', country: 'United States', timezone: 'America/Denver' },
  { id: 'seattle', name: 'Seattle', country: 'United States', timezone: 'America/Los_Angeles' },
  { id: 'miami', name: 'Miami', country: 'United States', timezone: 'America/New_York' },
  { id: 'boston', name: 'Boston', country: 'United States', timezone: 'America/New_York' },
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timezone: 'America/Toronto' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver' },
  { id: 'montreal', name: 'Montreal', country: 'Canada', timezone: 'America/Montreal' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo' },
  { id: 'rio', name: 'Rio de Janeiro', country: 'Brazil', timezone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires' },
  { id: 'lima', name: 'Lima', country: 'Peru', timezone: 'America/Lima' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', timezone: 'America/Bogota' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', timezone: 'America/Santiago' },

  // Asia
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  { id: 'osaka', name: 'Osaka', country: 'Japan', timezone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul' },
  { id: 'beijing', name: 'Beijing', country: 'China', timezone: 'Asia/Shanghai' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', timezone: 'Asia/Shanghai' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong' },
  { id: 'taipei', name: 'Taipei', country: 'Taiwan', timezone: 'Asia/Taipei' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok' },
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur' },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', timezone: 'Asia/Jakarta' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata' },
  { id: 'delhi', name: 'Delhi', country: 'India', timezone: 'Asia/Kolkata' },
  { id: 'bangalore', name: 'Bangalore', country: 'India', timezone: 'Asia/Kolkata' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai' },
  { id: 'abu-dhabi', name: 'Abu Dhabi', country: 'UAE', timezone: 'Asia/Dubai' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', timezone: 'Asia/Jerusalem' },
  { id: 'manila', name: 'Manila', country: 'Philippines', timezone: 'Asia/Manila' },
  { id: 'hanoi', name: 'Hanoi', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh' },
  { id: 'ho-chi-minh', name: 'Ho Chi Minh City', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh' },

  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne' },
  { id: 'brisbane', name: 'Brisbane', country: 'Australia', timezone: 'Australia/Brisbane' },
  { id: 'perth', name: 'Perth', country: 'Australia', timezone: 'Australia/Perth' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland' },
  { id: 'wellington', name: 'Wellington', country: 'New Zealand', timezone: 'Pacific/Auckland' },

  // Africa
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', timezone: 'Africa/Johannesburg' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', timezone: 'Africa/Johannesburg' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi' },
  { id: 'casablanca', name: 'Casablanca', country: 'Morocco', timezone: 'Africa/Casablanca' },
];

/**
 * Generate time options for the time picker (every 15 minutes)
 */
function generateTimeOptions(): string[] {
  const options = ['Now'];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      options.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

/**
 * Nomad Time Zone Manager UI
 */
export class NomadUI {
  private window: Window | null = null;
  private state: NomadState = {
    cities: [],
    selectedDate: new Date(),
    useCurrentTime: true,
    selectedTimeSlot: 'Now',
  };

  private timeUpdateInterval: NodeJS.Timeout | null = null;
  private searchResults: City[] = [];
  private isBuilding: boolean = false; // Prevent recursive rebuilds during construction

  constructor(private a: App) {
    // Initialize with default city synchronously
    this.state.cities = [
      WORLD_CITIES.find((c) => c.id === 'edinburgh') || WORLD_CITIES[0],
    ];

    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const citiesJson = this.a.getPreference('nomad_cities', '[]');
      // Handle both sync and async getPreference
      if (citiesJson instanceof Promise) {
        citiesJson.then((json: string) => {
          this.parseAndSetCities(json);
        });
      } else {
        this.parseAndSetCities(citiesJson as string);
      }
    } catch {
      // Keep default city on error
    }
  }

  private parseAndSetCities(json: string): void {
    try {
      const savedCities = JSON.parse(json);
      if (savedCities.length > 0) {
        this.state.cities = savedCities;
        // Don't call refreshUI here - buildUI will use the loaded cities
        // If UI is already built, a manual refresh can be triggered
        if (this.window && !this.isBuilding) {
          this.refreshUI();
        }
      }
    } catch {
      // Keep default city on parse error
    }
  }

  private saveSettings(): void {
    this.a.setPreference('nomad_cities', JSON.stringify(this.state.cities));
  }

  /**
   * Format time for a given timezone using the Intl API
   * This properly handles DST and all timezone rules
   */
  private formatTime(timezone: string, date: Date): string {
    try {
      return date.toLocaleTimeString('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '--:--';
    }
  }

  /**
   * Format date for a given timezone
   */
  private formatDate(timezone: string, date: Date): string {
    try {
      return date.toLocaleDateString('en-GB', {
        timeZone: timezone,
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '---';
    }
  }

  /**
   * Get timezone abbreviation (e.g., BST, EST, PST)
   */
  private getTimezoneAbbr(timezone: string, date: Date): string {
    try {
      const parts = date.toLocaleTimeString('en-GB', {
        timeZone: timezone,
        timeZoneName: 'short',
      }).split(' ');
      return parts[parts.length - 1] || timezone;
    } catch {
      return timezone;
    }
  }

  /**
   * Add a city to the list
   */
  private addCity(city: City): void {
    // Check if already added
    if (this.state.cities.find((c) => c.id === city.id)) {
      return;
    }

    this.state.cities.push({ ...city });
    this.saveSettings();
    this.refreshUI();
  }

  /**
   * Remove a city from the list
   */
  private removeCity(cityId: string): void {
    this.state.cities = this.state.cities.filter((c) => c.id !== cityId);
    this.saveSettings();
    this.refreshUI();
  }

  /**
   * Handle date selection from calendar
   */
  private onDateSelected(cityTimezone: string, dateStr: string): void {
    // Parse the ISO date string and preserve the time
    const [year, month, day] = dateStr.split('-').map(Number);
    const currentDate = this.state.selectedDate;

    // Get current time in the city's timezone
    const timeStr = this.formatTime(cityTimezone, currentDate);
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Create new date with selected date but preserve time
    const newDate = new Date(year, month - 1, day, hours, minutes);
    this.state.selectedDate = newDate;
    this.state.useCurrentTime = false;
    this.refreshUI();
  }

  /**
   * Handle time selection
   */
  private onTimeSelected(cityTimezone: string, timeStr: string): void {
    // Guard against unnecessary refreshes - only act if slot actually changed
    if (timeStr === this.state.selectedTimeSlot) {
      return; // No change
    }

    if (timeStr === 'Now') {
      this.state.useCurrentTime = true;
      this.state.selectedDate = new Date();
      this.state.selectedTimeSlot = 'Now';
      this.refreshUI();
      return;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    const currentDate = this.state.selectedDate;

    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      hours,
      minutes
    );

    this.state.selectedDate = newDate;
    this.state.useCurrentTime = false;
    this.state.selectedTimeSlot = timeStr; // Store the exact slot user picked
    this.refreshUI();
  }

  /**
   * Filter cities for search
   */
  private filterCities(query: string): City[] {
    if (!query || query.length < 2) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    return WORLD_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(lowerQuery) ||
        city.country.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limit to 10 results
  }

  private refreshUI(): void {
    // Prevent recursive rebuilds during construction
    if (this.isBuilding) {
      return;
    }
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  /**
   * Show photo info for a city
   */
  private showPhotoInfo(city: City): void {
    const imageUrl = city.imageUrl || CITY_IMAGES[city.id] ||
      `https://picsum.photos/seed/${encodeURIComponent(city.id)}/400/200`;

    if (this.window) {
      this.window.showInfo(
        `Photo: ${city.name}`,
        `Image source: Picsum Photos (placeholder)\nURL: ${imageUrl}`
      );
    }
  }

  /**
   * Build a single city card
   */
  private buildCityCard(city: City): void {
    const displayDate = this.state.useCurrentTime ? new Date() : this.state.selectedDate;
    const time = this.formatTime(city.timezone, displayDate);
    const date = this.formatDate(city.timezone, displayDate);
    const tzAbbr = this.getTimezoneAbbr(city.timezone, displayDate);

    // Get image URL for this city (fallback to seeded placeholder)
    const imageUrl = city.imageUrl || CITY_IMAGES[city.id] ||
      `https://picsum.photos/seed/${encodeURIComponent(city.id)}/400/200`;

    // Card with background image using stack
    this.a.stack(() => {
      // Layer 1: Background image
      this.a.image({ url: imageUrl, fillMode: 'stretch' });

      // Layer 2: Content overlay
      this.a.card('', '', () => {
        this.a.padded(() => {
          this.a.vbox(() => {
            // Row 1: City name + menu button
            this.a.hbox(() => {
              this.a.label(city.name.toUpperCase()).withId(`nomad-city-${city.id}`);
              this.a.spacer();
              this.a.menuButton('…', (menu) => {
                menu.item('Delete Place', () => this.removeCity(city.id));
                menu.item('Photo info', () => this.showPhotoInfo(city));
              }).withId(`nomad-menu-${city.id}`);
            });

            // Row 2: Country and timezone abbreviation
            this.a
              .label(`${city.country.toUpperCase()} · ${tzAbbr}`)
              .withId(`nomad-tz-${city.id}`);

            this.a.spacer();

            // Row 3: Date picker and time selector
            this.a.hbox(() => {
              // Date picker button
              this.a
                .button(`${date} ▾`)
                .onClick(() => {
                  // Show calendar - for now just a simple date display
                })
                .withId(`nomad-date-${city.id}`);

              this.a.spacer();

              // Time slot selector (select from 15-min intervals)
              // Use stored slot, not formatted time, to avoid callback loops
              const timeSelect = this.a.select(
                ['Now', ...TIME_OPTIONS],
                (selected) => {
                  this.onTimeSelected(city.timezone, selected);
                }
              ).withId(`nomad-time-${city.id}`);

              // Set to the stored time slot (user's selection), not the display time
              timeSelect.setSelected(this.state.selectedTimeSlot);
            });

            // Row 4: Large time display
            this.a.hbox(() => {
              this.a.spacer();
              this.a.label(time).withId(`nomad-time-display-${city.id}`);
            });
          });
        });
      });
    });
  }

  /**
   * Build the search/add section using CompletionEntry for autocomplete
   * Matches the original nomad's xWidget.CompletionEntry behavior
   */
  private buildSearchSection(): void {
    // Store reference for use in callbacks
    let searchEntry: CompletionEntry;
    // Track current filtered results for selection detection
    let currentFiltered: City[] = [];

    // Use border layout so the completionEntry expands to fill available space
    // (matching the original: container.NewBorder(nil, nil, add, nil, search))
    this.a.border({
      left: () => {
        this.a.label('+').withId('nomad-add-icon');
      },
      center: () => {
        // Autocomplete entry to search and add cities
        searchEntry = this.a.completionEntry(
          [], // Start with empty options - filtered dynamically
          'ADD A PLACE',
          async (text) => {
            // Check if user selected from dropdown (text matches a full option)
            const selectedCity = currentFiltered.find(
              (c) => `${c.name}, ${c.country}` === text
            );
            if (selectedCity) {
              // Clear entry BEFORE addCity() since addCity triggers refreshUI
              // which destroys and recreates the widget
              await searchEntry.setText('');
              await searchEntry.hideCompletion();
              currentFiltered = [];
              this.addCity(selectedCity);
              return;
            }

            // Filter cities when text length >= 2
            if (text.length < 2) {
              await searchEntry.hideCompletion();
              currentFiltered = [];
              return;
            }

            const filtered = this.filterCities(text);
            currentFiltered = filtered;

            if (filtered.length === 0) {
              await searchEntry.hideCompletion();
              return;
            }

            // Update options with filtered city names
            const options = filtered.map((c) => `${c.name}, ${c.country}`);
            await searchEntry.setOptions(options);
            await searchEntry.showCompletion();
          },
          async (text) => {
            // On submit (Enter key), add the first matching city
            if (currentFiltered.length > 0) {
              // Clear entry BEFORE addCity() since addCity triggers refreshUI
              // which destroys and recreates the widget
              await searchEntry.setText('');
              const cityToAdd = currentFiltered[0];
              currentFiltered = [];
              this.addCity(cityToAdd);
            }
          }
        ).withId('nomad-add-city');
      }
    });
  }

  buildUI(win: Window): void {
    this.isBuilding = true;
    this.window = win;

    // Apply custom theme colors matching the original
    this.a.setCustomTheme({
      background: '#180C27',
      foreground: '#FFFFFF',
      primary: '#FF8500',
      inputBackground: '#00000000',
      placeholder: '#FFFFFF40',
      menuBackground: '#180C27',
      overlayBackground: '#180C27',
      button: '#2A1A3D',
    });

    this.a.vbox(() => {
      // City cards
      for (const city of this.state.cities) {
        this.buildCityCard(city);
      }

      this.a.separator();

      // Add section
      this.buildSearchSection();
    });

    // Building complete - allow refreshUI to work again
    this.isBuilding = false;
  }

  /**
   * Start auto-refresh timer for live time updates.
   * Call this after buildUI if you want the time to update automatically.
   * Updates every 30 seconds (sufficient for HH:MM display).
   */
  startAutoRefresh(): void {
    if (this.timeUpdateInterval) {
      return; // Already running
    }
    this.timeUpdateInterval = setInterval(() => {
      if (this.state.useCurrentTime && this.window) {
        this.state.selectedDate = new Date();
        try {
          this.refreshUI();
        } catch (e) {
          // Window may have been closed - stop the timer
          this.cleanup();
        }
      }
    }, 30000);
  }

  // Public methods for testing
  getCities(): ReadonlyArray<City> {
    return [...this.state.cities];
  }

  getState(): Readonly<NomadState> {
    return { ...this.state };
  }

  cleanup(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
    this.window = null;
  }

  formatTimeForTimezone(timezone: string): string {
    return this.formatTime(timezone, this.state.selectedDate);
  }
}

/**
 * Create the Nomad app
 */
export function buildNomadApp(a: App, win: Window): NomadUI {
  const ui = new NomadUI(a);

  // Register cleanup (ensures timer is stopped on app exit)
  a.registerCleanup(() => ui.cleanup());

  win.setContent(() => {
    ui.buildUI(win);
  });

  win.setCloseIntercept(() => {
    ui.cleanup();
    return true;
  });

  ui.startAutoRefresh();

  return ui;
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport } = require('tsyne');
  app(resolveTransport(), { title: 'Nomad' }, (a: App) => {
    a.window({ title: 'Nomad', width: 340, height: 600 }, (win: Window) => {
      buildNomadApp(a, win);
    });
  });
}
