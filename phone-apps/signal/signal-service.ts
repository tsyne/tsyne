/*
 * Copyright (c) 2025 Portions copyright Nico Hickman and portions copyright Paul Hammant 2025
 * All rights reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Signal Service - Mock messaging and contact management
 * Based on Signal-rs (https://git.sr.ht/~nicohman/signal-rs)
 */

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  isFavorite?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  isEncrypted: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  lastMessage?: Message;
  lastMessageTime?: Date;
  unreadCount: number;
  isEncrypted: boolean;
}

type ChangeListener = () => void;

export interface ISignalService {
  // Contact methods
  getContacts(): Contact[];
  getContact(id: string): Contact | null;
  addContact(contact: Omit<Contact, 'id'>): Contact;
  updateContact(id: string, updates: Partial<Contact>): boolean;
  deleteContact(id: string): boolean;
  searchContacts(query: string): Contact[];

  // Conversation methods
  getConversations(): Conversation[];
  getConversation(id: string): Conversation | null;
  createConversation(participantId: string): Conversation;
  deleteConversation(id: string): boolean;

  // Message methods
  getMessages(conversationId: string): Message[];
  sendMessage(conversationId: string, content: string): Message;
  markAsRead(messageId: string): boolean;
  deleteMessage(messageId: string): boolean;

  // Event subscriptions
  onConversationUpdated(listener: ChangeListener): () => void;
  onMessageReceived(listener: (message: Message) => void): () => void;
  onContactUpdated(listener: ChangeListener): () => void;
}

export class MockSignalService implements ISignalService {
  private contacts: Contact[] = [];
  private conversations: Conversation[] = [];
  private messages: Message[] = [];
  private nextContactId = 1;
  private nextConversationId = 1;
  private nextMessageId = 1;

  private conversationListeners: ChangeListener[] = [];
  private messageListeners: ((message: Message) => void)[] = [];
  private contactListeners: ChangeListener[] = [];

  constructor() {
    this.initializeWithSampleData();
  }

  private initializeWithSampleData() {
    // Add sample contacts
    this.contacts = [
      { id: 'c1', name: 'Alice Smith', phoneNumber: '+1 (555) 100-0001', isFavorite: true },
      { id: 'c2', name: 'Bob Johnson', phoneNumber: '+1 (555) 100-0002', isFavorite: true },
      { id: 'c3', name: 'Carol Davis', phoneNumber: '+1 (555) 100-0003', isFavorite: false },
      { id: 'c4', name: 'David Wilson', phoneNumber: '+1 (555) 100-0004', isFavorite: false },
      { id: 'c5', name: 'Eve Martinez', phoneNumber: '+1 (555) 100-0005', isFavorite: false },
    ];
    this.nextContactId = 6;

    // Add sample conversations
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);

    this.conversations = [
      {
        id: 'conv1',
        participantId: 'c1',
        participantName: 'Alice Smith',
        unreadCount: 2,
        isEncrypted: true,
        lastMessageTime: now,
      },
      {
        id: 'conv2',
        participantId: 'c2',
        participantName: 'Bob Johnson',
        unreadCount: 0,
        isEncrypted: true,
        lastMessageTime: thirtyMinutesAgo,
      },
      {
        id: 'conv3',
        participantId: 'c3',
        participantName: 'Carol Davis',
        unreadCount: 1,
        isEncrypted: true,
        lastMessageTime: fiveMinutesAgo,
      },
    ];
    this.nextConversationId = 4;

    // Add sample messages
    this.messages = [
      {
        id: 'm1',
        conversationId: 'conv1',
        senderId: 'c1',
        senderName: 'Alice Smith',
        content: 'Hey! How are you?',
        timestamp: new Date(now.getTime() - 2 * 60000),
        isRead: false,
        isEncrypted: true,
      },
      {
        id: 'm2',
        conversationId: 'conv1',
        senderId: 'me',
        senderName: 'You',
        content: 'Hi Alice! I\'m doing great, thanks for asking!',
        timestamp: new Date(now.getTime() - 1 * 60000),
        isRead: true,
        isEncrypted: true,
      },
      {
        id: 'm3',
        conversationId: 'conv1',
        senderId: 'c1',
        senderName: 'Alice Smith',
        content: 'That\'s awesome! Want to grab coffee later?',
        timestamp: now,
        isRead: false,
        isEncrypted: true,
      },
      {
        id: 'm4',
        conversationId: 'conv2',
        senderId: 'c2',
        senderName: 'Bob Johnson',
        content: 'Did you see the game last night?',
        timestamp: thirtyMinutesAgo,
        isRead: true,
        isEncrypted: true,
      },
      {
        id: 'm5',
        conversationId: 'conv3',
        senderId: 'c3',
        senderName: 'Carol Davis',
        content: 'Let\'s reschedule our meeting',
        timestamp: fiveMinutesAgo,
        isRead: false,
        isEncrypted: true,
      },
    ];
    this.nextMessageId = 6;

