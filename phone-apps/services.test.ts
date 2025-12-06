/**
 * Unit tests for Phone Services
 */

import {
  MockStorageService,
  MockContactsService,
  MockTelephonyService,
  MockClockService,
  MockNotificationService,
  MockSettingsService,
  MockSMSService,
} from './services';

describe('MockStorageService', () => {
  let storage: MockStorageService;

  beforeEach(() => {
    storage = new MockStorageService();
  });

  test('should store and retrieve values', () => {
    storage.set('key1', 'value1');
    expect(storage.get('key1')).toBe('value1');
  });

  test('should return null for non-existent keys', () => {
    expect(storage.get('nonexistent')).toBeNull();
  });

  test('should remove values', () => {
    storage.set('key1', 'value1');
    storage.remove('key1');
    expect(storage.get('key1')).toBeNull();
  });

  test('should clear all values', () => {
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    storage.clear();
    expect(storage.getAll().size).toBe(0);
  });

  test('should return all values', () => {
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    const all = storage.getAll();
    expect(all.size).toBe(2);
    expect(all.get('key1')).toBe('value1');
  });
});

describe('MockContactsService', () => {
  let contacts: MockContactsService;

  beforeEach(() => {
    contacts = new MockContactsService();
  });

  test('should have sample contacts', () => {
    expect(contacts.getAll().length).toBeGreaterThan(0);
  });

  test('should add a contact', () => {
    const initialCount = contacts.getAll().length;
    const newContact = contacts.add({
      name: 'Test Person',
      phone: '555-9999',
    });
    expect(newContact.id).toBeDefined();
    expect(contacts.getAll().length).toBe(initialCount + 1);
  });

  test('should search contacts by name', () => {
    const results = contacts.search('Alice');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('Alice');
  });

  test('should search contacts by phone', () => {
    const results = contacts.search('555-0101');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should get contact by id', () => {
    const all = contacts.getAll();
    const first = all[0];
    const found = contacts.getById(first.id);
    expect(found).toEqual(first);
  });

  test('should update a contact', () => {
    const all = contacts.getAll();
    const first = all[0];
    const updated = contacts.update(first.id, { name: 'Updated Name' });
    expect(updated?.name).toBe('Updated Name');
    expect(updated?.phone).toBe(first.phone);
  });

  test('should remove a contact', () => {
    const all = contacts.getAll();
    const first = all[0];
    const removed = contacts.remove(first.id);
    expect(removed).toBe(true);
    expect(contacts.getById(first.id)).toBeNull();
  });

  test('should get favorites', () => {
    const favorites = contacts.getFavorites();
    expect(favorites.length).toBeGreaterThan(0);
    expect(favorites.every(c => c.favorite)).toBe(true);
  });
});

describe('MockTelephonyService', () => {
  let telephony: MockTelephonyService;

  beforeEach(() => {
    telephony = new MockTelephonyService();
  });

  test('should have sample call log', () => {
    expect(telephony.getCallLog().length).toBeGreaterThan(0);
  });

  test('should dial a number', async () => {
    const success = await telephony.dial('555-1234');
    expect(success).toBe(true);
    expect(telephony.isInCall()).toBe(true);
    expect(telephony.getCurrentCallNumber()).toBe('555-1234');
  });

  test('should not dial while in call', async () => {
    await telephony.dial('555-1234');
    const success = await telephony.dial('555-5678');
    expect(success).toBe(false);
  });

  test('should hang up', async () => {
    await telephony.dial('555-1234');
    await telephony.hangup();
    expect(telephony.isInCall()).toBe(false);
    expect(telephony.getCurrentCallNumber()).toBeNull();
  });

  test('should add to call log when dialing', async () => {
    const initialCount = telephony.getCallLog().length;
    await telephony.dial('555-1234');
    expect(telephony.getCallLog().length).toBe(initialCount + 1);
    expect(telephony.getCallLog()[0].number).toBe('555-1234');
    expect(telephony.getCallLog()[0].type).toBe('outgoing');
  });

  test('should clear call log', () => {
    telephony.clearCallLog();
    expect(telephony.getCallLog().length).toBe(0);
  });
});

