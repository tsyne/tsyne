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

import { app, styles, FontStyle } from '../../src';
import type { App } from '../../src';
import type { Window } from '../../src';
import type { Label } from '../../src';
import type { VBox } from '../../src';
import type { Conversation, Message } from './signal-service';
import { ISignalService, MockSignalService } from './signal-service';

// Define Signal app styles
styles({
  'signal-header': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 20,
  },
  'signal-subtitle': {
    text_align: 'center',
    font_style: FontStyle.ITALIC,
    font_size: 10,
  },
  'conversation-name': {
    font_style: FontStyle.BOLD,
    font_size: 14,
  },
  'conversation-preview': {
    font_size: 12,
  },
  'message-own': {
    text_align: 'right',
    font_size: 11,
  },
  'message-other': {
    text_align: 'left',
    font_size: 11,
  },
  'timestamp': {
    font_size: 9,
    font_style: FontStyle.ITALIC,
  },
  'unread-badge': {
    font_style: FontStyle.BOLD,
    font_size: 10,
  },
});

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
    if (!conversationListContainer) return;

    conversationListContainer.destroyChildren?.();

    const conversations = signal.getConversations();

    if (conversations.length === 0) {
      a.label('No conversations yet. Start a new one!').withId('label-no-conversations');
      return;
    }

    conversations.forEach((conv) => {
      buildConversationRow(conv);
    });
  }

  function buildConversationRow(conv: Conversation) {
    a.hbox(() => {
      a.vbox(() => {
        a.hbox(() => {
          a.label(conv.participantName)
            .withId(`conv-${conv.id}-name`)
            .addClass('conversation-name');

          a.spacer();

          if (conv.unreadCount > 0) {
            a.label(`(${conv.unreadCount})`)
              .withId(`conv-${conv.id}-unread`)
              .addClass('unread-badge');
          }

          a.label('🔒')
            .withId(`conv-${conv.id}-encrypted`)
            .addClass('timestamp');
        });

        const preview = conv.lastMessage?.content.substring(0, 50) || 'No messages';
        const time = conv.lastMessageTime ? formatTime(conv.lastMessageTime) : '';

        a.label(`${preview}...`)
          .withId(`conv-${conv.id}-preview`)
          .addClass('conversation-preview');

        a.label(time)
          .withId(`conv-${conv.id}-time`)
          .addClass('timestamp');
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
    if (!messagesContainer || !currentConversationId) return;

    messagesContainer.destroyChildren?.();

    const messages = signal.getMessages(currentConversationId);

    if (messages.length === 0) {
      a.label('No messages yet').withId('label-no-messages');
      return;
    }

    messages.forEach((msg) => {
      buildMessageRow(msg);
    });
  }

  function buildMessageRow(msg: Message) {
    const isOwn = msg.senderId === 'me';
    const senderLabel = isOwn ? 'You' : msg.senderName;

    a.hbox(() => {
      if (!isOwn) {
        a.label(senderLabel)
          .withId(`msg-${msg.id}-sender`)
          .addClass('conversation-name');
      } else {
        a.spacer();
      }

      a.vbox(() => {
        a.label(msg.content)
          .withId(`msg-${msg.id}-content`)
          .addClass(isOwn ? 'message-own' : 'message-other');

        a.label(`${msg.senderName} • ${formatTime(msg.timestamp)}${msg.isEncrypted ? ' 🔒' : ''}`)
          .withId(`msg-${msg.id}-meta`)
          .addClass('timestamp');
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
      // In a real app, would show a dialog
      console.log('No contacts available');
      return;
    }

    // Simple selection - in real app would be a list dialog
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
        a.label('📱 Signal').withId('signal-title').addClass('signal-header');
        a.label('End-to-End Encrypted Messaging').withId('signal-subtitle').addClass('signal-subtitle');
        a.separator();

        // View state indicator
        a.hbox(() => {
          currentViewLabel = a
            .label('💬 Conversations')
            .withId('signal-view-label')
            .addClass('conversation-name');

          a.spacer();

          a.button('🔄')
            .onClick(() => updateConversationList())
            .withId('btn-refresh');
        });

        a.separator();

        // Messages area (hidden initially, shown when conversation selected)
        a.scroll(() => {
          messagesContainer = a.vbox(() => {
            // Messages will be populated here
          }) as any;
        })
          .when(() => currentConversationId !== null)
          .withId('messages-scroll');

        // Conversations list (hidden when viewing messages)
        a.scroll(() => {
          conversationListContainer = a.vbox(() => {
            // Conversations will be populated here
          }) as any;
        })
          .when(() => currentConversationId === null)
          .withId('conversations-scroll');

        a.separator();

        // Input area (only shown when viewing a conversation)
        a.hbox(() => {
          messageInputEntry = a
            .entry('Type message...')
            .withId('message-input');

          a.button('Send')
            .onClick(() => sendMessage())
            .withId('btn-send-message');
        })
          .when(() => currentConversationId !== null)
          .withId('input-area');

        // Conversation list controls (only shown when viewing list)
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
            .when(() => currentConversationId !== null)
            .withId('btn-back');
        })
          .when(() => currentConversationId === null)
          .withId('control-area');
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
  app({ title: 'Signal' }, (a: App) => {
    createSignalApp(a);
  });
}
