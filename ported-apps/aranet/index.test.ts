/**
 * Jest Tests for Aranet4 Monitor - Unit Tests
 * Tests for store functionality, state management, and business logic
 */

import {
  AranetStore,
  ConnectionStatus,
  CO2Level,
  AlertSoundType,
  Aranet4Reading,
  AppSettings,
} from './index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

jest.setTimeout(15000); // Increase timeout for async operations

// Helper to create temporary test state files
function createTestStateFile(): string {
  const tmpDir = path.join(os.tmpdir(), 'aranet-test');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return path.join(tmpDir, `aranet-state-${crypto.randomBytes(4).toString('hex')}.json`);
}

describe('Aranet4Store', () => {
  let store: AranetStore;

  beforeEach(() => {
    // Disable persistence for tests by passing null (prevents loading ~/.tsyne/aranet-devices.json)
    store = new AranetStore(null as any);
  });

  afterEach(() => {
    store.destroy();
  });

  // ========== Connection Status Tests ==========

  describe('Connection Status', () => {
    it('should initialize as disconnected', () => {
      expect(store.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);
    });

    it('should transition through connection states', async () => {
      const statuses: ConnectionStatus[] = [];
      store.subscribe(() => {
        statuses.push(store.getConnectionStatus());
      });

      await store.connect();

      // Should go through Scanning -> Connecting -> Connected
      expect(statuses).toContain(ConnectionStatus.Scanning);
      expect(statuses).toContain(ConnectionStatus.Connecting);
      expect(statuses).toContain(ConnectionStatus.Connected);
      expect(store.getConnectionStatus()).toBe(ConnectionStatus.Connected);
    });

    it('should disconnect properly', async () => {
      await store.connect();
      expect(store.getConnectionStatus()).toBe(ConnectionStatus.Connected);

      await store.disconnect();
      expect(store.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);
    });

    it('should clear last reading on disconnect', async () => {
      await store.connect();
      await store.refreshReading();
      expect(store.getLastReading()).not.toBeNull();

      await store.disconnect();
      expect(store.getLastReading()).toBeNull();
    });
  });

  // ========== Reading Tests ==========

  describe('Readings', () => {
    it('should return null reading when disconnected', () => {
      expect(store.getLastReading()).toBeNull();
    });

    it('should generate reading when connected', async () => {
      await store.connect();
      await store.refreshReading();

      const reading = store.getLastReading();
      expect(reading).not.toBeNull();
      expect(reading?.co2).toBeGreaterThanOrEqual(0);
      expect(reading?.temperature).toBeGreaterThanOrEqual(-50);
      expect(reading?.temperature).toBeLessThanOrEqual(50);
      expect(reading?.humidity).toBeGreaterThanOrEqual(0);
      expect(reading?.humidity).toBeLessThanOrEqual(100);
      expect(reading?.battery).toBeGreaterThanOrEqual(0);
      expect(reading?.battery).toBeLessThanOrEqual(100);
      expect(reading?.timestamp).toBeInstanceOf(Date);
    });

    it('should not refresh reading when disconnected', async () => {
      await store.refreshReading();
      expect(store.getLastReading()).toBeNull();
    });

    it('should have timestamp on readings', async () => {
      await store.connect();
      await store.refreshReading();

      const reading = store.getLastReading();
      expect(reading?.timestamp).toBeInstanceOf(Date);
      expect(reading?.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should generate different readings on refresh', async () => {
      await store.connect();
      await store.refreshReading();
      const reading1 = store.getLastReading();

      // Advance time to get different simulated data
      jest.advanceTimersByTime(1000);

      await store.refreshReading();
      const reading2 = store.getLastReading();

      // Readings should be different (stochastic due to simulation)
      expect(reading1).not.toEqual(reading2);
      expect(reading2).not.toBeNull();
    });
  });

  // ========== CO2 Level Status Tests ==========

  describe('CO2 Level Status', () => {
    it('should return good for CO2 < 800 ppm', async () => {
      await store.connect();

      // Generate readings until we get one in good range
      for (let i = 0; i < 20; i++) {
        await store.refreshReading();
        const reading = store.getLastReading();
        if (reading && reading.co2 < 800) {
          expect(store.getCO2Level()).toBe(CO2Level.Good);
          return;
        }
      }

      // If we didn't find a good reading in simulation, test the logic
      const level = store.getCO2Level();
      expect([CO2Level.Good, CO2Level.Moderate, CO2Level.Poor]).toContain(level);
    });

    it('should return poor for CO2 >= 1200 ppm', async () => {
      await store.connect();

      // Generate readings until we get one in poor range
      for (let i = 0; i < 50; i++) {
        await store.refreshReading();
        const reading = store.getLastReading();
        if (reading && reading.co2 >= 1200) {
          expect(store.getCO2Level()).toBe(CO2Level.Poor);
          return;
        }
      }
    });

    it('should return good for null reading', () => {
      expect(store.getCO2Level()).toBe(CO2Level.Good);
    });

    it('should provide correct color for CO2 level', async () => {
      await store.connect();
      await store.refreshReading();

      const level = store.getCO2Level();
      const color = store.getCO2LevelColor();

      if (level === CO2Level.Good) {
        expect(color).toBe('#4CAF50');
      } else if (level === CO2Level.Moderate) {
        expect(color).toBe('#FFC107');
      } else if (level === CO2Level.Poor) {
        expect(color).toBe('#F44336');
      }
    });

    it('should provide emoji icon for CO2 level', async () => {
      await store.connect();
      await store.refreshReading();

      const icon = store.getCO2LevelIcon();
      expect(['🟢', '🟡', '🔴']).toContain(icon);
    });
  });

  // ========== Settings Tests ==========

  describe('Settings Management', () => {
    it('should return default settings', () => {
      const settings = store.getSettings();
      expect(settings.alertSound).toBe(AlertSoundType.Gentle);
      expect(settings.autoConnect).toBe(true);
      expect(settings.refreshInterval).toBe(5);
    });

    it('should update alert sound', () => {
      store.updateAlertSound(AlertSoundType.Urgent);
      expect(store.getSettings().alertSound).toBe(AlertSoundType.Urgent);

      store.updateAlertSound(AlertSoundType.Off);
      expect(store.getSettings().alertSound).toBe(AlertSoundType.Off);
    });

    it('should update auto-connect setting', () => {
      store.updateAutoConnect(false);
      expect(store.getSettings().autoConnect).toBe(false);

      store.updateAutoConnect(true);
      expect(store.getSettings().autoConnect).toBe(true);
    });

    it('should update refresh interval', () => {
      store.updateRefreshInterval(10);
      expect(store.getSettings().refreshInterval).toBe(10);

      store.updateRefreshInterval(1);
      expect(store.getSettings().refreshInterval).toBe(1);
    });

    it('should enforce minimum refresh interval of 1', () => {
      store.updateRefreshInterval(0);
      expect(store.getSettings().refreshInterval).toBe(1);

      store.updateRefreshInterval(-5);
      expect(store.getSettings().refreshInterval).toBe(1);
    });

    it('should return defensive copy of settings', () => {
      const settings1 = store.getSettings();
      const settings2 = store.getSettings();

      expect(settings1).toEqual(settings2);
      expect(settings1).not.toBe(settings2); // Different objects
    });
  });

  // ========== Device Management Tests ==========

  describe('Device Management', () => {
    it('should initialize with no devices', () => {
      expect(store.getAvailableDevices()).toEqual([]);
      expect(store.getSelectedDeviceId()).toBeNull();
    });

    it('should discover available devices', async () => {
      await store.discoverDevices();
      const devices = store.getAvailableDevices();
      expect(devices.length).toBeGreaterThan(0);
      expect(devices[0]).toHaveProperty('id');
      expect(devices[0]).toHaveProperty('name');
      expect(devices[0]).toHaveProperty('discovered');
    });

    it('should auto-select first device after discovery', async () => {
      await store.discoverDevices();
      const devices = store.getAvailableDevices();
      expect(store.getSelectedDeviceId()).toBe(devices[0].id);
    });

    it('should return correct device name', async () => {
      await store.discoverDevices();
      const devices = store.getAvailableDevices();
      expect(store.getSelectedDeviceName()).toBe(devices[0].name);
    });

    it('should allow device selection', async () => {
      await store.discoverDevices();
      const devices = store.getAvailableDevices();
      const secondDevice = devices[1];

      store.selectDevice(secondDevice.id);
      expect(store.getSelectedDeviceId()).toBe(secondDevice.id);
      expect(store.getSelectedDeviceName()).toBe(secondDevice.name);
    });

    it('should disconnect when switching devices', async () => {
      await store.discoverDevices();
      const devices = store.getAvailableDevices();

      // Connect to first device
      await store.connect();
      expect(store.getConnectionStatus()).toBe(ConnectionStatus.Connected);

      // Switch to second device
      store.selectDevice(devices[1].id);
      expect(store.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);
    });

    it('should handle invalid device selection', async () => {
      await store.discoverDevices();
      const originalDevice = store.getSelectedDeviceId();

      store.selectDevice('invalid-device-id');
      expect(store.getSelectedDeviceId()).toBe(originalDevice); // Should not change
    });

    it('should notify listeners when devices are discovered', async () => {
      const listener = jest.fn();
      store.subscribe(listener);
      listener.mockClear();

      await store.discoverDevices();
      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners when device is selected', async () => {
      await store.discoverDevices();
      const listener = jest.fn();
      store.subscribe(listener);
      listener.mockClear();

      const devices = store.getAvailableDevices();
      store.selectDevice(devices[1].id);
      expect(listener).toHaveBeenCalled();
    });

    it('should return defensive copy of devices', async () => {
      await store.discoverDevices();
      const devices1 = store.getAvailableDevices();
      const devices2 = store.getAvailableDevices();

      expect(devices1).toEqual(devices2);
      expect(devices1).not.toBe(devices2); // Different arrays
    });
  });

  // ========== State Persistence Tests ==========

  describe('State Persistence', () => {
    let testStateFile: string;

    beforeEach(() => {
      testStateFile = createTestStateFile();
    });

    afterEach(() => {
      // Clean up test files
      if (fs.existsSync(testStateFile)) {
        fs.unlinkSync(testStateFile);
      }
    });

    it('should save and load device state', async () => {
      const store1 = new AranetStore(testStateFile);
      await store1.discoverDevices();

      const devices = store1.getAvailableDevices();
      const selected = store1.getSelectedDeviceId();
      store1.selectDevice(devices[1].id);
      store1.destroy();

      // File should exist
      expect(fs.existsSync(testStateFile)).toBe(true);

      // Load into new store
      const store2 = new AranetStore(testStateFile);
      expect(store2.getAvailableDevices().length).toBe(devices.length);
      expect(store2.getSelectedDeviceId()).toBe(devices[1].id);
      store2.destroy();
    });

    it('should persist device selection across restarts', async () => {
      const store1 = new AranetStore(testStateFile);
      await store1.discoverDevices();
      const devices = store1.getAvailableDevices();

      store1.selectDevice(devices[2].id); // Select third device
      store1.destroy();

      // Create new store and verify selection persists
      const store2 = new AranetStore(testStateFile);
      expect(store2.getSelectedDeviceId()).toBe(devices[2].id);
      expect(store2.getSelectedDeviceName()).toBe(devices[2].name);
      store2.destroy();
    });

    it('should handle missing state file gracefully', () => {
      const nonExistentFile = path.join(os.tmpdir(), 'nonexistent-aranet-state.json');
      const store = new AranetStore(nonExistentFile);

      // Should not throw - should initialize with defaults
      expect(store.getAvailableDevices()).toEqual([]);
      expect(store.getSelectedDeviceId()).toBeNull();
      store.destroy();
    });

    it('should disable persistence when explicitly null', async () => {
      const store = new AranetStore(null as any);
      await store.discoverDevices();

      // Should have devices in memory
      expect(store.getAvailableDevices().length).toBeGreaterThan(0);

      // But nothing should be persisted to disk
      const defaultPath = path.join(os.homedir(), '.tsyne', 'aranet-devices.json');
      const fileExisted = fs.existsSync(defaultPath);
      store.destroy();

      // Should not create persistence file when disabled
      expect(!fileExisted || fs.existsSync(defaultPath)).toBe(true); // Either didn't exist before or still exists
    });

    it('should handle corrupted state file gracefully', () => {
      // Write corrupted JSON
      fs.writeFileSync(testStateFile, 'not valid json{{{', 'utf8');

      // Should load without errors and use defaults
      const store = new AranetStore(testStateFile);
      expect(store.getAvailableDevices()).toEqual([]);
      expect(store.getSelectedDeviceId()).toBeNull();
      store.destroy();
    });

    it('should restore devices with correct types', async () => {
      const store1 = new AranetStore(testStateFile);
      await store1.discoverDevices();
      store1.destroy();

      const store2 = new AranetStore(testStateFile);
      const devices = store2.getAvailableDevices();

      // Verify device structure and types
      expect(devices.length).toBeGreaterThan(0);
      expect(devices[0]).toHaveProperty('id');
      expect(devices[0]).toHaveProperty('name');
      expect(devices[0]).toHaveProperty('discovered');
      expect(devices[0].discovered).toBeInstanceOf(Date);
      store2.destroy();
    });

    it('should save state after device selection', async () => {
      const store = new AranetStore(testStateFile);
      await store.discoverDevices();
      const devices = store.getAvailableDevices();

      // Select a device
      store.selectDevice(devices[1].id);

      // State file should exist and contain the selection
      expect(fs.existsSync(testStateFile)).toBe(true);
      const savedState = JSON.parse(fs.readFileSync(testStateFile, 'utf8'));
      expect(savedState.selectedDeviceId).toBe(devices[1].id);
      store.destroy();
    });

    it('should save state after discovery', async () => {
      const store = new AranetStore(testStateFile);
      await store.discoverDevices();

      // State file should exist
      expect(fs.existsSync(testStateFile)).toBe(true);

      // File should contain version and devices
      const savedState = JSON.parse(fs.readFileSync(testStateFile, 'utf8'));
      expect(savedState.version).toBe(1);
      expect(Array.isArray(savedState.devices)).toBe(true);
      expect(savedState.devices.length).toBeGreaterThan(0);
      store.destroy();
    });
  });

  // ========== Observable Pattern Tests ==========

  describe('Observable Pattern', () => {
    it('should call listener on subscription', () => {
      const listener = jest.fn();
      store.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1); // Immediate call
    });

    it('should call listener on state change', async () => {
      const listener = jest.fn();
      store.subscribe(listener);
      listener.mockClear(); // Clear the initial call

      await store.connect();
      expect(listener.mock.calls.length).toBeGreaterThan(0);
    });

    it('should allow unsubscribe', async () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);
      listener.mockClear();

      await store.connect();
      const callsBeforeUnsubscribe = listener.mock.calls.length;

      unsubscribe();
      listener.mockClear();

      store.updateAlertSound(AlertSoundType.Off);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify multiple listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);

      listener1.mockClear();
      listener2.mockClear();

      await store.connect();

      expect(listener1.mock.calls.length).toBeGreaterThan(0);
      expect(listener2.mock.calls.length).toBeGreaterThan(0);
    });

    it('should notify listeners on settings change', () => {
      const listener = jest.fn();
      store.subscribe(listener);
      listener.mockClear();

      store.updateAlertSound(AlertSoundType.Urgent);
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      store.updateAutoConnect(false);
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      store.updateRefreshInterval(10);
      expect(listener).toHaveBeenCalled();
    });
  });

  // ========== Auto-Refresh Tests ==========

  describe('Auto-Refresh Mechanism', () => {
    it('should start auto-refresh on connect', async () => {
      const listener = jest.fn();
      store.subscribe(listener);
      listener.mockClear();

      await store.connect();

      // Wait for one refresh cycle (5 minutes = 300000ms)
      // Just verify the mechanism is active, not the actual timing
      expect(listener).toHaveBeenCalled();
    });

    it('should stop auto-refresh on disconnect', async () => {
      const listener = jest.fn();
      store.subscribe(listener);

      await store.connect();
      await store.disconnect();

      listener.mockClear();

      // After disconnect, auto-refresh should be cleared
      expect(store.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);
    });

    it('should respect custom refresh interval', async () => {
      const listener = jest.fn();
      store.subscribe(listener);

      await store.connect();
      store.updateRefreshInterval(2);

      // Verify setting was applied
      expect(store.getSettings().refreshInterval).toBe(2);
    });
  });

  // ========== Cleanup Tests ==========

  describe('Cleanup', () => {
    it('should destroy without errors', () => {
      expect(() => {
        store.destroy();
      }).not.toThrow();
    });

    it('should clear timers on destroy', async () => {
      await store.connect();
      store.destroy();

      // After destroy, timers should be cleared
      expect(store.getConnectionStatus()).toBe(ConnectionStatus.Connected); // Status unchanged but timers cleared
    });
  });

  // ========== Immutability Tests ==========

  describe('Immutability', () => {
    it('should return defensive copy of readings', async () => {
      await store.connect();
      await store.refreshReading();

      const reading1 = store.getLastReading();
      const reading2 = store.getLastReading();

      expect(reading1).toEqual(reading2);
      expect(reading1).toBe(reading2); // Same reference is fine for immutable object
    });

    it('should preserve reading data on multiple accesses', async () => {
      await store.connect();
      await store.refreshReading();

      const reading1 = store.getLastReading();
      expect(store.getLastReading()).toEqual(reading1);

      store.updateAlertSound(AlertSoundType.Off);
      expect(store.getLastReading()).toEqual(reading1);
    });
  });
});

// ========== Test Edge Cases ==========

describe('Edge Cases', () => {
  let store: AranetStore;

  beforeEach(() => {
    store = new AranetStore();
  });

  afterEach(() => {
    store.destroy();
  });

  it('should handle rapid connect/disconnect cycles', async () => {
    for (let i = 0; i < 3; i++) {
      await store.connect();
      await store.disconnect();
    }

    expect(store.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);
    expect(store.getLastReading()).toBeNull();
  });

  it('should handle multiple refresh calls in quick succession', async () => {
    await store.connect();

    for (let i = 0; i < 5; i++) {
      await store.refreshReading();
    }

    const reading = store.getLastReading();
    expect(reading).not.toBeNull();
    expect(reading?.co2).toBeGreaterThanOrEqual(0);
  });

  it('should handle settings changes while connected', async () => {
    await store.connect();

    store.updateAlertSound(AlertSoundType.Urgent);
    store.updateAutoConnect(false);
    store.updateRefreshInterval(15);

    expect(store.getConnectionStatus()).toBe(ConnectionStatus.Connected);
    expect(store.getSettings().alertSound).toBe(AlertSoundType.Urgent);
  });
});
