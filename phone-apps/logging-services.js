"use strict";
/**
 * Logging Services - Wrappers that log human-readable messages
 *
 * These wrap the mock services and emit human-readable descriptions
 * of what phone hardware/OS interactions would occur.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingStorageService = exports.LoggingSettingsService = exports.LoggingNotificationService = exports.LoggingClockService = exports.LoggingContactsService = exports.LoggingSMSService = exports.LoggingTelephonyService = exports.modemLog = void 0;
exports.createLoggingServices = createLoggingServices;
const services_1 = require("./services");
/**
 * Central modem log that all logging services write to
 */
class ModemLog {
    constructor() {
        this.listeners = [];
        this.history = [];
        this.maxHistory = 100;
    }
    log(subsystem, direction, message) {
        const entry = {
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
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index >= 0)
                this.listeners.splice(index, 1);
        };
    }
    getHistory() {
        return [...this.history];
    }
    clear() {
        this.history = [];
    }
}
// Singleton modem log instance
exports.modemLog = new ModemLog();
/**
 * Logging Telephony Service
 */
class LoggingTelephonyService {
    constructor() {
        this.delegate = new services_1.MockTelephonyService();
    }
    async dial(number) {
        exports.modemLog.log('TELEPHONY', 'TX', `AT+DIAL ${number}`);
        exports.modemLog.log('TELEPHONY', 'INFO', `Initiating voice call to ${number}...`);
        const result = await this.delegate.dial(number);
        if (result) {
            exports.modemLog.log('TELEPHONY', 'RX', 'CONNECT - Call established');
            exports.modemLog.log('TELEPHONY', 'INFO', `Ringing ${number}...`);
        }
        else {
            exports.modemLog.log('TELEPHONY', 'RX', 'BUSY - Call failed');
        }
        return result;
    }
    async hangup() {
        exports.modemLog.log('TELEPHONY', 'TX', 'ATH - Hang up');
        await this.delegate.hangup();
        exports.modemLog.log('TELEPHONY', 'RX', 'OK - Call ended');
        exports.modemLog.log('TELEPHONY', 'INFO', 'Voice call terminated');
    }
    getCallLog() {
        exports.modemLog.log('TELEPHONY', 'INFO', 'Reading call log from SIM...');
        return this.delegate.getCallLog();
    }
    clearCallLog() {
        exports.modemLog.log('TELEPHONY', 'TX', 'AT+CPBW=0 - Clear call log');
        this.delegate.clearCallLog();
        exports.modemLog.log('TELEPHONY', 'RX', 'OK');
    }
    isInCall() {
        return this.delegate.isInCall();
    }
    getCurrentCallNumber() {
        return this.delegate.getCurrentCallNumber();
    }
}
exports.LoggingTelephonyService = LoggingTelephonyService;
/**
 * Logging SMS Service
 */
class LoggingSMSService {
    constructor() {
        this.delegate = new services_1.MockSMSService();
        // Subscribe to incoming messages to log them
        this.delegate.onMessageReceived((message) => {
            exports.modemLog.log('SMS', 'RX', `+CMT: "${message.from}"`);
            exports.modemLog.log('SMS', 'RX', `> ${message.body.substring(0, 50)}${message.body.length > 50 ? '...' : ''}`);
            exports.modemLog.log('SMS', 'INFO', `SMS received from ${message.from} (${message.body.length} chars)`);
        });
    }
    async send(to, body) {
        exports.modemLog.log('SMS', 'TX', `AT+CMGS="${to}"`);
        exports.modemLog.log('SMS', 'TX', `> ${body.substring(0, 50)}${body.length > 50 ? '...' : ''}`);
        const result = await this.delegate.send(to, body);
        exports.modemLog.log('SMS', 'RX', '+CMGS: Message sent');
        exports.modemLog.log('SMS', 'INFO', `SMS delivered to ${to} (${body.length} chars)`);
        return result;
    }
    getThreads() {
        exports.modemLog.log('SMS', 'INFO', 'Reading SMS threads from storage...');
        return this.delegate.getThreads();
    }
    getMessages(threadId) {
        exports.modemLog.log('SMS', 'INFO', `Reading messages for thread ${threadId}...`);
        return this.delegate.getMessages(threadId);
    }
    markThreadRead(threadId) {
        exports.modemLog.log('SMS', 'INFO', `Marking thread ${threadId} as read`);
        this.delegate.markThreadRead(threadId);
    }
    deleteThread(threadId) {
        exports.modemLog.log('SMS', 'TX', `AT+CMGD=${threadId} - Delete thread`);
        const result = this.delegate.deleteThread(threadId);
        exports.modemLog.log('SMS', 'RX', result ? 'OK' : 'ERROR');
        return result;
    }
    deleteMessage(messageId) {
        exports.modemLog.log('SMS', 'TX', `AT+CMGD=${messageId} - Delete message`);
        const result = this.delegate.deleteMessage(messageId);
        exports.modemLog.log('SMS', 'RX', result ? 'OK' : 'ERROR');
        return result;
    }
    onMessageReceived(listener) {
        return this.delegate.onMessageReceived(listener);
    }
    setAutoReply(enabled) {
        exports.modemLog.log('SMS', 'INFO', `Auto-reply simulation ${enabled ? 'enabled' : 'disabled'}`);
        this.delegate.setAutoReply(enabled);
    }
}
exports.LoggingSMSService = LoggingSMSService;
/**
 * Logging Contacts Service
 */
