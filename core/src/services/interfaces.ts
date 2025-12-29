/**
 * Tsyne OS Service Interfaces
 *
 * These interfaces define the contracts for system services that apps can depend on.
 * Implementations are injected via IoC - apps receive the appropriate implementation
 * based on their runtime environment (standalone, desktop, phone, etc.)
 */

// ============================================================================
// Service Availability
// ============================================================================

/**
 * Result of calling a service method that may not be available
 */
export type ServiceResult<T> =
  | { available: true; value: T }
  | { available: false; reason: string };

/**
 * Check if a service is available on this platform
 */
export interface IServiceAvailability {
  /** Returns true if this service is available on the current platform */
  isAvailable(): boolean;
  /** Returns a human-readable reason why the service is not available */
  getUnavailableReason(): string;
}

// ============================================================================
// Storage Service - Key-value persistence (General)
// ============================================================================

export interface IStorageService {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  getAll(): Map<string, string>;
  clear(): void;
}

// ============================================================================
// Clock Service - Time and alarms (General)
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

// ============================================================================
// Notification Service - Local notifications (General)
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

// ============================================================================
// Settings Service - System preferences (General)
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

// ============================================================================
// App Lifecycle Service (General)
// ============================================================================

/**
 * App lifecycle service - handles app close behavior differently
 * depending on whether the app is running standalone or within the desktop.
 */
export interface IAppLifecycle {
  /**
   * Request the app to close. In standalone mode this quits the process.
   * In desktop mode this just closes the inner window.
   */
  requestClose(): void;
}

// ============================================================================
// Contacts Service - Contact management (Phone-specific)
// ============================================================================

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  favorite?: boolean;
}

export interface IContactsService extends IServiceAvailability {
  getAll(): Contact[];
  getById(id: string): Contact | null;
  search(query: string): Contact[];
  add(contact: Omit<Contact, 'id'>): Contact;
  update(id: string, contact: Partial<Contact>): Contact | null;
  remove(id: string): boolean;
  getFavorites(): Contact[];
}

// ============================================================================
// Telephony Service - Phone calls (Phone-specific)
// ============================================================================

export interface CallLogEntry {
  id: string;
  number: string;
  name?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: Date;
  duration?: number; // seconds
}

export interface ITelephonyService extends IServiceAvailability {
  dial(number: string): Promise<ServiceResult<boolean>>;
  hangup(): Promise<void>;
  getCallLog(): CallLogEntry[];
  clearCallLog(): void;
  isInCall(): boolean;
  getCurrentCallNumber(): string | null;
}

// ============================================================================
// SMS Service - Text messaging (Phone-specific)
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

export interface ISMSService extends IServiceAvailability {
  send(to: string, body: string): Promise<ServiceResult<Message>>;
  getThreads(): Thread[];
  getMessages(threadId: string): Message[];
  markThreadRead(threadId: string): void;
  deleteThread(threadId: string): boolean;
  deleteMessage(messageId: string): boolean;
  onMessageReceived(listener: MessageListener): () => void;
  setAutoReply(enabled: boolean): void;
}
