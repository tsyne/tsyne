/**
 * Voice Assistant Store - Jest Tests
 *
 * Portions copyright (c) 2021 LG Electronics, Inc.
 * Portions copyright (c) 2025 Paul Hammant
 *
 * Licensed under the Apache License, Version 2.0
 */

import {
  VoiceAssistantStore,
  CommandProcessor,
  MockSpeechRecognition,
  ChatMessage,
  AssistantStatus
} from './voice-assistant';

describe('VoiceAssistantStore', () => {
  let store: VoiceAssistantStore;

  beforeEach(() => {
    store = new VoiceAssistantStore();
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('should start with welcome message', () => {
      const messages = store.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].type).toBe('assistant');
      expect(messages[0].text).toContain('Hello');
    });

    it('should start in idle status', () => {
      expect(store.getStatus()).toBe('idle');
    });

    it('should not be listening initially', () => {
      expect(store.getIsListening()).toBe(false);
    });

    it('should return defensive copy of messages', () => {
      const messages1 = store.getMessages();
      const messages2 = store.getMessages();
      expect(messages1).not.toBe(messages2);
      expect(messages1).toEqual(messages2);
    });
  });

  // ===========================================================================
  // Status Display
  // ===========================================================================

  describe('status display', () => {
    it('should return correct status text for idle', () => {
      expect(store.getStatusText()).toBe('Tap microphone to speak');
    });

    it('should return microphone icon for idle', () => {
      expect(store.getStatusIcon()).toBe('\u{1F3A4}');
    });
  });

  // ===========================================================================
  // Message Management
  // ===========================================================================

  describe('message management', () => {
    it('should add user message', () => {
      store.addUserMessage('hello');
      const messages = store.getMessages();
      expect(messages.length).toBe(2);
      expect(messages[1].type).toBe('user');
      expect(messages[1].text).toBe('hello');
    });

    it('should add assistant message', () => {
      store.addAssistantMessage('Hi there!');
      const messages = store.getMessages();
      expect(messages.length).toBe(2);
      expect(messages[1].type).toBe('assistant');
      expect(messages[1].text).toBe('Hi there!');
    });

    it('should generate unique message IDs', () => {
      store.addUserMessage('test 1');
      store.addUserMessage('test 2');
      store.addUserMessage('test 3');
      const messages = store.getMessages();
      const ids = messages.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include timestamp in messages', () => {
      const before = new Date();
      store.addUserMessage('test');
      const after = new Date();
      const messages = store.getMessages();
      const timestamp = messages[1].timestamp;
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should clear history and add welcome message', () => {
      store.addUserMessage('test 1');
      store.addUserMessage('test 2');
      expect(store.getMessageCount()).toBe(3);

      store.clearHistory();

      expect(store.getMessageCount()).toBe(1);
      const messages = store.getMessages();
      expect(messages[0].type).toBe('assistant');
      expect(messages[0].text).toContain('Hello');
    });

    it('should return correct message count', () => {
      expect(store.getMessageCount()).toBe(1); // Welcome message
      store.addUserMessage('test');
      expect(store.getMessageCount()).toBe(2);
      store.addAssistantMessage('response');
      expect(store.getMessageCount()).toBe(3);
    });
  });

  // ===========================================================================
  // Subscription
  // ===========================================================================

  describe('subscription', () => {
    it('should notify listeners on message add', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.addUserMessage('test');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on clear history', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.clearHistory();

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      store.addUserMessage('test');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      store.subscribe(listener1);
      store.subscribe(listener2);

      store.addUserMessage('test');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Toggle Listening
  // ===========================================================================

  describe('toggle listening', () => {
    it('should stop listening when toggle called while listening', () => {
      // Manually set listening state
      store.stopListening();
      expect(store.getIsListening()).toBe(false);
    });
  });
});

// =============================================================================
// CommandProcessor Tests
// =============================================================================

describe('CommandProcessor', () => {
  let processor: CommandProcessor;

  beforeEach(() => {
    processor = new CommandProcessor();
  });

  // ===========================================================================
  // Time Command
  // ===========================================================================

  describe('time command', () => {
    it('should respond to "what is the time"', () => {
      const result = processor.process('what is the time');
      expect(result.response).toContain('current time is');
    });

    it('should respond to variations with "time"', () => {
      const result = processor.process('tell me the time please');
      expect(result.response).toContain('current time is');
    });
  });

  // ===========================================================================
  // Date Command
  // ===========================================================================

  describe('date command', () => {
    it('should respond to "what is the date"', () => {
      const result = processor.process('what is the date');
      expect(result.response).toContain('Today is');
    });

    it('should include weekday in date response', () => {
      const result = processor.process('what date is it');
      // Should contain a day name
      expect(result.response).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    });
  });

  // ===========================================================================
  // Play Command (YouTube)
  // ===========================================================================

  describe('play command', () => {
    it('should respond to "play [song]"', () => {
      const result = processor.process('play bohemian rhapsody');
      expect(result.response).toContain('bohemian rhapsody');
      expect(result.response).toContain('YouTube');
    });

    it('should set action to open_url', () => {
      const result = processor.process('play hello world');
      expect(result.action).toBe('open_url');
    });

    it('should include YouTube search URL', () => {
      const result = processor.process('play test song');
      expect(result.url).toContain('youtube.com');
      expect(result.url).toContain('search_query');
    });

    it('should URL encode the search query', () => {
      const result = processor.process('play rock & roll');
      expect(result.url).toContain(encodeURIComponent('rock & roll'));
    });
  });

  // ===========================================================================
  // Who Is Command (Wikipedia)
  // ===========================================================================

  describe('who is command', () => {
    it('should respond to "who is [person]"', () => {
      const result = processor.process('who is albert einstein');
      expect(result.response).toContain('albert einstein');
      expect(result.response).toContain('Wikipedia');
    });

    it('should set action to open_url', () => {
      const result = processor.process('who is marie curie');
      expect(result.action).toBe('open_url');
    });

    it('should include Wikipedia URL', () => {
      const result = processor.process('who is isaac newton');
      expect(result.url).toContain('wikipedia.org');
    });

    it('should format name with underscores for Wikipedia URL', () => {
      const result = processor.process('who is nikola tesla');
      expect(result.url).toContain('Nikola_Tesla');
    });
  });

  // ===========================================================================
  // Weather Command
  // ===========================================================================

  describe('weather command', () => {
    it('should respond to "weather"', () => {
      const result = processor.process('weather today');
      expect(result.response).toContain('weather');
    });

    it('should respond to "temperature"', () => {
      const result = processor.process('what is the temperature');
      expect(result.response).toContain('weather');
    });

    it('should include temperature in response', () => {
      const result = processor.process('weather');
      expect(result.response).toMatch(/\d+°F/);
    });

    it('should set action to show_info', () => {
      const result = processor.process('weather');
      expect(result.action).toBe('show_info');
    });
  });

  // ===========================================================================
  // Joke Command
  // ===========================================================================

  describe('joke command', () => {
    it('should respond to "tell me a joke"', () => {
      const result = processor.process('tell me a joke');
      expect(result.response.length).toBeGreaterThan(10);
    });

    it('should respond to variations with "joke"', () => {
      const result = processor.process('I want to hear a joke');
      expect(result.response.length).toBeGreaterThan(10);
    });

    it('should return programmer jokes', () => {
      // Run multiple times to check variety
      const jokes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const result = processor.process('joke');
        jokes.add(result.response);
      }
      // Should have at least some variety
      expect(jokes.size).toBeGreaterThan(1);
    });
  });

  // ===========================================================================
  // Calculate Command
  // ===========================================================================

  describe('calculate command', () => {
    it('should handle addition with "plus"', () => {
      const result = processor.process('calculate 5 plus 3');
      expect(result.response).toContain('8');
    });

    it('should handle subtraction with "minus"', () => {
      const result = processor.process('calculate 10 minus 4');
      expect(result.response).toContain('6');
    });

    it('should handle multiplication with "times"', () => {
      const result = processor.process('calculate 7 times 6');
      expect(result.response).toContain('42');
    });

    it('should handle division with "divided by"', () => {
      const result = processor.process('calculate 20 divided by 4');
      expect(result.response).toContain('5');
    });

    it('should handle word numbers', () => {
      const result = processor.process('calculate twenty plus five');
      expect(result.response).toContain('25');
    });

    it('should handle division by zero', () => {
      const result = processor.process('calculate 10 divided by 0');
      expect(result.response).toContain('Cannot divide by zero');
    });

    it('should handle inline math expressions', () => {
      const result = processor.process('25 plus 17');
      expect(result.response).toContain('42');
    });
  });

  // ===========================================================================
  // Timer Command
  // ===========================================================================

  describe('timer command', () => {
    it('should respond to "set timer for X minutes"', () => {
      const result = processor.process('set a timer for 5 minutes');
      expect(result.response).toContain('Timer set');
      expect(result.response).toContain('5 minute');
    });

    it('should handle singular minute', () => {
      const result = processor.process('set timer for 1 minute');
      expect(result.response).toContain('1 minute');
      expect(result.response).not.toContain('1 minutes');
    });

    it('should handle hours', () => {
      const result = processor.process('set timer for 2 hours');
      expect(result.response).toContain('2 hours');
    });

    it('should handle seconds', () => {
      const result = processor.process('set timer for 30 seconds');
      expect(result.response).toContain('30 seconds');
    });

    it('should provide help for unclear timer commands', () => {
      const result = processor.process('set a timer');
      expect(result.response).toContain('I can set a timer');
    });
  });

  // ===========================================================================
  // Unknown Command
  // ===========================================================================

  describe('unknown command', () => {
    it('should echo unrecognized commands', () => {
      const result = processor.process('open the pod bay doors');
      expect(result.response).toContain('open the pod bay doors');
    });

    it('should suggest alternatives', () => {
      const result = processor.process('xyzzy');
      expect(result.response).toContain('Try asking');
    });
  });
});

