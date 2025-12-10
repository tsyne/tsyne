/**
 * Phone Services - Interfaces and Mock Implementations
 *
 * These services represent phone hardware and system capabilities.
 * Mock implementations allow apps to be developed and tested without
 * actual phone hardware.
 */

// ============================================================================
// Storage Service - Key-value persistence
// ============================================================================

export interface IStorageService {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  getAll(): Map<string, string>;
  clear(): void;
}

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
// Contacts Service - Contact management
// ============================================================================

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  favorite?: boolean;
}

export interface IContactsService {
  getAll(): Contact[];
  getById(id: string): Contact | null;
  search(query: string): Contact[];
  add(contact: Omit<Contact, 'id'>): Contact;
  update(id: string, contact: Partial<Contact>): Contact | null;
  remove(id: string): boolean;
  getFavorites(): Contact[];
}

export class MockContactsService implements IContactsService {
  private contacts: Map<string, Contact> = new Map();
  private nextId = 1;

  constructor() {
    // Add some sample contacts
    this.add({ name: 'Alice Smith', phone: '555-0101', email: 'alice@example.com', favorite: true });
    this.add({ name: 'Bob Jones', phone: '555-0102', email: 'bob@example.com' });
    this.add({ name: 'Carol White', phone: '555-0103' });
    this.add({ name: 'David Brown', phone: '555-0104', favorite: true });
    this.add({ name: 'Eve Davis', phone: '555-0105', email: 'eve@example.com' });
  }

  getAll(): Contact[] {
    return Array.from(this.contacts.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getById(id: string): Contact | null {
    return this.contacts.get(id) ?? null;
  }

  search(query: string): Contact[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.phone.includes(query) ||
      (c.email && c.email.toLowerCase().includes(lower))
    );
  }

  add(contact: Omit<Contact, 'id'>): Contact {
    const id = `contact-${this.nextId++}`;
    const newContact: Contact = { ...contact, id };
    this.contacts.set(id, newContact);
    return newContact;
  }

  update(id: string, updates: Partial<Contact>): Contact | null {
    const existing = this.contacts.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.contacts.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.contacts.delete(id);
  }

  getFavorites(): Contact[] {
    return this.getAll().filter(c => c.favorite);
  }
}

// ============================================================================
// Telephony Service - Phone calls
// ============================================================================

export interface CallLogEntry {
  id: string;
  number: string;
  name?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: Date;
  duration?: number; // seconds
}

export interface ITelephonyService {
  dial(number: string): Promise<boolean>;
  hangup(): Promise<void>;
  getCallLog(): CallLogEntry[];
  clearCallLog(): void;
  isInCall(): boolean;
  getCurrentCallNumber(): string | null;
}

export class MockTelephonyService implements ITelephonyService {
  private callLog: CallLogEntry[] = [];
  private inCall = false;
  private currentNumber: string | null = null;
  private nextId = 1;

  constructor() {
    // Add some sample call history
    const now = new Date();
    this.callLog = [
      { id: 'call-1', number: '555-0101', name: 'Alice Smith', type: 'incoming', timestamp: new Date(now.getTime() - 3600000), duration: 120 },
      { id: 'call-2', number: '555-0102', name: 'Bob Jones', type: 'outgoing', timestamp: new Date(now.getTime() - 7200000), duration: 45 },
      { id: 'call-3', number: '555-9999', type: 'missed', timestamp: new Date(now.getTime() - 86400000) },
    ];
    this.nextId = 4;
  }

  async dial(number: string): Promise<boolean> {
    if (this.inCall) return false;
    this.inCall = true;
    this.currentNumber = number;
    console.log(`[MockTelephony] Dialing ${number}...`);

    // Add to call log
    this.callLog.unshift({
      id: `call-${this.nextId++}`,
      number,
      type: 'outgoing',
      timestamp: new Date(),
    });

    return true;
  }

  async hangup(): Promise<void> {
    if (this.inCall) {
      console.log(`[MockTelephony] Call ended with ${this.currentNumber}`);
      this.inCall = false;
      this.currentNumber = null;
    }
  }

  getCallLog(): CallLogEntry[] {
    return [...this.callLog];
  }

  clearCallLog(): void {
    this.callLog = [];
  }

  isInCall(): boolean {
    return this.inCall;
  }

  getCurrentCallNumber(): string | null {
    return this.currentNumber;
  }
}

// ============================================================================
// Clock Service - Time and alarms
// ============================================================================

export interface Alarm {
  id: string;
  time: string; // HH:MM format
  label: string;
  enabled: boolean;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (empty = one-time)
}

export interface IClockService {
  getCurrentTime(): Date;
  getTimezone(): string;
  getAlarms(): Alarm[];
  addAlarm(alarm: Omit<Alarm, 'id'>): Alarm;
  updateAlarm(id: string, alarm: Partial<Alarm>): Alarm | null;
  removeAlarm(id: string): boolean;
  toggleAlarm(id: string): Alarm | null;
}

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
// Notification Service - Local notifications
// ============================================================================

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
}

export interface INotificationService {
  send(title: string, body: string): Notification;
  getAll(): Notification[];
  getUnread(): Notification[];
  markRead(id: string): void;
  markAllRead(): void;
  clear(): void;
}

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
// Settings Service - System preferences
// ============================================================================

export interface ISettingsService {
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
  getTheme(): 'light' | 'dark' | 'system';
  setTheme(theme: 'light' | 'dark' | 'system'): void;
  getBrightness(): number;
  setBrightness(level: number): void;
  getVolume(): number;
  setVolume(level: number): void;
  isWifiEnabled(): boolean;
  setWifiEnabled(enabled: boolean): void;
  isBluetoothEnabled(): boolean;
  setBluetoothEnabled(enabled: boolean): void;
}

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
// SMS Service - Text messaging
// ============================================================================

