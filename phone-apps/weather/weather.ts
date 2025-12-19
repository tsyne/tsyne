/*
 * Copyright (c) 2025 Paul Hammant
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/**
 * Weather App
 *
 * Displays current weather for the user's location.
 * Uses free weather API (Open-Meteo, no API key required).
 * Implements pseudo-declarative pattern following calculator.ts style.
 *
 * @tsyne-app:name Weather
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder createWeatherApp
 * @tsyne-app:args app
 * @tsyne-app:count single
 */

import { app, styles, FontStyle } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import type { Label } from '../../core/src';

// Weather API interface
export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  lastUpdated: Date;
  feelsLike: number;
}

/**
 * Open-Meteo Weather Service (free, no API key required)
 * https://open-meteo.com/en/docs
 */
export class WeatherService {
  async getWeatherByCoordinates(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature` +
        `&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const current = data.current;

      return {
        temperature: Math.round(current.temperature_2m),
        condition: this.getWeatherCondition(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
        feelsLike: Math.round(current.apparent_temperature),
        location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to fetch weather: ${error}`);
    }
  }

  // WMO Weather interpretation codes
  private getWeatherCondition(code: number): string {
    if (code === 0 || code === 1) return 'Clear';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Foggy';
    if (code >= 50 && code < 70) return 'Drizzle';
    if (code >= 70 && code < 85) return 'Snow';
    if (code === 80 || code === 81 || code === 82) return 'Rain';
    if (code === 85 || code === 86) return 'Snow Showers';
    if (code === 80 || code === 81 || code === 82) return 'Rain';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code === 85 || code === 86) return 'Snow Showers';
    if (code === 80 || code === 81 || code === 82) return 'Showers';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code === 85 || code === 86) return 'Snow Showers';
    return 'Unknown';
  }

  /**
   * Get weather for a city name by reverse geocoding
   * Note: This is a simplified version. For production, use a geocoding service.
   */
  async getWeatherByCity(city: string): Promise<WeatherData> {
    // Default coordinates for major cities (simplified fallback)
    const cityCoordinates: Record<string, [number, number]> = {
      'new york': [40.7128, -74.006],
      'london': [51.5074, -0.1278],
      'tokyo': [35.6762, 139.6503],
      'paris': [48.8566, 2.3522],
      'sydney': [-33.8688, 151.2093],
      'san francisco': [37.7749, -122.4194],
      'los angeles': [34.0522, -118.2437],
      'berlin': [52.52, 13.405],
      'toronto': [43.6532, -79.3832],
      'dubai': [25.2048, 55.2708],
    };

    const coords = cityCoordinates[city.toLowerCase()];
    if (!coords) {
      throw new Error(`City '${city}' not found in database. Using default location.`);
    }

    const weather = await this.getWeatherByCoordinates(coords[0], coords[1]);
    weather.location = city;
    return weather;
  }
}

// Mock service for testing
export class MockWeatherService {
  async getWeatherByCoordinates(latitude: number, longitude: number): Promise<WeatherData> {
    return {
      temperature: 72,
      condition: 'Partly Cloudy',
      humidity: 65,
      windSpeed: 8.5,
      feelsLike: 70,
      location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      lastUpdated: new Date(),
    };
  }

  async getWeatherByCity(city: string): Promise<WeatherData> {
    return {
      temperature: 72,
      condition: 'Partly Cloudy',
      humidity: 65,
      windSpeed: 8.5,
      feelsLike: 70,
      location: city,
      lastUpdated: new Date(),
    };
  }
}

// Define weather styles
styles({
  'weather-title': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 28,
  },
  'weather-temp': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 48,
  },
  'weather-condition': {
    text_align: 'center',
    font_size: 20,
  },
  'weather-detail': {
    font_size: 14,
  },
});

/**
 * Build the weather UI - Pseudo-declarative style
 */
export function createWeatherApp(a: App): void {
  // Instance-local state
  let temperatureLabel: Label | undefined;
  let conditionLabel: Label | undefined;
  let detailsLabel: Label | undefined;
  let statusLabel: Label | undefined;
  let currentWeather: WeatherData | null = null;

  const weatherService = new WeatherService();

  async function loadWeather(latitude: number, longitude: number) {
    try {
      if (statusLabel) statusLabel.setText('Loading...');
      currentWeather = await weatherService.getWeatherByCoordinates(latitude, longitude);
      updateDisplay();
      if (statusLabel) statusLabel.setText('Updated');
    } catch (error) {
      if (statusLabel) statusLabel.setText(`Error: ${error}`);
    }
  }

  async function loadWeatherByCity(city: string) {
    try {
      if (statusLabel) statusLabel.setText('Loading...');
      currentWeather = await weatherService.getWeatherByCity(city);
      updateDisplay();
      if (statusLabel) statusLabel.setText('Updated');
    } catch (error) {
      if (statusLabel) statusLabel.setText(`Error: ${error}`);
    }
  }

  function updateDisplay() {
    if (!currentWeather) return;

    if (temperatureLabel) {
      temperatureLabel.setText(`${currentWeather.temperature}°F`);
    }

    if (conditionLabel) {
      conditionLabel.setText(currentWeather.condition);
    }

    if (detailsLabel) {
      const details =
        `Location: ${currentWeather.location}\n` +
        `Feels Like: ${currentWeather.feelsLike}°F\n` +
        `Humidity: ${currentWeather.humidity}%\n` +
        `Wind: ${currentWeather.windSpeed} mph\n` +
        `Updated: ${currentWeather.lastUpdated.toLocaleTimeString()}`;
      detailsLabel.setText(details);
    }
  }

  a.window({ title: 'Weather' }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('Weather').withId('weather-title');

        a.separator();

        // City search (for now, hardcoded demo)
        a.hbox(() => {
          const cityEntry = a.entry('Enter city...', (value) => {
            if (value.trim()) {
              loadWeatherByCity(value.trim());
            }
          }, 300).withId('city-input');

          a.button('Search').onClick(async () => {
            const text = await cityEntry.getText();
            if (text.trim()) {
              loadWeatherByCity(text.trim());
            }
          }).withId('search-btn');
        });

        a.separator();

        // Temperature display (large)
        temperatureLabel = a.label('--°F').withId('temperature');

        // Condition
        conditionLabel = a.label('--').withId('condition');

        a.separator();

        // Details (multi-line)
        detailsLabel = a.label('').withId('details');

        a.separator();

        // Refresh button
        a.hbox(() => {
          a.button('Refresh').onClick(async () => {
            // Try to get user's location or use default
            // For demo, using San Francisco coordinates
            await loadWeather(37.7749, -122.4194);
          }).withId('refresh-btn');

          a.spacer();

          statusLabel = a.label('Ready').withId('status');
        });
      });
    });

    win.show();

    // Load initial weather
    loadWeather(37.7749, -122.4194); // Default: San Francisco
  });
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Weather' }, (a: App) => {
    createWeatherApp(a);
  });
}
