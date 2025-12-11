/**
 * Logging Services - Wrappers that log human-readable messages
 *
 * These wrap the mock services and emit human-readable descriptions
 * of what phone hardware/OS interactions would occur.
 */
import { IStorageService, IContactsService, ITelephonyService, IClockService, INotificationService, ISettingsService, ISMSService, Contact, CallLogEntry, Alarm, Notification, Message, Thread } from './services';
/**
 * Event listener for modem log messages
 */
export type ModemLogListener = (message: ModemLogEntry) => void;
export interface ModemLogEntry {
    timestamp: Date;
    subsystem: 'TELEPHONY' | 'SMS' | 'STORAGE' | 'CONTACTS' | 'CLOCK' | 'NOTIFICATIONS' | 'SETTINGS' | 'SYSTEM';
    direction: 'TX' | 'RX' | 'INFO';
    message: string;
}
/**
 * Central modem log that all logging services write to
 */
declare class ModemLog {
    private listeners;
    private history;
    private maxHistory;
    log(subsystem: ModemLogEntry['subsystem'], direction: ModemLogEntry['direction'], message: string): void;
    subscribe(listener: ModemLogListener): () => void;
    getHistory(): ModemLogEntry[];
    clear(): void;
}
export declare const modemLog: ModemLog;
/**
 * Logging Telephony Service
 */
export declare class LoggingTelephonyService implements ITelephonyService {
    private delegate;
    dial(number: string): Promise<boolean>;
    hangup(): Promise<void>;
    getCallLog(): CallLogEntry[];
    clearCallLog(): void;
    isInCall(): boolean;
    getCurrentCallNumber(): string | null;
}
/**
 * Logging SMS Service
 */
export declare class LoggingSMSService implements ISMSService {
    private delegate;
    constructor();
    send(to: string, body: string): Promise<Message>;
    getThreads(): Thread[];
    getMessages(threadId: string): Message[];
    markThreadRead(threadId: string): void;
    deleteThread(threadId: string): boolean;
    deleteMessage(messageId: string): boolean;
    onMessageReceived(listener: (message: Message) => void): () => void;
    setAutoReply(enabled: boolean): void;
}
/**
 * Logging Contacts Service
 */
export declare class LoggingContactsService implements IContactsService {
    private delegate;
    getAll(): Contact[];
    getById(id: string): Contact | null;
    search(query: string): Contact[];
    add(contact: Omit<Contact, 'id'>): Contact;
    update(id: string, contact: Partial<Contact>): Contact | null;
    remove(id: string): boolean;
    getFavorites(): Contact[];
}
/**
 * Logging Clock Service
 */
export declare class LoggingClockService implements IClockService {
    private delegate;
    getCurrentTime(): Date;
    getTimezone(): string;
    getAlarms(): Alarm[];
    addAlarm(alarm: Omit<Alarm, 'id'>): Alarm;
    updateAlarm(id: string, alarm: Partial<Alarm>): Alarm | null;
    removeAlarm(id: string): boolean;
    toggleAlarm(id: string): Alarm | null;
}
/**
 * Logging Notification Service
 */
export declare class LoggingNotificationService implements INotificationService {
    private delegate;
    send(title: string, body: string): Notification;
    getAll(): Notification[];
    getUnread(): Notification[];
    markRead(id: string): void;
    markAllRead(): void;
    clear(): void;
}
/**
 * Logging Settings Service
 */
export declare class LoggingSettingsService implements ISettingsService {
    private delegate;
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
/**
 * Logging Storage Service
 */
export declare class LoggingStorageService implements IStorageService {
    private delegate;
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
    getAll(): Map<string, string>;
    clear(): void;
}
/**
 * Factory to create all logging services
 */
export declare function createLoggingServices(): {
    telephony: LoggingTelephonyService;
    sms: LoggingSMSService;
    contacts: LoggingContactsService;
    clock: LoggingClockService;
    notifications: LoggingNotificationService;
    settings: LoggingSettingsService;
    storage: LoggingStorageService;
};
export {};
