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

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import { ITelegramService, MockTelegramService, TelegramChat, QrLoginResult, RealTelegramService, loadCredentialsFromEnv } from './telegram-service';
import * as QRCode from 'qrcode';

/**
 * Build the Telegram UI - Pseudo-declarative style
 */
export function createTelegramApp(a: App, telegram?: ITelegramService): void {
  // Use provided service, or try real service with env credentials, or fall back to mock
  let telegramService: ITelegramService;
  if (telegram) {
    telegramService = telegram;
  } else {
    const creds = loadCredentialsFromEnv();
    if (creds) {
      console.log('Using real Telegram service with credentials from environment');
      telegramService = new RealTelegramService(creds);
    } else {
      console.log('No TELEGRAM_API_ID/TELEGRAM_API_HASH found, using mock service');
      telegramService = new MockTelegramService();
    }
  }

  // Instance-local state
  let currentChatId: string | null = null;
  let titleLabel: any = undefined;
  let messageInputEntry: any = undefined;
  let contentContainer: any = undefined;
  let mainWindow: any = undefined;
  let loginState: 'qr' | 'phone' | 'code' | 'logged_in' = telegramService.isLoggedIn() ? 'logged_in' : 'qr';
  let phoneInputEntry: any = undefined;
  let codeInputEntry: any = undefined;
  let loginErrorLabel: any = undefined;
  let qrCodeImage: any = undefined;
  let currentQrData: QrLoginResult | null = null;
  let messageScrollContainer: any = undefined;

  // Subscribe to telegram service events
  const unsubscribeChatAdded = telegramService.onChatAdded(() => rebuildUI());
  const unsubscribeMessageAdded = telegramService.onMessageAdded(() => {
    if (currentChatId) {
      rebuildUI();
      // Scroll to bottom to show new messages
      if (messageScrollContainer) {
        setTimeout(() => {
          messageScrollContainer.scrollToBottom();
        }, 100);
      }
    }
  });
  const unsubscribeChatUpdated = telegramService.onChatUpdated(() => rebuildUI());
  const unsubscribeLoginState = telegramService.onLoginStateChanged((loggedIn) => {
    loginState = loggedIn ? 'logged_in' : 'qr';
    currentQrData = null;
    rebuildUI();
  });
  const unsubscribeQrCode = telegramService.onQrCodeUpdate(async (qr) => {
    currentQrData = qr;
    await updateQrCodeImage();
  });

  async function updateQrCodeImage(): Promise<void> {
    if (!qrCodeImage || !currentQrData) return;
    try {
      const dataUrl = await QRCode.toDataURL(currentQrData.url, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      qrCodeImage.updateImage?.(dataUrl);
    } catch (e) {
      console.error('Failed to generate QR code:', e);
    }
  }

  function rebuildUI() {
    if (!mainWindow) return;
    mainWindow.setContent(() => {
      buildWindowContent();
    });
  }

  function buildWindowContent() {
    // Split view: chat list/login on left, messages on right
    a.hsplit(
      // Left: chat list or login (use border layout directly so it expands)
      () => {
        if (loginState === 'logged_in') {
          buildChatListView();
        } else {
          // Wrap login view in border so it expands
          a.border({
            center: () => {
              buildLoginView();
            }
          });
        }
      },
      // Right: message view
      () => {
        a.border({
          top: () => {
            a.vbox(() => {
              // Chat header
              titleLabel = a.label('💬 Telegram')
                .withId('chat-title');
              a.separator();
            });
          },
          center: () => {
            // Message list - use bindTo for dynamic updates
            messageScrollContainer = a.scroll(() => {
              a.vbox(() => {}).bindTo({
                items: () => currentChatId ? telegramService.getMessages(currentChatId) : [],
                empty: () => {
                  if (loginState === 'logged_in') {
                    a.label(currentChatId ? 'No messages yet' : 'Select a chat to view messages')
                      .withId('select-chat-label');
                  } else {
                    a.label('Please log in to start messaging')
                      .withId('login-prompt-label');
                  }
                },
                render: (msg: any, index: number) => {
                  const messages = currentChatId ? telegramService.getMessages(currentChatId) : [];
                  const isLast = index === messages.length - 1;
                  buildMessageRow(msg, isLast);
                },
                trackBy: (msg: any) => msg.id
              });
            });
          },
          bottom: () => {
            a.vbox(() => {
              a.separator();
              // Message input
              a.hbox(() => {
                messageInputEntry = a.entry(loginState === 'logged_in' ? 'Type a message...' : 'Log in to send messages', undefined, 400)
                  .withId('message-input');

                a.button('↩️')
                  .onClick(() => sendMessage())
                  .withId('btn-send');
              });
            });
          }
        });
      },
      0.35 // left pane takes 35% of width
    );
  }


  function buildLoginView() {
    a.vbox(() => {
      // Header
      a.label('💬 Telegram').withId('telegram-title');

      a.separator();

      a.spacer();

      if (loginState === 'qr') {
        // QR code login (primary method)
        a.vbox(() => {
          a.label('Sign in to Telegram').withId('login-header');
          a.label('Scan QR code with your phone').withId('login-subtitle');

          a.separator();

          // QR code image placeholder (200x200)
          qrCodeImage = a.image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
            .withId('qr-code');

          loginErrorLabel = a.label('').withId('login-error');

          a.label('Open Telegram on your phone').withId('qr-step-1');
          a.label('Go to Settings > Devices > Link Desktop Device').withId('qr-step-2');
          a.label('Point your phone at this screen').withId('qr-step-3');

          a.separator();

          a.hbox(() => {
            a.button('Use Phone Number')
              .onClick(() => {
                telegramService.cancelQrLogin();
                loginState = 'phone';
                rebuildUI();
              })
              .withId('btn-use-phone');
          });

          // Start QR login automatically
          setTimeout(async () => {
            loginErrorLabel?.setText?.('Generating QR code...');
            const result = await telegramService.startQrLogin();
            if (result.success && result.qr) {
              currentQrData = result.qr;
              await updateQrCodeImage();
              loginErrorLabel?.setText?.('Scan to log in');
            } else if (result.error) {
              loginErrorLabel?.setText?.(result.error);
            }
          }, 100);
        });
      } else if (loginState === 'phone') {
        // Phone number entry (fallback)
        a.vbox(() => {
          a.label('Sign in to Telegram').withId('login-header');
          a.label('Enter your phone number').withId('login-subtitle');

          a.separator();

          phoneInputEntry = a.entry('+1 234 567 8900')
            .withId('phone-input');

          loginErrorLabel = a.label('').withId('login-error');

          a.hbox(() => {
            a.button('Back to QR')
              .onClick(() => {
                loginState = 'qr';
                rebuildUI();
              })
              .withId('btn-back-qr');

            a.button('Next')
              .onClick(async () => {
                const phone = phoneInputEntry?.getText?.() || '';
                if (!phone.trim()) {
                  loginErrorLabel?.setText?.('Please enter a phone number');
                  return;
                }

                loginErrorLabel?.setText?.('Sending code...');
                const result = await telegramService.login(phone);
                if (result.success) {
                  loginState = 'code';
                  rebuildUI();
                } else {
                  loginErrorLabel?.setText?.(result.error || 'Login failed');
                }
              })
              .withId('btn-next');
          });
        });
      } else if (loginState === 'code') {
        // Verification code entry
        a.vbox(() => {
          a.label('Enter verification code').withId('code-header');
          a.label('We sent a code to your phone').withId('code-subtitle');

          a.separator();

          codeInputEntry = a.entry('12345')
            .withId('code-input');

          loginErrorLabel = a.label('').withId('login-error');

          a.hbox(() => {
            a.button('Back')
              .onClick(() => {
                loginState = 'phone';
                rebuildUI();
              })
              .withId('btn-back');

            a.button('Verify')
              .onClick(async () => {
                const code = codeInputEntry?.getText?.() || '';
                if (!code.trim()) {
                  loginErrorLabel?.setText?.('Please enter the code');
                  return;
                }

                loginErrorLabel?.setText?.('Verifying...');
                const result = await telegramService.verifyCode(code);
                if (result.success) {
                  loginState = 'logged_in';
                  rebuildUI();
                } else {
                  loginErrorLabel?.setText?.(result.error || 'Verification failed');
                }
              })
              .withId('btn-verify');
          });
        });
      }

      a.spacer();
    });
  }

  function buildChatListView() {
    // Use border layout so scroll in center expands
    a.border({
      top: () => {
        a.vbox(() => {
          // Header
          a.label('💬 Telegram').withId('telegram-title');

          a.separator();

          // Action buttons
          a.hbox(() => {
            a.button('🔍').withId('btn-search');
            a.spacer();
            a.button('🚪').onClick(() => {
              telegramService.logout();
            }).withId('btn-logout');
            a.button('✏️').onClick(() => {
              showNewChatDialog();
            }).withId('btn-new-chat');
          });

          a.separator();
        });
      },
      center: () => {
        // Chat list using bindTo for dynamic updates
        a.scroll(() => {
          a.vbox(() => {}).bindTo({
            items: () => telegramService.getChats(),
            empty: () => {
              a.label('No chats yet').withId('no-chats-label');
            },
            render: (chat: TelegramChat) => {
              buildChatRow(chat);
            },
            trackBy: (chat: TelegramChat) => chat.id
          });
        });
      }
    });
  }

  function buildChatRow(chat: TelegramChat) {
    // Use border layout: avatar left, name center (expands), button right
    a.border({
      left: () => {
        a.label(chat.avatar || '👤').withId(`chat-${chat.id}-avatar`);
      },
      center: () => {
        // Chat name with unread count - truncate if too long
        const displayName = chat.unreadCount > 0
          ? `${chat.name} (${chat.unreadCount})`
          : chat.name;
        a.label(displayName, undefined, 'leading', 'break').withId(`chat-${chat.id}-name`);
      },
      right: () => {
        a.button('→')
          .onClick(() => {
            currentChatId = chat.id;
            telegramService.markChatAsRead(chat.id);
            showChatView(chat);
          })
          .withId(`chat-${chat.id}-open`);
      }
    });
  }

  function buildMessageRow(msg: any, isLast: boolean = false) {
    const timeStr = formatTime(msg.timestamp);
    const alignment = msg.isOwn ? 'trailing' : 'leading';

    // Build message content
    const buildContent = () => {
      // For messages with images, use border layout so image expands to fill available space
      if (msg.mediaUrl && msg.mediaType === 'photo') {
        a.border({
          center: () => {
            // Image in center expands to fill available space
            a.image({ path: msg.mediaUrl, fillMode: 'contain' }).withId(`message-${msg.id}-image`);
          },
          bottom: () => {
            a.vbox(() => {
              // Show text if present
              if (msg.text) {
                a.label(msg.text, undefined, alignment, 'word').withId(`message-${msg.id}`);
              }
              a.label(`${msg.sender} • ${timeStr}`, undefined, alignment)
                .withId(`message-${msg.id}-time`);
            });
          }
        });
      } else {
        // For text-only messages, use simple vbox
        a.vbox(() => {
          if (msg.mediaType) {
            // Show placeholder for other media types
            a.label(`[${msg.mediaType}]`, undefined, alignment).withId(`message-${msg.id}-media`);
          }

          // Show text if present
          if (msg.text) {
            a.label(msg.text, undefined, alignment, 'word').withId(`message-${msg.id}`);
          }

          a.label(`${msg.sender} • ${timeStr}`, undefined, alignment)
            .withId(`message-${msg.id}-time`);
        });
      }
    };

    // Use fixed hsplit (no draggable divider) for 15:85 / 85:15 layout
    if (msg.isOwn) {
      // Own messages: 15% spacer on left, 85% message on right
      a.hsplit(
        () => { a.spacer(); },
        buildContent,
        0.15,
        true // fixed - no draggable divider
      );
    } else {
      // Other's messages: 85% message on left, 15% spacer on right
      a.hsplit(
        buildContent,
        () => { a.spacer(); },
        0.85,
        true // fixed - no draggable divider
      );
    }

    // Add separator between messages (not after the last one)
    if (!isLast) {
      a.separator();
    }
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

  async function showChatView(chat: TelegramChat) {
    // Load messages for this chat from Telegram
    if (telegramService.loadMessagesForChat) {
      await telegramService.loadMessagesForChat(chat.id);
    }

    // Rebuild UI to show the selected chat's messages
    rebuildUI();

    // Scroll to bottom to show latest messages
    if (messageScrollContainer) {
      // Small delay to allow UI to render before scrolling
      setTimeout(() => {
        messageScrollContainer.scrollToBottom();
      }, 100);
    }
  }

  async function sendMessage() {
    if (!currentChatId || !messageInputEntry) return;

    const text = await messageInputEntry.getText?.() || '';
    if (!text.trim()) return;

    telegramService.sendMessage(currentChatId, text);
    await messageInputEntry.setText?.('');
    rebuildUI();
  }

  function showNewChatDialog() {
    // Use a simple dialog for new chat
    const chatName = 'New Chat ' + new Date().getTime();
    telegramService.addChat(chatName);
  }

  a.window({ title: 'Telegram', width: 800, height: 600 }, (win: Window) => {
    mainWindow = win;
    win.setContent(() => {
      buildWindowContent();
    });
    win.show();
  });

  // Cleanup function
  const cleanup = () => {
    unsubscribeChatAdded();
    unsubscribeMessageAdded();
    unsubscribeChatUpdated();
    unsubscribeLoginState();
    unsubscribeQrCode();
    telegramService.cancelQrLogin();
  };

  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Telegram' }, (a: App) => {
    // Let createTelegramApp auto-detect credentials from environment
    createTelegramApp(a);
  });
}
