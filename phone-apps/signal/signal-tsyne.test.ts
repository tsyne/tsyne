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
 * TsyneTest integration tests for Signal app UI
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createSignalApp } from './signal';
import type { App } from '../../core/src';

describe('Signal App UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('Initial State', () => {
    test('should display Signal title', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('signal-title').within(500).shouldExist();
    });

    test('should display Signal subtitle', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('signal-subtitle').within(500).shouldExist();
    });

    test('should display view label', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('signal-view-label').within(500).shouldExist();
    });

    test('should display refresh button', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('btn-refresh').within(500).shouldExist();
    });

    test('should display status label', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('signal-status').within(500).shouldExist();
    });

    test('should display new conversation button', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('btn-new-conversation').within(500).shouldExist();
    });
  });

  describe('Conversation List', () => {
    test('should display conversations scroll area', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('conversations-scroll').within(500).shouldExist();
    });

    test('should display conversation items', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Should have at least one conversation visible
      const result = await ctx.getByID('conv-conv1-name').within(500).shouldExist();
      expect(result).toBeDefined();
    });

    test('should display conversation preview text', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('conv-conv1-preview').within(500).shouldExist();
    });

    test('should display conversation timestamp', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('conv-conv1-time').within(500).shouldExist();
    });

    test('should display encryption indicator', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('conv-conv1-encrypted').within(500).shouldExist();
    });

    test('should display unread badge for conversations with unread messages', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // conv1 has unread count of 2
      const result = await ctx.getByID('conv-conv1-unread').within(500).shouldExist();
      expect(result).toBeDefined();
    });

    test('should display open button for each conversation', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('conv-conv1-open').within(500).shouldExist();
    });

    test('should display delete button for each conversation', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('conv-conv1-delete').within(500).shouldExist();
    });
  });

  describe('Conversation Navigation', () => {
    test('should open conversation when clicking open button', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click open button for first conversation
      await ctx.getByID('conv-conv1-open').click();

      // Should now display messages scroll area
      await ctx.getByID('messages-scroll').within(500).shouldExist();
    });

    test('should display messages when conversation is opened', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open first conversation
      await ctx.getByID('conv-conv1-open').click();

      // Should have at least one message visible
      const result = await ctx.getByID('msg-m1-content').within(500).shouldExist();
      expect(result).toBeDefined();
    });

    test('should display back button when viewing conversation', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open first conversation
      await ctx.getByID('conv-conv1-open').click();

      // Back button should be visible
      await ctx.getByID('btn-back').within(500).shouldExist();
    });

    test('should return to conversation list when clicking back', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open conversation
      await ctx.getByID('conv-conv1-open').click();

      // Click back
      await ctx.getByID('btn-back').click();

      // Should see conversations list again
      await ctx.getByID('conversations-scroll').within(500).shouldExist();
    });
  });

  describe('Messaging', () => {
    test('should display message input area when viewing conversation', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open conversation
      await ctx.getByID('conv-conv1-open').click();

      // Input area should be visible
      await ctx.getByID('input-area').within(500).shouldExist();
    });

    test('should display message input field', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open conversation
      await ctx.getByID('conv-conv1-open').click();

      // Input field should be visible
      await ctx.getByID('message-input').within(500).shouldExist();
    });

    test('should display send button', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open conversation
      await ctx.getByID('conv-conv1-open').click();

      // Send button should be visible
      await ctx.getByID('btn-send-message').within(500).shouldExist();
    });

    test('should display message content', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open conversation
      await ctx.getByID('conv-conv1-open').click();

      // First message should be visible
      await ctx.getByID('msg-m1-content').within(500).shouldExist();
    });

    test('should display message metadata', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open conversation
      await ctx.getByID('conv-conv1-open').click();

      // Message metadata should be visible
      await ctx.getByID('msg-m1-meta').within(500).shouldExist();
    });
  });

  describe('Conversation Deletion', () => {
    test('should delete conversation when clicking delete button', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify initial state has 3 conversations
      await ctx.getByID('signal-status').getText().shouldBe('3 conversations');

      // Delete first conversation
      await ctx.getByID('conv-conv1-delete').click();

      // Status should now show 2 conversations
      await ctx.getByID('signal-status').getText().within(500).shouldBe('2 conversations');
    });
  });

  describe('Complete UI Rendering', () => {
    test('should render conversations list successfully', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify the UI is fully rendered
      await ctx.getByID('signal-title').within(500).shouldExist();
      await ctx.getByID('conversations-scroll').within(500).shouldExist();
    });

    test('should render message view successfully', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSignalApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Open a conversation
      await ctx.getByID('conv-conv1-open').click();

      // Verify message view is rendered
      await ctx.getByID('messages-scroll').within(500).shouldExist();
      await ctx.getByID('input-area').within(500).shouldExist();
    });
  });
});
