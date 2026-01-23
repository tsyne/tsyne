/**
 * ELIZA - Classic Pattern Matching Chatbot
 *
 * A Tsyne port of Joseph Weizenbaum's 1966 ELIZA chatbot.
 * Simulates a Rogerian psychotherapist using pattern matching
 * and symbolic processing.
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name ELIZA
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/><circle cx="8" cy="10" r="1.5"/><circle cx="12" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder createElizaApp
 * @tsyne-app:args app
 * @tsyne-app:count many
 */

import { app, resolveTransport  } from 'tsyne';
import type { App, Window, Label, Entry, VBox } from 'tsyne';
import { elizaResponse, getInitialGreeting, isQuitCommand } from './eliza-engine';

/** Message in the conversation */
interface ChatMessage {
  sender: 'user' | 'eliza';
  text: string;
  timestamp: Date;
}

/**
 * ELIZA Chat UI
 *
 * Uses pseudo-declarative message rendering with bindTo pattern.
 */
export class ElizaUI {
  private messages: ChatMessage[] = [];
  private inputEntry: Entry | null = null;
  private messageContainer: VBox | null = null;
  private statusLabel: Label | null = null;
  private window: Window | null = null;
  private debugMode = false;

  constructor(private a: App) {
    // Add initial greeting
    this.messages.push({
      sender: 'eliza',
      text: getInitialGreeting(),
      timestamp: new Date(),
    });
  }

  /**
   * Send a message and get ELIZA's response
   */
  async sendMessage(text: string): Promise<void> {
    if (!text.trim()) return;

    // Add user message
    this.messages.push({
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    });

    // Get ELIZA response
    const result = elizaResponse(text);

    if (result.response === null) {
      // User wants to quit
      this.messages.push({
        sender: 'eliza',
        text: 'Goodbye. It was nice talking to you.',
        timestamp: new Date(),
      });
      this.updateStatus('Session ended');
    } else {
      // Add debug info if enabled
      if (this.debugMode && result.debug) {
        this.messages.push({
          sender: 'eliza',
          text: `[Pattern: "${result.debug.pattern}" | Rank: ${result.debug.rank}${result.debug.matches.length > 0 ? ` | Matches: ${result.debug.matches.join(', ')}` : ''}]`,
          timestamp: new Date(),
        });
      }

      // Add ELIZA response
      this.messages.push({
        sender: 'eliza',
        text: result.response,
        timestamp: new Date(),
      });
    }

    // Refresh the message display
    this.refreshMessages();
  }

  /**
   * Toggle debug mode
   */
  toggleDebug(): void {
    this.debugMode = !this.debugMode;
    this.updateStatus(this.debugMode ? 'Debug mode: ON' : 'Debug mode: OFF');
  }

  /**
   * Clear the conversation
   */
  clearConversation(): void {
    this.messages = [
      {
        sender: 'eliza',
        text: getInitialGreeting(),
        timestamp: new Date(),
      },
    ];
    this.refreshMessages();
    this.updateStatus('Conversation cleared');
  }

  /**
   * Update status label
   */
  private updateStatus(text: string): void {
    if (this.statusLabel) {
      this.statusLabel.setText(text);
    }
  }

  /**
   * Refresh the message display
   */
  private refreshMessages(): void {
    if (!this.messageContainer) return;

    // Clear and rebuild messages
    this.messageContainer.removeAll();

    // Show last N messages (scrollable area)
    const displayMessages = this.messages.slice(-20);

    for (const msg of displayMessages) {
      this.messageContainer.add(() => {
        const prefix = msg.sender === 'user' ? 'You: ' : 'ELIZA: ';
        const isDebug = msg.sender === 'eliza' && msg.text.startsWith('[');
        this.a.label(prefix + msg.text, undefined, undefined, 'word', {
          italic: isDebug,
        });
      });
    }

    this.messageContainer.refresh();
  }

  /**
   * Build the UI
   */
  build(): void {
    this.a.window(
      { title: 'ELIZA - Classic Pattern Matching Chatbot', width: 500, height: 600 },
      (win) => {
        this.window = win;

        win.setContent(() => {
          this.a.vbox(() => {
            // Toolbar
            this.a.hbox(() => {
              this.a.button('Clear').onClick(() => this.clearConversation()).withId('btn-clear');
              this.a.button('Debug').onClick(() => this.toggleDebug()).withId('btn-debug');
              this.a.spacer();
              this.statusLabel = this.a.label('Ready').withId('status');
            });

            this.a.separator();

            // Message display area with scroll
            this.a.scroll(() => {
              this.messageContainer = this.a.vbox(() => {
                // Initial message
                this.a.label('ELIZA: ' + getInitialGreeting(), undefined, undefined, 'word');
              });
            }).withMinSize(400, 400);

            this.a.separator();

            // Input area
            this.a.hbox(() => {
              this.a.label('You:');
              this.inputEntry = this.a.entry(
                '',
                async (text: string) => {
                  await this.sendMessage(text);
                  // Clear input
                  if (this.inputEntry) {
                    this.inputEntry.setText('');
                  }
                },
                250
              ).withId('input');
              this.a.button('Send').onClick(async () => {
                if (this.inputEntry) {
                  const text = await this.inputEntry.getText();
                  await this.sendMessage(text);
                  this.inputEntry.setText('');
                }
              }).withId('btn-send');
            });

            // Help text
            this.a.label(
              'Type a message and press Enter. Try: "I am feeling sad" or "I remember my childhood"',
              undefined,
              undefined,
              'word',
              { italic: true }
            ).withId('help-text');
          });
        });

        win.show();
      }
    );
  }
}

/**
 * Create the ELIZA app
 */
export function createElizaApp(a: App): ElizaUI {
  const ui = new ElizaUI(a);
  ui.build();
  return ui;
}

// Standalone entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'ELIZA' }, (a) => {
    createElizaApp(a);
  });
}