    // Set last messages on conversations
    this.conversations.forEach((conv) => {
      const lastMsg = this.messages
        .filter((m) => m.conversationId === conv.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      if (lastMsg) {
        conv.lastMessage = lastMsg;
      }
    });
  }

  // Contact methods
  getContacts(): Contact[] {
    return [...this.contacts];
  }

  getContact(id: string): Contact | null {
    return this.contacts.find((c) => c.id === id) || null;
  }

  addContact(contact: Omit<Contact, 'id'>): Contact {
    const newContact: Contact = {
      ...contact,
      id: `c${this.nextContactId++}`,
    };
    this.contacts.push(newContact);
    this.notifyContactListeners();
    return newContact;
  }

  updateContact(id: string, updates: Partial<Contact>): boolean {
    const contact = this.contacts.find((c) => c.id === id);
    if (!contact) return false;

    Object.assign(contact, updates);
    this.notifyContactListeners();
    return true;
  }

  deleteContact(id: string): boolean {
    const index = this.contacts.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.contacts.splice(index, 1);
    this.notifyContactListeners();
    return true;
  }

  searchContacts(query: string): Contact[] {
    if (!query.trim()) return this.getContacts();

    const lowerQuery = query.toLowerCase();
    return this.contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.phoneNumber.includes(query)
    );
  }

  // Conversation methods
  getConversations(): Conversation[] {
    return [...this.conversations].sort(
      (a, b) =>
        (b.lastMessageTime?.getTime() || 0) - (a.lastMessageTime?.getTime() || 0)
    );
  }

  getConversation(id: string): Conversation | null {
    return this.conversations.find((c) => c.id === id) || null;
  }

  createConversation(participantId: string): Conversation {
    const contact = this.getContact(participantId);
    if (!contact) throw new Error(`Contact ${participantId} not found`);

    // Check if conversation already exists
    const existing = this.conversations.find((c) => c.participantId === participantId);
    if (existing) return existing;

    const newConversation: Conversation = {
      id: `conv${this.nextConversationId++}`,
      participantId,
      participantName: contact.name,
      unreadCount: 0,
      isEncrypted: true,
    };

    this.conversations.push(newConversation);
    this.notifyConversationListeners();
    return newConversation;
  }

  deleteConversation(id: string): boolean {
    const index = this.conversations.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.conversations.splice(index, 1);
    // Remove associated messages
    this.messages = this.messages.filter((m) => m.conversationId !== id);
    this.notifyConversationListeners();
    return true;
  }

  // Message methods
  getMessages(conversationId: string): Message[] {
    return this.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  sendMessage(conversationId: string, content: string): Message {
    const conversation = this.getConversation(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

    const newMessage: Message = {
      id: `m${this.nextMessageId++}`,
      conversationId,
      senderId: 'me',
      senderName: 'You',
      content,
      timestamp: new Date(),
      isRead: true,
      isEncrypted: true,
    };

    this.messages.push(newMessage);
    conversation.lastMessage = newMessage;
    conversation.lastMessageTime = newMessage.timestamp;

    this.notifyMessageListeners(newMessage);
    this.notifyConversationListeners();
    return newMessage;
  }

  markAsRead(messageId: string): boolean {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return false;

    message.isRead = true;
    const conversation = this.getConversation(message.conversationId);
    if (conversation && conversation.unreadCount > 0) {
      conversation.unreadCount--;
    }

    this.notifyConversationListeners();
    return true;
  }

  deleteMessage(messageId: string): boolean {
    const index = this.messages.findIndex((m) => m.id === messageId);
    if (index === -1) return false;

    this.messages.splice(index, 1);
    this.notifyConversationListeners();
    return true;
  }

  // Event subscriptions
  onConversationUpdated(listener: ChangeListener): () => void {
    this.conversationListeners.push(listener);
    return () => {
      const index = this.conversationListeners.indexOf(listener);
      if (index > -1) this.conversationListeners.splice(index, 1);
    };
  }

  onMessageReceived(listener: (message: Message) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) this.messageListeners.splice(index, 1);
    };
  }

  onContactUpdated(listener: ChangeListener): () => void {
    this.contactListeners.push(listener);
    return () => {
      const index = this.contactListeners.indexOf(listener);
      if (index > -1) this.contactListeners.splice(index, 1);
    };
  }

  private notifyConversationListeners() {
    this.conversationListeners.forEach((listener) => listener());
  }

  private notifyMessageListeners(message: Message) {
    this.messageListeners.forEach((listener) => listener(message));
  }

  private notifyContactListeners() {
    this.contactListeners.forEach((listener) => listener());
  }
}
