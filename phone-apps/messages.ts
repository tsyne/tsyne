/**
 * Messages App
 *
 * A messaging app with conversation threads and auto-reply simulation.
 * Uses SMSService for messaging and ContactsService for contact names.
 *
 * @tsyne-app:name Messages
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7z"/></svg>
 * @tsyne-app:category phone
 * @tsyne-app:builder createMessagesApp
 * @tsyne-app:args app,sms,contacts
 * @tsyne-app:count single
 */

import { app, resolveTransport } from '../core/src';
import type { App } from '../core/src/app';
import type { Window } from '../core/src/window';
import type { Entry } from '../core/src/widgets/inputs';
import { ISMSService, MockSMSService, IContactsService, MockContactsService, Message, Thread } from './services';

/**
 * Messages UI class
 */
class MessagesUI {
  private window: Window | null = null;
  private currentThreadId: string | null = null;
  private composeEntry: Entry | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private a: App,
    private sms: ISMSService,
    private contacts: IContactsService
  ) {
    // Subscribe to new messages
    this.unsubscribe = this.sms.onMessageReceived((message) => {
      this.handleNewMessage(message);
    });
  }

  private handleNewMessage(message: Message): void {
    // Refresh the view when a new message arrives
    if (this.window) {
      this.refresh();
    }
  }

  private refresh(): void {
    if (!this.window) return;

    this.window.setContent(() => {
      if (this.currentThreadId) {
        this.buildConversationView(this.window!);
      } else {
        this.buildThreadListView(this.window!);
      }
    });
  }

  private getContactName(number: string): string {
    const allContacts = this.contacts.getAll();
    const contact = allContacts.find(c => c.phone === number);
    return contact ? contact.name : number;
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  buildUI(win: Window): void {
    this.window = win;
    this.buildThreadListView(win);
  }

  private buildThreadListView(win: Window): void {
    this.a.vbox(() => {
      // Header
      this.a.hbox(() => {
        this.a.label('Messages');
        this.a.spacer();
        this.a.button('New').onClick(() => this.handleNewMessage2()).withId('btn-new');
      });

      this.a.separator();

      // Thread list
      const threads = this.sms.getThreads();

      if (threads.length === 0) {
        this.a.vbox(() => {
          this.a.spacer();
          this.a.label('No messages yet');
          this.a.label('Tap "New" to start a conversation');
          this.a.spacer();
        });
      } else {
        this.a.scroll(() => {
          this.a.vbox(() => {
            threads.forEach(thread => {
              this.buildThreadRow(thread);
            });
          });
        });
      }
    });
  }

  private buildThreadRow(thread: Thread): void {
    const contactName = thread.contactName || this.getContactName(thread.contactNumber);

    this.a.hbox(() => {
      // Contact avatar placeholder
      this.a.vbox(() => {
        this.a.label(contactName.charAt(0).toUpperCase());
      });

      // Thread info
      this.a.vbox(() => {
        this.a.hbox(() => {
          this.a.label(contactName).withId(`thread-${thread.id}-name`);
          this.a.spacer();
          this.a.label(this.formatTime(thread.lastMessage.timestamp));
        });

        this.a.hbox(() => {
          const preview = thread.lastMessage.body.substring(0, 30);
          const suffix = thread.lastMessage.body.length > 30 ? '...' : '';
          this.a.label(preview + suffix).withId(`thread-${thread.id}-preview`);

          if (thread.unreadCount > 0) {
            this.a.spacer();
            this.a.label(`(${thread.unreadCount})`).withId(`thread-${thread.id}-unread`);
          }
        });
      });
    }).onClick(() => this.openThread(thread.id));
  }

  private openThread(threadId: string): void {
    this.currentThreadId = threadId;
    this.sms.markThreadRead(threadId);
    this.refresh();
  }

  private buildConversationView(win: Window): void {
    if (!this.currentThreadId) return;

    const messages = this.sms.getMessages(this.currentThreadId);
    const threads = this.sms.getThreads();
    const thread = threads.find(t => t.id === this.currentThreadId);
    const contactNumber = thread?.contactNumber || 'Unknown';
    const contactName = this.getContactName(contactNumber);

    this.a.vbox(() => {
      // Header with back button
      this.a.hbox(() => {
        this.a.button('<').onClick(() => this.goBack()).withId('btn-back');
        this.a.label(contactName).withId('conversation-title');
        this.a.spacer();
      });

      this.a.separator();

      // Messages
      this.a.scroll(() => {
        this.a.vbox(() => {
          messages.forEach(msg => {
            this.buildMessageBubble(msg);
          });
        });
      });

      this.a.separator();

      // Compose area
      this.a.hbox(() => {
        this.composeEntry = this.a.entry('Type a message...', () => {}, 250).withId('compose-entry') as Entry;
        this.a.button('Send').onClick(() => this.sendMessage(contactNumber)).withId('btn-send');
      });
    });
  }

  private buildMessageBubble(message: Message): void {
    const isMe = message.from === 'me';

    this.a.hbox(() => {
      if (isMe) {
        this.a.spacer();
      }

      this.a.vbox(() => {
        this.a.label(message.body).withId(`msg-${message.id}`);
        this.a.label(this.formatTime(message.timestamp));
      });

      if (!isMe) {
        this.a.spacer();
      }
    });
  }

  private goBack(): void {
    this.currentThreadId = null;
    this.refresh();
  }

  private async sendMessage(to: string): Promise<void> {
    if (!this.composeEntry) return;

    const body = this.composeEntry.getText();
    if (!body.trim()) return;

    await this.sms.send(to, body);
    this.composeEntry.setText('');
    this.refresh();
  }

  private async handleNewMessage2(): Promise<void> {
    if (!this.window) return;

    // Get contacts for selection
    const allContacts = this.contacts.getAll();
    const contactOptions = allContacts.map(c => `${c.name} (${c.phone})`);

    if (contactOptions.length === 0) {
      await this.window.showAlert('No Contacts', 'Add contacts first to start messaging.');
      return;
    }

    const result = await this.window.showForm('New Message', [
      { name: 'contact', label: 'To', type: 'select', options: contactOptions },
      { name: 'message', label: 'Message', type: 'entry' },
    ]);

    if (result.submitted && result.values.contact && result.values.message) {
      // Parse phone number from selection
      const selectedOption = result.values.contact as string;
      const phoneMatch = selectedOption.match(/\(([^)]+)\)$/);
      if (phoneMatch) {
        const phoneNumber = phoneMatch[1];
        await this.sms.send(phoneNumber, result.values.message as string);

        // Open the conversation
        const threadId = `thread-${phoneNumber}`;
        this.openThread(threadId);
      }
    }
  }

  // Method to open a conversation with a specific number (called from Contacts app)
  openConversationWith(phoneNumber: string): void {
    const threadId = `thread-${phoneNumber}`;
    this.currentThreadId = threadId;
    this.refresh();
  }

  // Cleanup
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

/**
 * Create the messages app
 * @param a - App instance
 * @param sms - SMS service
 * @param contacts - Contacts service for name lookup
 */
export function createMessagesApp(
  a: App,
  sms: ISMSService,
  contacts: IContactsService
): MessagesUI {
  const ui = new MessagesUI(a, sms, contacts);

  a.window({ title: 'Messages' }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Messages' }, (a: App) => {
    const sms = new MockSMSService();
    const contacts = new MockContactsService();
    createMessagesApp(a, sms, contacts);
  });
}
