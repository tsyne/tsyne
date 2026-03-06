<!--
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
 -->

# Weather App

A weather application for Tsyne on postmarketOS displaying current conditions and forecasts.

## Features

### Current Weather Display
- Current temperature and conditions
- Weather icon based on WMO code
- Humidity and wind speed
- Feels like temperature
- Precipitation chance

### Location Support
- Default to system locale city
- Search by city name
- Temperature unit toggling (°C / °F)

### Data Source
- **Open-Meteo API** - Free, no API key required
- Real-time weather data
- WMO weather code interpretation

## Architecture

### Weather Service
- Fetches data from Open-Meteo API
- Converts WMO codes to human-readable conditions
- Supports multiple locations
- Temperature unit conversion

### UI
- Pseudo-declarative pattern matching other Tsyne apps
- Real-time weather display
- Search and refresh functionality
- Temperature unit toggle

## Testing

### UI Tests
```bash
npm test -- weather.test.ts
TSYNE_HEADED=1 npm test -- weather.test.ts  # With GUI
TAKE_SCREENSHOTS=1 npm test -- weather.test.ts  # With screenshots
```

### Unit Tests
```bash
npm test -- weather.test.ts
```

## Usage

### Standalone
```bash
npx tsx phone-apps/weather/weather.ts
```

### In Phone Simulator
```bash
npx tsx phone-apps/phone-modem-simulator.ts
# Click Weather icon to launch
```

## Open-Meteo API

Free weather API endpoints:
- **Forecast API**: `https://api.open-meteo.com/v1/forecast`
- **Geocoding API**: `https://geocoding-api.open-meteo.com/v1/search`

No authentication required, no rate limits for fair use.

## Files

- `weather.ts` - Main app UI
- `weather.test.ts` - Comprehensive tests
- `README.md` - This file

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(search) + vbox(current weather) + scroll(forecast)` nesting |
| **Core declarative** | Fluent method chaining | 4/10 | `.withId()` on 5 elements. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 3/10 | Minimal loop-based generation. Weather data displayed statically |
| **State architecture** | Observable store | 3/10 | No Observable store. Weather data managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 4 `setText()` calls for weather data display |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 4/10 | Limited IDs for search and temperature |
| **Design** | Separation of concerns | 6/10 | Open-Meteo API integration separated from UI rendering |
| | **Overall** | **4/10** | Simple weather display with API integration. No reactive bindings |
