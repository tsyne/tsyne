/**
 * Phone Services
 *
 * Re-exports core service interfaces and implementations,
 * plus phone-specific mock implementations with sample data.
 */

// Re-export everything from core services
export * from 'tsyne';

// Import types needed for phone-specific mocks
import {
  IContactsService,
  ITelephonyService,
  ISMSService,
  Contact,
  CallLogEntry,
  Message,
  Thread,
  MessageListener,
  ServiceResult,
} from 'tsyne';

// ============================================================================
// Mock Contacts Service (Phone-specific with sample data)
// ============================================================================

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

  isAvailable(): boolean {
    return true;
  }

  getUnavailableReason(): string {
    return '';
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
// Mock Telephony Service (Phone-specific with sample data)
// ============================================================================

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

  isAvailable(): boolean {
    return true;
  }

  getUnavailableReason(): string {
    return '';
  }

  async dial(number: string): Promise<ServiceResult<boolean>> {
    if (this.inCall) {
      return { available: true, value: false };
    }
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

    return { available: true, value: true };
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
// Mock SMS Service (Phone-specific with sample data)
// ============================================================================

export class MockSMSService implements ISMSService {
  private messages: Message[] = [];
  private nextId = 1;
  private listeners: MessageListener[] = [];
  private autoReply = true;

  // Simulated responses based on keywords
  private static readonly RESPONSES: Record<string, string[]> = {
    'hello': ['Hey there!', 'Hi! How are you?', 'Hello! '],
    'hi': ['Hey!', 'Hi! What\'s up?', 'Hello!'],
    'how are you': ['I\'m doing great, thanks!', 'Pretty good! You?', 'Can\'t complain '],
    'yes': ['Great!', 'Awesome!', 'Perfect '],
    'no': ['OK, no problem', 'That\'s fine', 'Understood'],
    'thanks': ['You\'re welcome!', 'No problem!', 'Anytime!'],
    'bye': ['See you later!', 'Goodbye!', 'Take care!'],
    'ok': ['', 'Sounds good', 'Cool'],
    'default': ['Got it!', 'OK', 'I see', 'Interesting!', 'Tell me more', '', 'Sure thing'],
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

  isAvailable(): boolean {
    return true;
  }

  getUnavailableReason(): string {
    return '';
  }

  async send(to: string, body: string): Promise<ServiceResult<Message>> {
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

    return { available: true, value: message };
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
