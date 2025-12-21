/*
 * Real Telegram Service using GramJS
 *
 * Implements ITelegramService with actual Telegram API integration.
 * Requires api_id and api_hash from https://my.telegram.org
 */

import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ITelegramService,
  TelegramChat,
  TelegramMessage,
  QrLoginResult,
} from './telegram-service';

const SESSION_FILE = path.join(os.homedir(), '.tsyne', 'telegram-session.txt');

export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
}

/**
 * Load credentials from environment variables
 * Set TELEGRAM_API_ID and TELEGRAM_API_HASH
 */
export function loadCredentialsFromEnv(): TelegramCredentials | null {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    return null;
  }

  const parsedId = parseInt(apiId, 10);
  if (isNaN(parsedId)) {
    console.error('TELEGRAM_API_ID must be a number');
    return null;
  }

  return { apiId: parsedId, apiHash };
}

export class RealTelegramService implements ITelegramService {
  private client: TelegramClient | null = null;
  private session: StringSession;
  private credentials: TelegramCredentials;
  private chats: TelegramChat[] = [];
  private messages: Map<string, TelegramMessage[]> = new Map();
  private chatAddedListeners: ((chat: TelegramChat) => void)[] = [];
  private messageAddedListeners: ((msg: TelegramMessage) => void)[] = [];
  private chatUpdatedListeners: ((chat: TelegramChat) => void)[] = [];
  private loginStateListeners: ((loggedIn: boolean) => void)[] = [];
  private qrCodeListeners: ((qr: QrLoginResult) => void)[] = [];
  private loggedIn: boolean = false;
  private qrLoginAborted: boolean = false;
  private sessionRestorePromise: Promise<boolean> | null = null;

  constructor(credentials: TelegramCredentials) {
    this.credentials = credentials;
    this.savedSessionString = this.loadSession();
    console.log('Loaded session:', this.savedSessionString ? `${this.savedSessionString.length} chars` : 'none');
    this.session = new StringSession(this.savedSessionString);

    // Try to restore session in background
    if (this.savedSessionString) {
      this.sessionRestorePromise = this.tryRestoreSession();
      this.sessionRestorePromise.then((restored) => {
        console.log('Session restore result:', restored);
        this.sessionRestorePromise = null;
      });
    }
  }

  private savedSessionString: string = '';

