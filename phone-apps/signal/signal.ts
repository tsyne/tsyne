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
 * Signal Messaging App - Tsyne Port
 *
 * A pseudo-declarative encrypted messaging application for Tsyne.
 * Ported from https://git.sr.ht/~nicohman/signal-rs
 *
 * @tsyne-app:name Signal
 * @tsyne-app:icon message
 * @tsyne-app:category Communication
 * @tsyne-app:builder createSignalApp
 * @tsyne-app:args app
 * @tsyne-app:count single
 */

import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import type { Label } from '../../core/src';
import type { VBox } from '../../core/src';
import type { Conversation, Message } from './signal-service';
import { ISignalService, MockSignalService } from './signal-service';

/**
 * Build the Signal messaging app
 */
export function createSignalApp(a: App): void {
  const signal: ISignalService = new MockSignalService();

  // UI state
  let conversationListContainer: VBox | undefined;
  let messagesContainer: VBox | undefined;
  let messageInputEntry: any | undefined;
  let statusLabel: Label | undefined;
  let currentConversationId: string | null = null;
  let currentConversationName: string | null = null;
  let currentViewLabel: Label | undefined;

  // Subscribe to updates
  const unsubConversations = signal.onConversationUpdated(() => updateConversationList());
  const unsubMessages = signal.onMessageReceived(() => {
    if (currentConversationId) {
      updateMessages();
    }
  });

  function formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  }

  function updateConversationList() {
    const container = conversationListContainer;
    if (!container) return;

    // Clear existing conversation rows
    container.removeAll();

    const conversations = signal.getConversations();

    // Update status label
    if (statusLabel) {
      statusLabel.setText(`${conversations.length} conversations`);
    }

    if (conversations.length === 0) {
      container.add(() => {
        a.label('No conversations yet. Start a new one!').withId('label-no-conversations');
      });
      return;
    }

    conversations.forEach((conv) => {
      container.add(() => {
        buildConversationRow(conv);
      });
    });
  }

  function buildConversationRow(conv: Conversation) {
    a.hbox(() => {
      a.vbox(() => {
        a.hbox(() => {
          a.label(conv.participantName)
            .withId(`conv-${conv.id}-name`);

          a.spacer();

          if (conv.unreadCount > 0) {
            a.label(`(${conv.unreadCount})`)
              .withId(`conv-${conv.id}-unread`);
          }

          a.label('🔒')
            .withId(`conv-${conv.id}-encrypted`);
        });

        const preview = conv.lastMessage?.content.substring(0, 50) || 'No messages';
        const time = conv.lastMessageTime ? formatTime(conv.lastMessageTime) : '';

        a.label(`${preview}...`)
          .withId(`conv-${conv.id}-preview`);

        a.label(time)
          .withId(`conv-${conv.id}-time`);
      });

      a.spacer();

      a.hbox(() => {
        a.button('→')
          .onClick(() => {
            currentConversationId = conv.id;
            currentConversationName = conv.participantName;
            updateCurrentViewLabel();
            updateMessages();
          })
          .withId(`conv-${conv.id}-open`);

        a.button('🗑')
          .onClick(() => {
            signal.deleteConversation(conv.id);
            updateConversationList();
          })
          .withId(`conv-${conv.id}-delete`);
      });
    });
  }

  function updateMessages() {
    const container = messagesContainer;
    if (!container || !currentConversationId) return;

    // Clear existing messages
    container.removeAll();

    const messages = signal.getMessages(currentConversationId);

    if (messages.length === 0) {
      container.add(() => {
        a.label('No messages yet').withId('label-no-messages');
      });
      return;
    }

    messages.forEach((msg) => {
      container.add(() => {
        buildMessageRow(msg);
      });
    });
  }

  function buildMessageRow(msg: Message) {
    const isOwn = msg.senderId === 'me';
    const senderLabel = isOwn ? 'You' : msg.senderName;

    a.hbox(() => {
      if (!isOwn) {
        a.label(senderLabel)
          .withId(`msg-${msg.id}-sender`);
      } else {
        a.spacer();
      }

      a.vbox(() => {
        a.label(msg.content)
          .withId(`msg-${msg.id}-content`);

        a.label(`${msg.senderName} • ${formatTime(msg.timestamp)}${msg.isEncrypted ? ' 🔒' : ''}`)
          .withId(`msg-${msg.id}-meta`);
      });

      if (isOwn) {
        a.spacer();
      }
    });
  }

  function updateCurrentViewLabel() {
    if (currentViewLabel && currentConversationName) {
      currentViewLabel.setText(`💬 ${currentConversationName}`);
    }
  }

  function showNewConversationDialog() {
    const contacts = signal.getContacts();
    if (contacts.length === 0) {
      console.log('No contacts available');
      return;
    }

    // Simple selection - use first available contact
    const contact = contacts[0];
    const conversation = signal.createConversation(contact.id);
    currentConversationId = conversation.id;
    currentConversationName = conversation.participantName;
    updateCurrentViewLabel();
    updateMessages();
    updateConversationList();
  }

  function sendMessage() {
    if (!messageInputEntry || !currentConversationId) return;

    const text = messageInputEntry.getText?.() || '';
    if (!text.trim()) return;

    signal.sendMessage(currentConversationId, text);
    messageInputEntry.setText('');
    updateMessages();
    updateConversationList();
  }

  a.window({ title: 'Signal Messenger', width: 400, height: 700 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('📱 Signal').withId('signal-title');
        a.label('End-to-End Encrypted Messaging').withId('signal-subtitle');
        a.separator();

        // View state indicator
        a.hbox(() => {
          currentViewLabel = a
            .label('💬 Conversations')
            .withId('signal-view-label');

          a.spacer();

          a.button('🔄')
            .onClick(() => updateConversationList())
            .withId('btn-refresh');
        });

        a.separator();

        // Messages area
        a.scroll(() => {
          messagesContainer = a.vbox(() => {
            // Messages will be populated here
          }) as any;
        })
          .withId('messages-scroll');

        // Conversations list
        a.scroll(() => {
          conversationListContainer = a.vbox(() => {
            // Conversations will be populated here
          }) as any;
        })
          .withId('conversations-scroll');

        a.separator();

        // Input area
        a.hbox(() => {
          messageInputEntry = a
            .entry('Type message...')
            .withId('message-input');

          a.button('Send')
            .onClick(() => sendMessage())
            .withId('btn-send-message');
        });
        a.label('').withId('input-area');  // Marker for input area

        // Conversation list controls
        a.hbox(() => {
          statusLabel = a.label(`${signal.getConversations().length} conversations`).withId('signal-status');

          a.spacer();

          a.button('➕')
            .onClick(() => showNewConversationDialog())
            .withId('btn-new-conversation');

          a.button('←')
            .onClick(() => {
              currentConversationId = null;
              currentConversationName = null;
              updateCurrentViewLabel();
            })
            .withId('btn-back');
        });
        a.label('').withId('control-area');  // Marker for control area
      });
    });

    win.show();

    // Initial display
    updateConversationList();
  });

  // Cleanup
  const cleanup = () => {
    unsubConversations();
    unsubMessages();
  };

  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport  } = require('../../core/src');
  app(resolveTransport(), { title: 'Signal' }, (a: any) => {
    createSignalApp(a);
  });
}
