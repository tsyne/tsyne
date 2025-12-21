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

// Re-export real service for convenience
export { RealTelegramService, TelegramCredentials, loadCredentialsFromEnv } from './real-telegram-service';

export interface TelegramMessage {
  id: string;
  chatId: string;
  sender: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
}

export interface TelegramChat {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  avatar?: string;
}

export interface QrLoginResult {
  token: string;      // Base64 token for QR code
  url: string;        // tg://login?token=... URL to encode as QR
  expiresAt: Date;    // When this QR code expires
}

export interface ITelegramService {
  getChats(): TelegramChat[];
  getChat(id: string): TelegramChat | null;
  getMessages(chatId: string): TelegramMessage[];
  loadMessagesForChat?(chatId: string): Promise<TelegramMessage[]>;
  sendMessage(chatId: string, text: string): TelegramMessage;
  addChat(name: string): TelegramChat;
  deleteChat(id: string): boolean;
  markChatAsRead(id: string): boolean;
  onChatAdded(handler: (chat: TelegramChat) => void): () => void;
  onMessageAdded(handler: (msg: TelegramMessage) => void): () => void;
  onChatUpdated(handler: (chat: TelegramChat) => void): () => void;
  // Login functionality
  isLoggedIn(): boolean;
  // QR code login (primary method)
  startQrLogin(): Promise<{ success: boolean; qr?: QrLoginResult; error?: string }>;
  onQrCodeUpdate(handler: (qr: QrLoginResult) => void): () => void;
  cancelQrLogin(): void;
  // Phone+code login (fallback)
  login(phoneNumber: string): Promise<{ success: boolean; error?: string }>;
  verifyCode(code: string): Promise<{ success: boolean; error?: string }>;
  logout(): void;
  onLoginStateChanged(handler: (loggedIn: boolean) => void): () => void;
}

export class MockTelegramService implements ITelegramService {
  private chats: TelegramChat[] = [];
  private messages: Map<string, TelegramMessage[]> = new Map();
  private chatAddedListeners: ((chat: TelegramChat) => void)[] = [];
  private messageAddedListeners: ((msg: TelegramMessage) => void)[] = [];
  private chatUpdatedListeners: ((chat: TelegramChat) => void)[] = [];
  private loginStateListeners: ((loggedIn: boolean) => void)[] = [];
  private qrCodeListeners: ((qr: QrLoginResult) => void)[] = [];
  private loggedIn: boolean = false;
  private pendingPhoneNumber: string | null = null;
  private qrLoginTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(startLoggedIn: boolean = true) {
    // For testing, start logged in with sample chats
    if (startLoggedIn) {
      this.loggedIn = true;
      this.initializeSampleChats();
    }
  }

  private initializeSampleChats() {
    const sampleChats: TelegramChat[] = [
      {
        id: '1',
        name: 'Alice Smith',
        lastMessage: 'See you tomorrow! 👋',
        lastMessageTime: new Date(Date.now() - 5 * 60000),
        unreadCount: 2,
        avatar: '👩',
      },
      {
        id: '2',
        name: 'Bob Johnson',
        lastMessage: 'Thanks for the info!',
        lastMessageTime: new Date(Date.now() - 15 * 60000),
        unreadCount: 0,
        avatar: '👨',
      },
      {
        id: '3',
        name: 'Team Chat',
        lastMessage: 'Meeting at 2pm',
        lastMessageTime: new Date(Date.now() - 2 * 60000),
        unreadCount: 3,
        avatar: '👥',
      },
      {
        id: '4',
        name: 'Carol Davis',
        lastMessage: 'Sounds good!',
        lastMessageTime: new Date(Date.now() - 45 * 60000),
        unreadCount: 0,
        avatar: '👩‍🦰',
      },
    ];

    this.chats = sampleChats;

    // Initialize sample messages for each chat
    const sampleMessages: Record<string, TelegramMessage[]> = {
      '1': [
        {
          id: 'm1',
          chatId: '1',
          sender: 'Alice',
          text: 'Hi! How are you?',
          timestamp: new Date(Date.now() - 20 * 60000),
          isOwn: false,
        },
        {
          id: 'm2',
          chatId: '1',
          sender: 'You',
          text: 'Good! How about you?',
          timestamp: new Date(Date.now() - 18 * 60000),
          isOwn: true,
        },
        {
          id: 'm3',
          chatId: '1',
          sender: 'Alice',
          text: 'Great! See you tomorrow! 👋',
          timestamp: new Date(Date.now() - 5 * 60000),
          isOwn: false,
        },
      ],
      '2': [
        {
          id: 'm4',
          chatId: '2',
          sender: 'You',
          text: 'Did you get the files?',
          timestamp: new Date(Date.now() - 25 * 60000),
          isOwn: true,
        },
        {
          id: 'm5',
          chatId: '2',
          sender: 'Bob',
          text: 'Yes, got them. Thanks for the info!',
          timestamp: new Date(Date.now() - 15 * 60000),
          isOwn: false,
        },
      ],
      '3': [
        {
          id: 'm6',
          chatId: '3',
          sender: 'Carol',
          text: 'Everyone ready for the standup?',
          timestamp: new Date(Date.now() - 10 * 60000),
          isOwn: false,
        },
        {
          id: 'm7',
          chatId: '3',
          sender: 'You',
          text: 'Yes, I am',
          timestamp: new Date(Date.now() - 8 * 60000),
          isOwn: true,
        },
        {
          id: 'm8',
          chatId: '3',
          sender: 'Team',
          text: 'Meeting at 2pm',
          timestamp: new Date(Date.now() - 2 * 60000),
          isOwn: false,
        },
      ],
      '4': [
        {
          id: 'm9',
          chatId: '4',
          sender: 'You',
          text: 'Want to grab coffee?',
          timestamp: new Date(Date.now() - 50 * 60000),
          isOwn: true,
        },
        {
          id: 'm10',
          chatId: '4',
          sender: 'Carol',
          text: 'Sounds good!',
          timestamp: new Date(Date.now() - 45 * 60000),
          isOwn: false,
        },
      ],
    };

    for (const [chatId, msgs] of Object.entries(sampleMessages)) {
      this.messages.set(chatId, msgs);
    }
  }

