/*
 * Tests for WhatsApp App
 *
 * Copyright Paul Hammant 2025
 * Licensed under GNU General Public License v3
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createWhatsAppApp } from './whatsapp';
import { MockWhatsAppService } from './whatsapp-service';

describe('WhatsApp App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let whatsapp: MockWhatsAppService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    whatsapp = new MockWhatsAppService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display whatsapp title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('whatsapp-title').within(500).shouldExist();
  });

  test('should display search input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('search-input').within(500).shouldExist();
  });

  test('should display filter buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('btn-filter-all').within(500).shouldExist();
    await ctx.getById('btn-filter-unread').within(500).shouldExist();
    await ctx.getById('btn-filter-groups').within(500).shouldExist();
    await ctx.getById('btn-filter-archived').within(500).shouldExist();
  });

  test('should display chat list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = whatsapp.getChats();
    if (chats.length > 0) {
      await ctx.getById(`chat-${chats[0].id}-name`).within(500).shouldExist();
    }
  });

  test('should display chat names', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = whatsapp.getChats();
    for (const chat of chats.slice(0, 3)) {
      await ctx.getById(`chat-${chat.id}-name`).within(500).shouldExist();
    }
  });

  test('should display chat avatars', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = whatsapp.getChats();
    if (chats.length > 0) {
      await ctx.getById(`chat-${chats[0].id}-avatar`).within(500).shouldExist();
    }
  });

  test('should have open button for chats', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = whatsapp.getChats();
    if (chats.length > 0) {
      await ctx.getById(`chat-${chats[0].id}-open`).within(500).shouldExist();
    }
  });

  test('should display message input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('message-input').within(500).shouldExist();
  });

  test('should display send button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('btn-send').within(500).shouldExist();
  });

  test('should display logout button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('btn-logout').within(500).shouldExist();
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createWhatsAppApp(app, whatsapp);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = 'screenshots/whatsapp.png';
      await tsyneTest.screenshot(screenshotPath);
      console.log(`WhatsApp screenshot saved: ${screenshotPath}`);
    }
  });
});

/**
 * Unit tests for MockWhatsAppService
 */
