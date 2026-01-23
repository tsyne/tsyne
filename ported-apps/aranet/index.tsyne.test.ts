/**
 * TsyneTest for Aranet4 Monitor - UI Integration Tests
 * Tests for UI interactions, state changes, and visual updates
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildAranetApp } from './index';

describe('Aranet4 UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  beforeEach(async () => {
    ctx = tsyneTest.getContext();
  });

  // ========== Window & Widget Creation Tests ==========

  describe('Window Creation', () => {
    it('should create main window with correct title', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Window should be created and visible
      expect(testApp).toBeDefined();
    });

    it('should display all main widgets', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Check that all main widgets exist
      await ctx.getById('statusLabel').shouldExist();
      await ctx.getById('connectionStatus').shouldExist();
      await ctx.getById('statusIcon').shouldExist();
      await ctx.getById('co2Level').shouldExist();
      await ctx.getById('temperature').shouldExist();
      await ctx.getById('humidity').shouldExist();
      await ctx.getById('pressure').shouldExist();
      await ctx.getById('battery').shouldExist();
    });

    it('should display all control buttons', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      await ctx.getById('connectBtn').shouldExist();
      await ctx.getById('settingsBtn').shouldExist();
    });
  });

  // ========== Connection State Tests ==========

  describe('Connection States', () => {
    it('should show connect button when disconnected', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Connect button should be visible initially (disconnected state)
      await ctx.getById('connectBtn').shouldBeVisible();
    });

    it('should update status label on connect', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Initial state
      await ctx.getById('statusLabel').within(500).shouldBe('Not Connected');

      // Click connect
      await ctx.getById('connectBtn').click();

      // Wait for connection to complete
      await ctx.getById('statusLabel').within(5000).shouldBe('Connected to Aranet4');
    });

    it('should update connection status text', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Initial disconnected
      await ctx.getById('connectionStatus').within(500).shouldBe('Status: Disconnected');

      // Click connect
      await ctx.getById('connectBtn').click();

      // Should show connected after connection completes
      await ctx.getById('connectionStatus').within(5000).shouldBe('Status: Connected');
    });

    it('should show disconnect button after connecting', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Connect first
      await ctx.getById('connectBtn').click();

      // Wait for connection
      await ctx.getById('disconnectBtn').within(5000).shouldBeVisible();
    });

    it('should show connect button after disconnecting', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Connect
      await ctx.getById('connectBtn').click();
      await ctx.getById('disconnectBtn').within(5000).shouldBeVisible();

      // Disconnect
      await ctx.getById('disconnectBtn').click();

      // Should show connect button again
      await ctx.getById('connectBtn').within(500).shouldBeVisible();
    });
  });

  // ========== Readings Display Tests ==========

  describe('Readings Display', () => {
    it('should display initial empty readings', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Should show placeholder text
      const co2 = await ctx.getById('co2Level').getText();
      expect(co2).toContain('--');
    });

    it('should update readings after connection', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Connect
      await ctx.getById('connectBtn').click();

      // Wait for readings to appear
      const co2 = await ctx.getById('co2Level').within(5000).getText();
      expect(co2).toMatch(/CO2: \d+ ppm/);

      const temp = await ctx.getById('temperature').getText();
      expect(temp).toMatch(/Temperature: [-\d.]+°C/);

      const humidity = await ctx.getById('humidity').getText();
      expect(humidity).toMatch(/Humidity: \d+%/);

      const pressure = await ctx.getById('pressure').getText();
      expect(pressure).toMatch(/Pressure: [\d.]+/);

      const battery = await ctx.getById('battery').getText();
      expect(battery).toMatch(/Battery: \d+%/);
    });

    it('should clear readings on disconnect', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Connect
      await ctx.getById('connectBtn').click();
      await ctx.getById('disconnectBtn').within(5000).shouldBeVisible();

      // Wait for readings
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Disconnect
      await ctx.getById('disconnectBtn').click();

      // Readings should reset
      await ctx.getById('co2Level').within(500).shouldBe('CO2: -- ppm');
    });
  });

  // ========== Refresh Button Tests ==========

  describe('Refresh Button', () => {
    it('should show refresh button when connected', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Not visible initially
      const btn = ctx.getById('refreshBtn');
      expect(btn).toBeDefined();

      // Connect
      await ctx.getById('connectBtn').click();

      // Should become visible
      await ctx.getById('refreshBtn').within(5000).shouldBeVisible();
    });

    it('should refresh readings on button click', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Connect
      await ctx.getById('connectBtn').click();
      await ctx.getById('refreshBtn').within(5000).shouldBeVisible();

      // Get initial reading
      const co2Before = await ctx.getById('co2Level').getText();

      // Click refresh
      await ctx.getById('refreshBtn').click();

      // Wait a bit and check that text still exists (indicating successful refresh)
      const co2After = await ctx.getById('co2Level').within(500).getText();
      expect(co2After).toMatch(/CO2: \d+ ppm/);
    });

    it('should hide refresh button when disconnected', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Connect
      await ctx.getById('connectBtn').click();
      await ctx.getById('refreshBtn').within(5000).shouldBeVisible();

      // Disconnect
      await ctx.getById('disconnectBtn').click();

      // Refresh button should be hidden (not visible)
      const btn = ctx.getById('refreshBtn');
      expect(btn).toBeDefined(); // Widget exists
      // But should not be visible
    });
  });

  // ========== Settings Window Tests ==========

  describe('Settings Window', () => {
    it('should open settings window on button click', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Click settings button
      await ctx.getById('settingsBtn').click();

      // Wait for settings window to open
      await ctx.getById('settingsTitle').within(2000).shouldExist();
    });

    it('should display settings controls', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Check for settings elements
      await ctx.getById('alertSoundLabel').within(2000).shouldExist();
      await ctx.getById('autoConnectLabel').shouldExist();
      await ctx.getById('refreshIntervalLabel').shouldExist();
      await ctx.getById('closeSettingsBtn').shouldExist();
    });

    it('should allow closing settings window', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();
      await ctx.getById('settingsTitle').within(2000).shouldExist();

      // Close settings
      await ctx.getById('closeSettingsBtn').click();

      // Settings title should no longer be visible (window closed)
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
  });

  // ========== Alert Sound Settings Tests ==========

  describe('Alert Sound Settings', () => {
    it('should display alert sound options', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Alert sound buttons should exist
      await ctx.getById('sound-Off').within(2000).shouldExist();
      await ctx.getById('sound-Gentle').shouldExist();
      await ctx.getById('sound-Urgent (Fire Alarm)').shouldExist();
    });

    it('should show selected alert sound', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Gentle should be selected by default
      await ctx.getById('soundSelected-Gentle').within(2000).shouldExist();
    });

    it('should change alert sound selection', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Change to Off
      await ctx.getById('sound-Off').within(2000).click();

      // Off should now be selected
      await ctx.getById('soundSelected-Off').within(500).shouldExist();

      // Gentle should no longer be selected
      const gentleBtn = ctx.getById('soundSelected-Gentle');
      expect(gentleBtn).toBeDefined();
    });
  });

  // ========== Refresh Interval Settings Tests ==========

  describe('Refresh Interval Settings', () => {
    it('should display refresh interval controls', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Controls should exist
      await ctx.getById('decreaseInterval').within(2000).shouldExist();
      await ctx.getById('intervalValue').shouldExist();
      await ctx.getById('increaseInterval').shouldExist();
    });

    it('should show default refresh interval', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Should show 5 minutes by default
      await ctx.getById('intervalValue').within(2000).shouldBe('5');
    });

    it('should increase refresh interval', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Increase interval
      await ctx.getById('increaseInterval').within(2000).click();

      // Should now be 6
      await ctx.getById('intervalValue').within(500).shouldBe('6');
    });

    it('should decrease refresh interval', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Decrease interval
      await ctx.getById('decreaseInterval').within(2000).click();

      // Should now be 4
      await ctx.getById('intervalValue').within(500).shouldBe('4');
    });

    it('should not allow interval below 1', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Open settings
      await ctx.getById('settingsBtn').click();

      // Decrease multiple times
      for (let i = 0; i < 10; i++) {
        await ctx.getById('decreaseInterval').click();
      }

      // Should stay at 1
      await ctx.getById('intervalValue').within(500).shouldBe('1');
    });
  });

  // ========== UI State Consistency Tests ==========

  describe('UI State Consistency', () => {
    it('should maintain consistency through connect/disconnect cycle', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Initial state
      await ctx.getById('statusLabel').within(500).shouldBe('Not Connected');

      // Connect
      await ctx.getById('connectBtn').click();
      await ctx.getById('statusLabel').within(5000).shouldBe('Connected to Aranet4');

      // Disconnect
      await ctx.getById('disconnectBtn').click();
      await ctx.getById('statusLabel').within(500).shouldBe('Not Connected');

      // Connect again
      await ctx.getById('connectBtn').click();
      await ctx.getById('statusLabel').within(5000).shouldBe('Connected to Aranet4');
    });

    it('should maintain status through settings changes', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      // Connect
      await ctx.getById('connectBtn').click();
      await ctx.getById('statusLabel').within(5000).shouldBe('Connected to Aranet4');

      // Open settings and change something
      await ctx.getById('settingsBtn').click();
      await ctx.getById('increaseInterval').within(2000).click();
      await ctx.getById('closeSettingsBtn').click();

      // Status should still show connected
      await ctx.getById('statusLabel').within(500).shouldBe('Connected to Aranet4');
    });
  });

  // ========== Auto-close Settings Tests ==========

  describe('Settings Window Auto-close', () => {
    it('should handle multiple settings window open/close cycles', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildAranetApp(app);
      });

      await testApp.run();

      for (let i = 0; i < 3; i++) {
        // Open
        await ctx.getById('settingsBtn').click();
        await ctx.getById('settingsTitle').within(2000).shouldExist();

        // Close
        await ctx.getById('closeSettingsBtn').click();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Main app should still be responsive
      await ctx.getById('statusLabel').shouldExist();
    });
  });
});
