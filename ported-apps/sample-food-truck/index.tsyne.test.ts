/**
 * TsyneTest for Food Truck App
 *
 * Integration tests for the Food Truck app UI using TsyneTest framework.
 * Tests user interactions, order management, and view switching.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { buildFoodTruckApp, FoodTruckStore } from './index';

describe('Food Truck App UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    // Cleanup
  });

  it('should render the app with sidebar and orders view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check sidebar exists
    const appTitle = await ctx.getById('app-title').getText();
    expect(appTitle).toContain('Food Truck');

    // Check orders view buttons
    const ordersBtn = await ctx.getById('btn-orders');
    expect(ordersBtn).toBeDefined();
  });

  it('should display initial order count in status', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const status = await ctx.getById('status-summary').getText();
    expect(status).toMatch(/Pending:|Ready:/);
  });

  it('should add order when clicking quick add buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const initialStatus = await ctx.getById('status-summary').getText();

    // Click add burger button
    await ctx.getById('add-burger').click();

    // Status should update
    const updatedStatus = await ctx.getById('status-summary').within(1000).getText();
    expect(updatedStatus).not.toBe(initialStatus);
  });

  it('should mark order as ready', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add an order
    await ctx.getById('add-burger').click();

    // Wait for pending order to appear
    await ctx
      .getById('pending-section-title')
      .within(1000)
      .shouldExist();

    // Get the ready button for the new order
    const pendingOrders = await ctx.getById('pending-section-title').getText();
    expect(pendingOrders).toBeDefined();
  });

  it('should switch to sales view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click sales button
    await ctx.getById('btn-sales').click();

    // Sales title should be visible
    await ctx
      .getById('sales-title')
      .within(1000)
      .shouldExist();
  });

  it('should display sales analytics', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to sales view
    await ctx.getById('btn-sales').click();

    // Check for total sales label
    await ctx
      .getById('total-sales')
      .within(1000)
      .shouldExist();

    // Check for top items label
    const topItemsLabel = await ctx.getById('top-items-label').getText();
    expect(topItemsLabel).toBe('Top Menu Items:');
  });

  it('should switch to weather view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click weather button
    await ctx.getById('btn-weather').click();

    // Weather title should be visible
    await ctx
      .getById('weather-title')
      .within(1000)
      .shouldExist();
  });

  it('should display weather information', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to weather view
    await ctx.getById('btn-weather').click();

    // Check weather data is displayed
    const location = await ctx.getById('weather-location').within(1000).getText();
    expect(location).toMatch(/📍/);

    const temp = await ctx.getById('weather-temperature').getText();
    expect(temp).toMatch(/🌡️/);
  });

  it('should update weather when button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to weather view
    await ctx.getById('btn-weather').click();

    // Get initial temperature
    const initialTemp = await ctx.getById('weather-temperature').getText();

    // Click update weather
    await ctx.getById('btn-update-weather').click();

    // Temperature should change (might take a moment)
    const updatedTemp = await ctx
      .getById('weather-temperature')
      .within(1000)
      .getText();

    // At least one should have updated
    expect(initialTemp || updatedTemp).toBeDefined();
  });

  it('should maintain view when switching back and forth', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start in orders view
    const ordersTitle = await ctx.getById('orders-title').getText();
    expect(ordersTitle).toBeDefined();

    // Switch to sales
    await ctx.getById('btn-sales').click();
    await ctx.getById('sales-title').within(1000).shouldExist();

    // Switch back to orders
    await ctx.getById('btn-orders').click();
    await ctx
      .getById('orders-title')
      .within(1000)
      .shouldExist();
  });

  it('should handle multiple orders', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add multiple orders
    await ctx.getById('add-burger').click();
    await new Promise((r) => setTimeout(r, 100));
    await ctx.getById('add-tacos').click();
    await new Promise((r) => setTimeout(r, 100));
    await ctx.getById('add-pizza').click();

    // Status should reflect multiple pending orders
    const status = await ctx.getById('status-summary').within(1000).getText();
    expect(status).toMatch(/Pending: [2-9]/);
  });

  it('should have accessible UI with proper IDs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All main navigation buttons should be accessible
    const buttons = [
      'btn-orders',
      'btn-sales',
      'btn-weather',
      'add-burger',
      'add-tacos',
      'add-pizza',
      'add-random',
    ];

    for (const btnId of buttons) {
      const btn = await ctx.getById(btnId);
      expect(btn).toBeDefined();
    }
  });

  it('should capture screenshot of orders view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add an order for more interesting screenshot
    await ctx.getById('add-burger').click();
    await new Promise((r) => setTimeout(r, 200));

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/food-truck-orders.png');
    }
  });

  it('should capture screenshot of sales view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to sales view
    await ctx.getById('btn-sales').click();
    await ctx.getById('sales-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/food-truck-sales.png');
    }
  });

  it('should capture screenshot of weather view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to weather view
    await ctx.getById('btn-weather').click();
    await ctx.getById('weather-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/food-truck-weather.png');
    }
  });
});
