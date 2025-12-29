/**
 * Mock Service Implementations
 *
 * These mock implementations provide in-memory simulation of services
 * for development, testing, and platforms without native implementations.
 */

import {
  IStorageService,
  IClockService,
  INotificationService,
  ISettingsService,
  IAppLifecycle,
  Alarm,
  Notification,
} from './interfaces';

// ============================================================================
// Mock Storage Service
// ============================================================================

export class MockStorageService implements IStorageService {
  private data: Map<string, string> = new Map();

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }

  getAll(): Map<string, string> {
    return new Map(this.data);
  }

  clear(): void {
    this.data.clear();
  }
}

// ============================================================================
// Mock Clock Service
// ============================================================================

export class MockClockService implements IClockService {
  private alarms: Map<string, Alarm> = new Map();
  private nextId = 1;
  private mockedTime: Date | null = null;

  constructor() {
    // Add sample alarms
    this.addAlarm({ time: '07:00', label: 'Wake up', enabled: true, days: [1, 2, 3, 4, 5] });
    this.addAlarm({ time: '08:30', label: 'Meeting', enabled: false, days: [] });
  }

  /** Set a fixed time for testing. Pass null to use real time. */
  setTime(time: Date | null): void {
    this.mockedTime = time;
  }

  getCurrentTime(): Date {
    return this.mockedTime ?? new Date();
  }

  getTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  getAlarms(): Alarm[] {
    return Array.from(this.alarms.values()).sort((a, b) => a.time.localeCompare(b.time));
  }

  addAlarm(alarm: Omit<Alarm, 'id'>): Alarm {
    const id = `alarm-${this.nextId++}`;
    const newAlarm: Alarm = { ...alarm, id };
    this.alarms.set(id, newAlarm);
    return newAlarm;
  }

  updateAlarm(id: string, updates: Partial<Alarm>): Alarm | null {
    const existing = this.alarms.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.alarms.set(id, updated);
    return updated;
  }

  removeAlarm(id: string): boolean {
    return this.alarms.delete(id);
  }

  toggleAlarm(id: string): Alarm | null {
    const alarm = this.alarms.get(id);
    if (!alarm) return null;
    alarm.enabled = !alarm.enabled;
    return alarm;
  }
}

// ============================================================================
// Mock Notification Service
// ============================================================================

export class MockNotificationService implements INotificationService {
  private notifications: Notification[] = [];
  private nextId = 1;

  send(title: string, body: string): Notification {
    const notification: Notification = {
      id: `notif-${this.nextId++}`,
      title,
      body,
      timestamp: new Date(),
      read: false,
    };
    this.notifications.unshift(notification);
    console.log(`[MockNotification] ${title}: ${body}`);
    return notification;
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }

  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  markRead(id: string): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) notif.read = true;
  }

  markAllRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  clear(): void {
    this.notifications = [];
  }
}

// ============================================================================
// Mock Settings Service
// ============================================================================

export class MockSettingsService implements ISettingsService {
  private settings: Map<string, any> = new Map<string, any>([
    ['theme', 'system'],
    ['brightness', 80],
    ['volume', 70],
    ['wifi', true],
    ['bluetooth', false],
  ]);

  get<T>(key: string, defaultValue: T): T {
    return this.settings.has(key) ? this.settings.get(key) : defaultValue;
  }

  set<T>(key: string, value: T): void {
    this.settings.set(key, value);
  }

  getTheme(): 'light' | 'dark' | 'system' {
    return this.get('theme', 'system');
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.set('theme', theme);
  }

  getBrightness(): number {
    return this.get('brightness', 80);
  }

  setBrightness(level: number): void {
    this.set('brightness', Math.max(0, Math.min(100, level)));
  }

  getVolume(): number {
    return this.get('volume', 70);
  }

  setVolume(level: number): void {
    this.set('volume', Math.max(0, Math.min(100, level)));
  }

  isWifiEnabled(): boolean {
    return this.get('wifi', true);
  }

  setWifiEnabled(enabled: boolean): void {
    this.set('wifi', enabled);
  }

  isBluetoothEnabled(): boolean {
    return this.get('bluetooth', false);
  }

  setBluetoothEnabled(enabled: boolean): void {
    this.set('bluetooth', enabled);
  }
}

// ============================================================================
// App Lifecycle Implementations
// ============================================================================

/**
 * Standalone lifecycle - calls app.quit() to exit the entire process
 */
export class StandaloneAppLifecycle implements IAppLifecycle {
  constructor(private quitFn: () => void) {}

  requestClose(): void {
    this.quitFn();
  }
}

/**
 * Desktop lifecycle - closes the inner window via callback
 * The callback is provided by desktop.ts to close the specific inner window
 */
export class DesktopAppLifecycle implements IAppLifecycle {
  constructor(private closeCallback?: () => void) {}

  requestClose(): void {
    if (this.closeCallback) {
      this.closeCallback();
    }
  }
}
