/*
 * WhatsApp Service Interface and Implementations
 *
 * This module provides an abstraction layer for WhatsApp functionality,
 * allowing the Tsyne UI to work with either a mock service (for testing)
 * or the real WAHA (WhatsApp HTTP API) backend.
 *
 * Copyright Paul Hammant 2025
 * Licensed under GNU General Public License v3
 */

// ============================================
// Data Types
// ============================================

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  sender: string;
  senderName?: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
  /** Message acknowledgment status: 0=pending, 1=sent, 2=delivered, 3=read */
  ack?: number;
  /** Media type if present */
  mediaType?: 'photo' | 'video' | 'audio' | 'document' | 'sticker';
  /** Media URL or data URL */
  mediaUrl?: string;
  /** Reactions on this message */
  reactions?: Array<{ emoji: string; from: string }>;
  /** ID of message being replied to */
  replyToId?: string;
  /** Preview of replied message */
  replyToText?: string;
  /** True if message was deleted */
  isRevoked?: boolean;
}

export interface WhatsAppChat {
  id: string;
  name: string;
  /** Last message text preview */
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  /** Avatar emoji or image URL */
  avatar?: string;
  /** True if this is a group chat */
  isGroup: boolean;
  /** True if chat is archived */
  isArchived?: boolean;
  /** True if chat is pinned */
  isPinned?: boolean;
  /** True if chat is muted */
  isMuted?: boolean;
  /** Typing indicator */
  typingParticipants?: string[];
}

export interface WhatsAppSession {
  name: string;
  status: 'WORKING' | 'STARTING' | 'SCAN_QR_CODE' | 'FAILED' | 'STOPPED';
  /** QR code data if status is SCAN_QR_CODE */
  qr?: { url: string; base64?: string };
}

export interface QrLoginResult {
  /** The raw QR data string */
  data: string;
  /** When this QR code expires */
  expiresAt: Date;
}

export interface WhatsAppConfig {
  /** WAHA server URL (e.g., http://localhost:3000) */
  wahaUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Session name to use */
  sessionName?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ChatFilter = 'all' | 'unread' | 'groups' | 'archived';

// ============================================
// Service Interface
// ============================================

export interface IWhatsAppService {
  // Connection status
  getConnectionStatus(): ConnectionStatus;
  onConnectionStatusChanged(handler: (status: ConnectionStatus) => void): () => void;

  // Session management
  getSessions(): WhatsAppSession[];
  getCurrentSession(): string | null;
  setCurrentSession(sessionName: string): Promise<boolean>;
  createSession(sessionName: string): Promise<{ success: boolean; error?: string }>;
  deleteSession(sessionName: string): Promise<boolean>;
  refreshSessions(): Promise<void>;

  // Login / Authentication
  isLoggedIn(): boolean;
  startQrLogin(): Promise<{ success: boolean; qr?: QrLoginResult; error?: string }>;
  onQrCodeUpdate(handler: (qr: QrLoginResult) => void): () => void;
  cancelQrLogin(): void;
  logout(): Promise<void>;
  onLoginStateChanged(handler: (loggedIn: boolean) => void): () => void;

  // Chats
  getChats(filter?: ChatFilter): WhatsAppChat[];
  getChat(id: string): WhatsAppChat | null;
  searchChats(query: string): WhatsAppChat[];
  refreshChats(): Promise<void>;
  archiveChat(chatId: string): Promise<boolean>;
  unarchiveChat(chatId: string): Promise<boolean>;
  deleteChat(chatId: string): Promise<boolean>;
  markChatAsRead(chatId: string): Promise<boolean>;
  markChatAsUnread(chatId: string): Promise<boolean>;
  onChatUpdated(handler: (chat: WhatsAppChat) => void): () => void;
  onChatsChanged(handler: () => void): () => void;

  // Messages
  getMessages(chatId: string): WhatsAppMessage[];
  loadMessages(chatId: string, limit?: number): Promise<WhatsAppMessage[]>;
  loadOlderMessages(chatId: string): Promise<WhatsAppMessage[]>;
  sendMessage(chatId: string, text: string, replyToId?: string): Promise<WhatsAppMessage | null>;
  deleteMessage(chatId: string, messageId: string): Promise<boolean>;
  reactToMessage(chatId: string, messageId: string, emoji: string): Promise<boolean>;
  onMessageAdded(handler: (msg: WhatsAppMessage) => void): () => void;
  onMessageUpdated(handler: (msg: WhatsAppMessage) => void): () => void;

