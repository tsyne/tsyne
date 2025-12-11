"use strict";
/**
 * Phone Services - Interfaces and Mock Implementations
 *
 * These services represent phone hardware and system capabilities.
 * Mock implementations allow apps to be developed and tested without
 * actual phone hardware.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSMSService = exports.DesktopAppLifecycle = exports.StandaloneAppLifecycle = exports.MockSettingsService = exports.MockNotificationService = exports.MockClockService = exports.MockTelephonyService = exports.MockContactsService = exports.MockStorageService = void 0;
class MockStorageService {
    constructor() {
        this.data = new Map();
    }
    get(key) {
        return this.data.get(key) ?? null;
    }
    set(key, value) {
        this.data.set(key, value);
    }
    remove(key) {
        this.data.delete(key);
    }
    getAll() {
        return new Map(this.data);
    }
    clear() {
        this.data.clear();
    }
}
exports.MockStorageService = MockStorageService;
class MockContactsService {
    constructor() {
        this.contacts = new Map();
        this.nextId = 1;
        // Add some sample contacts
        this.add({ name: 'Alice Smith', phone: '555-0101', email: 'alice@example.com', favorite: true });
        this.add({ name: 'Bob Jones', phone: '555-0102', email: 'bob@example.com' });
        this.add({ name: 'Carol White', phone: '555-0103' });
        this.add({ name: 'David Brown', phone: '555-0104', favorite: true });
        this.add({ name: 'Eve Davis', phone: '555-0105', email: 'eve@example.com' });
    }
    getAll() {
        return Array.from(this.contacts.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    getById(id) {
        return this.contacts.get(id) ?? null;
    }
    search(query) {
        const lower = query.toLowerCase();
        return this.getAll().filter(c => c.name.toLowerCase().includes(lower) ||
            c.phone.includes(query) ||
            (c.email && c.email.toLowerCase().includes(lower)));
    }
    add(contact) {
        const id = `contact-${this.nextId++}`;
        const newContact = { ...contact, id };
        this.contacts.set(id, newContact);
        return newContact;
    }
    update(id, updates) {
        const existing = this.contacts.get(id);
        if (!existing)
            return null;
        const updated = { ...existing, ...updates, id };
        this.contacts.set(id, updated);
        return updated;
    }
    remove(id) {
        return this.contacts.delete(id);
    }
    getFavorites() {
        return this.getAll().filter(c => c.favorite);
    }
}
exports.MockContactsService = MockContactsService;
class MockTelephonyService {
    constructor() {
        this.callLog = [];
        this.inCall = false;
        this.currentNumber = null;
        this.nextId = 1;
        // Add some sample call history
        const now = new Date();
        this.callLog = [
            { id: 'call-1', number: '555-0101', name: 'Alice Smith', type: 'incoming', timestamp: new Date(now.getTime() - 3600000), duration: 120 },
            { id: 'call-2', number: '555-0102', name: 'Bob Jones', type: 'outgoing', timestamp: new Date(now.getTime() - 7200000), duration: 45 },
            { id: 'call-3', number: '555-9999', type: 'missed', timestamp: new Date(now.getTime() - 86400000) },
        ];
        this.nextId = 4;
    }
    async dial(number) {
        if (this.inCall)
            return false;
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
    async hangup() {
        if (this.inCall) {
            console.log(`[MockTelephony] Call ended with ${this.currentNumber}`);
            this.inCall = false;
            this.currentNumber = null;
        }
    }
    getCallLog() {
        return [...this.callLog];
    }
    clearCallLog() {
        this.callLog = [];
    }
    isInCall() {
        return this.inCall;
    }
    getCurrentCallNumber() {
        return this.currentNumber;
    }
}
exports.MockTelephonyService = MockTelephonyService;
class MockClockService {
    constructor() {
        this.alarms = new Map();
        this.nextId = 1;
        this.mockedTime = null;
        // Add sample alarms
        this.addAlarm({ time: '07:00', label: 'Wake up', enabled: true, days: [1, 2, 3, 4, 5] });
        this.addAlarm({ time: '08:30', label: 'Meeting', enabled: false, days: [] });
    }
    /** Set a fixed time for testing. Pass null to use real time. */
    setTime(time) {
        this.mockedTime = time;
    }
    getCurrentTime() {
        return this.mockedTime ?? new Date();
    }
    getTimezone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    getAlarms() {
        return Array.from(this.alarms.values()).sort((a, b) => a.time.localeCompare(b.time));
    }
    addAlarm(alarm) {
        const id = `alarm-${this.nextId++}`;
        const newAlarm = { ...alarm, id };
        this.alarms.set(id, newAlarm);
        return newAlarm;
    }
    updateAlarm(id, updates) {
        const existing = this.alarms.get(id);
        if (!existing)
            return null;
        const updated = { ...existing, ...updates, id };
        this.alarms.set(id, updated);
        return updated;
    }
    removeAlarm(id) {
        return this.alarms.delete(id);
    }
    toggleAlarm(id) {
        const alarm = this.alarms.get(id);
        if (!alarm)
            return null;
        alarm.enabled = !alarm.enabled;
        return alarm;
    }
}
exports.MockClockService = MockClockService;
class MockNotificationService {
    constructor() {
        this.notifications = [];
        this.nextId = 1;
    }
    send(title, body) {
        const notification = {
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
    getAll() {
        return [...this.notifications];
    }
    getUnread() {
        return this.notifications.filter(n => !n.read);
    }
    markRead(id) {
        const notif = this.notifications.find(n => n.id === id);
        if (notif)
            notif.read = true;
    }
    markAllRead() {
        this.notifications.forEach(n => n.read = true);
    }
    clear() {
        this.notifications = [];
    }
}
exports.MockNotificationService = MockNotificationService;
class MockSettingsService {
    constructor() {
        this.settings = new Map([
            ['theme', 'system'],
            ['brightness', 80],
            ['volume', 70],
            ['wifi', true],
            ['bluetooth', false],
        ]);
    }
    get(key, defaultValue) {
        return this.settings.has(key) ? this.settings.get(key) : defaultValue;
    }
    set(key, value) {
        this.settings.set(key, value);
    }
    getTheme() {
        return this.get('theme', 'system');
    }
    setTheme(theme) {
        this.set('theme', theme);
    }
    getBrightness() {
        return this.get('brightness', 80);
    }
    setBrightness(level) {
        this.set('brightness', Math.max(0, Math.min(100, level)));
    }
    getVolume() {
        return this.get('volume', 70);
    }
    setVolume(level) {
        this.set('volume', Math.max(0, Math.min(100, level)));
    }
    isWifiEnabled() {
        return this.get('wifi', true);
    }
    setWifiEnabled(enabled) {
        this.set('wifi', enabled);
    }
    isBluetoothEnabled() {
        return this.get('bluetooth', false);
    }
    setBluetoothEnabled(enabled) {
        this.set('bluetooth', enabled);
    }
}
exports.MockSettingsService = MockSettingsService;
/**
 * Standalone lifecycle - calls app.quit() to exit the entire process
 */
class StandaloneAppLifecycle {
    constructor(quitFn) {
        this.quitFn = quitFn;
    }
    requestClose() {
        this.quitFn();
    }
}
exports.StandaloneAppLifecycle = StandaloneAppLifecycle;
/**
 * Desktop lifecycle - closes the inner window via callback
 * The callback is provided by desktop.ts to close the specific inner window
 */
class DesktopAppLifecycle {
    constructor(closeCallback) {
        this.closeCallback = closeCallback;
    }
    requestClose() {
        if (this.closeCallback) {
            this.closeCallback();
        }
    }
}
exports.DesktopAppLifecycle = DesktopAppLifecycle;
class MockSMSService {
    constructor() {
        this.messages = [];
        this.nextId = 1;
        this.listeners = [];
        this.autoReply = true;
        const now = new Date();
        // Add some sample messages
        this.messages = [
            { id: 'msg-1', threadId: 'thread-555-0101', from: '555-0101', to: 'me', body: 'Hey, are you coming to the party?', timestamp: new Date(now.getTime() - 1800000), read: true },
            { id: 'msg-2', threadId: 'thread-555-0101', from: 'me', to: '555-0101', body: 'Yes! See you at 8', timestamp: new Date(now.getTime() - 1700000), read: true },
            { id: 'msg-3', threadId: 'thread-555-0102', from: '555-0102', to: 'me', body: 'Meeting moved to 3pm', timestamp: new Date(now.getTime() - 3600000), read: false },
        ];
        this.nextId = 4;
    }
    async send(to, body) {
        const threadId = `thread-${to}`;
        const message = {
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
    scheduleAutoReply(from, originalMessage) {
        // Random delay between 1-4 seconds
        const delay = 1000 + Math.random() * 3000;
        setTimeout(() => {
            const response = this.generateResponse(originalMessage);
            this.receiveMessage(from, response);
        }, delay);
    }
    generateResponse(originalMessage) {
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
    receiveMessage(from, body) {
        const threadId = `thread-${from}`;
        const message = {
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
    onMessageReceived(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index >= 0)
                this.listeners.splice(index, 1);
        };
    }
    setAutoReply(enabled) {
        this.autoReply = enabled;
    }
    getThreads() {
        const threadMap = new Map();
        for (const msg of this.messages) {
            const existing = threadMap.get(msg.threadId) || [];
            existing.push(msg);
            threadMap.set(msg.threadId, existing);
        }
        const threads = [];
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
    getMessages(threadId) {
        return this.messages
            .filter(m => m.threadId === threadId)
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    markThreadRead(threadId) {
        this.messages
            .filter(m => m.threadId === threadId)
            .forEach(m => m.read = true);
    }
    deleteThread(threadId) {
        const before = this.messages.length;
        this.messages = this.messages.filter(m => m.threadId !== threadId);
        return this.messages.length < before;
    }
    deleteMessage(messageId) {
        const index = this.messages.findIndex(m => m.id === messageId);
        if (index >= 0) {
            this.messages.splice(index, 1);
            return true;
        }
        return false;
    }
}
exports.MockSMSService = MockSMSService;
// Simulated responses based on keywords
MockSMSService.RESPONSES = {
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
//# sourceMappingURL=services.js.map