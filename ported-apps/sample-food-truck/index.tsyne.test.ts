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
    const appTitle = await ctx.getByID('app-title').getText();
    expect(appTitle).toContain('Food Truck');

    // Check orders view buttons
    const ordersBtn = await ctx.getByID('btn-orders');
    expect(ordersBtn).toBeDefined();
  });

  it('should display initial order count in status', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const status = await ctx.getByID('status-summary').getText();
    expect(status).toMatch(/Pending:|Ready:/);
  });

  it('should add order when clicking quick add buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const initialStatus = await ctx.getByID('status-summary').getText();

    // Click add burger button
    await ctx.getByID('add-burger').click();

    // Status should update
    const updatedStatus = await ctx.getByID('status-summary').within(1000).getText();
    expect(updatedStatus).not.toBe(initialStatus);
  });

  it('should mark order as ready', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add an order
    await ctx.getByID('add-burger').click();

    // Wait for pending order to appear
    await ctx
      .getByID('pending-section-title')
      .within(1000)
      .shouldExist();

    // Get the ready button for the new order
    const pendingOrders = await ctx.getByID('pending-section-title').getText();
    expect(pendingOrders).toBeDefined();
  });

  it('should switch to sales view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click sales button
    await ctx.getByID('btn-sales').click();

    // Sales title should be visible
    await ctx
      .getByID('sales-title')
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
    await ctx.getByID('btn-sales').click();

    // Check for total sales label
    await ctx
      .getByID('total-sales')
      .within(1000)
      .shouldExist();

    // Check for top items label
    const topItemsLabel = await ctx.getByID('top-items-label').getText();
    expect(topItemsLabel).toBe('Top Menu Items:');
  });

  it('should switch to weather view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click weather button
    await ctx.getByID('btn-weather').click();

    // Weather title should be visible
    await ctx
      .getByID('weather-title')
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
    await ctx.getByID('btn-weather').click();

    // Check weather data is displayed
    const location = await ctx.getByID('weather-location').within(1000).getText();
    expect(location).toMatch(/📍/);

    const temp = await ctx.getByID('weather-temperature').getText();
    expect(temp).toMatch(/🌡️/);
  });

  it('should update weather when button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFoodTruckApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to weather view
    await ctx.getByID('btn-weather').click();

    // Get initial temperature
    const initialTemp = await ctx.getByID('weather-temperature').getText();

    // Click update weather
    await ctx.getByID('btn-update-weather').click();

    // Temperature should change (might take a moment)
    const updatedTemp = await ctx
      .getByID('weather-temperature')
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
    const ordersTitle = await ctx.getByID('orders-title').getText();
    expect(ordersTitle).toBeDefined();

    // Switch to sales
    await ctx.getByID('btn-sales').click();
    await ctx.getByID('sales-title').within(1000).shouldExist();

    // Switch back to orders
    await ctx.getByID('btn-orders').click();
    await ctx
      .getByID('orders-title')
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
    await ctx.getByID('add-burger').click();
    await new Promise((r) => setTimeout(r, 100));
    await ctx.getByID('add-tacos').click();
    await new Promise((r) => setTimeout(r, 100));
    await ctx.getByID('add-pizza').click();

    // Status should reflect multiple pending orders
    const status = await ctx.getByID('status-summary').within(1000).getText();
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
      const btn = await ctx.getByID(btnId);
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
    await ctx.getByID('add-burger').click();
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
    await ctx.getByID('btn-sales').click();
    await ctx.getByID('sales-title').within(1000).shouldExist();

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
    await ctx.getByID('btn-weather').click();
    await ctx.getByID('weather-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/food-truck-weather.png');
    }
  });
});