  // Typing indicators
  sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void>;
  onTypingIndicator(handler: (chatId: string, participants: string[]) => void): () => void;

  // Profile
  getMyProfile(): { id: string; name: string; avatar?: string } | null;

  // Cleanup
  disconnect(): void;
}

// ============================================
// Mock Service Implementation
// ============================================

export class MockWhatsAppService implements IWhatsAppService {
  private sessions: WhatsAppSession[] = [];
  private currentSession: string | null = null;
  private chats: WhatsAppChat[] = [];
  private messages: Map<string, WhatsAppMessage[]> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private loggedIn: boolean = false;
  private qrLoginTimer: ReturnType<typeof setTimeout> | null = null;
  private myProfile: { id: string; name: string; avatar?: string } | null = null;

  // Event listeners
  private connectionStatusListeners: ((status: ConnectionStatus) => void)[] = [];
  private loginStateListeners: ((loggedIn: boolean) => void)[] = [];
  private qrCodeListeners: ((qr: QrLoginResult) => void)[] = [];
  private chatUpdatedListeners: ((chat: WhatsAppChat) => void)[] = [];
  private chatsChangedListeners: (() => void)[] = [];
  private messageAddedListeners: ((msg: WhatsAppMessage) => void)[] = [];
  private messageUpdatedListeners: ((msg: WhatsAppMessage) => void)[] = [];
  private typingListeners: ((chatId: string, participants: string[]) => void)[] = [];

  constructor(startLoggedIn: boolean = true) {
    if (startLoggedIn) {
      this.initializeWithMockData();
    }
  }

  private initializeWithMockData(): void {
    this.loggedIn = true;
    this.connectionStatus = 'connected';
    this.currentSession = 'default';
    this.myProfile = { id: 'me@c.us', name: 'You', avatar: '🙂' };

    this.sessions = [
      { name: 'default', status: 'WORKING' },
    ];

    const now = Date.now();
    this.chats = [
      {
        id: 'alice@c.us',
        name: 'Alice Smith',
        lastMessage: 'See you tomorrow! 👋',
        lastMessageTime: new Date(now - 5 * 60000),
        unreadCount: 2,
        avatar: '👩',
        isGroup: false,
      },
      {
        id: 'bob@c.us',
        name: 'Bob Johnson',
        lastMessage: 'Thanks for the info!',
        lastMessageTime: new Date(now - 15 * 60000),
        unreadCount: 0,
        avatar: '👨',
        isGroup: false,
      },
      {
        id: 'team@g.us',
        name: 'Team Chat',
        lastMessage: 'Meeting at 2pm',
        lastMessageTime: new Date(now - 2 * 60000),
        unreadCount: 3,
        avatar: '👥',
        isGroup: true,
      },
      {
        id: 'carol@c.us',
        name: 'Carol Davis',
        lastMessage: 'Sounds good!',
        lastMessageTime: new Date(now - 45 * 60000),
        unreadCount: 0,
        avatar: '👩‍🦰',
        isGroup: false,
      },
      {
        id: 'archived@c.us',
        name: 'Old Chat',
        lastMessage: 'From last month',
        lastMessageTime: new Date(now - 30 * 24 * 60 * 60000),
        unreadCount: 0,
        avatar: '📦',
        isGroup: false,
        isArchived: true,
      },
    ];

    // Initialize messages for each chat
    this.messages.set('alice@c.us', [
      {
        id: 'm1',
        chatId: 'alice@c.us',
        sender: 'alice@c.us',
        senderName: 'Alice',
        text: 'Hi! How are you?',
        timestamp: new Date(now - 20 * 60000),
        isOwn: false,
        ack: 3,
      },
      {
        id: 'm2',
        chatId: 'alice@c.us',
        sender: 'me@c.us',
        senderName: 'You',
        text: 'Good! How about you?',
        timestamp: new Date(now - 18 * 60000),
        isOwn: true,
        ack: 3,
      },
      {
        id: 'm3',
        chatId: 'alice@c.us',
        sender: 'alice@c.us',
        senderName: 'Alice',
        text: 'See you tomorrow! 👋',
        timestamp: new Date(now - 5 * 60000),
        isOwn: false,
        ack: 3,
        reactions: [{ emoji: '👍', from: 'me@c.us' }],
      },
    ]);

    this.messages.set('bob@c.us', [
      {
        id: 'm4',
        chatId: 'bob@c.us',
        sender: 'me@c.us',
        senderName: 'You',
        text: 'Did you get the files?',
        timestamp: new Date(now - 25 * 60000),
        isOwn: true,
        ack: 3,
      },
      {
        id: 'm5',
        chatId: 'bob@c.us',
        sender: 'bob@c.us',
        senderName: 'Bob',
        text: 'Yes, got them. Thanks for the info!',
        timestamp: new Date(now - 15 * 60000),
        isOwn: false,
        ack: 3,
      },
    ]);

    this.messages.set('team@g.us', [
      {
        id: 'm6',
        chatId: 'team@g.us',
        sender: 'carol@c.us',
        senderName: 'Carol',
        text: 'Everyone ready for the standup?',
        timestamp: new Date(now - 10 * 60000),
        isOwn: false,
        ack: 3,
      },
      {
        id: 'm7',
        chatId: 'team@g.us',
        sender: 'me@c.us',
        senderName: 'You',
        text: 'Yes, I am',
        timestamp: new Date(now - 8 * 60000),
        isOwn: true,
        ack: 3,
      },
      {
        id: 'm8',
        chatId: 'team@g.us',
        sender: 'alice@c.us',
        senderName: 'Alice',
        text: 'Meeting at 2pm',
        timestamp: new Date(now - 2 * 60000),
        isOwn: false,
        ack: 3,
      },
    ]);

    this.messages.set('carol@c.us', [
      {
        id: 'm9',
        chatId: 'carol@c.us',
        sender: 'me@c.us',
        senderName: 'You',
        text: 'Want to grab coffee?',
        timestamp: new Date(now - 50 * 60000),
        isOwn: true,
        ack: 3,
      },
      {
        id: 'm10',
        chatId: 'carol@c.us',
        sender: 'carol@c.us',
        senderName: 'Carol',
        text: 'Sounds good!',
        timestamp: new Date(now - 45 * 60000),
        isOwn: false,
        ack: 3,
      },
    ]);
  }