describe('MockClockService', () => {
  let clock: MockClockService;

  beforeEach(() => {
    clock = new MockClockService();
  });

  test('should return current time', () => {
    const time = clock.getCurrentTime();
    expect(time instanceof Date).toBe(true);
  });

  test('should return timezone', () => {
    const tz = clock.getTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });

  test('should have sample alarms', () => {
    expect(clock.getAlarms().length).toBeGreaterThan(0);
  });

  test('should add an alarm', () => {
    const initialCount = clock.getAlarms().length;
    const alarm = clock.addAlarm({
      time: '09:00',
      label: 'Test Alarm',
      enabled: true,
      days: [],
    });
    expect(alarm.id).toBeDefined();
    expect(clock.getAlarms().length).toBe(initialCount + 1);
  });

  test('should toggle alarm', () => {
    const alarms = clock.getAlarms();
    const first = alarms[0];
    const wasEnabled = first.enabled;
    const toggled = clock.toggleAlarm(first.id);
    expect(toggled?.enabled).toBe(!wasEnabled);
  });

  test('should remove alarm', () => {
    const alarms = clock.getAlarms();
    const first = alarms[0];
    const removed = clock.removeAlarm(first.id);
    expect(removed).toBe(true);
    expect(clock.getAlarms().find(a => a.id === first.id)).toBeUndefined();
  });
});

describe('MockNotificationService', () => {
  let notifications: MockNotificationService;

  beforeEach(() => {
    notifications = new MockNotificationService();
  });

  test('should send notification', () => {
    const notif = notifications.send('Test Title', 'Test Body');
    expect(notif.id).toBeDefined();
    expect(notif.title).toBe('Test Title');
    expect(notif.body).toBe('Test Body');
    expect(notif.read).toBe(false);
  });

  test('should get all notifications', () => {
    notifications.send('Title 1', 'Body 1');
    notifications.send('Title 2', 'Body 2');
    expect(notifications.getAll().length).toBe(2);
  });

  test('should get unread notifications', () => {
    notifications.send('Title 1', 'Body 1');
    const notif2 = notifications.send('Title 2', 'Body 2');
    notifications.markRead(notif2.id);
    expect(notifications.getUnread().length).toBe(1);
  });

  test('should mark all as read', () => {
    notifications.send('Title 1', 'Body 1');
    notifications.send('Title 2', 'Body 2');
    notifications.markAllRead();
    expect(notifications.getUnread().length).toBe(0);
  });

  test('should clear all notifications', () => {
    notifications.send('Title 1', 'Body 1');
    notifications.clear();
    expect(notifications.getAll().length).toBe(0);
  });
});

describe('MockSettingsService', () => {
  let settings: MockSettingsService;

  beforeEach(() => {
    settings = new MockSettingsService();
  });

  test('should get and set generic values', () => {
    settings.set('custom', 'value');
    expect(settings.get('custom', 'default')).toBe('value');
  });

  test('should return default for missing keys', () => {
    expect(settings.get('missing', 'default')).toBe('default');
  });

  test('should get and set theme', () => {
    settings.setTheme('dark');
    expect(settings.getTheme()).toBe('dark');
  });

  test('should get and set brightness', () => {
    settings.setBrightness(50);
    expect(settings.getBrightness()).toBe(50);
  });

  test('should clamp brightness to valid range', () => {
    settings.setBrightness(150);
    expect(settings.getBrightness()).toBe(100);
    settings.setBrightness(-10);
    expect(settings.getBrightness()).toBe(0);
  });

  test('should get and set volume', () => {
    settings.setVolume(30);
    expect(settings.getVolume()).toBe(30);
  });

  test('should get and set wifi', () => {
    settings.setWifiEnabled(false);
    expect(settings.isWifiEnabled()).toBe(false);
  });

  test('should get and set bluetooth', () => {
    settings.setBluetoothEnabled(true);
    expect(settings.isBluetoothEnabled()).toBe(true);
  });
});

describe('MockSMSService', () => {
  let sms: MockSMSService;

  beforeEach(() => {
    sms = new MockSMSService();
  });

  test('should have sample messages', () => {
    expect(sms.getThreads().length).toBeGreaterThan(0);
  });

  test('should send message', async () => {
    const msg = await sms.send('555-9999', 'Hello!');
    expect(msg.id).toBeDefined();
    expect(msg.to).toBe('555-9999');
    expect(msg.body).toBe('Hello!');
  });

  test('should get messages for thread', () => {
    const threads = sms.getThreads();
    const threadId = threads[0].id;
    const messages = sms.getMessages(threadId);
    expect(messages.length).toBeGreaterThan(0);
  });

  test('should mark thread as read', () => {
    const threads = sms.getThreads();
    const threadWithUnread = threads.find(t => t.unreadCount > 0);
    if (threadWithUnread) {
      sms.markThreadRead(threadWithUnread.id);
      const updated = sms.getThreads().find(t => t.id === threadWithUnread.id);
      expect(updated?.unreadCount).toBe(0);
    }
  });

  test('should delete thread', () => {
    const threads = sms.getThreads();
    const initialCount = threads.length;
    const deleted = sms.deleteThread(threads[0].id);
    expect(deleted).toBe(true);
    expect(sms.getThreads().length).toBe(initialCount - 1);
  });
});
