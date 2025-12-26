/*
 * Real WhatsApp Service Implementation
 *
 * This module wraps the WAHA (WhatsApp HTTP API) client to provide
 * real WhatsApp functionality through the IWhatsAppService interface.
 *
 * Requires a running WAHA server and the @muhammedaksam/waha-node package.
 *
 * Copyright Paul Hammant 2025
 * Licensed under GNU General Public License v3
 */

import { WahaClient } from '@muhammedaksam/waha-node';
import type {
  ChatSummary,
  SessionInfo,
  WAMessage,
  WAHAChatPresences,
} from '@muhammedaksam/waha-node';
import {
  IWhatsAppService,
  WhatsAppChat,
  WhatsAppMessage,
  WhatsAppSession,
  WhatsAppConfig,
  QrLoginResult,
  ConnectionStatus,
  ChatFilter,
} from './whatsapp-service';

// ============================================
// Real WhatsApp Service
// ============================================

export class RealWhatsAppService implements IWhatsAppService {
  private client: WahaClient;
  private config: WhatsAppConfig;
  private currentSessionName: string | null = null;
  private sessions: WhatsAppSession[] = [];
  private chats: WhatsAppChat[] = [];
  private messages: Map<string, WhatsAppMessage[]> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private loggedIn: boolean = false;
  private myProfile: { id: string; name: string; avatar?: string } | null = null;
  private contactsCache: Map<string, string> = new Map();

