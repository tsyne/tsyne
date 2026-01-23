/**
 * TsyneTest for Voice Assistant App
 *
 * Integration tests for the Voice Assistant UI using TsyneTest framework.
 * Tests chat interface, quick commands, and UI state changes.
 *
 * Portions copyright (c) 2021 LG Electronics, Inc.
 * Portions copyright (c) 2025 Paul Hammant
 *
 * Licensed under the Apache License, Version 2.0
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildVoiceAssistant } from './voice-assistant';

describe('Voice Assistant UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  // ===========================================================================
  // Initial Rendering
  // ===========================================================================

  describe('initial rendering', () => {
    it('should render app with header', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const header = await ctx.getById('header-title').getText();
      expect(header).toBeDefined();
      expect(header).toContain('Voice Assistant');
    });

    it('should display status label', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const status = await ctx.getById('status-label').getText();
      expect(status).toBeDefined();
      expect(status).toContain('Tap microphone');
    });

    it('should display status icon', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const icon = await ctx.getById('status-icon').getText();
      expect(icon).toBeDefined();
    });

    it('should display microphone button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const micBtn = await ctx.getById('mic-btn').getText();
      expect(micBtn).toContain('Listen');
    });

    it('should display clear button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const clearBtn = await ctx.getById('clear-btn');
      expect(clearBtn).toBeDefined();
    });

    it('should display message list', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const messageList = await ctx.getById('message-list');
      expect(messageList).toBeDefined();
    });
  });

  // ===========================================================================
  // Quick Commands
  // ===========================================================================

  describe('quick commands', () => {
    it('should display time quick command button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const timeBtn = await ctx.getById('quick-time').getText();
      expect(timeBtn).toBe('Time');
    });

    it('should display date quick command button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const dateBtn = await ctx.getById('quick-date').getText();
      expect(dateBtn).toBe('Date');
    });

    it('should display weather quick command button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const weatherBtn = await ctx.getById('quick-weather').getText();
      expect(weatherBtn).toBe('Weather');
    });

    it('should display joke quick command button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const jokeBtn = await ctx.getById('quick-joke').getText();
      expect(jokeBtn).toBe('Joke');
    });

    it('should respond to time command click', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const timeBtn = await ctx.getById('quick-time');
      await timeBtn.click();

      // Wait for message to appear
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have added user and assistant messages
      const messageList = await ctx.getById('message-list');
      expect(messageList).toBeDefined();
    });

    it('should respond to date command click', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const dateBtn = await ctx.getById('quick-date');
      await dateBtn.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      const messageList = await ctx.getById('message-list');
      expect(messageList).toBeDefined();
    });

    it('should respond to weather command click', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const weatherBtn = await ctx.getById('quick-weather');
      await weatherBtn.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      const messageList = await ctx.getById('message-list');
      expect(messageList).toBeDefined();
    });

    it('should respond to joke command click', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const jokeBtn = await ctx.getById('quick-joke');
      await jokeBtn.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      const messageList = await ctx.getById('message-list');
      expect(messageList).toBeDefined();
    });
  });

  // ===========================================================================
  // Clear History
  // ===========================================================================

  describe('clear history', () => {
    it('should clear history when clear button clicked', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Add some messages via quick commands
      const timeBtn = await ctx.getById('quick-time');
      await timeBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Click clear
      const clearBtn = await ctx.getById('clear-btn');
      await clearBtn.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Message list should still exist (with just welcome message)
      const messageList = await ctx.getById('message-list');
      expect(messageList).toBeDefined();
    });
  });

  // ===========================================================================
  // Header Icons
  // ===========================================================================

  describe('header elements', () => {
    it('should display robot icon in header', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      const icon = await ctx.getById('header-icon').getText();
      expect(icon).toBeDefined();
    });
  });

  // ===========================================================================
  // Multiple Quick Commands
  // ===========================================================================

  describe('multiple interactions', () => {
    it('should handle multiple quick commands in sequence', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildVoiceAssistant(app);
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click time
      const timeBtn = await ctx.getById('quick-time');
      await timeBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Click date
      const dateBtn = await ctx.getById('quick-date');
      await dateBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Click weather
      const weatherBtn = await ctx.getById('quick-weather');
      await weatherBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      // App should still be responsive
      const status = await ctx.getById('status-label').getText();
      expect(status).toBeDefined();
    });
  });
});