class LoggingContactsService {
    constructor() {
        this.delegate = new services_1.MockContactsService();
    }
    getAll() {
        exports.modemLog.log('CONTACTS', 'INFO', 'Reading contacts from SIM + device storage...');
        const contacts = this.delegate.getAll();
        exports.modemLog.log('CONTACTS', 'INFO', `Found ${contacts.length} contacts`);
        return contacts;
    }
    getById(id) {
        return this.delegate.getById(id);
    }
    search(query) {
        exports.modemLog.log('CONTACTS', 'INFO', `Searching contacts for "${query}"...`);
        return this.delegate.search(query);
    }
    add(contact) {
        exports.modemLog.log('CONTACTS', 'TX', `AT+CPBW - Write phonebook entry`);
        exports.modemLog.log('CONTACTS', 'INFO', `Adding contact: ${contact.name} (${contact.phone})`);
        const result = this.delegate.add(contact);
        exports.modemLog.log('CONTACTS', 'RX', 'OK - Contact saved');
        return result;
    }
    update(id, contact) {
        exports.modemLog.log('CONTACTS', 'INFO', `Updating contact ${id}...`);
        const result = this.delegate.update(id, contact);
        if (result) {
            exports.modemLog.log('CONTACTS', 'RX', 'OK - Contact updated');
        }
        return result;
    }
    remove(id) {
        exports.modemLog.log('CONTACTS', 'TX', `AT+CPBW=${id},"" - Delete phonebook entry`);
        const result = this.delegate.remove(id);
        exports.modemLog.log('CONTACTS', 'RX', result ? 'OK' : 'ERROR');
        return result;
    }
    getFavorites() {
        return this.delegate.getFavorites();
    }
}
exports.LoggingContactsService = LoggingContactsService;
/**
 * Logging Clock Service
 */
class LoggingClockService {
    constructor() {
        this.delegate = new services_1.MockClockService();
    }
    getCurrentTime() {
        return this.delegate.getCurrentTime();
    }
    getTimezone() {
        return this.delegate.getTimezone();
    }
    getAlarms() {
        exports.modemLog.log('CLOCK', 'INFO', 'Reading alarms from RTC...');
        return this.delegate.getAlarms();
    }
    addAlarm(alarm) {
        exports.modemLog.log('CLOCK', 'TX', `RTC: Set alarm for ${alarm.time}`);
        exports.modemLog.log('CLOCK', 'INFO', `Programming alarm: "${alarm.label}" at ${alarm.time}`);
        const result = this.delegate.addAlarm(alarm);
        exports.modemLog.log('CLOCK', 'RX', 'OK - Alarm set in RTC');
        return result;
    }
    updateAlarm(id, alarm) {
        exports.modemLog.log('CLOCK', 'INFO', `Updating alarm ${id}...`);
        return this.delegate.updateAlarm(id, alarm);
    }
    removeAlarm(id) {
        exports.modemLog.log('CLOCK', 'TX', `RTC: Clear alarm ${id}`);
        const result = this.delegate.removeAlarm(id);
        exports.modemLog.log('CLOCK', 'RX', result ? 'OK' : 'ERROR');
        return result;
    }
    toggleAlarm(id) {
        const alarm = this.delegate.toggleAlarm(id);
        if (alarm) {
            exports.modemLog.log('CLOCK', 'INFO', `Alarm ${id} ${alarm.enabled ? 'enabled' : 'disabled'}`);
        }
        return alarm;
    }
}
exports.LoggingClockService = LoggingClockService;
/**
 * Logging Notification Service
 */