  // Connection status
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  onConnectionStatusChanged(handler: (status: ConnectionStatus) => void): () => void {
    this.connectionStatusListeners.push(handler);
    return () => {
      const i = this.connectionStatusListeners.indexOf(handler);
      if (i > -1) this.connectionStatusListeners.splice(i, 1);
    };
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.connectionStatusListeners.forEach((h) => h(status));
  }

  // Session management
  getSessions(): WhatsAppSession[] {
    return [...this.sessions];
  }

  getCurrentSession(): string | null {
    return this.currentSession;
  }

  async setCurrentSession(sessionName: string): Promise<boolean> {
    const session = this.sessions.find((s) => s.name === sessionName);
    if (!session) return false;
    this.currentSession = sessionName;
    return true;
  }

  async createSession(sessionName: string): Promise<{ success: boolean; error?: string }> {
    if (this.sessions.find((s) => s.name === sessionName)) {
      return { success: false, error: 'Session already exists' };
    }
    this.sessions.push({ name: sessionName, status: 'SCAN_QR_CODE' });
    return { success: true };
  }

  async deleteSession(sessionName: string): Promise<boolean> {
    const i = this.sessions.findIndex((s) => s.name === sessionName);
    if (i === -1) return false;
    this.sessions.splice(i, 1);
    if (this.currentSession === sessionName) {
      this.currentSession = this.sessions[0]?.name || null;
    }
    return true;
  }

  async refreshSessions(): Promise<void> {
    // No-op for mock
  }

  // Login / Authentication
  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  async startQrLogin(): Promise<{ success: boolean; qr?: QrLoginResult; error?: string }> {
    const qr: QrLoginResult = {
      data: `mock_qr_data_${Date.now()}`,
      expiresAt: new Date(Date.now() + 60000),
    };

    // Simulate auto-login after 3 seconds
    this.qrLoginTimer = setTimeout(() => {
      this.initializeWithMockData();
      this.loginStateListeners.forEach((h) => h(true));
      this.chatsChangedListeners.forEach((h) => h());
    }, 3000);

    return { success: true, qr };
  }

