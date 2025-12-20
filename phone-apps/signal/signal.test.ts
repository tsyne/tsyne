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
 * Jest tests for Signal Service
 */

import { MockSignalService, Contact, Conversation, Message } from './signal-service';

describe('MockSignalService', () => {
  let service: MockSignalService;

  beforeEach(() => {
    service = new MockSignalService();
  });

  describe('Contact Management', () => {
    test('should initialize with sample contacts', () => {
      const contacts = service.getContacts();
      expect(contacts.length).toBeGreaterThan(0);
    });

    test('should get all contacts', () => {
      const contacts = service.getContacts();
      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
    });

    test('should get contact by id', () => {
      const allContacts = service.getContacts();
      const firstContact = allContacts[0];

      const retrieved = service.getContact(firstContact.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(firstContact.id);
      expect(retrieved?.name).toBe(firstContact.name);
    });

    test('should return null for non-existent contact', () => {
      const contact = service.getContact('non-existent-id');
      expect(contact).toBeNull();
    });

    test('should add new contact', () => {
      const initialCount = service.getContacts().length;

      const newContact = service.addContact({
        name: 'Test User',
        phoneNumber: '+1 (555) 999-9999',
        isFavorite: false,
      });

      expect(newContact.id).toBeDefined();
      expect(newContact.name).toBe('Test User');
      expect(service.getContacts().length).toBe(initialCount + 1);
    });

    test('should update contact', () => {
      const allContacts = service.getContacts();
      const contactToUpdate = allContacts[0];

      const result = service.updateContact(contactToUpdate.id, {
        name: 'Updated Name',
      });

      expect(result).toBe(true);
      const updated = service.getContact(contactToUpdate.id);
      expect(updated?.name).toBe('Updated Name');
    });

    test('should return false when updating non-existent contact', () => {
      const result = service.updateContact('non-existent-id', { name: 'Test' });
      expect(result).toBe(false);
    });

    test('should delete contact', () => {
      const allContacts = service.getContacts();
      const initialCount = allContacts.length;
      const contactToDelete = allContacts[0];

      const result = service.deleteContact(contactToDelete.id);

      expect(result).toBe(true);
      expect(service.getContacts().length).toBe(initialCount - 1);
      expect(service.getContact(contactToDelete.id)).toBeNull();
    });

    test('should return false when deleting non-existent contact', () => {
      const result = service.deleteContact('non-existent-id');
      expect(result).toBe(false);
    });

    test('should search contacts by name', () => {
      const allContacts = service.getContacts();
      const testContact = allContacts[0];
      const searchTerm = testContact.name.substring(0, 3);

      const results = service.searchContacts(searchTerm);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((c) => c.id === testContact.id)).toBe(true);
    });

    test('should search contacts by phone number', () => {
      const allContacts = service.getContacts();
      const testContact = allContacts[0];

      const results = service.searchContacts(testContact.phoneNumber);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((c) => c.id === testContact.id)).toBe(true);
    });

    test('should return all contacts for empty search', () => {
      const allContacts = service.getContacts();
      const searchResults = service.searchContacts('');

      expect(searchResults.length).toBe(allContacts.length);
    });

    test('should return empty array for no matches', () => {
      const results = service.searchContacts('xxxnonexistentxxx');
      expect(results.length).toBe(0);
    });
  });

  describe('Conversation Management', () => {
    test('should initialize with sample conversations', () => {
      const conversations = service.getConversations();
      expect(conversations.length).toBeGreaterThan(0);
    });

    test('should get all conversations sorted by time', () => {
      const conversations = service.getConversations();
      expect(Array.isArray(conversations)).toBe(true);

      for (let i = 1; i < conversations.length; i++) {
        const prevTime = conversations[i - 1].lastMessageTime?.getTime() || 0;
        const currTime = conversations[i].lastMessageTime?.getTime() || 0;
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    test('should get conversation by id', () => {
      const conversations = service.getConversations();
      const firstConv = conversations[0];

      const retrieved = service.getConversation(firstConv.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(firstConv.id);
    });

    test('should return null for non-existent conversation', () => {
      const conversation = service.getConversation('non-existent-id');
      expect(conversation).toBeNull();
    });

    test('should create new conversation with contact', () => {
      const contacts = service.getContacts();
      const targetContact = contacts[0];

      const conversation = service.createConversation(targetContact.id);

      expect(conversation.id).toBeDefined();
      expect(conversation.participantId).toBe(targetContact.id);
      expect(conversation.participantName).toBe(targetContact.name);
      expect(conversation.isEncrypted).toBe(true);
    });

    test('should return existing conversation if already created', () => {
      const contacts = service.getContacts();
      const targetContact = contacts[0];

      const conv1 = service.createConversation(targetContact.id);
      const conv2 = service.createConversation(targetContact.id);

      expect(conv1.id).toBe(conv2.id);
    });

    test('should throw error when creating conversation with non-existent contact', () => {
      expect(() => {
        service.createConversation('non-existent-id');
      }).toThrow();
    });

    test('should delete conversation', () => {
      const conversations = service.getConversations();
      const initialCount = conversations.length;
      const convToDelete = conversations[0];

      const result = service.deleteConversation(convToDelete.id);

      expect(result).toBe(true);
      expect(service.getConversations().length).toBe(initialCount - 1);
    });

    test('should return false when deleting non-existent conversation', () => {
      const result = service.deleteConversation('non-existent-id');
      expect(result).toBe(false);
    });

    test('should remove associated messages when deleting conversation', () => {
      const conversations = service.getConversations();
      const convToDelete = conversations[0];
      const messagesBeforeDelete = service.getMessages(convToDelete.id);

      service.deleteConversation(convToDelete.id);

      // Messages should be deleted
      const messagesAfterDelete = service.getMessages(convToDelete.id);
      expect(messagesAfterDelete.length).toBe(0);
    });
  });

  describe('Message Management', () => {
    let testConversationId: string;

    beforeEach(() => {
      const conversations = service.getConversations();
      testConversationId = conversations[0].id;
    });

    test('should get messages for conversation', () => {
      const messages = service.getMessages(testConversationId);
      expect(Array.isArray(messages)).toBe(true);
    });

    test('should sort messages by timestamp', () => {
      const messages = service.getMessages(testConversationId);

      if (messages.length > 1) {
        for (let i = 1; i < messages.length; i++) {
          expect(messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
            messages[i - 1].timestamp.getTime()
          );
        }
      }
    });

    test('should send message to conversation', () => {
      const initialCount = service.getMessages(testConversationId).length;

      const message = service.sendMessage(testConversationId, 'Hello, World!');

      expect(message.id).toBeDefined();
      expect(message.content).toBe('Hello, World!');
      expect(message.conversationId).toBe(testConversationId);
      expect(message.senderId).toBe('me');
      expect(service.getMessages(testConversationId).length).toBe(initialCount + 1);
    });

    test('should mark message as read', () => {
      const messages = service.getMessages(testConversationId);
      const unreadMessage = messages.find((m) => !m.isRead);

      if (unreadMessage) {
        const result = service.markAsRead(unreadMessage.id);
        expect(result).toBe(true);

        const updated = service.getMessages(testConversationId).find((m) => m.id === unreadMessage.id);
        expect(updated?.isRead).toBe(true);
      }
    });

    test('should return false when marking non-existent message as read', () => {
      const result = service.markAsRead('non-existent-id');
      expect(result).toBe(false);
    });

    test('should delete message', () => {
      const message = service.sendMessage(testConversationId, 'Message to delete');
      const initialCount = service.getMessages(testConversationId).length;

      const result = service.deleteMessage(message.id);

      expect(result).toBe(true);
      expect(service.getMessages(testConversationId).length).toBe(initialCount - 1);
    });

    test('should return false when deleting non-existent message', () => {
      const result = service.deleteMessage('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('Event Subscriptions', () => {
    test('should notify on conversation update', () => {
      const listener = jest.fn();
      service.onConversationUpdated(listener);

      const contacts = service.getContacts();
      const newContact = contacts[contacts.length - 1];
      service.createConversation(newContact.id);

      expect(listener).toHaveBeenCalled();
    });

    test('should unsubscribe from conversation updates', () => {
      const listener = jest.fn();
      const unsubscribe = service.onConversationUpdated(listener);

      const contacts = service.getContacts();
      const newContact = contacts[contacts.length - 1];
      service.createConversation(newContact.id);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      const anotherContact = contacts[0];
      service.createConversation(anotherContact.id);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    test('should notify on message received', () => {
      const listener = jest.fn();
      service.onMessageReceived(listener);

      const conversations = service.getConversations();
      service.sendMessage(conversations[0].id, 'Test message');

      expect(listener).toHaveBeenCalled();
    });

    test('should unsubscribe from message received events', () => {
      const listener = jest.fn();
      const unsubscribe = service.onMessageReceived(listener);

      const conversations = service.getConversations();
      service.sendMessage(conversations[0].id, 'Test message 1');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      service.sendMessage(conversations[0].id, 'Test message 2');
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    test('should notify on contact update', () => {
      const listener = jest.fn();
      service.onContactUpdated(listener);

      const contacts = service.getContacts();
      service.updateContact(contacts[0].id, { name: 'Updated Name' });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete conversation workflow', () => {
      const contacts = service.getContacts();
      const targetContact = contacts[0];

      // Create conversation
      const conversation = service.createConversation(targetContact.id);
      expect(conversation).toBeDefined();

      // Send messages
      const msg1 = service.sendMessage(conversation.id, 'Hi there!');
      const msg2 = service.sendMessage(conversation.id, 'How are you?');

      expect(service.getMessages(conversation.id).length).toBe(2);

      // Check conversation metadata
      const updated = service.getConversation(conversation.id);
      expect(updated?.lastMessage?.content).toBe('How are you?');

      // Delete message
      service.deleteMessage(msg1.id);
      expect(service.getMessages(conversation.id).length).toBe(1);

      // Delete conversation
      service.deleteConversation(conversation.id);
      expect(service.getConversation(conversation.id)).toBeNull();
    });

    test('should track unread message count', () => {
      const conversations = service.getConversations();
      let testConv = conversations.find((c) => c.unreadCount > 0);

      if (testConv) {
        const initialCount = testConv.unreadCount;
        const unreadMessages = service.getMessages(testConv.id).filter((m) => !m.isRead);

        if (unreadMessages.length > 0) {
          service.markAsRead(unreadMessages[0].id);
          const updated = service.getConversation(testConv.id);
          expect(updated?.unreadCount).toBe(initialCount - 1);
        }
      }
    });
  });
});
