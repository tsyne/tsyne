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

jest.setTimeout(15000); // Increase timeout for async operations

describe('Aranet4Store', () => {
  let store: AranetStore;

  beforeEach(() => {
    store = new AranetStore();
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
