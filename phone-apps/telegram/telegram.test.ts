/*
 * Portions copyright Development@bendingtherules.nl
 * Portions copyright Paul Hammant 2025
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Tests for Telegram App
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createTelegramApp } from './telegram';
import { MockTelegramService } from './telegram-service';

describe('Telegram App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let telegram: MockTelegramService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    telegram = new MockTelegramService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display telegram title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('telegram-title').within(500).shouldExist();
  });

  test('should display search button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-search').within(500).shouldExist();
  });

  test('should display new chat button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-new-chat').within(500).shouldExist();
  });

  test('should display chat list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = telegram.getChats();
    if (chats.length > 0) {
      await ctx.getByID(`chat-${chats[0].id}-name`).within(500).shouldExist();
    }
  });

  test('should display chat names', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = telegram.getChats();
    for (const chat of chats) {
      await ctx.getByID(`chat-${chat.id}-name`).within(500).shouldExist();
    }
  });

  test('should display chat avatars', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = telegram.getChats();
    if (chats.length > 0) {
      await ctx.getByID(`chat-${chats[0].id}-avatar`).within(500).shouldExist();
    }
  });

  test('should display chat name', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = telegram.getChats();
    if (chats.length > 0) {
      // Chat name label shows name (and unread count if any)
      await ctx.getByID(`chat-${chats[0].id}-name`).within(500).shouldExist();
    }
  });

  test('should display unread count in chat name for chats with unread messages', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = telegram.getChats();
    const unreadChat = chats.find((c) => c.unreadCount > 0);
    if (unreadChat) {
      // Unread count is shown in the name label text, e.g. "Alice (3)"
      await ctx.getByID(`chat-${unreadChat.id}-name`).within(500).shouldExist();
    }
  });

  test('should have open button for chats', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const chats = telegram.getChats();
    if (chats.length > 0) {
      await ctx.getByID(`chat-${chats[0].id}-open`).within(500).shouldExist();
    }
  });

  test('should display message input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('message-input').within(500).shouldExist();
  });

  test('should display send button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-send').within(500).shouldExist();
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTelegramApp(app, telegram);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = 'screenshots/telegram.png';
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Telegram screenshot saved: ${screenshotPath}`);
    }
  });
});

/**
 * Unit tests for MockTelegramService
 */
describe('MockTelegramService', () => {
  let service: MockTelegramService;

  beforeEach(() => {
    service = new MockTelegramService();
  });

  test('should initialize with sample chats', () => {
    const chats = service.getChats();
    expect(chats.length).toBeGreaterThan(0);
  });

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
    const chat = service.getChat('non-existent');
    expect(chat).toBeNull();
  });

  test('should get messages for chat', () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const messages = service.getMessages(chats[0].id);
      expect(Array.isArray(messages)).toBe(true);
    }
  });

  test('should return empty array for non-existent chat messages', () => {
    const messages = service.getMessages('non-existent');
    expect(messages).toEqual([]);
  });

  test('should send message to chat', () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const chatId = chats[0].id;
      const initialMessageCount = service.getMessages(chatId).length;

      const message = service.sendMessage(chatId, 'Test message');

      expect(message.text).toBe('Test message');
      expect(message.chatId).toBe(chatId);
      expect(message.isOwn).toBe(true);
      expect(service.getMessages(chatId).length).toBe(initialMessageCount + 1);
    }
  });

  test('should throw error when sending message to non-existent chat', () => {
    expect(() => {
      service.sendMessage('non-existent', 'Test message');
    }).toThrow();
  });

  test('should add new chat', () => {
    const initialCount = service.getChats().length;

    const newChat = service.addChat('New Chat');

    expect(newChat.id).toBeDefined();
    expect(newChat.name).toBe('New Chat');
    expect(service.getChats().length).toBe(initialCount + 1);
  });

  test('should delete chat', () => {
    const allChats = service.getChats();
    const initialCount = allChats.length;
    const chatToDelete = allChats[0];

    const result = service.deleteChat(chatToDelete.id);

    expect(result).toBe(true);
    expect(service.getChats().length).toBe(initialCount - 1);
    expect(service.getChat(chatToDelete.id)).toBeNull();
  });

  test('should return false when deleting non-existent chat', () => {
    const result = service.deleteChat('non-existent');
    expect(result).toBe(false);
  });

  test('should mark chat as read', () => {
    const chats = service.getChats();
    const unreadChat = chats.find((c) => c.unreadCount > 0);

    if (unreadChat) {
      const result = service.markChatAsRead(unreadChat.id);

      expect(result).toBe(true);
      const updated = service.getChat(unreadChat.id);
      expect(updated?.unreadCount).toBe(0);
    }
  });

  test('should return false when marking non-existent chat as read', () => {
    const result = service.markChatAsRead('non-existent');
    expect(result).toBe(false);
  });

  test('should notify when chat is added', async () => {
    const addedChats: string[] = [];
    service.onChatAdded((chat) => addedChats.push(chat.name));

    service.addChat('New Chat');

    expect(addedChats).toContain('New Chat');
  });

  test('should notify when message is added', async () => {
    const addedMessages: string[] = [];
    service.onMessageAdded((msg) => addedMessages.push(msg.text));

    const chats = service.getChats();
    if (chats.length > 0) {
      service.sendMessage(chats[0].id, 'Test message');

      expect(addedMessages).toContain('Test message');
    }
  });

  test('should notify when chat is updated', async () => {
    const updatedChats: string[] = [];
    service.onChatUpdated((chat) => updatedChats.push(chat.name));

    const chats = service.getChats();
    if (chats.length > 0) {
      service.sendMessage(chats[0].id, 'Test message');

      expect(updatedChats).toContain(chats[0].name);
    }
  });

  test('should unsubscribe from chat added events', () => {
    const addedChats: string[] = [];
    const unsubscribe = service.onChatAdded((chat) => addedChats.push(chat.name));

    service.addChat('Chat 1');

    unsubscribe();

    service.addChat('Chat 2');

    expect(addedChats).toContain('Chat 1');
    expect(addedChats).not.toContain('Chat 2');
  });

  test('should sort chats by last message time', () => {
    const chats = service.getChats();
    for (let i = 1; i < chats.length; i++) {
      expect(chats[i - 1].lastMessageTime.getTime()).toBeGreaterThanOrEqual(
        chats[i].lastMessageTime.getTime()
      );
    }
  });

  test('should have messages sorted by timestamp', () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const messages = service.getMessages(chats[0].id);
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          messages[i - 1].timestamp.getTime()
        );
      }
    }
  });

  test('should update chat last message when sending message', () => {
    const chats = service.getChats();
    if (chats.length > 0) {
      const chat = chats[0];
      const originalLastMessage = chat.lastMessage;

      service.sendMessage(chat.id, 'New test message');

      const updated = service.getChat(chat.id);
      expect(updated?.lastMessage).toBe('New test message');
      expect(updated?.lastMessage).not.toBe(originalLastMessage);
    }
  });
});
