/**
 * Voice Assistant - Tsyne Port
 *
 * A voice-activated assistant with chat interface. Demonstrates mock speech
 * recognition, command processing, and reactive chat UI.
 *
 * Original: webOS POC App by LG Electronics
 * Portions copyright (c) 2021 LG Electronics, Inc.
 * Portions copyright (c) 2025 Paul Hammant
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ## Services from original webOS app not yet implemented (require API tokens):
 *
 * - Google Cloud Speech-to-Text: Voice recognition (requires credentials)
 *   Currently mocked with random command selection
 *
 * - Google Calendar API: Create/list/delete events (requires OAuth2)
 *   Calendar commands return placeholder responses
 *
 * - OpenWeatherMap API: Real weather data (requires API key, free tier available)
 *   Currently returns hardcoded weather response
 *
 * - YouTube Data API: Video search (requires API key)
 *   Currently generates search URL without fetching results
 *
 * ## Services that could be implemented without tokens:
 *
 * - Wikipedia API: Free, no authentication required
 *   Could fetch real article summaries for "who is [person]" commands
 *
 * @tsyne-app:name Voice Assistant
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder buildVoiceAssistant
 * @tsyne-app:args app
 */

import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets/display';

// ============================================================================
// Data Models
// ============================================================================

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

type AssistantStatus = 'idle' | 'listening' | 'processing' | 'answering';

interface CommandResult {
  response: string;
  action?: 'open_url' | 'show_info';
  url?: string;
}

type ChangeListener = () => void;

// ============================================================================
// Mock Speech Recognition Service
// ============================================================================

/**
 * Mock speech recognition that simulates voice input.
 * In a real implementation, this would use Web Speech API or native speech services.
 */
class MockSpeechRecognition {
  private simulatedCommands = [
    'what is the time',
    'what is the date',
    'play bohemian rhapsody',
    'who is albert einstein',
    'weather today',
    'tell me a joke',
    'calculate 25 plus 17',
    'set a timer for 5 minutes',
  ];

  /**
   * Simulate listening for a voice command.
   * Returns a promise that resolves with recognized text after a delay.
   */
  async listen(): Promise<string> {
    // Simulate listening delay (1-2 seconds)
    await this.delay(1000 + Math.random() * 1000);

    // Return a random command from the list
    const index = Math.floor(Math.random() * this.simulatedCommands.length);
    return this.simulatedCommands[index];
  }

  /**
   * For testing: set a specific command to be returned
   */
  setNextCommand(command: string): void {
    this.simulatedCommands = [command];
  }

