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
 * Tests for Weather App
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createWeatherApp, MockWeatherService } from './weather';

describe('Weather App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display weather app title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Title should be visible
    await ctx.getById('weather-title').within(500).shouldExist();
  });

  test('should display temperature', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should load initial weather and display temperature
    await ctx.getById('temperature').within(2000).shouldBe('72°F');
  });

  test('should display weather condition', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should display condition
    await ctx.getById('condition').within(2000).shouldExist();
  });

  test('should display weather details', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should display humidity and wind info
    await ctx.getById('details').within(2000).shouldExist();
    const details = await ctx.getById('details').getText();
    expect(details).toContain('Humidity');
    expect(details).toContain('Wind');
  });

  test('should have city search input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // City input should exist
    await ctx.getById('city-input').within(500).shouldExist();
  });

  test('should have search button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Search button should exist
    await ctx.getById('search-btn').within(500).shouldExist();
  });

  test('should have refresh button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Refresh button should exist
    await ctx.getById('refresh-btn').within(500).shouldExist();
  });

  test('should show status updates', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Status should be visible
    await ctx.getById('status').within(500).shouldExist();
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWeatherApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for weather to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshot = await ctx.screenshot();
      console.log(`Weather screenshot saved: ${screenshot}`);
    }
  });
});

/**
 * Unit tests for WeatherService
 */
describe('MockWeatherService', () => {
  let service: MockWeatherService;

  beforeEach(() => {
    service = new MockWeatherService();
  });

  test('should return weather data with valid structure', async () => {
    const weather = await service.getWeatherByCoordinates(40.7128, -74.006);

    expect(weather).toHaveProperty('temperature');
    expect(weather).toHaveProperty('condition');
    expect(weather).toHaveProperty('humidity');
    expect(weather).toHaveProperty('windSpeed');
    expect(weather).toHaveProperty('feelsLike');
    expect(weather).toHaveProperty('location');
    expect(weather).toHaveProperty('lastUpdated');
  });

  test('should have valid temperature range', async () => {
    const weather = await service.getWeatherByCoordinates(40.7128, -74.006);

    expect(weather.temperature).toBeGreaterThan(-100);
    expect(weather.temperature).toBeLessThan(150);
  });

  test('should have valid humidity range', async () => {
    const weather = await service.getWeatherByCoordinates(40.7128, -74.006);

    expect(weather.humidity).toBeGreaterThanOrEqual(0);
    expect(weather.humidity).toBeLessThanOrEqual(100);
  });

  test('should support city lookup', async () => {
    const weather = await service.getWeatherByCity('New York');

    expect(weather.location).toBe('New York');
    expect(weather.temperature).toBeGreaterThan(-100);
  });

  test('should have non-empty condition string', async () => {
    const weather = await service.getWeatherByCoordinates(40.7128, -74.006);

    expect(weather.condition).toBeTruthy();
    expect(weather.condition.length).toBeGreaterThan(0);
  });
});
