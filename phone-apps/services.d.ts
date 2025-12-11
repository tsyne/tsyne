/**
 * Phone Services - Interfaces and Mock Implementations
 *
 * These services represent phone hardware and system capabilities.
 * Mock implementations allow apps to be developed and tested without
 * actual phone hardware.
 */
export interface IStorageService {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
    getAll(): Map<string, string>;
    clear(): void;
}
export declare class MockStorageService implements IStorageService {
    private data;
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
    getAll(): Map<string, string>;
    clear(): void;
}
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
export declare class MockContactsService implements IContactsService {
    private contacts;
    private nextId;
    constructor();
    getAll(): Contact[];
    getById(id: string): Contact | null;
    search(query: string): Contact[];
    add(contact: Omit<Contact, 'id'>): Contact;
    update(id: string, updates: Partial<Contact>): Contact | null;
    remove(id: string): boolean;
    getFavorites(): Contact[];
}
export interface CallLogEntry {
    id: string;
    number: string;
    name?: string;
    type: 'incoming' | 'outgoing' | 'missed';
    timestamp: Date;
    duration?: number;
}
export interface ITelephonyService {
    dial(number: string): Promise<boolean>;
    hangup(): Promise<void>;
    getCallLog(): CallLogEntry[];
    clearCallLog(): void;
    isInCall(): boolean;
    getCurrentCallNumber(): string | null;
}
export declare class MockTelephonyService implements ITelephonyService {
    private callLog;
    private inCall;
    private currentNumber;
    private nextId;
    constructor();
    dial(number: string): Promise<boolean>;
    hangup(): Promise<void>;
    getCallLog(): CallLogEntry[];
    clearCallLog(): void;
    isInCall(): boolean;
    getCurrentCallNumber(): string | null;
}
export interface Alarm {
    id: string;
    time: string;
    label: string;
    enabled: boolean;
    days: number[];
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
export declare class MockClockService implements IClockService {
    private alarms;
    private nextId;
    private mockedTime;
    constructor();
    /** Set a fixed time for testing. Pass null to use real time. */
    setTime(time: Date | null): void;
    getCurrentTime(): Date;
    getTimezone(): string;
    getAlarms(): Alarm[];
    addAlarm(alarm: Omit<Alarm, 'id'>): Alarm;
    updateAlarm(id: string, updates: Partial<Alarm>): Alarm | null;
    removeAlarm(id: string): boolean;
    toggleAlarm(id: string): Alarm | null;
}
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
export declare class MockNotificationService implements INotificationService {
    private notifications;
    private nextId;
    send(title: string, body: string): Notification;
    getAll(): Notification[];
    getUnread(): Notification[];
    markRead(id: string): void;
    markAllRead(): void;
    clear(): void;
}
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
export declare class MockSettingsService implements ISettingsService {
    private settings;
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
/**
 * App lifecycle service - handles app close behavior differently
 * depending on whether the app is running standalone or within the desktop.
 */
export interface IAppLifecycle {
    /**
     * Request the app to close. In standalone mode this quits the process.
     * In desktop mode this just closes the inner window (handled by MDI).
     */
    requestClose(): void;
}
/**
 * Standalone lifecycle - calls app.quit() to exit the entire process
 */
export declare class StandaloneAppLifecycle implements IAppLifecycle {
    private quitFn;
    constructor(quitFn: () => void);
    requestClose(): void;
}
/**
 * Desktop lifecycle - closes the inner window via callback
 * The callback is provided by desktop.ts to close the specific inner window
 */
export declare class DesktopAppLifecycle implements IAppLifecycle {
    private closeCallback?;
    constructor(closeCallback?: (() => void) | undefined);
    requestClose(): void;
}
export declare class MockSMSService implements ISMSService {
    private messages;
    private nextId;
    private listeners;
    private autoReply;
    private static readonly RESPONSES;
    constructor();
    send(to: string, body: string): Promise<Message>;
    private scheduleAutoReply;
    private generateResponse;
    private receiveMessage;
    onMessageReceived(listener: MessageListener): () => void;
    setAutoReply(enabled: boolean): void;
    getThreads(): Thread[];
    getMessages(threadId: string): Message[];
    markThreadRead(threadId: string): void;
    deleteThread(threadId: string): boolean;
    deleteMessage(messageId: string): boolean;
}