  /**
   * For testing: reset to default commands
   */
  resetCommands(): void {
    this.simulatedCommands = [
      'what is the time',
      'what is the date',
      'play bohemian rhapsody',
      'who is albert einstein',
      'weather today',
      'tell me a joke',
      'calculate 25 plus 17',
      'set a timer for 5 minutes',
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Command Processor
// ============================================================================

/**
 * Processes voice commands and generates appropriate responses.
 */
class CommandProcessor {
  process(command: string): CommandResult {
    const cmd = command.toLowerCase().trim();

    // Calculate command (check before time to avoid "times" matching "time")
    if (cmd.startsWith('calculate ') || cmd.includes(' plus ') || cmd.includes(' minus ') ||
        cmd.includes(' times ') || cmd.includes(' divided')) {
      return this.handleCalculation(cmd);
    }

    // Timer command (check before time to avoid matching)
    if (cmd.includes('timer') || cmd.includes('alarm') || cmd.includes('set a ')) {
      const match = cmd.match(/(\d+)\s*(minute|second|hour)/i);
      if (match) {
        const amount = match[1];
        const unit = match[2].toLowerCase();
        return { response: `Timer set for ${amount} ${unit}${parseInt(amount) > 1 ? 's' : ''}.` };
      }
      return { response: 'I can set a timer. Just say "set timer for X minutes".' };
    }

    // Time command (exact phrase or "what time")
    if (cmd.includes('what time') || cmd.includes('the time') || cmd === 'time') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return { response: `The current time is ${timeStr}.` };
    }

    // Date command
    if (cmd.includes('date')) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return { response: `Today is ${dateStr}.` };
    }

    // Play command (YouTube)
    if (cmd.startsWith('play ')) {
      const query = cmd.substring(5);
      return {
        response: `Searching for "${query}" on YouTube...`,
        action: 'open_url',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      };
    }

    // Who is command (Wikipedia)
    if (cmd.startsWith('who is ')) {
      const person = cmd.substring(7);
      const formattedPerson = person
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('_');
      return {
        response: `Looking up "${person}" on Wikipedia...`,
        action: 'open_url',
        url: `https://en.wikipedia.org/wiki/${formattedPerson}`
      };
    }

    // Weather command
    if (cmd.includes('weather') || cmd.includes('temperature')) {
      return {
        response: 'Current weather: Partly cloudy, 72°F (22°C). Humidity: 45%. Wind: 8 mph NW.',
        action: 'show_info'
      };
    }

    // Joke command
    if (cmd.includes('joke')) {
      const jokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs!',
        'Why did the developer go broke? Because he used up all his cache!',
        'How many programmers does it take to change a light bulb? None, that\'s a hardware problem!',
        'Why do Java developers wear glasses? Because they can\'t C#!',
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      return { response: joke };
    }

    // Default response
    return {
      response: `I heard: "${command}". I'm not sure how to help with that. Try asking about the time, weather, or say "play [song name]".`
    };
  }

  private handleCalculation(cmd: string): CommandResult {
    // Simple word-to-number and operation parsing
    const words: Record<string, number> = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
      'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
      'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
      'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
      'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
      'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90, 'hundred': 100
    };

    let expression = cmd.replace('calculate ', '');

    // Replace word numbers with digits
    for (const [word, num] of Object.entries(words)) {
      expression = expression.replace(new RegExp(`\\b${word}\\b`, 'gi'), num.toString());
    }

    // Replace word operators
    expression = expression.replace(/\bplus\b/gi, '+');
    expression = expression.replace(/\bminus\b/gi, '-');
    expression = expression.replace(/\btimes\b/gi, '*');
    expression = expression.replace(/\bdivided by\b/gi, '/');

    // Extract numbers and operator
    const match = expression.match(/(\d+)\s*([+\-*/])\s*(\d+)/);
    if (match) {
      const a = parseFloat(match[1]);
      const op = match[2];
      const b = parseFloat(match[3]);
      let result: number;

      switch (op) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': result = b !== 0 ? a / b : NaN; break;
        default: return { response: 'I could not understand the calculation.' };
      }

      if (isNaN(result)) {
        return { response: 'Cannot divide by zero.' };
      }

      return { response: `The answer is ${result}.` };
    }

    return { response: 'I could not understand the calculation. Try "calculate 5 plus 3".' };
  }
}

// ============================================================================
// Voice Assistant Store (Observable)
// ============================================================================

export class VoiceAssistantStore {
  private messages: ChatMessage[] = [];
  private status: AssistantStatus = 'idle';
  private isListening = false;
  private changeListeners: ChangeListener[] = [];
  private nextMessageId = 1;
  private speechRecognition = new MockSpeechRecognition();
  private commandProcessor = new CommandProcessor();

  constructor() {
    this.addWelcomeMessage();
  }

  private addWelcomeMessage(): void {
    this.messages.push({
      id: `msg-${String(this.nextMessageId++).padStart(3, '0')}`,
      type: 'assistant',
      text: 'Hello! I\'m your voice assistant. Tap the microphone to start listening.',
      timestamp: new Date()
    });
  }