  onQrCodeUpdate(handler: (qr: QrLoginResult) => void): () => void {
    this.qrCodeListeners.push(handler);
    return () => {
      const i = this.qrCodeListeners.indexOf(handler);
      if (i > -1) this.qrCodeListeners.splice(i, 1);
    };
  }

  cancelQrLogin(): void {
    if (this.qrLoginTimer) {
      clearTimeout(this.qrLoginTimer);
      this.qrLoginTimer = null;
    }
  }

  async logout(): Promise<void> {
    this.cancelQrLogin();
    this.loggedIn = false;
    this.chats = [];
    this.messages.clear();
    this.currentSession = null;
    this.myProfile = null;
    this.setConnectionStatus('disconnected');
    this.loginStateListeners.forEach((h) => h(false));
  }

  onLoginStateChanged(handler: (loggedIn: boolean) => void): () => void {
    this.loginStateListeners.push(handler);
    return () => {
      const i = this.loginStateListeners.indexOf(handler);
      if (i > -1) this.loginStateListeners.splice(i, 1);
    };
  }

  // Chats
  getChats(filter?: ChatFilter): WhatsAppChat[] {
    let filtered = [...this.chats];

    switch (filter) {
      case 'unread':
        filtered = filtered.filter((c) => c.unreadCount > 0 && !c.isArchived);
        break;
      case 'groups':
        filtered = filtered.filter((c) => c.isGroup && !c.isArchived);
        break;
      case 'archived':
        filtered = filtered.filter((c) => c.isArchived);
        break;
      case 'all':
      default:
        filtered = filtered.filter((c) => !c.isArchived);
        break;
    }

    // Sort by pinned first, then by last message time
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
    });
  }

  getChat(id: string): WhatsAppChat | null {
    return this.chats.find((c) => c.id === id) || null;
  }

  searchChats(query: string): WhatsAppChat[] {
    const q = query.toLowerCase();
    return this.chats.filter(
      (c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  }

  async refreshChats(): Promise<void> {
    // No-op for mock
    this.chatsChangedListeners.forEach((h) => h());
  }

  async archiveChat(chatId: string): Promise<boolean> {
    const chat = this.getChat(chatId);
    if (!chat) return false;
    chat.isArchived = true;
    this.chatUpdatedListeners.forEach((h) => h(chat));
    this.chatsChangedListeners.forEach((h) => h());
    return true;
  }

  async unarchiveChat(chatId: string): Promise<boolean> {
    const chat = this.getChat(chatId);
    if (!chat) return false;
    chat.isArchived = false;
    this.chatUpdatedListeners.forEach((h) => h(chat));
    this.chatsChangedListeners.forEach((h) => h());
    return true;
  }

  async deleteChat(chatId: string): Promise<boolean> {
    const i = this.chats.findIndex((c) => c.id === chatId);
    if (i === -1) return false;
    this.chats.splice(i, 1);
    this.messages.delete(chatId);
    this.chatsChangedListeners.forEach((h) => h());
    return true;
  }

  async markChatAsRead(chatId: string): Promise<boolean> {
    const chat = this.getChat(chatId);
    if (!chat) return false;
    chat.unreadCount = 0;
    this.chatUpdatedListeners.forEach((h) => h(chat));
    return true;
  }

  async markChatAsUnread(chatId: string): Promise<boolean> {
    const chat = this.getChat(chatId);
    if (!chat) return false;
    chat.unreadCount = Math.max(1, chat.unreadCount);
    this.chatUpdatedListeners.forEach((h) => h(chat));
    return true;
  }

  onChatUpdated(handler: (chat: WhatsAppChat) => void): () => void {
    this.chatUpdatedListeners.push(handler);
    return () => {
      const i = this.chatUpdatedListeners.indexOf(handler);
      if (i > -1) this.chatUpdatedListeners.splice(i, 1);
    };
  }

  onChatsChanged(handler: () => void): () => void {
    this.chatsChangedListeners.push(handler);
    return () => {
      const i = this.chatsChangedListeners.indexOf(handler);
      if (i > -1) this.chatsChangedListeners.splice(i, 1);
    };
  }

  // Messages
  getMessages(chatId: string): WhatsAppMessage[] {
    return this.messages.get(chatId) || [];
  }

  async loadMessages(chatId: string, _limit?: number): Promise<WhatsAppMessage[]> {
    return this.getMessages(chatId);
  }

  async loadOlderMessages(_chatId: string): Promise<WhatsAppMessage[]> {
    // Mock doesn't have older messages
    return [];
  }

  async sendMessage(chatId: string, text: string, replyToId?: string): Promise<WhatsAppMessage | null> {
    const chat = this.getChat(chatId);
    if (!chat) return null;

    const replyMsg = replyToId ? this.getMessages(chatId).find((m) => m.id === replyToId) : undefined;

    const msg: WhatsAppMessage = {
      id: `msg_${Date.now()}`,
      chatId,
      sender: 'me@c.us',
      senderName: 'You',
      text,
      timestamp: new Date(),
      isOwn: true,
      ack: 1, // Sent
      replyToId,
      replyToText: replyMsg?.text,
    };

    const chatMessages = this.messages.get(chatId) || [];
    chatMessages.push(msg);
    this.messages.set(chatId, chatMessages);

    // Update chat's last message
    chat.lastMessage = text;
    chat.lastMessageTime = new Date();

    this.messageAddedListeners.forEach((h) => h(msg));
    this.chatUpdatedListeners.forEach((h) => h(chat));
    this.chatsChangedListeners.forEach((h) => h());

    // Simulate delivery after 500ms
    setTimeout(() => {
      msg.ack = 2;
      this.messageUpdatedListeners.forEach((h) => h(msg));
    }, 500);

    // Simulate read after 1s
    setTimeout(() => {
      msg.ack = 3;
      this.messageUpdatedListeners.forEach((h) => h(msg));
    }, 1000);

    return msg;
  }

  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    const chatMessages = this.messages.get(chatId);
    if (!chatMessages) return false;

    const msg = chatMessages.find((m) => m.id === messageId);
    if (!msg) return false;

    msg.isRevoked = true;
    msg.text = 'This message was deleted';
    this.messageUpdatedListeners.forEach((h) => h(msg));
    return true;
  }

  async reactToMessage(chatId: string, messageId: string, emoji: string): Promise<boolean> {
    const chatMessages = this.messages.get(chatId);
    if (!chatMessages) return false;

    const msg = chatMessages.find((m) => m.id === messageId);
    if (!msg) return false;

    if (!msg.reactions) msg.reactions = [];

    // Remove existing reaction from same user
    msg.reactions = msg.reactions.filter((r) => r.from !== 'me@c.us');

    // Add new reaction (empty emoji removes reaction)
    if (emoji) {
      msg.reactions.push({ emoji, from: 'me@c.us' });
    }

    this.messageUpdatedListeners.forEach((h) => h(msg));
    return true;
  }

  onMessageAdded(handler: (msg: WhatsAppMessage) => void): () => void {
    this.messageAddedListeners.push(handler);
    return () => {
      const i = this.messageAddedListeners.indexOf(handler);
      if (i > -1) this.messageAddedListeners.splice(i, 1);
    };
  }

  onMessageUpdated(handler: (msg: WhatsAppMessage) => void): () => void {
    this.messageUpdatedListeners.push(handler);
    return () => {
      const i = this.messageUpdatedListeners.indexOf(handler);
      if (i > -1) this.messageUpdatedListeners.splice(i, 1);
    };
  }

  // Typing indicators
  async sendTypingIndicator(_chatId: string, _isTyping: boolean): Promise<void> {
    // No-op for mock
  }

  onTypingIndicator(handler: (chatId: string, participants: string[]) => void): () => void {
    this.typingListeners.push(handler);
    return () => {
      const i = this.typingListeners.indexOf(handler);
      if (i > -1) this.typingListeners.splice(i, 1);
    };
  }

  // Profile
  getMyProfile(): { id: string; name: string; avatar?: string } | null {
    return this.myProfile;
  }

  // Cleanup
  disconnect(): void {
    this.cancelQrLogin();
    this.setConnectionStatus('disconnected');
  }
}

// ============================================
// Config Loading
// ============================================

export function loadConfigFromEnv(): WhatsAppConfig | null {
  const wahaUrl = process.env.WAHA_URL;
  const apiKey = process.env.WAHA_API_KEY;
  const sessionName = process.env.WAHA_SESSION || 'default';

  if (!wahaUrl) return null;

  return { wahaUrl, apiKey, sessionName };
}

// Re-export real service for convenience
export { RealWhatsAppService, createRealWhatsAppService } from './real-whatsapp-service';
