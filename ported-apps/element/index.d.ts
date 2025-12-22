/**
 * Element - Matrix Client - Tsyne Port
 *
 * @tsyne-app:name Element
 * @tsyne-app:icon message
 * @tsyne-app:category Communication
 * @tsyne-app:args (a: App) => void
 *
 * A open, secure, decentralized messenger ported from Element iOS to Tsyne:
 * - Real-time messaging via Matrix protocol
 * - End-to-end encryption (E2EE) support
 * - Rooms and direct messages
 * - User presence and typing indicators
 * - Notification management
 * - Message reactions and rich content
 * - Multi-user spaces and organization
 *
 * Portions copyright (c) 2013–2025 Matrix Foundation and portions copyright Paul Hammant 2025
 */
export interface MatrixUser {
    id: string;
    userId: string;
    displayName: string;
    avatar: string;
    presence: 'online' | 'idle' | 'offline';
    lastSeen: Date;
}
export interface MatrixRoom {
    id: string;
    name: string;
    topic: string;
    avatar: string;
    memberCount: number;
    unreadCount: number;
    isDirect: boolean;
    isEncrypted: boolean;
    joinedMembers: MatrixUser[];
    timestamp: Date;
}
export interface MatrixMessage {
    id: string;
    roomId: string;
    sender: MatrixUser;
    content: string;
    timestamp: Date;
    isEdited: boolean;
    reactions: Array<{
        emoji: string;
        count: number;
        users: string[];
    }>;
    isEncrypted: boolean;
}
export interface NotificationRule {
    id: string;
    roomId: string;
    type: 'all-messages' | 'mentions-only' | 'muted';
    isMuted: boolean;
}
export interface DirectChat {
    id: string;
    participant: MatrixUser;
    lastMessage?: MatrixMessage;
    timestamp: Date;
}
export interface UserSession {
    id: string;
    userId: string;
    deviceName: string;
    isCurrentDevice: boolean;
    lastActivity: Date;
    isVerified: boolean;
}
type ChangeListener = () => void;
export declare class ElementStore {
    private currentUser;
    private rooms;
    private messages;
    private directChats;
    private notificationRules;
    private sessions;
    private nextMessageId;
    private changeListeners;
    subscribe(listener: ChangeListener): () => void;
    private notifyChange;
    getRooms(): MatrixRoom[];
    getDirectChats(): DirectChat[];
    getRoomMessages(roomId: string): MatrixMessage[];
    sendMessage(roomId: string, content: string): MatrixMessage;
    leaveRoom(roomId: string): boolean;
    createDirectChat(participant: MatrixUser): DirectChat;
    addReaction(messageId: string, emoji: string): boolean;
    deleteMessage(messageId: string): boolean;
    markRoomAsRead(roomId: string): void;
    getTotalUnreadCount(): number;
    getCurrentUser(): MatrixUser;
    setUserPresence(presence: 'online' | 'idle' | 'offline'): void;
    updateUserProfile(displayName: string, avatar: string): void;
    getUsers(): MatrixUser[];
    getNotificationRules(): NotificationRule[];
    setRoomNotificationRule(roomId: string, type: NotificationRule['type']): void;
    muteRoom(roomId: string, mute: boolean): void;
    getSessions(): UserSession[];
    deleteSession(sessionId: string): boolean;
    getRoomCount(): number;
    getMessageCount(): number;
    getEncryptedRoomCount(): number;
    getOnlineUserCount(): number;
}
export declare function buildElementApp(a: any): void;
export {};