  getChats(): TelegramChat[] {
    // Sort by last message time, newest first
    return [...this.chats].sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
  }

  getChat(id: string): TelegramChat | null {
    return this.chats.find((c) => c.id === id) || null;
  }

  getMessages(chatId: string): TelegramMessage[] {
    return this.messages.get(chatId) || [];
  }

  sendMessage(chatId: string, text: string): TelegramMessage {
    const chat = this.getChat(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const message: TelegramMessage = {
      id: `msg_${Date.now()}`,
      chatId,
      sender: 'You',
      text,
      timestamp: new Date(),
      isOwn: true,
    };

    const chatMessages = this.messages.get(chatId) || [];
    chatMessages.push(message);
    this.messages.set(chatId, chatMessages);

    // Update chat's last message
    chat.lastMessage = text;
    chat.lastMessageTime = new Date();

    // Notify listeners
    this.messageAddedListeners.forEach((listener) => listener(message));
    this.chatUpdatedListeners.forEach((listener) => listener(chat));

    return message;
  }

  addChat(name: string): TelegramChat {
    const newChat: TelegramChat = {
      id: `chat_${Date.now()}`,
      name,
      lastMessage: 'No messages yet',
      lastMessageTime: new Date(),
      unreadCount: 0,
      avatar: '👤',
    };

    this.chats.push(newChat);
    this.messages.set(newChat.id, []);

    this.chatAddedListeners.forEach((listener) => listener(newChat));
    return newChat;
  }

  deleteChat(id: string): boolean {
    const index = this.chats.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.chats.splice(index, 1);
    this.messages.delete(id);
    return true;
  }

  markChatAsRead(id: string): boolean {
    const chat = this.getChat(id);
    if (!chat) return false;

    chat.unreadCount = 0;
    this.chatUpdatedListeners.forEach((listener) => listener(chat));
    return true;
  }

  onChatAdded(handler: (chat: TelegramChat) => void): () => void {
    this.chatAddedListeners.push(handler);
    return () => {
      const index = this.chatAddedListeners.indexOf(handler);
      if (index > -1) this.chatAddedListeners.splice(index, 1);
    };
  }

  onMessageAdded(handler: (msg: TelegramMessage) => void): () => void {
    this.messageAddedListeners.push(handler);
    return () => {
      const index = this.messageAddedListeners.indexOf(handler);
      if (index > -1) this.messageAddedListeners.splice(index, 1);
    };
  }

  onChatUpdated(handler: (chat: TelegramChat) => void): () => void {
    this.chatUpdatedListeners.push(handler);
    return () => {
      const index = this.chatUpdatedListeners.indexOf(handler);
      if (index > -1) this.chatUpdatedListeners.splice(index, 1);
    };
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  async startQrLogin(): Promise<{ success: boolean; qr?: QrLoginResult; error?: string }> {
    // Generate mock QR data
    const token = Buffer.from(`mock_token_${Date.now()}`).toString('base64');
    const qr: QrLoginResult = {
      token,
      url: `tg://login?token=${token}`,
      expiresAt: new Date(Date.now() + 30000), // 30 seconds
    };

    // Simulate auto-login after 3 seconds (mock "scan")
    this.qrLoginTimer = setTimeout(() => {
      this.loggedIn = true;
      this.initializeSampleChats();
      this.loginStateListeners.forEach((listener) => listener(true));
    }, 3000);

    return { success: true, qr };
  }

  onQrCodeUpdate(handler: (qr: QrLoginResult) => void): () => void {
    this.qrCodeListeners.push(handler);
    return () => {
      const index = this.qrCodeListeners.indexOf(handler);
      if (index > -1) this.qrCodeListeners.splice(index, 1);
    };
  }

  cancelQrLogin(): void {
    if (this.qrLoginTimer) {
      clearTimeout(this.qrLoginTimer);
      this.qrLoginTimer = null;
    }
  }

  async login(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Basic validation
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?\d{10,15}$/.test(cleanNumber)) {
      return { success: false, error: 'Invalid phone number format' };
    }

    this.pendingPhoneNumber = cleanNumber;
    return { success: true };
  }

  async verifyCode(code: string): Promise<{ success: boolean; error?: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!this.pendingPhoneNumber) {
      return { success: false, error: 'No pending login' };
    }

    // Accept any 5-digit code for mock
    if (!/^\d{5}$/.test(code)) {
      return { success: false, error: 'Invalid code format (5 digits required)' };
    }

    // Simulate successful login
    this.loggedIn = true;
    this.pendingPhoneNumber = null;
    this.initializeSampleChats();
    this.loginStateListeners.forEach((listener) => listener(true));
    return { success: true };
  }

  logout(): void {
    this.cancelQrLogin();
    this.loggedIn = false;
    this.chats = [];
    this.messages.clear();
    this.loginStateListeners.forEach((listener) => listener(false));
  }

  onLoginStateChanged(handler: (loggedIn: boolean) => void): () => void {
    this.loginStateListeners.push(handler);
    return () => {
      const index = this.loginStateListeners.indexOf(handler);
      if (index > -1) this.loginStateListeners.splice(index, 1);
    };
  }
}