  // -------------------------------------------------------------------------
  // Subscription
  // -------------------------------------------------------------------------

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach(listener => listener());
  }

  // -------------------------------------------------------------------------
  // Getters (defensive copies)
  // -------------------------------------------------------------------------

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getStatus(): AssistantStatus {
    return this.status;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getStatusText(): string {
    switch (this.status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'answering': return 'Answering...';
      default: return 'Tap microphone to speak';
    }
  }

  getStatusIcon(): string {
    switch (this.status) {
      case 'listening': return '\u{1F3A4}'; // Microphone
      case 'processing': return '\u{23F3}'; // Hourglass
      case 'answering': return '\u{1F50A}'; // Speaker
      default: return '\u{1F3A4}'; // Microphone
    }
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async startListening(): Promise<void> {
    if (this.isListening) return;

    this.isListening = true;
    this.status = 'listening';
    this.notifyChange();

    try {
      // Listen for voice command
      const command = await this.speechRecognition.listen();

      // Add user message
      this.addUserMessage(command);

      // Process command
      this.status = 'processing';
      this.notifyChange();

      // Small delay to show processing state
      await this.delay(500);

      // Get response
      const result = this.commandProcessor.process(command);

      // Add assistant response
      this.status = 'answering';
      this.notifyChange();

      await this.delay(300);
      this.addAssistantMessage(result.response);

    } catch (error) {
      this.addAssistantMessage('Sorry, I had trouble understanding. Please try again.');
    } finally {
      this.isListening = false;
      this.status = 'idle';
      this.notifyChange();
    }
  }

  stopListening(): void {
    this.isListening = false;
    this.status = 'idle';
    this.notifyChange();
  }

  toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  clearHistory(): void {
    this.messages = [];
    this.nextMessageId = 1;
    this.addWelcomeMessage();
    this.notifyChange();
  }

  // For testing
  addUserMessage(text: string): void {
    this.messages.push({
      id: `msg-${String(this.nextMessageId++).padStart(3, '0')}`,
      type: 'user',
      text,
      timestamp: new Date()
    });
    this.notifyChange();
  }

  addAssistantMessage(text: string): void {
    this.messages.push({
      id: `msg-${String(this.nextMessageId++).padStart(3, '0')}`,
      type: 'assistant',
      text,
      timestamp: new Date()
    });
    this.notifyChange();
  }

  // For testing: access to speech recognition
  getSpeechRecognition(): MockSpeechRecognition {
    return this.speechRecognition;
  }

  // For testing: access to command processor
  getCommandProcessor(): CommandProcessor {
    return this.commandProcessor;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for testing
export { CommandProcessor, MockSpeechRecognition, ChatMessage, AssistantStatus, CommandResult };

// ============================================================================
// Voice Assistant UI
// ============================================================================

export function buildVoiceAssistant(a: App): void {
  const store = new VoiceAssistantStore();

  // Widget references for updates
  let statusLabel: Label | undefined;
  let statusIcon: Label | undefined;
  let messageList: any;
  let micButton: any;

  // Update UI elements
  const updateUI = async () => {
    if (statusLabel) {
      await statusLabel.setText(store.getStatusText());
    }
    if (statusIcon) {
      await statusIcon.setText(store.getStatusIcon());
    }
    if (messageList) {
      await messageList.update();
    }
    if (micButton) {
      const isListening = store.getIsListening();
      await micButton.setText(isListening ? '\u{1F534} Stop' : '\u{1F3A4} Listen');
    }
  };

  // Subscribe to store changes
  store.subscribe(updateUI);

  a.window({ title: 'Voice Assistant', width: 400, height: 600 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.hbox(() => {
          a.label('\u{1F916}').withId('header-icon');
          a.label('Voice Assistant').withId('header-title');
          a.spacer();
          a.button('\u{1F5D1}').withId('clear-btn')
            .onClick(async () => {
              store.clearHistory();
            });
        });

        a.separator();

        // Status bar
        a.hbox(() => {
          statusIcon = a.label(store.getStatusIcon()).withId('status-icon');
          statusLabel = a.label(store.getStatusText()).withId('status-label');
        });

        a.separator();

        // Chat messages area
        a.scroll(() => {
          messageList = a.vbox(() => {}).withId('message-list').bindTo({
            items: () => store.getMessages(),
            render: (msg: ChatMessage) => {
              const isUser = msg.type === 'user';
              a.hbox(() => {
                if (!isUser) {
                  a.label('\u{1F916}').withId(`avatar-${msg.id}`);
                }
                a.vbox(() => {
                  a.label(msg.text).withId(`text-${msg.id}`);
                  a.label(formatTime(msg.timestamp)).withId(`time-${msg.id}`);
                }).when(() => true);
                if (isUser) {
                  a.label('\u{1F464}').withId(`avatar-${msg.id}`);
                }
              });
            },
            trackBy: (msg: ChatMessage) => msg.id
          });
        });

        a.separator();

        // Control bar
        a.hbox(() => {
          a.spacer();
          micButton = a.button('\u{1F3A4} Listen').withId('mic-btn')
            .onClick(async () => {
              await store.toggleListening();
            });
          a.spacer();
        });

        // Quick commands
        a.hbox(() => {
          a.button('Time').withId('quick-time').onClick(async () => {
            store.addUserMessage('what is the time');
            const result = store.getCommandProcessor().process('what is the time');
            store.addAssistantMessage(result.response);
          });
          a.button('Date').withId('quick-date').onClick(async () => {
            store.addUserMessage('what is the date');
            const result = store.getCommandProcessor().process('what is the date');
            store.addAssistantMessage(result.response);
          });
          a.button('Weather').withId('quick-weather').onClick(async () => {
            store.addUserMessage('weather today');
            const result = store.getCommandProcessor().process('weather today');
            store.addAssistantMessage(result.response);
          });
          a.button('Joke').withId('quick-joke').onClick(async () => {
            store.addUserMessage('tell me a joke');
            const result = store.getCommandProcessor().process('tell me a joke');
            store.addAssistantMessage(result.response);
          });
        });
      });
    });
  });
}

// Helper function
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Export store class for testing
export { VoiceAssistantStore as Store };
