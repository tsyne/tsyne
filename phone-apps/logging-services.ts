/**
 * Logging Services - Wrappers that log human-readable messages
 *
 * These wrap the mock services and emit human-readable descriptions
 * of what phone hardware/OS interactions would occur.
 */

import {
  IStorageService,
  IContactsService,
  ITelephonyService,
  IClockService,
  INotificationService,
  ISettingsService,
  ISMSService,
  MockStorageService,
  MockContactsService,
  MockTelephonyService,
  MockClockService,
  MockNotificationService,
  MockSettingsService,
  MockSMSService,
  Contact,
  CallLogEntry,
  Alarm,
  Notification,
  Message,
  Thread,
  MessageListener,
} from './services';

/**
 * Event listener for modem log messages
 */
export type ModemLogListener = (message: ModemLogEntry) => void;

export interface ModemLogEntry {
  timestamp: Date;
  subsystem: 'TELEPHONY' | 'SMS' | 'STORAGE' | 'CONTACTS' | 'CLOCK' | 'NOTIFICATIONS' | 'SETTINGS' | 'SYSTEM';
  direction: 'TX' | 'RX' | 'INFO';  // TX = to hardware, RX = from hardware, INFO = internal
  message: string;
}

/**
 * Central modem log that all logging services write to
 */
class ModemLog {
  private listeners: ModemLogListener[] = [];
  private history: ModemLogEntry[] = [];
  private maxHistory = 100;

  log(subsystem: ModemLogEntry['subsystem'], direction: ModemLogEntry['direction'], message: string): void {
    const entry: ModemLogEntry = {
      timestamp: new Date(),
      subsystem,
      direction,
      message,
    };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.listeners.forEach(listener => listener(entry));
  }

