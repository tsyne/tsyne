#!/usr/bin/env tsyne
//
// Weather Viewer - A standalone Tsyne application demonstrating embedded npm dependencies
//
// This file demonstrates the "Grapes-alike" pattern where npm dependencies are declared
// directly in the source file. Run with: ./scripts/tsyne examples/weather-viewer-standalone.ts
//
// When run with `tsyne weather-viewer-standalone.ts`, the tsyne runtime will:
//   1. Parse the @grab directives below
//   2. Install missing dependencies to ~/.tsyne/packages/
//   3. Configure NODE_PATH and run the app with ts-node
//
// Inspired by Groovy's Grapes: https://docs.groovy-lang.org/latest/html/documentation/grape.html

// @Grab('axios@^1.6.0')
// @Grab('date-fns@^3.0.0')

// Note: The imports below work because tsyne sets up the module resolution
// to include ~/.tsyne/packages/node_modules in the NODE_PATH
import axios from 'axios';
import { format } from 'date-fns';

import { app, styles, FontStyle } from '../src';
// In production: import { app, styles, FontStyle } from 'tsyne';

// Weather API - Using Open-Meteo (free, no API key required)
// https://open-meteo.com/en/docs
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// Weather code descriptions
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
};

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  feelsLike: number;
}

interface GeoLocation {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

// Predefined cities for the dropdown
const CITIES: GeoLocation[] = [
  { name: 'New York', lat: 40.7128, lon: -74.006, country: 'USA' },
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'UK' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'Japan' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'Australia' },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'France' },
  { name: 'Berlin', lat: 52.52, lon: 13.405, country: 'Germany' },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, country: 'Brazil' },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, country: 'India' },
];

// Styling
styles({
  label: {
    text_align: 'center',
  },
});

// State
let selectedCity: GeoLocation = CITIES[0];
let weather: WeatherData | null = null;
let lastUpdated: Date | null = null;
let errorMessage: string | null = null;

// Widget references
let temperatureLabel: any;
let conditionLabel: any;
let detailsLabel: any;
let statusLabel: any;

async function fetchWeather(city: GeoLocation): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: city.lat.toString(),
    longitude: city.lon.toString(),
    current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature',
    timezone: 'auto',
  });

  const response = await axios.get(`${WEATHER_API}?${params}`);
  const current = response.data.current;

  return {
    temperature: current.temperature_2m,
    weatherCode: current.weather_code,
    windSpeed: current.wind_speed_10m,
    humidity: current.relative_humidity_2m,
    feelsLike: current.apparent_temperature,
  };
}

function updateDisplay() {
  if (errorMessage) {
    temperatureLabel?.setText('--');
    conditionLabel?.setText(errorMessage);
    detailsLabel?.setText('');
    statusLabel?.setText('Error fetching weather');
    return;
  }

  if (!weather) {
    temperatureLabel?.setText('--');
    conditionLabel?.setText('Loading...');
    detailsLabel?.setText('');
    statusLabel?.setText('Fetching weather data...');
    return;
  }

  temperatureLabel?.setText(`${Math.round(weather.temperature)}°C`);
  conditionLabel?.setText(WEATHER_CODES[weather.weatherCode] || 'Unknown');
  detailsLabel?.setText(
    `Feels like: ${Math.round(weather.feelsLike)}°C | ` +
      `Humidity: ${weather.humidity}% | ` +
      `Wind: ${weather.windSpeed} km/h`
  );

  if (lastUpdated) {
    // Using date-fns for formatting (from @grab)
    statusLabel?.setText(`Last updated: ${format(lastUpdated, 'PPpp')}`);
  }
}

async function refreshWeather() {
  errorMessage = null;
  weather = null;
  updateDisplay();

  try {
    weather = await fetchWeather(selectedCity);
    lastUpdated = new Date();
    errorMessage = null;
  } catch (err: any) {
    errorMessage = `Failed to fetch: ${err.message}`;
  }

  updateDisplay();
}

function onCityChange(cityName: string) {
  const city = CITIES.find((c) => c.name === cityName);
  if (city) {
    selectedCity = city;
    refreshWeather();
  }
}

// Build the Weather Viewer UI
export function buildWeatherViewer(a: any) {
  a.window({ title: 'Weather Viewer', width: 400, height: 350 }, () => {
    a.vbox(() => {
      // Header
      a.label('🌤️ Weather Viewer').setStyle({
        font_size: 24,
        font_style: FontStyle.BOLD,
      });

      a.separator();

      // City selector
      a.hbox(() => {
        a.label('City: ');
        a.select(
          CITIES.map((c) => c.name),
          selectedCity.name,
          onCityChange
        );
        a.button('Refresh', refreshWeather);
      });

      a.separator();

      // Weather display
      a.vbox(() => {
        // Large temperature display
        temperatureLabel = a.label('--').setStyle({
          font_size: 64,
          font_style: FontStyle.BOLD,
        });

        // Condition
        conditionLabel = a.label('Loading...').setStyle({
          font_size: 20,
        });

        // Details row
        detailsLabel = a.label('').setStyle({
          font_size: 14,
        });
      });

      a.separator();

      // Status bar
      statusLabel = a.label('Starting...').setStyle({
        font_size: 12,
        text_align: 'left',
      });
    });
  });

  // Initial fetch
  refreshWeather();
}

// Run directly when executed as main script
if (require.main === module) {
  app({ title: 'Weather Viewer' }, buildWeatherViewer);
}