  private loadSession(): string {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        return fs.readFileSync(SESSION_FILE, 'utf-8').trim();
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    }
    return '';
  }

  private saveSession(): void {
    try {
      const dir = path.dirname(SESSION_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SESSION_FILE, this.session.save(), 'utf-8');
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }

  private async ensureClient(): Promise<TelegramClient> {
    if (!this.client) {
      this.client = new TelegramClient(
        this.session,
        this.credentials.apiId,
        this.credentials.apiHash,
        { connectionRetries: 5 }
      );
    }
    if (!this.client.connected) {
      await this.client.connect();
    }
    return this.client;
  }

  async startQrLogin(): Promise<{ success: boolean; qr?: QrLoginResult; error?: string }> {
    // Wait for any pending session restore to complete first
    if (this.sessionRestorePromise) {
      console.log('startQrLogin: waiting for session restore...');
      await this.sessionRestorePromise;
      console.log('startQrLogin: session restore complete, loggedIn:', this.loggedIn);
    }

    // Don't start QR login if already logged in
    if (this.loggedIn) {
      console.log('startQrLogin: already logged in, skipping');
      return { success: true };
    }

    try {
      this.qrLoginAborted = false;
      const client = await this.ensureClient();

      // Start QR login in background (don't await - it blocks until complete)
      this.runQrLoginFlow(client).catch((err) => {
        console.error('QR login flow error:', err);
      });

      // Return immediately - QR code will be sent via onQrCodeUpdate callback
      return { success: true };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return { success: false, error };
    }
  }

  private async runQrLoginFlow(client: TelegramClient): Promise<void> {
    try {
      const user = await client.signInUserWithQrCode(
        { apiId: this.credentials.apiId, apiHash: this.credentials.apiHash },
        {
          qrCode: async (qrCode) => {
            if (this.qrLoginAborted) return;

            // qrCode.token is a Buffer, convert to base64url
            const tokenBuffer = Buffer.from(qrCode.token);
            const tokenBase64 = tokenBuffer.toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            const qr: QrLoginResult = {
              token: tokenBase64,
              url: `tg://login?token=${tokenBase64}`,
              expiresAt: new Date(qrCode.expires * 1000),
            };

            console.log('QR code generated, URL:', qr.url);

            // Notify listeners of new QR code
            this.qrCodeListeners.forEach((listener) => listener(qr));
          },
          onError: (err) => {
            console.error('QR login error:', err);
          },
        }
      );

      if (this.qrLoginAborted) {
        return;
      }

      // Login successful
      console.log('QR login successful, user:', user);
      this.loggedIn = true;

      try {
        this.saveSession();
        console.log('Session saved');
      } catch (e) {
        console.error('Failed to save session:', e);
      }

      try {
        console.log('Loading chats...');
        await this.loadChats();
        console.log('Chats loaded:', this.chats.length);
      } catch (e) {
        console.error('Failed to load chats:', e);
      }

      console.log('Notifying', this.loginStateListeners.length, 'login state listeners');
      this.loginStateListeners.forEach((listener) => {
        try {
          listener(true);
        } catch (e) {
          console.error('Login listener error:', e);
        }
      });
      console.log('Login state listeners notified');
    } catch (e) {
      if (!this.qrLoginAborted) {
        console.error('QR login failed:', e);
      }
    }
  }

  onQrCodeUpdate(handler: (qr: QrLoginResult) => void): () => void {
    this.qrCodeListeners.push(handler);
    return () => {
      const index = this.qrCodeListeners.indexOf(handler);
      if (index > -1) this.qrCodeListeners.splice(index, 1);
    };
  }

  cancelQrLogin(): void {
    this.qrLoginAborted = true;
  }

  async login(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.ensureClient();
      await client.sendCode(
        { apiId: this.credentials.apiId, apiHash: this.credentials.apiHash },
        phoneNumber
      );
      return { success: true };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return { success: false, error };
    }
  }

  async verifyCode(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.ensureClient();
      await client.signInUser(
        { apiId: this.credentials.apiId, apiHash: this.credentials.apiHash },
        {
          phoneNumber: async () => '', // Already sent
          phoneCode: async () => code,
          password: async () => '', // TODO: Handle 2FA
          onError: (err) => {
            throw err;
          },
        }
      );

      this.loggedIn = true;
      this.saveSession();
      await this.loadChats();
      this.loginStateListeners.forEach((listener) => listener(true));

      return { success: true };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return { success: false, error };
    }
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  logout(): void {
    this.cancelQrLogin();
    this.loggedIn = false;
    this.chats = [];
    this.messages.clear();

    // Clear saved session
    try {
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
      }
    } catch (e) {
      console.error('Failed to delete session file:', e);
    }

    // Disconnect client
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }

    this.session = new StringSession('');
    this.loginStateListeners.forEach((listener) => listener(false));
  }

  onLoginStateChanged(handler: (loggedIn: boolean) => void): () => void {
    this.loginStateListeners.push(handler);
    return () => {
      const index = this.loginStateListeners.indexOf(handler);
      if (index > -1) this.loginStateListeners.splice(index, 1);
    };
  }

  private async loadChats(): Promise<void> {
    if (!this.client) {
      console.log('loadChats: no client');
      return;
    }

    try {
      console.log('loadChats: getting dialogs...');
      const dialogs = await this.client.getDialogs({ limit: 50 });
      console.log('loadChats: got', dialogs.length, 'dialogs');

      this.chats = dialogs.map((dialog, index) => {
        const entity = dialog.entity;
        let name = 'Unknown';
        let avatar = '👤';

        if (entity instanceof Api.User) {
          name = [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.username || 'Unknown';
          avatar = entity.bot ? '🤖' : '👤';
        } else if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
          name = entity.title || 'Unknown';
          avatar = entity instanceof Api.Channel ? '📢' : '👥';
        }

        const chatId = String(dialog.id);
        if (index < 5) {
          console.log(`loadChats: dialog ${index}: ${name} (${avatar}), id=${chatId}`);
        }

        return {
          id: chatId,
          name,
          lastMessage: dialog.message?.message || 'No messages',
          lastMessageTime: dialog.message?.date ? new Date(dialog.message.date * 1000) : new Date(),
          unreadCount: dialog.unreadCount || 0,
          avatar,
        };
      });
      console.log('loadChats: mapped', this.chats.length, 'chats');
    } catch (e) {
      console.error('Failed to load chats:', e);
    }
  }

  getChats(): TelegramChat[] {
    return [...this.chats].sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
  }

  getChat(id: string): TelegramChat | null {
    return this.chats.find((c) => c.id === id) || null;
  }

  getMessages(chatId: string): TelegramMessage[] {
    return this.messages.get(chatId) || [];
  }

  async loadMessagesForChat(chatId: string): Promise<TelegramMessage[]> {
    if (!this.client) return [];

    try {
      const messages = await this.client.getMessages(chatId, { limit: 50 });

      const mapped: TelegramMessage[] = messages.map((msg) => {
        let sender = 'Unknown';
        const isOwn = msg.out || false;

        if (isOwn) {
          sender = 'You';
        } else if (msg.sender instanceof Api.User) {
          sender = [msg.sender.firstName, msg.sender.lastName].filter(Boolean).join(' ') || 'Unknown';
        }

        return {
          id: String(msg.id),
          chatId,
          sender,
          text: msg.message || '',
          timestamp: new Date(msg.date * 1000),
          isOwn,
        };
      });

      // Reverse to get chronological order
      mapped.reverse();
      this.messages.set(chatId, mapped);
      return mapped;
    } catch (e) {
      console.error('Failed to load messages:', e);
      return [];
    }
  }

  sendMessage(chatId: string, text: string): TelegramMessage {
    // Create optimistic message
    const message: TelegramMessage = {
      id: `pending_${Date.now()}`,
      chatId,
      sender: 'You',
      text,
      timestamp: new Date(),
      isOwn: true,
    };

    // Add to local messages
    const chatMessages = this.messages.get(chatId) || [];
    chatMessages.push(message);
    this.messages.set(chatId, chatMessages);

    // Send via API (async, don't await)
    this.sendMessageAsync(chatId, text, message.id);

    // Update chat's last message
    const chat = this.getChat(chatId);
    if (chat) {
      chat.lastMessage = text;
      chat.lastMessageTime = new Date();
      this.chatUpdatedListeners.forEach((listener) => listener(chat));
    }

    this.messageAddedListeners.forEach((listener) => listener(message));
    return message;
  }

  private async sendMessageAsync(chatId: string, text: string, pendingId: string): Promise<void> {
    if (!this.client) return;

    try {
      const result = await this.client.sendMessage(chatId, { message: text });

      // Update the pending message with real ID
      const chatMessages = this.messages.get(chatId) || [];
      const pendingMsg = chatMessages.find((m) => m.id === pendingId);
      if (pendingMsg && result) {
        pendingMsg.id = String(result.id);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }

  addChat(name: string): TelegramChat {
    // For real Telegram, this would search for users/create groups
    // For now, just add a placeholder
    const newChat: TelegramChat = {
      id: `new_${Date.now()}`,
      name,
      lastMessage: 'No messages yet',
      lastMessageTime: new Date(),
      unreadCount: 0,
      avatar: '👤',
    };

    this.chats.push(newChat);
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

    // Mark as read on Telegram (async)
    this.markAsReadAsync(id);

    this.chatUpdatedListeners.forEach((listener) => listener(chat));
    return true;
  }

  private async markAsReadAsync(chatId: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.markAsRead(chatId);
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
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

  /**
   * Check if there's a saved session and try to restore it
   */
  async tryRestoreSession(): Promise<boolean> {
    console.log('tryRestoreSession: session string length:', this.savedSessionString?.length || 0);
    if (!this.savedSessionString) {
      console.log('tryRestoreSession: no session to restore');
      return false;
    }

    try {
      console.log('tryRestoreSession: connecting...');
      const client = await this.ensureClient();
      console.log('tryRestoreSession: getting user info...');
      const me = await client.getMe();
      console.log('tryRestoreSession: got user:', me?.firstName);
      if (me) {
        this.loggedIn = true;
        console.log('tryRestoreSession: loading chats...');
        await this.loadChats();
        console.log('tryRestoreSession: notifying listeners...');
        this.loginStateListeners.forEach((listener) => listener(true));
        console.log('tryRestoreSession: done, logged in!');
        return true;
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
      // Clear invalid session
      this.session = new StringSession('');
    }

    return false;
  }
}
