/**
 * Nomad App - Time zone conversion and management
 *
 * A time conversion application for managing time across multiple timezones
 * and locations. Track current time in different cities and time zones.
 *
 * Portions copyright original team and portions copyright Paul Hammant 2025
 * License: MIT
 *
 * @tsyne-app:name Nomad
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="1"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildNomadApp
 * @tsyne-app:args app,win
 * @tsyne-app:count single
 */

import type { App } from './app';
import type { Window } from './window';
import type { Label } from './widgets/display';

interface TimeLocation {
  id: string;
  name: string;
  timezone: string;
  offset: number; // hours offset from UTC
  currentTime?: string;
}

interface NomadState {
  locations: TimeLocation[];
  sortByName: boolean;
  useFormat24h: boolean;
}

// Common timezones
const COMMON_TIMEZONES: TimeLocation[] = [
  { id: 'utc', name: 'UTC', timezone: 'UTC', offset: 0 },
  { id: 'london', name: 'London', timezone: 'Europe/London', offset: 0 },
  { id: 'paris', name: 'Paris', timezone: 'Europe/Paris', offset: 1 },
  { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 9 },
  { id: 'sydney', name: 'Sydney', timezone: 'Australia/Sydney', offset: 10 },
  { id: 'ny', name: 'New York', timezone: 'America/New_York', offset: -5 },
  { id: 'la', name: 'Los Angeles', timezone: 'America/Los_Angeles', offset: -8 },
  { id: 'dubai', name: 'Dubai', timezone: 'Asia/Dubai', offset: 4 },
  { id: 'singapore', name: 'Singapore', timezone: 'Asia/Singapore', offset: 8 },
  { id: 'mumbai', name: 'Mumbai', timezone: 'Asia/Kolkata', offset: 5.5 },
  { id: 'bangkok', name: 'Bangkok', timezone: 'Asia/Bangkok', offset: 7 },
  { id: 'hongkong', name: 'Hong Kong', timezone: 'Asia/Hong_Kong', offset: 8 },
  { id: 'toronto', name: 'Toronto', timezone: 'America/Toronto', offset: -5 },
  { id: 'mexico', name: 'Mexico City', timezone: 'America/Mexico_City', offset: -6 },
  { id: 'berlin', name: 'Berlin', timezone: 'Europe/Berlin', offset: 1 },
];

/**
 * Nomad Time Zone Manager UI
 */
class NomadUI {
  private window: Window | null = null;
  private state: NomadState = {
    locations: [],
    sortByName: true,
    useFormat24h: true,
  };

  private timesLabel: Label | null = null;
  private timeUpdateInterval: NodeJS.Timeout | null = null;

  constructor(private a: App) {
    this.loadSettings();
  }

  private loadSettings(): void {
    const locations = this.a.getPreference('nomad_locations', '[]');
    const sortByName = this.a.getPreferenceBool('nomad_sort_by_name', true);
    const useFormat24h = this.a.getPreferenceBool('nomad_24h_format', true);

    Promise.resolve(locations).then((locs: string) => {
      try {
        this.state.locations = JSON.parse(locs);
      } catch {
        this.state.locations = [];
      }
    });

    Promise.resolve(sortByName).then((sort: boolean) => {
      this.state.sortByName = sort;
    });

    Promise.resolve(useFormat24h).then((format: boolean) => {
      this.state.useFormat24h = format;
    });
  }

  private saveSettings(): void {
    this.a.setPreference('nomad_locations', JSON.stringify(this.state.locations));
    this.a.setPreference('nomad_sort_by_name', this.state.sortByName.toString());
    this.a.setPreference('nomad_24h_format', this.state.useFormat24h.toString());
  }

  private calculateTime(offset: number): string {
    const now = new Date();
    const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const offsetMs = offset * 60 * 60 * 1000;
    const localTime = new Date(utcTime.getTime() + offsetMs);

    if (this.state.useFormat24h) {
      return localTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } else {
      return localTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    }
  }