  subscribe(listener: ModemLogListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  getHistory(): ModemLogEntry[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}

// Singleton modem log instance
export const modemLog = new ModemLog();

/**
 * Logging Telephony Service
 */
export class LoggingTelephonyService implements ITelephonyService {
  private delegate = new MockTelephonyService();

  async dial(number: string): Promise<boolean> {
    modemLog.log('TELEPHONY', 'TX', `AT+DIAL ${number}`);
    modemLog.log('TELEPHONY', 'INFO', `Initiating voice call to ${number}...`);
    const result = await this.delegate.dial(number);
    if (result) {
      modemLog.log('TELEPHONY', 'RX', 'CONNECT - Call established');
      modemLog.log('TELEPHONY', 'INFO', `Ringing ${number}...`);
    } else {
      modemLog.log('TELEPHONY', 'RX', 'BUSY - Call failed');
    }
    return result;
  }

  async hangup(): Promise<void> {
    modemLog.log('TELEPHONY', 'TX', 'ATH - Hang up');
    await this.delegate.hangup();
    modemLog.log('TELEPHONY', 'RX', 'OK - Call ended');
    modemLog.log('TELEPHONY', 'INFO', 'Voice call terminated');
  }

  getCallLog(): CallLogEntry[] {
    modemLog.log('TELEPHONY', 'INFO', 'Reading call log from SIM...');
    return this.delegate.getCallLog();
  }

  clearCallLog(): void {
    modemLog.log('TELEPHONY', 'TX', 'AT+CPBW=0 - Clear call log');
    this.delegate.clearCallLog();
    modemLog.log('TELEPHONY', 'RX', 'OK');
  }

  isInCall(): boolean {
    return this.delegate.isInCall();
  }

  getCurrentCallNumber(): string | null {
    return this.delegate.getCurrentCallNumber();
  }
}

/**
 * Logging SMS Service
 */
export class LoggingSMSService implements ISMSService {
  private delegate = new MockSMSService();

  constructor() {
    // Subscribe to incoming messages to log them
    this.delegate.onMessageReceived((message) => {
      modemLog.log('SMS', 'RX', `+CMT: "${message.from}"`);
      modemLog.log('SMS', 'RX', `> ${message.body.substring(0, 50)}${message.body.length > 50 ? '...' : ''}`);
      modemLog.log('SMS', 'INFO', `SMS received from ${message.from} (${message.body.length} chars)`);
    });
  }

  async send(to: string, body: string): Promise<Message> {
    modemLog.log('SMS', 'TX', `AT+CMGS="${to}"`);
    modemLog.log('SMS', 'TX', `> ${body.substring(0, 50)}${body.length > 50 ? '...' : ''}`);
    const result = await this.delegate.send(to, body);
    modemLog.log('SMS', 'RX', '+CMGS: Message sent');
    modemLog.log('SMS', 'INFO', `SMS delivered to ${to} (${body.length} chars)`);
    return result;
  }

  getThreads(): Thread[] {
    modemLog.log('SMS', 'INFO', 'Reading SMS threads from storage...');
    return this.delegate.getThreads();
  }

  getMessages(threadId: string): Message[] {
    modemLog.log('SMS', 'INFO', `Reading messages for thread ${threadId}...`);
    return this.delegate.getMessages(threadId);
  }

  markThreadRead(threadId: string): void {
    modemLog.log('SMS', 'INFO', `Marking thread ${threadId} as read`);
    this.delegate.markThreadRead(threadId);
  }

  deleteThread(threadId: string): boolean {
    modemLog.log('SMS', 'TX', `AT+CMGD=${threadId} - Delete thread`);
    const result = this.delegate.deleteThread(threadId);
    modemLog.log('SMS', 'RX', result ? 'OK' : 'ERROR');
    return result;
  }

  deleteMessage(messageId: string): boolean {
    modemLog.log('SMS', 'TX', `AT+CMGD=${messageId} - Delete message`);
    const result = this.delegate.deleteMessage(messageId);
    modemLog.log('SMS', 'RX', result ? 'OK' : 'ERROR');
    return result;
  }

  onMessageReceived(listener: (message: Message) => void): () => void {
    return this.delegate.onMessageReceived(listener);
  }

  setAutoReply(enabled: boolean): void {
    modemLog.log('SMS', 'INFO', `Auto-reply simulation ${enabled ? 'enabled' : 'disabled'}`);
    this.delegate.setAutoReply(enabled);
  }
}

/**
 * Logging Contacts Service
 */
export class LoggingContactsService implements IContactsService {
  private delegate = new MockContactsService();

  getAll(): Contact[] {
    modemLog.log('CONTACTS', 'INFO', 'Reading contacts from SIM + device storage...');
    const contacts = this.delegate.getAll();
    modemLog.log('CONTACTS', 'INFO', `Found ${contacts.length} contacts`);
    return contacts;
  }

  getById(id: string): Contact | null {
    return this.delegate.getById(id);
  }

  search(query: string): Contact[] {
    modemLog.log('CONTACTS', 'INFO', `Searching contacts for "${query}"...`);
    return this.delegate.search(query);
  }

  add(contact: Omit<Contact, 'id'>): Contact {
    modemLog.log('CONTACTS', 'TX', `AT+CPBW - Write phonebook entry`);
    modemLog.log('CONTACTS', 'INFO', `Adding contact: ${contact.name} (${contact.phone})`);
    const result = this.delegate.add(contact);
    modemLog.log('CONTACTS', 'RX', 'OK - Contact saved');
    return result;
  }

  update(id: string, contact: Partial<Contact>): Contact | null {
    modemLog.log('CONTACTS', 'INFO', `Updating contact ${id}...`);
    const result = this.delegate.update(id, contact);
    if (result) {
      modemLog.log('CONTACTS', 'RX', 'OK - Contact updated');
    }
    return result;
  }

  remove(id: string): boolean {
    modemLog.log('CONTACTS', 'TX', `AT+CPBW=${id},"" - Delete phonebook entry`);
    const result = this.delegate.remove(id);
    modemLog.log('CONTACTS', 'RX', result ? 'OK' : 'ERROR');
    return result;
  }

  getFavorites(): Contact[] {
    return this.delegate.getFavorites();
  }
}

/**
 * Logging Clock Service
 */
export class LoggingClockService implements IClockService {
  private delegate = new MockClockService();

  getCurrentTime(): Date {
    return this.delegate.getCurrentTime();
  }

  getTimezone(): string {
    return this.delegate.getTimezone();
  }

  getAlarms(): Alarm[] {
    modemLog.log('CLOCK', 'INFO', 'Reading alarms from RTC...');
    return this.delegate.getAlarms();
  }

  addAlarm(alarm: Omit<Alarm, 'id'>): Alarm {
    modemLog.log('CLOCK', 'TX', `RTC: Set alarm for ${alarm.time}`);
    modemLog.log('CLOCK', 'INFO', `Programming alarm: "${alarm.label}" at ${alarm.time}`);
    const result = this.delegate.addAlarm(alarm);
    modemLog.log('CLOCK', 'RX', 'OK - Alarm set in RTC');
    return result;
  }

  updateAlarm(id: string, alarm: Partial<Alarm>): Alarm | null {
    modemLog.log('CLOCK', 'INFO', `Updating alarm ${id}...`);
    return this.delegate.updateAlarm(id, alarm);
  }

  removeAlarm(id: string): boolean {
    modemLog.log('CLOCK', 'TX', `RTC: Clear alarm ${id}`);
    const result = this.delegate.removeAlarm(id);
    modemLog.log('CLOCK', 'RX', result ? 'OK' : 'ERROR');
    return result;
  }

  toggleAlarm(id: string): Alarm | null {
    const alarm = this.delegate.toggleAlarm(id);
    if (alarm) {
      modemLog.log('CLOCK', 'INFO', `Alarm ${id} ${alarm.enabled ? 'enabled' : 'disabled'}`);
    }
    return alarm;
  }
}

/**
 * Logging Notification Service
 */
export class LoggingNotificationService implements INotificationService {
  private delegate = new MockNotificationService();

  send(title: string, body: string): Notification {
    modemLog.log('NOTIFICATIONS', 'TX', 'VIBRATE: 200ms pattern');
    modemLog.log('NOTIFICATIONS', 'TX', 'LED: Blink blue 3x');
    modemLog.log('NOTIFICATIONS', 'INFO', `Notification: "${title}" - ${body}`);
    return this.delegate.send(title, body);
  }

  getAll(): Notification[] {
    return this.delegate.getAll();
  }

  getUnread(): Notification[] {
    return this.delegate.getUnread();
  }

  markRead(id: string): void {
    this.delegate.markRead(id);
  }

  markAllRead(): void {
    this.delegate.markAllRead();
  }

  clear(): void {
    modemLog.log('NOTIFICATIONS', 'INFO', 'Clearing notification tray');
    this.delegate.clear();
  }
}

/**
 * Logging Settings Service
 */
export class LoggingSettingsService implements ISettingsService {
  private delegate = new MockSettingsService();

  get<T>(key: string, defaultValue: T): T {
    return this.delegate.get(key, defaultValue);
  }

  set<T>(key: string, value: T): void {
    modemLog.log('SETTINGS', 'INFO', `Setting ${key} = ${JSON.stringify(value)}`);
    this.delegate.set(key, value);
  }

  getTheme(): 'light' | 'dark' | 'system' {
    return this.delegate.getTheme();
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    modemLog.log('SETTINGS', 'TX', `DISPLAY: Set theme ${theme}`);
    this.delegate.setTheme(theme);
  }

  getBrightness(): number {
    return this.delegate.getBrightness();
  }

  setBrightness(level: number): void {
    modemLog.log('SETTINGS', 'TX', `BACKLIGHT: Set brightness ${level}%`);
    modemLog.log('SETTINGS', 'INFO', `Display brightness → ${level}%`);
    this.delegate.setBrightness(level);
  }

  getVolume(): number {
    return this.delegate.getVolume();
  }

  setVolume(level: number): void {
    modemLog.log('SETTINGS', 'TX', `AUDIO: Set volume ${level}%`);
    modemLog.log('SETTINGS', 'INFO', `System volume → ${level}%`);
    this.delegate.setVolume(level);
  }

  isWifiEnabled(): boolean {
    return this.delegate.isWifiEnabled();
  }

  setWifiEnabled(enabled: boolean): void {
    modemLog.log('SETTINGS', 'TX', `WIFI: ${enabled ? 'ENABLE' : 'DISABLE'}`);
    modemLog.log('SETTINGS', 'INFO', `WiFi radio ${enabled ? 'powered on, scanning...' : 'powered off'}`);
    this.delegate.setWifiEnabled(enabled);
    if (enabled) {
      modemLog.log('SETTINGS', 'RX', 'WIFI: Found 3 networks');
    }
  }

  isBluetoothEnabled(): boolean {
    return this.delegate.isBluetoothEnabled();
  }

  setBluetoothEnabled(enabled: boolean): void {
    modemLog.log('SETTINGS', 'TX', `BLUETOOTH: ${enabled ? 'ENABLE' : 'DISABLE'}`);
    modemLog.log('SETTINGS', 'INFO', `Bluetooth radio ${enabled ? 'powered on, discoverable' : 'powered off'}`);
    this.delegate.setBluetoothEnabled(enabled);
  }
}

/**
 * Logging Storage Service
 */
export class LoggingStorageService implements IStorageService {
  private delegate = new MockStorageService();

  get(key: string): string | null {
    modemLog.log('STORAGE', 'INFO', `Read: ${key}`);
    return this.delegate.get(key);
  }

  set(key: string, value: string): void {
    modemLog.log('STORAGE', 'TX', `FLASH: Write ${key} (${value.length} bytes)`);
    this.delegate.set(key, value);
    modemLog.log('STORAGE', 'RX', 'OK');
  }

  remove(key: string): void {
    modemLog.log('STORAGE', 'TX', `FLASH: Delete ${key}`);
    this.delegate.remove(key);
  }

  getAll(): Map<string, string> {
    return this.delegate.getAll();
  }

  clear(): void {
    modemLog.log('STORAGE', 'TX', 'FLASH: Erase user partition');
    this.delegate.clear();
    modemLog.log('STORAGE', 'RX', 'OK - Storage cleared');
  }
}

/**
 * Factory to create all logging services
 */
export function createLoggingServices() {
  modemLog.log('SYSTEM', 'INFO', 'Phone booting...');
  modemLog.log('SYSTEM', 'INFO', 'Initializing hardware subsystems...');
  modemLog.log('SYSTEM', 'RX', 'SIM: Card detected - Carrier: Mock Mobile');
  modemLog.log('SYSTEM', 'RX', 'BASEBAND: Signal strength 4/5 bars');
  modemLog.log('SYSTEM', 'INFO', 'Phone ready');

  return {
    telephony: new LoggingTelephonyService(),
    sms: new LoggingSMSService(),
    contacts: new LoggingContactsService(),
    clock: new LoggingClockService(),
    notifications: new LoggingNotificationService(),
    settings: new LoggingSettingsService(),
    storage: new LoggingStorageService(),
  };
}
