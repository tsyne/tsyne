/*
 * WhatsApp App for Tsyne
 *
 * A messaging application ported from waha-tui to Tsyne's pseudo-declarative UI.
 * Uses WAHA (WhatsApp HTTP API) backend or mock service for testing.
 *
 * Copyright Paul Hammant 2025
 * Licensed under GNU General Public License v3
 */

/**
 * WhatsApp App
 *
 * A messaging application with chat list, message threads, and send functionality.
 * Implements pseudo-declarative pattern for Tsyne platform.
 *
 * @tsyne-app:name WhatsApp
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
 * @tsyne-app:category communications
 * @tsyne-app:builder createWhatsAppApp
 * @tsyne-app:args app
 * @tsyne-app:count single
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import {
  IWhatsAppService,
  MockWhatsAppService,
  WhatsAppChat,
  WhatsAppMessage,
  ChatFilter,
  loadConfigFromEnv,
  createRealWhatsAppService,
} from './whatsapp-service';
import * as QRCode from 'qrcode';

/**
 * Build the WhatsApp UI - Pseudo-declarative style
 */
export function createWhatsAppApp(a: App, whatsAppService?: IWhatsAppService): void {
  // Use provided service, or real service if config available, or mock
  const service: IWhatsAppService = whatsAppService ?? (() => {
    const config = loadConfigFromEnv();
    if (config) {
      console.log('Using real WhatsApp service with WAHA at', config.wahaUrl);
      return createRealWhatsAppService(config);
    }
    console.log('No WAHA_URL found, using mock service');
    return new MockWhatsAppService();
  })();

  // Instance-local state
  let currentChatId: string | null = null;
  let currentFilter: ChatFilter = 'all';
  let searchQuery: string = '';
  let mainWindow: any = undefined;
  let qrCodeImage: any = undefined;
  let loginErrorLabel: any = undefined;
  let messageInputEntry: any = undefined;
  let messageScrollContainer: any = undefined;
  let searchEntry: any = undefined;
  let replyingToMessage: WhatsAppMessage | null = null;

  // Subscribe to service events
  const unsubscribeChatsChanged = service.onChatsChanged(() => rebuildUI());
  const unsubscribeMessageAdded = service.onMessageAdded(() => {
    if (currentChatId) {
      rebuildUI();
      scrollToBottom();
    }
  });
  const unsubscribeMessageUpdated = service.onMessageUpdated(() => {
    if (currentChatId) {
      rebuildUI();
    }
  });
  const unsubscribeLoginState = service.onLoginStateChanged((loggedIn) => {
    if (loggedIn) {
      rebuildUI();
    }
  });
  const unsubscribeQrCode = service.onQrCodeUpdate(async (qr) => {
    await updateQrCodeImage(qr.data);
  });
  const unsubscribeTyping = service.onTypingIndicator((chatId, participants) => {
    const chat = service.getChat(chatId);
    if (chat) {
      chat.typingParticipants = participants;
      if (currentChatId === chatId) {
        rebuildUI();
      }
    }
  });

  async function updateQrCodeImage(data: string): Promise<void> {
    if (!qrCodeImage) return;
    try {
      const dataUrl = await QRCode.toDataURL(data, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      qrCodeImage.updateImage?.(dataUrl);
    } catch (e) {
      console.error('Failed to generate QR code:', e);
    }
  }

  function scrollToBottom(): void {
    if (messageScrollContainer) {
      setTimeout(() => {
        messageScrollContainer.scrollToBottom();
      }, 100);
    }
  }

  function rebuildUI(): void {
    if (!mainWindow) return;
    mainWindow.setContent(() => {
      buildWindowContent();
    });
  }

  function buildWindowContent(): void {
    const isLoggedIn = service.isLoggedIn();

    a.hsplit(
      // Left pane: chat list or login
      () => {
        if (isLoggedIn) {
          buildChatListView();
        } else {
          a.border({
            center: () => buildLoginView(),
          });
        }
      },
      // Right pane: conversation
      () => {
        buildConversationView();
      },
      0.35 // Left pane takes 35%
    );
  }

  // ============================================
  // Login View
  // ============================================

  function buildLoginView(): void {
    a.vbox(() => {
      a.label('WhatsApp').withId('whatsapp-title');
      a.separator();
      a.spacer();

      a.vbox(() => {
        a.label('Sign in to WhatsApp').withId('login-header');
        a.label('Scan QR code with your phone').withId('login-subtitle');
        a.separator();

        // QR code placeholder
        qrCodeImage = a
          .image(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          )
          .withId('qr-code');

        loginErrorLabel = a.label('').withId('login-error');

        a.label('1. Open WhatsApp on your phone').withId('qr-step-1');
        a.label('2. Go to Settings > Linked Devices').withId('qr-step-2');
        a.label('3. Tap "Link a Device"').withId('qr-step-3');
        a.label('4. Point your phone at this screen').withId('qr-step-4');

        // Start QR login
        setTimeout(async () => {
          loginErrorLabel?.setText?.('Generating QR code...');
          const result = await service.startQrLogin();
          if (result.success && result.qr) {
            await updateQrCodeImage(result.qr.data);
            loginErrorLabel?.setText?.('Scan to log in');
          } else if (result.error) {
            loginErrorLabel?.setText?.(result.error);
          }
        }, 100);
      });

      a.spacer();
    });
  }

  // ============================================
  // Chat List View
  // ============================================

  function buildChatListView(): void {
    a.border({
      top: () => {
        a.vbox(() => {
          // Header
          a.hbox(() => {
            a.label('WhatsApp').withId('whatsapp-title');
            a.spacer();
            a.button('🚪')
              .onClick(async () => {
                await service.logout();
                rebuildUI();
              })
              .withId('btn-logout');
          });

          a.separator();

          // Search bar
          a.hbox(() => {
            searchEntry = a
              .entry('Search chats...', async () => {
                const text = (await searchEntry?.getText?.()) || '';
                searchQuery = text;
                rebuildUI();
              }, 200)
              .withId('search-input');

            a.button('🔍')
              .onClick(async () => {
                const text = (await searchEntry?.getText?.()) || '';
                searchQuery = text;
                rebuildUI();
              })
              .withId('btn-search');
          });

          a.separator();

          // Filter tabs
          a.hbox(() => {
            buildFilterButton('All', 'all');
            buildFilterButton('Unread', 'unread');
            buildFilterButton('Groups', 'groups');
            buildFilterButton('Archived', 'archived');
          });

          a.separator();
        });
      },
      center: () => {
        // Chat list
        a.scroll(() => {
          a.vbox(() => {}).bindTo({
            items: () => getFilteredChats(),
            empty: () => {
              a.label(searchQuery ? 'No chats found' : 'No chats').withId('no-chats-label');
            },
            render: (chat: WhatsAppChat) => {
              buildChatRow(chat);
            },
            trackBy: (chat: WhatsAppChat) => chat.id,
          });
        });
      },
    });
  }

  function buildFilterButton(label: string, filter: ChatFilter): void {
    const isActive = currentFilter === filter;
    a.button(isActive ? `[${label}]` : label)
      .onClick(() => {
        currentFilter = filter;
        rebuildUI();
      })
      .withId(`btn-filter-${filter}`);
  }

  function getFilteredChats(): WhatsAppChat[] {
    let chats = service.getChats(currentFilter);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      chats = chats.filter(
        (c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
      );
    }

    return chats;
  }

  function buildChatRow(chat: WhatsAppChat): void {
    const isSelected = currentChatId === chat.id;
    const hasUnread = chat.unreadCount > 0;

    a.border({
      left: () => {
        a.label(chat.avatar || (chat.isGroup ? '👥' : '👤')).withId(`chat-${chat.id}-avatar`);
      },
      center: () => {
        a.vbox(() => {
          // Chat name with unread indicator
          const nameDisplay = hasUnread ? `● ${chat.name}` : chat.name;
          a.label(nameDisplay, undefined, 'leading', 'break').withId(`chat-${chat.id}-name`);

          // Last message preview with typing indicator
          let preview = chat.lastMessage;
          if (chat.typingParticipants && chat.typingParticipants.length > 0) {
            preview = 'typing...';
          }
          a.label(truncateText(preview, 30), undefined, 'leading', 'break').withId(
            `chat-${chat.id}-preview`
          );
        });
      },
      right: () => {
        a.vbox(() => {
          // Time
          a.label(formatTime(chat.lastMessageTime)).withId(`chat-${chat.id}-time`);

          // Unread badge
          if (hasUnread) {
            a.label(`(${chat.unreadCount})`).withId(`chat-${chat.id}-unread`);
          }
        });
      },
    });

    // Make the whole row clickable via a button overlay
    a.button(isSelected ? '●' : '→')
      .onClick(async () => {
        currentChatId = chat.id;
        await service.markChatAsRead(chat.id);
        await service.loadMessages(chat.id);
        rebuildUI();
        scrollToBottom();
      })
      .withId(`chat-${chat.id}-open`);

    a.separator();
  }

  // ============================================
  // Conversation View
  // ============================================

  function buildConversationView(): void {
    const chat = currentChatId ? service.getChat(currentChatId) : null;
    const isLoggedIn = service.isLoggedIn();

    a.border({
      top: () => {
        a.vbox(() => {
          // Chat header
          if (chat) {
            a.hbox(() => {
              a.label(chat.avatar || '👤').withId('chat-avatar');
              a.vbox(() => {
                a.label(chat.name).withId('chat-title');
                // Typing indicator
                if (chat.typingParticipants && chat.typingParticipants.length > 0) {
                  a.label('typing...').withId('typing-indicator');
                }
              });
              a.spacer();
              // Chat actions
              a.button('📋')
                .onClick(() => {
                  // Could show chat info
                })
                .withId('btn-chat-info');
            });
          } else {
            a.label('WhatsApp').withId('chat-title');
          }
          a.separator();
        });
      },
      center: () => {
        // Message list
        messageScrollContainer = a.scroll(() => {
          a.vbox(() => {}).bindTo({
            items: () => (currentChatId ? service.getMessages(currentChatId) : []),
            empty: () => {
              if (!isLoggedIn) {
                a.label('Please log in to start messaging').withId('login-prompt-label');
              } else if (!currentChatId) {
                a.label('Select a chat to view messages').withId('select-chat-label');
              } else {
                a.label('No messages yet').withId('no-messages-label');
              }
            },
            render: (msg: WhatsAppMessage, index: number) => {
              const messages = currentChatId ? service.getMessages(currentChatId) : [];
              const isLast = index === messages.length - 1;
              buildMessageRow(msg, isLast);
            },
            trackBy: (msg: WhatsAppMessage) => msg.id,
          });
        });
      },
      bottom: () => {
        a.vbox(() => {
          a.separator();

          // Reply preview
          if (replyingToMessage) {
            const replyMsg = replyingToMessage; // Capture for closure
            a.hbox(() => {
              a.vbox(() => {
                a.label(`↩️ Replying to ${replyMsg.senderName || 'message'}`).withId(
                  'reply-header'
                );
                a.label(truncateText(replyMsg.text, 50)).withId('reply-preview');
              });
              a.button('✕')
                .onClick(() => {
                  replyingToMessage = null;
                  rebuildUI();
                })
                .withId('btn-cancel-reply');
            });
            a.separator();
          }

          // Message input
          a.hbox(() => {
            messageInputEntry = a
              .entry(isLoggedIn ? 'Type a message...' : 'Log in to send messages', undefined, 400)
              .withId('message-input');

            a.button('📎')
              .onClick(() => {
                // Could add attachment picker
              })
              .withId('btn-attach');

            a.button('↩️')
              .onClick(() => sendMessage())
              .withId('btn-send');
          });
        });
      },
    });
  }

  function buildMessageRow(msg: WhatsAppMessage, isLast: boolean = false): void {
    const timeStr = formatTime(msg.timestamp);
    const alignment = msg.isOwn ? 'trailing' : 'leading';

    const buildContent = () => {
      a.vbox(() => {
        // Reply quote if present
        if (msg.replyToText) {
          a.label(`↩️ ${truncateText(msg.replyToText, 30)}`, undefined, alignment).withId(
            `message-${msg.id}-reply`
          );
        }

        // Media indicator
        if (msg.mediaType) {
          a.label(`[${msg.mediaType}]`, undefined, alignment).withId(`message-${msg.id}-media`);
        }

        // Message text
        if (msg.isRevoked) {
          a.label('🚫 This message was deleted', undefined, alignment).withId(`message-${msg.id}`);
        } else if (msg.text) {
          a.label(msg.text, undefined, alignment, 'word').withId(`message-${msg.id}`);
        }

        // Reactions
        if (msg.reactions && msg.reactions.length > 0) {
          const reactionStr = msg.reactions.map((r) => r.emoji).join(' ');
          a.label(reactionStr, undefined, alignment).withId(`message-${msg.id}-reactions`);
        }

        // Time + ack status
        const ackIcon = getAckIcon(msg.ack);
        a.label(`${msg.senderName || 'Unknown'} • ${timeStr} ${ackIcon}`, undefined, alignment).withId(
          `message-${msg.id}-time`
        );

        // Quick actions (reply, react)
        if (!msg.isRevoked) {
          a.hbox(() => {
            a.button('↩️')
              .onClick(() => {
                replyingToMessage = msg;
                rebuildUI();
              })
              .withId(`message-${msg.id}-reply-btn`);

            a.button('👍')
              .onClick(async () => {
                if (currentChatId) {
                  await service.reactToMessage(currentChatId, msg.id, '👍');
                }
              })
              .withId(`message-${msg.id}-react-btn`);
          }).when(() => msg.isOwn ? false : true); // Show actions for received messages
        }
      });
    };

    // Layout: own messages right-aligned, others left-aligned
    if (msg.isOwn) {
      a.hsplit(
        () => {
          a.spacer();
        },
        buildContent,
        0.15,
        true
      );
    } else {
      a.hsplit(
        buildContent,
        () => {
          a.spacer();
        },
        0.85,
        true
      );
    }

    if (!isLast) {
      a.separator();
    }
  }

  async function sendMessage(): Promise<void> {
    if (!currentChatId || !messageInputEntry) return;

    const text = (await messageInputEntry.getText?.()) || '';
    if (!text.trim()) return;

    const replyToId = replyingToMessage?.id;
    replyingToMessage = null;

    await service.sendMessage(currentChatId, text, replyToId);
    await messageInputEntry.setText?.('');
    rebuildUI();
    scrollToBottom();
  }

  // ============================================
  // Helper Functions
  // ============================================

  function formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;

    return date.toLocaleDateString();
  }

  function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  function getAckIcon(ack?: number): string {
    switch (ack) {
      case 0:
        return '🕐'; // Pending
      case 1:
        return '✓'; // Sent
      case 2:
        return '✓✓'; // Delivered
      case 3:
        return '✓✓'; // Read (could use blue ticks in real impl)
      default:
        return '';
    }
  }

  // ============================================
  // Main Window
  // ============================================

  a.window({ title: 'WhatsApp', width: 900, height: 700 }, (win: Window) => {
    mainWindow = win;
    win.setContent(() => {
      buildWindowContent();
    });
    win.show();
  });

  // Cleanup function
  const cleanup = () => {
    unsubscribeChatsChanged();
    unsubscribeMessageAdded();
    unsubscribeMessageUpdated();
    unsubscribeLoginState();
    unsubscribeQrCode();
    unsubscribeTyping();
    service.cancelQrLogin();
    service.disconnect();
  };

  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'WhatsApp' }, (a: App) => {
    createWhatsAppApp(a);
  });
}