class LoggingNotificationService {
    constructor() {
        this.delegate = new services_1.MockNotificationService();
    }
    send(title, body) {
        exports.modemLog.log('NOTIFICATIONS', 'TX', 'VIBRATE: 200ms pattern');
        exports.modemLog.log('NOTIFICATIONS', 'TX', 'LED: Blink blue 3x');
        exports.modemLog.log('NOTIFICATIONS', 'INFO', `Notification: "${title}" - ${body}`);
        return this.delegate.send(title, body);
    }
    getAll() {
        return this.delegate.getAll();
    }
    getUnread() {
        return this.delegate.getUnread();
    }
    markRead(id) {
        this.delegate.markRead(id);
    }
    markAllRead() {
        this.delegate.markAllRead();
    }
    clear() {
        exports.modemLog.log('NOTIFICATIONS', 'INFO', 'Clearing notification tray');
        this.delegate.clear();
    }
}
exports.LoggingNotificationService = LoggingNotificationService;
/**
 * Logging Settings Service
 */
class LoggingSettingsService {
    constructor() {
        this.delegate = new services_1.MockSettingsService();
    }
    get(key, defaultValue) {
        return this.delegate.get(key, defaultValue);
    }
    set(key, value) {
        exports.modemLog.log('SETTINGS', 'INFO', `Setting ${key} = ${JSON.stringify(value)}`);
        this.delegate.set(key, value);
    }
    getTheme() {
        return this.delegate.getTheme();
    }
    setTheme(theme) {
        exports.modemLog.log('SETTINGS', 'TX', `DISPLAY: Set theme ${theme}`);
        this.delegate.setTheme(theme);
    }
    getBrightness() {
        return this.delegate.getBrightness();
    }
    setBrightness(level) {
        exports.modemLog.log('SETTINGS', 'TX', `BACKLIGHT: Set brightness ${level}%`);
        exports.modemLog.log('SETTINGS', 'INFO', `Display brightness → ${level}%`);
        this.delegate.setBrightness(level);
    }
    getVolume() {
        return this.delegate.getVolume();
    }
    setVolume(level) {
        exports.modemLog.log('SETTINGS', 'TX', `AUDIO: Set volume ${level}%`);
        exports.modemLog.log('SETTINGS', 'INFO', `System volume → ${level}%`);
        this.delegate.setVolume(level);
    }
    isWifiEnabled() {
        return this.delegate.isWifiEnabled();
    }
    setWifiEnabled(enabled) {
        exports.modemLog.log('SETTINGS', 'TX', `WIFI: ${enabled ? 'ENABLE' : 'DISABLE'}`);
        exports.modemLog.log('SETTINGS', 'INFO', `WiFi radio ${enabled ? 'powered on, scanning...' : 'powered off'}`);
        this.delegate.setWifiEnabled(enabled);
        if (enabled) {
            exports.modemLog.log('SETTINGS', 'RX', 'WIFI: Found 3 networks');
        }
    }
    isBluetoothEnabled() {
        return this.delegate.isBluetoothEnabled();
    }
    setBluetoothEnabled(enabled) {
        exports.modemLog.log('SETTINGS', 'TX', `BLUETOOTH: ${enabled ? 'ENABLE' : 'DISABLE'}`);
        exports.modemLog.log('SETTINGS', 'INFO', `Bluetooth radio ${enabled ? 'powered on, discoverable' : 'powered off'}`);
        this.delegate.setBluetoothEnabled(enabled);
    }
}
exports.LoggingSettingsService = LoggingSettingsService;
/**
 * Logging Storage Service
 */
class LoggingStorageService {
    constructor() {
        this.delegate = new services_1.MockStorageService();
    }
    get(key) {
        exports.modemLog.log('STORAGE', 'INFO', `Read: ${key}`);
        return this.delegate.get(key);
    }
    set(key, value) {
        exports.modemLog.log('STORAGE', 'TX', `FLASH: Write ${key} (${value.length} bytes)`);
        this.delegate.set(key, value);
        exports.modemLog.log('STORAGE', 'RX', 'OK');
    }
    remove(key) {
        exports.modemLog.log('STORAGE', 'TX', `FLASH: Delete ${key}`);
        this.delegate.remove(key);
    }
    getAll() {
        return this.delegate.getAll();
    }
    clear() {
        exports.modemLog.log('STORAGE', 'TX', 'FLASH: Erase user partition');
        this.delegate.clear();
        exports.modemLog.log('STORAGE', 'RX', 'OK - Storage cleared');
    }
}
exports.LoggingStorageService = LoggingStorageService;
/**
 * Factory to create all logging services
 */
function createLoggingServices() {
    exports.modemLog.log('SYSTEM', 'INFO', 'Phone booting...');
    exports.modemLog.log('SYSTEM', 'INFO', 'Initializing hardware subsystems...');
    exports.modemLog.log('SYSTEM', 'RX', 'SIM: Card detected - Carrier: Mock Mobile');
    exports.modemLog.log('SYSTEM', 'RX', 'BASEBAND: Signal strength 4/5 bars');
    exports.modemLog.log('SYSTEM', 'INFO', 'Phone ready');
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
//# sourceMappingURL=logging-services.js.map