export interface Message {
  id: string;
  threadId: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  read: boolean;
}

export interface Thread {
  id: string;
  contactNumber: string;
  contactName?: string;
  lastMessage: Message;
  unreadCount: number;
}

export type MessageListener = (message: Message) => void;

export interface ISMSService {
  send(to: string, body: string): Promise<Message>;
  getThreads(): Thread[];
  getMessages(threadId: string): Message[];
  markThreadRead(threadId: string): void;
  deleteThread(threadId: string): boolean;
  deleteMessage(messageId: string): boolean;
  onMessageReceived(listener: MessageListener): () => void;
  setAutoReply(enabled: boolean): void;
}

export class MockSMSService implements ISMSService {
  private messages: Message[] = [];
  private nextId = 1;
  private listeners: MessageListener[] = [];
  private autoReply = true;

  // Simulated responses based on keywords
  private static readonly RESPONSES: Record<string, string[]> = {
    'hello': ['Hey there!', 'Hi! How are you?', 'Hello! 👋'],
    'hi': ['Hey!', 'Hi! What\'s up?', 'Hello!'],
    'how are you': ['I\'m doing great, thanks!', 'Pretty good! You?', 'Can\'t complain 😊'],
    'yes': ['Great!', 'Awesome!', 'Perfect 👍'],
    'no': ['OK, no problem', 'That\'s fine', 'Understood'],
    'thanks': ['You\'re welcome!', 'No problem!', 'Anytime!'],
    'bye': ['See you later!', 'Goodbye!', 'Take care!'],
    'ok': ['👍', 'Sounds good', 'Cool'],
    'default': ['Got it!', 'OK', 'I see', 'Interesting!', 'Tell me more', '👍', 'Sure thing'],
  };

  constructor() {
    const now = new Date();
    // Add some sample messages
    this.messages = [
      { id: 'msg-1', threadId: 'thread-555-0101', from: '555-0101', to: 'me', body: 'Hey, are you coming to the party?', timestamp: new Date(now.getTime() - 1800000), read: true },
      { id: 'msg-2', threadId: 'thread-555-0101', from: 'me', to: '555-0101', body: 'Yes! See you at 8', timestamp: new Date(now.getTime() - 1700000), read: true },
      { id: 'msg-3', threadId: 'thread-555-0102', from: '555-0102', to: 'me', body: 'Meeting moved to 3pm', timestamp: new Date(now.getTime() - 3600000), read: false },
    ];
    this.nextId = 4;
  }

  async send(to: string, body: string): Promise<Message> {
    const threadId = `thread-${to}`;
    const message: Message = {
      id: `msg-${this.nextId++}`,
      threadId,
      from: 'me',
      to,
      body,
      timestamp: new Date(),
      read: true,
    };
    this.messages.push(message);
    console.log(`[MockSMS] Sent to ${to}: ${body}`);

    // Simulate a response after a delay if auto-reply is enabled
    if (this.autoReply) {
      this.scheduleAutoReply(to, body);
    }

    return message;
  }

  private scheduleAutoReply(from: string, originalMessage: string): void {
    // Random delay between 1-4 seconds
    const delay = 1000 + Math.random() * 3000;

    setTimeout(() => {
      const response = this.generateResponse(originalMessage);
      this.receiveMessage(from, response);
    }, delay);
  }

  private generateResponse(originalMessage: string): string {
    const lower = originalMessage.toLowerCase();

    // Check for keyword matches
    for (const [keyword, responses] of Object.entries(MockSMSService.RESPONSES)) {
      if (keyword !== 'default' && lower.includes(keyword)) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    // Default response
    const defaults = MockSMSService.RESPONSES['default'];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  private receiveMessage(from: string, body: string): void {
    const threadId = `thread-${from}`;
    const message: Message = {
      id: `msg-${this.nextId++}`,
      threadId,
      from,
      to: 'me',
      body,
      timestamp: new Date(),
      read: false,
    };
    this.messages.push(message);
    console.log(`[MockSMS] Received from ${from}: ${body}`);

    // Notify listeners
    this.listeners.forEach(listener => listener(message));
  }

  onMessageReceived(listener: MessageListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  setAutoReply(enabled: boolean): void {
    this.autoReply = enabled;
  }

  getThreads(): Thread[] {
    const threadMap = new Map<string, Message[]>();

    for (const msg of this.messages) {
      const existing = threadMap.get(msg.threadId) || [];
      existing.push(msg);
      threadMap.set(msg.threadId, existing);
    }

    const threads: Thread[] = [];
    for (const [threadId, msgs] of threadMap) {
      const sorted = msgs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const lastMsg = sorted[0];
      const contactNumber = lastMsg.from === 'me' ? lastMsg.to : lastMsg.from;

      threads.push({
        id: threadId,
        contactNumber,
        lastMessage: lastMsg,
        unreadCount: msgs.filter(m => !m.read && m.from !== 'me').length,
      });
    }

    return threads.sort((a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime());
  }

  getMessages(threadId: string): Message[] {
    return this.messages
      .filter(m => m.threadId === threadId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  markThreadRead(threadId: string): void {
    this.messages
      .filter(m => m.threadId === threadId)
      .forEach(m => m.read = true);
  }

  deleteThread(threadId: string): boolean {
    const before = this.messages.length;
    this.messages = this.messages.filter(m => m.threadId !== threadId);
    return this.messages.length < before;
  }

  deleteMessage(messageId: string): boolean {
    const index = this.messages.findIndex(m => m.id === messageId);
    if (index >= 0) {
      this.messages.splice(index, 1);
      return true;
    }
    return false;
  }
}