describe('MockWhatsAppService', () => {
  let service: MockWhatsAppService;

  beforeEach(() => {
    service = new MockWhatsAppService();
  });

  // ============================================
  // Initialization Tests
  // ============================================

  test('should initialize with sample chats', () => {
    const chats = service.getChats();
    expect(chats.length).toBeGreaterThan(0);
  });

  test('should be logged in by default', () => {
    expect(service.isLoggedIn()).toBe(true);
  });

  test('should have connection status connected', () => {
    expect(service.getConnectionStatus()).toBe('connected');
  });

  test('should have a profile', () => {
    const profile = service.getMyProfile();
    expect(profile).not.toBeNull();
    expect(profile?.id).toBeDefined();
    expect(profile?.name).toBeDefined();
  });

  // ============================================
  // Chat Tests
  // ============================================

  test('should get all chats', () => {
    const chats = service.getChats();
    expect(Array.isArray(chats)).toBe(true);
    expect(chats.length).toBeGreaterThan(0);
  });

  test('should get chat by id', () => {
    const allChats = service.getChats();
    const firstChat = allChats[0];

    const retrieved = service.getChat(firstChat.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(firstChat.id);
    expect(retrieved?.name).toBe(firstChat.name);
  });

  test('should return null for non-existent chat', () => {
    const chat = service.getChat('non-existent@c.us');
    expect(chat).toBeNull();
  });

  test('should filter chats by unread', () => {
    const unreadChats = service.getChats('unread');
    for (const chat of unreadChats) {
      expect(chat.unreadCount).toBeGreaterThan(0);
    }
  });

  test('should filter chats by groups', () => {
    const groupChats = service.getChats('groups');
    for (const chat of groupChats) {
      expect(chat.isGroup).toBe(true);
    }
  });

  test('should filter chats by archived', () => {
    const archivedChats = service.getChats('archived');
    for (const chat of archivedChats) {
      expect(chat.isArchived).toBe(true);
    }
  });

  test('should search chats by name', () => {
    const results = service.searchChats('alice');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain('alice');
  });

  test('should search chats by message content', () => {
    const results = service.searchChats('tomorrow');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should return empty array for no search results', () => {
    const results = service.searchChats('xyznonexistent');
    expect(results).toEqual([]);
  });

  // ============================================
  // Message Tests
  // ============================================

  test('should get messages for chat', () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const messages = service.getMessages(chats[0].id);
      expect(Array.isArray(messages)).toBe(true);
    }
  });

  test('should return empty array for non-existent chat messages', () => {
    const messages = service.getMessages('non-existent@c.us');
    expect(messages).toEqual([]);
  });

  test('should send message to chat', async () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const chatId = chats[0].id;
      const initialMessageCount = service.getMessages(chatId).length;

      const message = await service.sendMessage(chatId, 'Test message');

      expect(message).not.toBeNull();
      expect(message?.text).toBe('Test message');
      expect(message?.chatId).toBe(chatId);
      expect(message?.isOwn).toBe(true);
      expect(service.getMessages(chatId).length).toBe(initialMessageCount + 1);
    }
  });

  test('should return null when sending message to non-existent chat', async () => {
    const result = await service.sendMessage('non-existent@c.us', 'Test message');
    expect(result).toBeNull();
  });

  test('should send message with reply', async () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const chatId = chats[0].id;
      const existingMessages = service.getMessages(chatId);
      if (existingMessages.length > 0) {
        const replyToId = existingMessages[0].id;
        const message = await service.sendMessage(chatId, 'Reply message', replyToId);

        expect(message?.replyToId).toBe(replyToId);
        expect(message?.replyToText).toBeDefined();
      }
    }
  });

  // ============================================
  // Chat Actions Tests
  // ============================================

  test('should archive chat', async () => {
    const chats = service.getChats('all');
    if (chats.length > 0) {
      const chatId = chats[0].id;
      const result = await service.archiveChat(chatId);

      expect(result).toBe(true);
      const chat = service.getChat(chatId);
      expect(chat?.isArchived).toBe(true);
    }
  });

  test('should unarchive chat', async () => {
    const archivedChats = service.getChats('archived');
    if (archivedChats.length > 0) {
      const chatId = archivedChats[0].id;
      const result = await service.unarchiveChat(chatId);

      expect(result).toBe(true);
      const chat = service.getChat(chatId);
      expect(chat?.isArchived).toBe(false);
    }
  });

  test('should delete chat', async () => {
    const chats = service.getChats();
    const initialCount = chats.length;
    const chatToDelete = chats[0];

    const result = await service.deleteChat(chatToDelete.id);

    expect(result).toBe(true);
    expect(service.getChats().length).toBeLessThan(initialCount);
    expect(service.getChat(chatToDelete.id)).toBeNull();
  });

  test('should return false when deleting non-existent chat', async () => {
    const result = await service.deleteChat('non-existent@c.us');
    expect(result).toBe(false);
  });

  test('should mark chat as read', async () => {
    const chats = service.getChats();
    const unreadChat = chats.find((c) => c.unreadCount > 0);

    if (unreadChat) {
      const result = await service.markChatAsRead(unreadChat.id);

      expect(result).toBe(true);
      const updated = service.getChat(unreadChat.id);
      expect(updated?.unreadCount).toBe(0);
    }
  });

  test('should mark chat as unread', async () => {
    const chats = service.getChats();
    const readChat = chats.find((c) => c.unreadCount === 0);

    if (readChat) {
      const result = await service.markChatAsUnread(readChat.id);

      expect(result).toBe(true);
      const updated = service.getChat(readChat.id);
      expect(updated?.unreadCount).toBeGreaterThan(0);
    }
  });

  // ============================================
  // Message Actions Tests
  // ============================================

  test('should delete message', async () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const chatId = chats[0].id;
      const messages = service.getMessages(chatId);
      if (messages.length > 0) {
        const messageId = messages[0].id;
        const result = await service.deleteMessage(chatId, messageId);

        expect(result).toBe(true);
        const updatedMsg = service.getMessages(chatId).find((m) => m.id === messageId);
        expect(updatedMsg?.isRevoked).toBe(true);
      }
    }
  });

  test('should react to message', async () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const chatId = chats[0].id;
      const messages = service.getMessages(chatId);
      if (messages.length > 0) {
        const messageId = messages[0].id;
        const result = await service.reactToMessage(chatId, messageId, '👍');

        expect(result).toBe(true);
        const updatedMsg = service.getMessages(chatId).find((m) => m.id === messageId);
        expect(updatedMsg?.reactions?.some((r) => r.emoji === '👍')).toBe(true);
      }
    }
  });

  test('should remove reaction with empty emoji', async () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const chatId = chats[0].id;
      const messages = service.getMessages(chatId);
      if (messages.length > 0) {
        const messageId = messages[0].id;
        // Add reaction first
        await service.reactToMessage(chatId, messageId, '👍');
        // Remove reaction
        await service.reactToMessage(chatId, messageId, '');

        const updatedMsg = service.getMessages(chatId).find((m) => m.id === messageId);
        expect(updatedMsg?.reactions?.some((r) => r.from === 'me@c.us')).toBe(false);
      }
    }
  });

  // ============================================
  // Event Subscription Tests
  // ============================================

  test('should notify when chat is updated', async () => {
    const updatedChats: string[] = [];
    service.onChatUpdated((chat) => updatedChats.push(chat.id));

    const chats = service.getChats();
    if (chats.length > 0) {
      await service.sendMessage(chats[0].id, 'Test message');

      expect(updatedChats).toContain(chats[0].id);
    }
  });

  test('should notify when chats change', async () => {
    let changeCount = 0;
    service.onChatsChanged(() => changeCount++);

    const chats = service.getChats();
    if (chats.length > 0) {
      await service.sendMessage(chats[0].id, 'Test message');

      expect(changeCount).toBeGreaterThan(0);
    }
  });

  test('should notify when message is added', async () => {
    const addedMessages: string[] = [];
    service.onMessageAdded((msg) => addedMessages.push(msg.text));

    const chats = service.getChats();
    if (chats.length > 0) {
      await service.sendMessage(chats[0].id, 'Test message');

      expect(addedMessages).toContain('Test message');
    }
  });

  test('should notify when message is updated', async () => {
    const updatedMessages: string[] = [];
    service.onMessageUpdated((msg) => updatedMessages.push(msg.id));

    const chats = service.getChats();
    if (chats.length > 0) {
      const chatId = chats[0].id;
      const messages = service.getMessages(chatId);
      if (messages.length > 0) {
        await service.reactToMessage(chatId, messages[0].id, '👍');

        expect(updatedMessages).toContain(messages[0].id);
      }
    }
  });

  test('should unsubscribe from events', () => {
    const changes: number[] = [];
    const unsubscribe = service.onChatsChanged(() => changes.push(1));

    service.refreshChats();
    expect(changes.length).toBeGreaterThan(0);

    const countBefore = changes.length;
    unsubscribe();

    service.refreshChats();
    expect(changes.length).toBe(countBefore);
  });

  // ============================================
  // Login/Logout Tests
  // ============================================

  test('should logout and clear data', async () => {
    expect(service.isLoggedIn()).toBe(true);
    expect(service.getChats().length).toBeGreaterThan(0);

    await service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getChats().length).toBe(0);
    expect(service.getConnectionStatus()).toBe('disconnected');
  });

  test('should notify on login state change', async () => {
    let loggedIn = true;
    service.onLoginStateChanged((state) => {
      loggedIn = state;
    });

    await service.logout();

    expect(loggedIn).toBe(false);
  });

  // ============================================
  // Sorting Tests
  // ============================================

  test('should sort chats by last message time', () => {
    const chats = service.getChats();
    for (let i = 1; i < chats.length; i++) {
      // Pinned chats come first, then sorted by time
      if (!chats[i - 1].isPinned && !chats[i].isPinned) {
        expect(chats[i - 1].lastMessageTime.getTime()).toBeGreaterThanOrEqual(
          chats[i].lastMessageTime.getTime()
        );
      }
    }
  });

  test('should update chat last message when sending message', async () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const chat = chats[0];
      const originalLastMessage = chat.lastMessage;

      await service.sendMessage(chat.id, 'New test message');

      const updated = service.getChat(chat.id);
      expect(updated?.lastMessage).toBe('New test message');
      expect(updated?.lastMessage).not.toBe(originalLastMessage);
    }
  });
});