  private updateTimes(): void {
    for (const loc of this.state.locations) {
      loc.currentTime = this.calculateTime(loc.offset);
    }

    this.refreshUI();
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  private addLocation(location: TimeLocation): void {
    // Check if already added
    if (this.state.locations.find((l) => l.id === location.id)) {
      return;
    }

    const newLoc = { ...location, id: `${location.id}-${Date.now()}` };
    this.state.locations.push(newLoc);
    this.saveSettings();
    this.updateTimes();
    this.refreshUI();
  }

  private removeLocation(id: string): void {
    this.state.locations = this.state.locations.filter((l) => l.id !== id);
    this.saveSettings();
    this.refreshUI();
  }

  private getSortedLocations(): TimeLocation[] {
    const sorted = [...this.state.locations];

    if (this.state.sortByName) {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => a.offset - b.offset);
    }

    return sorted;
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Title
      this.a.label('Nomad - Time Zone Manager').withId('nomadTitle');

      this.a.separator();

      // Add location section
      this.a.label('Add Location').withId('nomadAddLabel');
      this.a.scroll(() => {
        this.a.vbox(() => {
          const commonLocations = COMMON_TIMEZONES.slice(0, 8);
          for (const loc of commonLocations) {
            this.a
              .button(`+ ${loc.name}`)
              .onClick(() => this.addLocation(loc))
              .withId(`nomad-add-${loc.id}`);
          }
        });
      });

      this.a.separator();

      // Sorting and display options
      this.a.hbox(() => {
        this.a
          .button(this.state.sortByName ? 'Sort by UTC Offset' : 'Sort by Name')
          .onClick(() => {
            this.state.sortByName = !this.state.sortByName;
            this.saveSettings();
            this.updateTimes();
            this.refreshUI();
          })
          .withId('nomadSortBtn');

        this.a.spacer();

        this.a
          .button(this.state.useFormat24h ? '12-Hour' : '24-Hour')
          .onClick(() => {
            this.state.useFormat24h = !this.state.useFormat24h;
            this.saveSettings();
            this.updateTimes();
            this.refreshUI();
          })
          .withId('nomadFormatBtn');
      });

      this.a.separator();

      // Current times display
      this.a.label('Current Times').withId('nomadTimesLabel');

      if (this.state.locations.length === 0) {
        this.a.label('Add a location to see times').withId('nomadPlaceholder');
      } else {
        this.a.scroll(() => {
          this.a.vbox(() => {
            for (const loc of this.getSortedLocations()) {
              this.a.hbox(() => {
                this.a
                  .label(`${loc.name} (UTC${loc.offset >= 0 ? '+' : ''}${loc.offset})`)
                  .withId(`nomad-loc-name-${loc.id}`);

                this.a.spacer();

                this.a.label(loc.currentTime || '--:--:--').withId(`nomad-loc-time-${loc.id}`);

                this.a
                  .button('×')
                  .onClick(() => this.removeLocation(loc.id))
                  .withId(`nomad-remove-${loc.id}`);
              });
            }
          });
        });
      }
    });

    // Start timer for updating times
    if (!this.timeUpdateInterval) {
      this.timeUpdateInterval = setInterval(() => {
        this.updateTimes();
      }, 1000);
    }

    this.updateTimes();
  }

  // Public methods for testing
  getLocations(): ReadonlyArray<TimeLocation> {
    return [...this.state.locations];
  }

  getState(): Readonly<NomadState> {
    return { ...this.state };
  }

  cleanup(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  calculateTimeForOffset(offset: number): string {
    return this.calculateTime(offset);
  }
}

/**
 * Create the Nomad app
 */
export function buildNomadApp(a: App, win: Window): NomadUI {
  const ui = new NomadUI(a);

  win.setContent(() => {
    ui.buildUI(win);
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  const { app } = require('./index');
  app({ title: 'Nomad', width: 600, height: 800 }, (a: App) => {
    a.window({ title: 'Nomad - Time Zone Manager', width: 600, height: 800 }, (win: Window) => {
      buildNomadApp(a, win);
    });
  });
}