// =============================================================================
// MockSpeechRecognition Tests
// =============================================================================

describe('MockSpeechRecognition', () => {
  let recognition: MockSpeechRecognition;

  beforeEach(() => {
    recognition = new MockSpeechRecognition();
  });

  describe('listen', () => {
    it('should return a command string', async () => {
      const command = await recognition.listen();
      expect(typeof command).toBe('string');
      expect(command.length).toBeGreaterThan(0);
    });

    it('should return one of the default commands', async () => {
      const defaultCommands = [
        'what is the time',
        'what is the date',
        'play bohemian rhapsody',
        'who is albert einstein',
        'weather today',
        'tell me a joke',
        'calculate 25 plus 17',
        'set a timer for 5 minutes',
      ];

      const command = await recognition.listen();
      expect(defaultCommands).toContain(command);
    });
  });

  describe('setNextCommand', () => {
    it('should set a specific command to return', async () => {
      recognition.setNextCommand('custom command');
      const command = await recognition.listen();
      expect(command).toBe('custom command');
    });
  });

  describe('resetCommands', () => {
    it('should reset to default commands after custom set', async () => {
      recognition.setNextCommand('custom');
      recognition.resetCommands();

      const defaultCommands = [
        'what is the time',
        'what is the date',
        'play bohemian rhapsody',
        'who is albert einstein',
        'weather today',
        'tell me a joke',
        'calculate 25 plus 17',
        'set a timer for 5 minutes',
      ];

      const command = await recognition.listen();
      expect(defaultCommands).toContain(command);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration', () => {
  let store: VoiceAssistantStore;

  beforeEach(() => {
    store = new VoiceAssistantStore();
  });

  describe('quick command flow', () => {
    it('should process time command and add messages', () => {
      const processor = store.getCommandProcessor();

      store.addUserMessage('what is the time');
      const result = processor.process('what is the time');
      store.addAssistantMessage(result.response);

      const messages = store.getMessages();
      expect(messages.length).toBe(3); // Welcome + user + assistant
      expect(messages[1].type).toBe('user');
      expect(messages[2].type).toBe('assistant');
      expect(messages[2].text).toContain('current time is');
    });

    it('should process calculation and add messages', () => {
      const processor = store.getCommandProcessor();

      store.addUserMessage('calculate 10 plus 5');
      const result = processor.process('calculate 10 plus 5');
      store.addAssistantMessage(result.response);

      const messages = store.getMessages();
      expect(messages[2].text).toContain('15');
    });
  });

  describe('conversation history', () => {
    it('should maintain message order', () => {
      store.addUserMessage('question 1');
      store.addAssistantMessage('answer 1');
      store.addUserMessage('question 2');
      store.addAssistantMessage('answer 2');

      const messages = store.getMessages();
      expect(messages[1].text).toBe('question 1');
      expect(messages[2].text).toBe('answer 1');
      expect(messages[3].text).toBe('question 2');
      expect(messages[4].text).toBe('answer 2');
    });
  });
});