  // WebSocket for real-time updates
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  // Event listeners
  private connectionStatusListeners: ((status: ConnectionStatus) => void)[] = [];
  private loginStateListeners: ((loggedIn: boolean) => void)[] = [];
  private qrCodeListeners: ((qr: QrLoginResult) => void)[] = [];
  private chatUpdatedListeners: ((chat: WhatsAppChat) => void)[] = [];
  private chatsChangedListeners: (() => void)[] = [];
  private messageAddedListeners: ((msg: WhatsAppMessage) => void)[] = [];
  private messageUpdatedListeners: ((msg: WhatsAppMessage) => void)[] = [];
  private typingListeners: ((chatId: string, participants: string[]) => void)[] = [];

  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.client = new WahaClient(config.wahaUrl, config.apiKey);
    this.currentSessionName = config.sessionName || null;
  }

  // ============================================
  // Connection Management
  // ============================================

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

  private connectWebSocket(): void {
    if (this.ws) return;

    try {
      let wsUrl = this.config.wahaUrl.replace(/^http/, 'ws');
      if (!wsUrl.endsWith('/ws')) {
        wsUrl = `${wsUrl}/ws`;
      }

      const params = new URLSearchParams();
      params.append('session', '*');

      const events = [
        'session.status',
        'message',
        'message.reaction',
        'message.any',
        'message.ack',
        'message.revoked',
        'presence.update',
      ];
      events.forEach((e) => params.append('events', e));

      if (this.config.apiKey) {
        params.append('x-api-key', this.config.apiKey);
      }

      this.ws = new WebSocket(`${wsUrl}?${params.toString()}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          this.processWebSocketEvent(data);
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Error leads to close
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connectWebSocket();
    }, delay);
  }

  private processWebSocketEvent(data: any): void {
    if (
      data.session &&
      this.currentSessionName &&
      data.session !== this.currentSessionName
    ) {
      return;
    }

    switch (data.event) {
      case 'session.status':
        this.handleSessionStatusEvent(data.payload);
        break;
      case 'message':
      case 'message.any':
        this.handleMessageEvent(data.payload);
        break;
      case 'message.ack':
        this.handleMessageAckEvent(data.payload);
        break;
      case 'message.reaction':
        this.handleMessageReactionEvent(data.payload);
        break;
      case 'message.revoked':
        this.handleMessageRevokedEvent(data.payload);
        break;
      case 'presence.update':
        this.handlePresenceEvent(data.payload);
        break;
    }
  }

  private handleSessionStatusEvent(payload: any): void {
    const status = payload?.status;
    if (status === 'WORKING') {
      this.loggedIn = true;
      this.loginStateListeners.forEach((h) => h(true));
    } else if (status === 'SCAN_QR_CODE' && payload.qr) {
      this.qrCodeListeners.forEach((h) =>
        h({
          data: payload.qr.url || payload.qr.base64,
          expiresAt: new Date(Date.now() + 60000),
        })
      );
    }
  }

  private handleMessageEvent(payload: any): void {
    if (!payload) return;

    const chatId = payload.fromMe ? payload.to : payload.from;
    const msg = this.convertToWhatsAppMessage(payload, chatId);

    const chatMessages = this.messages.get(chatId) || [];
    if (!chatMessages.find((m) => m.id === msg.id)) {
      chatMessages.push(msg);
      this.messages.set(chatId, chatMessages);
      this.messageAddedListeners.forEach((h) => h(msg));
    }

    // Update chat's last message
    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.lastMessage = msg.text || '[media]';
      chat.lastMessageTime = msg.timestamp;
      if (!payload.fromMe) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
      }
      this.chatUpdatedListeners.forEach((h) => h(chat));
    }

    this.chatsChangedListeners.forEach((h) => h());
  }

  private handleMessageAckEvent(payload: any): void {
    const chatId = payload.fromMe ? payload.to : payload.from;
    const chatMessages = this.messages.get(chatId);
    if (!chatMessages) return;

    const msg = chatMessages.find((m) => m.id === payload.id);
    if (msg) {
      msg.ack = payload.ack;
      this.messageUpdatedListeners.forEach((h) => h(msg));
    }
  }

  private handleMessageReactionEvent(payload: any): void {
    const reaction = payload.reaction;
    if (!reaction) return;

    // Find the message in all chats
    for (const [chatId, messages] of this.messages) {
      const msg = messages.find((m) => m.id === reaction.messageId);
      if (msg) {
        if (!msg.reactions) msg.reactions = [];
        // Remove existing reaction from sender
        const senderId = payload.participant || payload.from;
        msg.reactions = msg.reactions.filter((r) => r.from !== senderId);
        // Add new reaction
        if (reaction.text) {
          msg.reactions.push({ emoji: reaction.text, from: senderId });
        }
        this.messageUpdatedListeners.forEach((h) => h(msg));
        break;
      }
    }
  }

  private handleMessageRevokedEvent(payload: any): void {
    const revokedId = payload.revokedMessageId;
    for (const [chatId, messages] of this.messages) {
      const msg = messages.find((m) => m.id === revokedId);
      if (msg) {
        msg.isRevoked = true;
        msg.text = 'This message was deleted';
        this.messageUpdatedListeners.forEach((h) => h(msg));
        break;
      }
    }
  }

  private handlePresenceEvent(payload: any): void {
    if (!payload?.id || !payload.presences) return;

    const chatId = payload.id;
    const typingParticipants = payload.presences
      .filter((p: any) => p.lastKnownPresence === 'typing' || p.lastKnownPresence === 'composing')
      .map((p: any) => p.participant);

    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.typingParticipants = typingParticipants;
      this.chatUpdatedListeners.forEach((h) => h(chat));
    }

    this.typingListeners.forEach((h) => h(chatId, typingParticipants));
  }

  // ============================================
  // Session Management
  // ============================================

  getSessions(): WhatsAppSession[] {
    return [...this.sessions];
  }

  getCurrentSession(): string | null {
    return this.currentSessionName;
  }

  async setCurrentSession(sessionName: string): Promise<boolean> {
    const session = this.sessions.find((s) => s.name === sessionName);
    if (!session) return false;
    this.currentSessionName = sessionName;
    return true;
  }

  async createSession(sessionName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.sessions.sessionsControllerCreate({
        name: sessionName,
        start: true,
      });
      await this.refreshSessions();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to create session' };
    }
  }

  async deleteSession(sessionName: string): Promise<boolean> {
    try {
      await this.client.sessions.sessionsControllerDelete(sessionName);
      await this.refreshSessions();
      return true;
    } catch {
      return false;
    }
  }

  async refreshSessions(): Promise<void> {
    try {
      this.setConnectionStatus('connecting');
      const { data: sessions } = await this.client.sessions.sessionsControllerList();
      this.sessions = (sessions as SessionInfo[] || []).map((s) => ({
        name: s.name,
        status: s.status as WhatsAppSession['status'],
        qr: (s as any).qr,
      }));

      // Check if current session is working
      const currentSession = this.sessions.find((s) => s.name === this.currentSessionName);
      if (currentSession?.status === 'WORKING') {
        this.loggedIn = true;
        this.connectWebSocket();
      }

      this.setConnectionStatus('connected');
    } catch (e) {
      this.setConnectionStatus('error');
    }
  }

  // ============================================
  // Login / Authentication
  // ============================================

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  async startQrLogin(): Promise<{ success: boolean; qr?: QrLoginResult; error?: string }> {
    try {
      if (!this.currentSessionName) {
        this.currentSessionName = 'default';
      }

      // Create or start session
      const existingSession = this.sessions.find((s) => s.name === this.currentSessionName);
      if (!existingSession) {
        await this.client.sessions.sessionsControllerCreate({
          name: this.currentSessionName,
          start: true,
        });
      } else {
        await this.client.sessions.sessionsControllerStart(this.currentSessionName);
      }

      // Connect WebSocket to receive QR updates
      this.connectWebSocket();

      // Get initial session info for QR
      const { data: session } = await this.client.sessions.sessionsControllerGet(
        this.currentSessionName
      );

      if ((session as any).qr) {
        const qrData = (session as any).qr;
        return {
          success: true,
          qr: {
            data: qrData.url || qrData.base64,
            expiresAt: new Date(Date.now() + 60000),
          },
        };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to start QR login' };
    }
  }

  onQrCodeUpdate(handler: (qr: QrLoginResult) => void): () => void {
    this.qrCodeListeners.push(handler);
    return () => {
      const i = this.qrCodeListeners.indexOf(handler);
      if (i > -1) this.qrCodeListeners.splice(i, 1);
    };
  }

  cancelQrLogin(): void {
    // Stop session if needed
  }

  async logout(): Promise<void> {
    if (!this.currentSessionName) return;

    try {
      await this.client.sessions.sessionsControllerLogout(this.currentSessionName);
    } catch {
      // Ignore errors
    }

    this.loggedIn = false;
    this.chats = [];
    this.messages.clear();
    this.loginStateListeners.forEach((h) => h(false));
  }

  onLoginStateChanged(handler: (loggedIn: boolean) => void): () => void {
    this.loginStateListeners.push(handler);
    return () => {
      const i = this.loginStateListeners.indexOf(handler);
      if (i > -1) this.loginStateListeners.splice(i, 1);
    };
  }

  // ============================================
  // Chats
  // ============================================

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
    if (!this.currentSessionName) return;

    try {
      const response = await this.client.chats.chatsControllerGetChats(
        this.currentSessionName,
        {}
      );

      // Handle different response formats from the SDK
      let chats: any[] = [];
      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray((response as any).data)) {
          chats = (response as any).data;
        } else if (Array.isArray(response)) {
          chats = response as any[];
        }
      }

      this.chats = chats.map((c) => this.convertToWhatsAppChat(c));

      // Load contacts for names
      await this.loadContacts();

      this.chatsChangedListeners.forEach((h) => h());
    } catch (e) {
      console.error('Failed to refresh chats:', e);
    }
  }

  private async loadContacts(): Promise<void> {
    if (!this.currentSessionName) return;

    try {
      const response = await this.client.contacts.contactsControllerGetAll({
        session: this.currentSessionName,
        limit: 5000,
      });

      // Handle different response formats from the SDK
      let contacts: any[] = [];
      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray((response as any).data)) {
          contacts = (response as any).data;
        } else if (Array.isArray(response)) {
          contacts = response as any[];
        }
      }

      for (const contact of contacts) {
        if (contact.id && (contact.name || contact.pushname)) {
          this.contactsCache.set(contact.id, contact.name || contact.pushname);
        }
      }
    } catch {
      // Ignore
    }
  }

  private convertToWhatsAppChat(c: any): WhatsAppChat {
    const id = typeof c.id === 'string' ? c.id : c.id?._serialized || '';
    const isGroup = id.endsWith('@g.us');
    const muteExp = c.muteExpiration || 0;

    return {
      id,
      name: c.name || this.contactsCache.get(id) || id,
      lastMessage: c.lastMessage?.body || '',
      lastMessageTime: new Date((c.lastMessage?.timestamp || Date.now() / 1000) * 1000),
      unreadCount: c.unreadCount || 0,
      avatar: isGroup ? '👥' : '👤',
      isGroup,
      isArchived: c.archived || false,
      isPinned: c.isPinned || false,
      isMuted: muteExp > Date.now() / 1000,
    };
  }

  async archiveChat(chatId: string): Promise<boolean> {
    if (!this.currentSessionName) return false;

    try {
      await this.client.chats.chatsControllerArchiveChat(this.currentSessionName, chatId);
      const chat = this.getChat(chatId);
      if (chat) {
        chat.isArchived = true;
        this.chatUpdatedListeners.forEach((h) => h(chat));
      }
      return true;
    } catch {
      return false;
    }
  }

  async unarchiveChat(chatId: string): Promise<boolean> {
    if (!this.currentSessionName) return false;

    try {
      await this.client.chats.chatsControllerUnarchiveChat(this.currentSessionName, chatId);
      const chat = this.getChat(chatId);
      if (chat) {
        chat.isArchived = false;
        this.chatUpdatedListeners.forEach((h) => h(chat));
      }
      return true;
    } catch {
      return false;
    }
  }

  async deleteChat(chatId: string): Promise<boolean> {
    if (!this.currentSessionName) return false;

    try {
      await this.client.chats.chatsControllerDeleteChat(this.currentSessionName, chatId);
      this.chats = this.chats.filter((c) => c.id !== chatId);
      this.messages.delete(chatId);
      this.chatsChangedListeners.forEach((h) => h());
      return true;
    } catch {
      return false;
    }
  }

  async markChatAsRead(chatId: string): Promise<boolean> {
    // WAHA doesn't have explicit mark-as-read API; handled by reading messages
    const chat = this.getChat(chatId);
    if (chat) {
      chat.unreadCount = 0;
      this.chatUpdatedListeners.forEach((h) => h(chat));
    }
    return true;
  }

  async markChatAsUnread(chatId: string): Promise<boolean> {
    // WAHA may not have a direct markChatUnread API; simulate locally
    const chat = this.getChat(chatId);
    if (chat) {
      chat.unreadCount = Math.max(1, chat.unreadCount);
      this.chatUpdatedListeners.forEach((h) => h(chat));
      return true;
    }
    return false;
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

  // ============================================
  // Messages
  // ============================================

  getMessages(chatId: string): WhatsAppMessage[] {
    return this.messages.get(chatId) || [];
  }

  async loadMessages(chatId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    if (!this.currentSessionName) return [];

    try {
      const { data: messages } = await this.client.chats.chatsControllerGetChatMessages(
        this.currentSessionName,
        chatId,
        {
          limit,
          downloadMedia: false,
          sortBy: 'messageTimestamp',
          sortOrder: 'desc',
        }
      );

      const converted = ((messages as WAMessage[]) || []).map((m) =>
        this.convertToWhatsAppMessage(m, chatId)
      );

      this.messages.set(chatId, converted);
      return converted;
    } catch (e) {
      console.error('Failed to load messages:', e);
      return [];
    }
  }

  async loadOlderMessages(chatId: string): Promise<WhatsAppMessage[]> {
    if (!this.currentSessionName) return [];

    const currentMessages = this.messages.get(chatId) || [];
    const offset = currentMessages.length;

    try {
      const { data: messages } = await this.client.chats.chatsControllerGetChatMessages(
        this.currentSessionName,
        chatId,
        {
          limit: 50,
          offset,
          downloadMedia: false,
          sortBy: 'messageTimestamp',
          sortOrder: 'desc',
        }
      );

      const converted = ((messages as WAMessage[]) || []).map((m) =>
        this.convertToWhatsAppMessage(m, chatId)
      );

      const combined = [...currentMessages, ...converted];
      this.messages.set(chatId, combined);
      return converted;
    } catch {
      return [];
    }
  }

  private convertToWhatsAppMessage(m: any, chatId: string): WhatsAppMessage {
    const senderId = m.participant || m.from;
    const senderName =
      this.contactsCache.get(senderId) ||
      m._data?.notifyName ||
      m._data?.pushName ||
      senderId;

    return {
      id: m.id,
      chatId,
      sender: senderId,
      senderName,
      text: m.body || '',
      timestamp: new Date(m.timestamp * 1000),
      isOwn: m.fromMe,
      ack: m.ack,
      mediaType: m.mediaType,
      mediaUrl: m.mediaUrl,
      reactions: this.normalizeReactions(m),
      replyToId: m.replyTo?.id,
      replyToText: m.replyTo?.body,
    };
  }

  private normalizeReactions(m: any): Array<{ emoji: string; from: string }> {
    if (m.reactions && Array.isArray(m.reactions)) {
      return m.reactions.map((r: any) => ({
        emoji: r.text || r.aggregateEmoji,
        from: r.from || r.id,
      }));
    }

    // Try _data.reactions
    if (m._data?.reactions && Array.isArray(m._data.reactions)) {
      const result: Array<{ emoji: string; from: string }> = [];
      for (const r of m._data.reactions) {
        const emoji = r.aggregateEmoji;
        if (r.senders) {
          for (const sender of r.senders) {
            result.push({ emoji, from: sender.id });
          }
        }
      }
      return result;
    }

    return [];
  }

  async sendMessage(
    chatId: string,
    text: string,
    replyToId?: string
  ): Promise<WhatsAppMessage | null> {
    if (!this.currentSessionName) return null;

    try {
      await this.client.chatting.chattingControllerSendText({
        session: this.currentSessionName,
        chatId,
        text,
        ...(replyToId && { reply_to: replyToId }),
      });

      // Reload messages to get the sent one
      await this.loadMessages(chatId);

      const messages = this.messages.get(chatId) || [];
      return messages[0] || null; // Most recent
    } catch (e) {
      console.error('Failed to send message:', e);
      return null;
    }
  }

  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    if (!this.currentSessionName) return false;

    try {
      await this.client.chats.chatsControllerDeleteMessage(
        this.currentSessionName,
        chatId,
        messageId
      );
      return true;
    } catch {
      return false;
    }
  }

  async reactToMessage(chatId: string, messageId: string, emoji: string): Promise<boolean> {
    if (!this.currentSessionName) return false;

    try {
      await this.client.chatting.chattingControllerSetReaction({
        session: this.currentSessionName,
        messageId,
        reaction: emoji,
      });
      return true;
    } catch {
      return false;
    }
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

  // ============================================
  // Typing Indicators
  // ============================================

  async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    if (!this.currentSessionName) return;

    try {
      if (isTyping) {
        await this.client.chatting.chattingControllerStartTyping({
          session: this.currentSessionName,
          chatId,
        });
      } else {
        await this.client.chatting.chattingControllerStopTyping({
          session: this.currentSessionName,
          chatId,
        });
      }
    } catch {
      // Ignore typing errors
    }
  }

  onTypingIndicator(handler: (chatId: string, participants: string[]) => void): () => void {
    this.typingListeners.push(handler);
    return () => {
      const i = this.typingListeners.indexOf(handler);
      if (i > -1) this.typingListeners.splice(i, 1);
    };
  }

  // ============================================
  // Profile
  // ============================================

  getMyProfile(): { id: string; name: string; avatar?: string } | null {
    return this.myProfile;
  }

  async fetchMyProfile(): Promise<void> {
    if (!this.currentSessionName) return;

    try {
      const { data: profile } = await this.client.profile.profileControllerGetMyProfile(
        this.currentSessionName
      );
      this.myProfile = {
        id: (profile as any).id,
        name: (profile as any).name || 'Me',
        avatar: (profile as any).picture,
      };
    } catch {
      // Ignore
    }
  }

  // ============================================
  // Cleanup
  // ============================================

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setConnectionStatus('disconnected');
  }
}

// ============================================
// Factory Function
// ============================================

export function createRealWhatsAppService(config: WhatsAppConfig): IWhatsAppService {
  const service = new RealWhatsAppService(config);
  // Start connecting
  service.refreshSessions();
  return service;
}
