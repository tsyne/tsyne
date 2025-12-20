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
 * Telegram App
 *
 * A messaging application with chat list, message threads, and send functionality.
 * Implements pseudo-declarative pattern for Tsyne platform.
 *
 * @tsyne-app:name Telegram
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.597-.17 2.015l4.3 1.791 2.695 8.71c.213.64.915.967 1.51.744l3.44-1.777c.556-.287.802-.923.553-1.466L12.57 13.3l5.108-6.32c.592-.73-.128-1.751-1.013-1.263Z"/></svg>
 * @tsyne-app:category communications
 * @tsyne-app:builder createTelegramApp
 * @tsyne-app:args app
 * @tsyne-app:count single
 */

import { app } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import { ITelegramService, MockTelegramService, TelegramChat } from './telegram-service';

/**
 * Build the Telegram UI - Pseudo-declarative style
 */
export function createTelegramApp(a: App, telegram?: ITelegramService): void {
  const telegramService = telegram || new MockTelegramService();

  // Instance-local state
  let currentChatId: string | null = null;
  let titleLabel: any = undefined;
  let messageInputEntry: any = undefined;
  let contentContainer: any = undefined;

  // Subscribe to telegram service events
  const unsubscribeChatAdded = telegramService.onChatAdded(() => rebuildUI());
  const unsubscribeMessageAdded = telegramService.onMessageAdded(() => {
    if (currentChatId) {
      rebuildMessageView();
    }
  });
  const unsubscribeChatUpdated = telegramService.onChatUpdated(() => rebuildUI());

  function rebuildUI() {
    if (!contentContainer) return;
    contentContainer.destroyChildren?.();
    buildChatListView();
  }

  function rebuildMessageView() {
    if (!contentContainer) return;
    contentContainer.destroyChildren?.();
    buildMessageView();
  }

  function buildChatListView() {
    const chats = telegramService.getChats();

    a.vbox(() => {
      // Header
      a.label('💬 Telegram').withId('telegram-title');

      a.separator();

      // Action buttons
      a.hbox(() => {
        a.button('🔍').withId('btn-search');
        a.spacer();
        a.button('✏️').onClick(() => {
          showNewChatDialog();
        }).withId('btn-new-chat');
      });

      a.separator();

      // Chat list
      a.scroll(() => {
        a.vbox(() => {
          if (chats.length === 0) {
            a.label('No chats yet').withId('no-chats-label');
            return;
          }

          chats.forEach((chat) => {
            buildChatRow(chat);
          });
        });
      });
    });
  }

  function buildChatRow(chat: TelegramChat) {
    a.hbox(() => {
      // Avatar
      a.label(chat.avatar || '👤').withId(`chat-${chat.id}-avatar`);

      // Chat info
      a.vbox(() => {
        // Name and unread count
        a.hbox(() => {
          a.label(chat.name).withId(`chat-${chat.id}-name`);

          if (chat.unreadCount > 0) {
            a.label(`(${chat.unreadCount})`).withId(`chat-${chat.id}-unread`);
          }
        });

        // Last message preview
        a.label(chat.lastMessage).withId(`chat-${chat.id}-message`);

        // Time
        const timeStr = formatTime(chat.lastMessageTime);
        a.label(timeStr).withId(`chat-${chat.id}-time`);
      });

      a.spacer();

      // Open button
      a.button('→')
        .onClick(() => {
          currentChatId = chat.id;
          telegramService.markChatAsRead(chat.id);
          showChatView(chat);
        })
        .withId(`chat-${chat.id}-open`);
    });
  }

  function buildMessageView() {
    const messages = currentChatId ? telegramService.getMessages(currentChatId) : [];
    const currentChat = currentChatId ? telegramService.getChat(currentChatId) : null;

    a.vbox(() => {
      // Chat header
      titleLabel = a.label(`💬 ${currentChat?.name || 'Telegram'}`)
        .withId('chat-title');

      a.separator();

      // Messages
      a.scroll(() => {
        a.vbox(() => {
          if (messages.length === 0) {
            a.label('No messages yet').withId('no-messages-label');
            return;
          }

          messages.forEach((msg) => {
            buildMessageRow(msg);
          });
        });
      });

      a.separator();

      // Message input
      a.hbox(() => {
        messageInputEntry = a.entry('Type a message...')
          .withId('message-input');

        a.button('↩️')
          .onClick(() => sendMessage())
          .withId('btn-send');
      });
    });
  }

  function buildMessageRow(msg: any) {
    a.hbox(() => {
      if (msg.isOwn) {
        a.spacer();
      }

      a.vbox(() => {
        a.label(msg.text).withId(`message-${msg.id}`);

        const timeStr = formatTime(msg.timestamp);
        a.label(`${msg.sender} • ${timeStr}`)
          .withId(`message-${msg.id}-time`);
      });

      if (!msg.isOwn) {
        a.spacer();
      }
    });
  }

  function formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }

  function showChatView(chat: TelegramChat) {
    if (titleLabel) {
      titleLabel.setText(`💬 ${chat.name}`);
    }

    rebuildMessageView();

    if (messageInputEntry && messageInputEntry.focus) {
      setTimeout(() => messageInputEntry.focus?.(), 100);
    }
  }

  function sendMessage() {
    if (!currentChatId || !messageInputEntry) return;

    const text = messageInputEntry.getText?.() || '';
    if (!text.trim()) return;

    telegramService.sendMessage(currentChatId, text);
    messageInputEntry.setText?.('');
    rebuildMessageView();
  }

  function showNewChatDialog() {
    // Use a simple dialog for new chat
    const chatName = 'New Chat ' + new Date().getTime();
    telegramService.addChat(chatName);
  }

  a.window({ title: 'Telegram', width: 800, height: 600 }, (win: Window) => {
    win.setContent(() => {
      // Split view: chat list on left, messages on right
      a.hsplit(
        // Left: chat list
        () => {
          contentContainer = a.vbox(() => {
            buildChatListView();
          });
        },
        // Right: message view
        () => {
          a.vbox(() => {
            // Chat header
            titleLabel = a.label('💬 Telegram')
              .withId('chat-title');

            a.separator();

            // Messages
            a.scroll(() => {
              a.vbox(() => {
                a.label('Select a chat to view messages')
                  .withId('select-chat-label');
              });
            });

            a.separator();

            // Message input
            a.hbox(() => {
              messageInputEntry = a.entry('Type a message...')
                .withId('message-input');

              a.button('↩️')
                .onClick(() => sendMessage())
                .withId('btn-send');
            });
          });
        },
        350 // offset for left pane
      );
    });

    win.show();
  });

  // Cleanup function
  const cleanup = () => {
    unsubscribeChatAdded();
    unsubscribeMessageAdded();
    unsubscribeChatUpdated();
  };

  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Telegram' }, (a: App) => {
    const telegramService = new MockTelegramService();
    createTelegramApp(a, telegramService);
  });
}
