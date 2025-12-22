"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementStore = void 0;
exports.buildElementApp = buildElementApp;
class ElementStore {
    constructor() {
        this.currentUser = {
            id: 'user-001',
            userId: '@alice:example.com',
            displayName: 'Alice',
            avatar: '👩',
            presence: 'online',
            lastSeen: new Date(),
        };
        this.rooms = [
            {
                id: 'room-001',
                name: '#general',
                topic: 'General discussion',
                avatar: '💬',
                memberCount: 12,
                unreadCount: 3,
                isDirect: false,
                isEncrypted: true,
                joinedMembers: [
                    { id: 'user-002', userId: '@bob:example.com', displayName: 'Bob', avatar: '👨', presence: 'online', lastSeen: new Date() },
                    { id: 'user-003', userId: '@charlie:example.com', displayName: 'Charlie', avatar: '👨‍💻', presence: 'idle', lastSeen: new Date(Date.now() - 300000) },
                ],
                timestamp: new Date(Date.now() - 3600000),
            },
            {
                id: 'room-002',
                name: '#random',
                topic: 'Off-topic fun',
                avatar: '🎲',
                memberCount: 8,
                unreadCount: 0,
                isDirect: false,
                isEncrypted: true,
                joinedMembers: [],
                timestamp: new Date(Date.now() - 7200000),
            },
            {
                id: 'room-003',
                name: 'Direct with Bob',
                topic: '',
                avatar: '👨',
                memberCount: 2,
                unreadCount: 1,
                isDirect: true,
                isEncrypted: true,
                joinedMembers: [{ id: 'user-002', userId: '@bob:example.com', displayName: 'Bob', avatar: '👨', presence: 'online', lastSeen: new Date() }],
                timestamp: new Date(Date.now() - 1800000),
            },
        ];
        this.messages = [
            {
                id: 'msg-001',
                roomId: 'room-001',
                sender: { id: 'user-002', userId: '@bob:example.com', displayName: 'Bob', avatar: '👨', presence: 'online', lastSeen: new Date() },
                content: 'Hey Alice, how are you doing?',
                timestamp: new Date(Date.now() - 600000),
                isEdited: false,
                reactions: [{ emoji: '👍', count: 2, users: ['@alice:example.com', '@charlie:example.com'] }],
                isEncrypted: true,
            },
            {
                id: 'msg-002',
                roomId: 'room-001',
                sender: { id: 'user-003', userId: '@charlie:example.com', displayName: 'Charlie', avatar: '👨‍💻', presence: 'idle', lastSeen: new Date(Date.now() - 300000) },
                content: 'Just finished that project we discussed',
                timestamp: new Date(Date.now() - 420000),
                isEdited: false,
                reactions: [],
                isEncrypted: true,
            },
        ];
        this.directChats = [
            {
                id: 'dm-001',
                participant: { id: 'user-002', userId: '@bob:example.com', displayName: 'Bob', avatar: '👨', presence: 'online', lastSeen: new Date() },
                timestamp: new Date(Date.now() - 1800000),
                lastMessage: { id: 'dm-msg-001', roomId: 'room-003', sender: { id: 'user-002', userId: '@bob:example.com', displayName: 'Bob', avatar: '👨', presence: 'online', lastSeen: new Date() }, content: 'See you tomorrow', timestamp: new Date(Date.now() - 1800000), isEdited: false, reactions: [], isEncrypted: true },
            },
        ];
        this.notificationRules = [
            { id: 'rule-001', roomId: 'room-001', type: 'all-messages', isMuted: false },
            { id: 'rule-002', roomId: 'room-002', type: 'mentions-only', isMuted: false },
        ];
        this.sessions = [
            { id: 'session-001', userId: '@alice:example.com', deviceName: 'Alice iPhone', isCurrentDevice: false, lastActivity: new Date(Date.now() - 86400000), isVerified: true },
            { id: 'session-002', userId: '@alice:example.com', deviceName: 'Alice Desktop (Current)', isCurrentDevice: true, lastActivity: new Date(), isVerified: true },
        ];
        this.nextMessageId = 3;
        this.changeListeners = [];
    }
    subscribe(listener) {
        this.changeListeners.push(listener);
        return () => {
            this.changeListeners = this.changeListeners.filter((l) => l !== listener);
        };
    }
    notifyChange() {
        this.changeListeners.forEach((listener) => listener());
    }
    // ========== Rooms ==========
    getRooms() {
        return [...this.rooms].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    getDirectChats() {
        return [...this.directChats].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    getRoomMessages(roomId) {
        return this.messages.filter((m) => m.roomId === roomId);
    }
    sendMessage(roomId, content) {
        const message = {
            id: `msg-${String(this.nextMessageId++).padStart(3, '0')}`,
            roomId,
            sender: this.currentUser,
            content,
            timestamp: new Date(),
            isEdited: false,
            reactions: [],
            isEncrypted: true,
        };
        this.messages.unshift(message);
        const room = this.rooms.find((r) => r.id === roomId);
        if (room) {
            room.timestamp = new Date();
            room.unreadCount = 0;
        }
        this.notifyChange();
        return message;
    }
    leaveRoom(roomId) {
        const initialLength = this.rooms.length;
        this.rooms = this.rooms.filter((r) => r.id !== roomId);
        if (this.rooms.length < initialLength) {
            this.notifyChange();
            return true;
        }
        return false;
    }
    createDirectChat(participant) {
        const chat = {
            id: `dm-${Date.now()}`,
            participant,
            timestamp: new Date(),
        };
        this.directChats.unshift(chat);
        this.notifyChange();
        return chat;
    }
    // ========== Messages ==========
    addReaction(messageId, emoji) {
        const message = this.messages.find((m) => m.id === messageId);
        if (message) {
            const reaction = message.reactions.find((r) => r.emoji === emoji);
            if (reaction) {
                reaction.count++;
                if (!reaction.users.includes(this.currentUser.userId)) {
                    reaction.users.push(this.currentUser.userId);
                }
            }
            else {
                message.reactions.push({ emoji, count: 1, users: [this.currentUser.userId] });
            }
            this.notifyChange();
            return true;
        }
        return false;
    }
    deleteMessage(messageId) {
        const initialLength = this.messages.length;
        this.messages = this.messages.filter((m) => m.id !== messageId);
        if (this.messages.length < initialLength) {
            this.notifyChange();
            return true;
        }
        return false;
    }
    markRoomAsRead(roomId) {
        const room = this.rooms.find((r) => r.id === roomId);
        if (room) {
            room.unreadCount = 0;
            this.notifyChange();
        }
    }
    getTotalUnreadCount() {
        return this.rooms.reduce((sum, r) => sum + r.unreadCount, 0);
    }
    // ========== User Management ==========
    getCurrentUser() {
        return { ...this.currentUser };
    }
    setUserPresence(presence) {
        this.currentUser.presence = presence;
        this.notifyChange();
    }
    updateUserProfile(displayName, avatar) {
        this.currentUser.displayName = displayName;
        this.currentUser.avatar = avatar;
        this.notifyChange();
    }
    getUsers() {
        const users = new Map();
        this.rooms.forEach((r) => r.joinedMembers.forEach((u) => users.set(u.id, u)));
        return Array.from(users.values());
    }
    // ========== Notifications ==========
    getNotificationRules() {
        return [...this.notificationRules];
    }
    setRoomNotificationRule(roomId, type) {
        let rule = this.notificationRules.find((r) => r.roomId === roomId);
        if (!rule) {
            rule = { id: `rule-${Date.now()}`, roomId, type, isMuted: false };
            this.notificationRules.push(rule);
        }
        else {
            rule.type = type;
        }
        this.notifyChange();
    }
    muteRoom(roomId, mute) {
        let rule = this.notificationRules.find((r) => r.roomId === roomId);
        if (!rule) {
            rule = { id: `rule-${Date.now()}`, roomId, type: 'all-messages', isMuted: mute };
            this.notificationRules.push(rule);
        }
        else {
            rule.isMuted = mute;
        }
        this.notifyChange();
    }
    // ========== Sessions ==========
    getSessions() {
        return [...this.sessions];
    }
    deleteSession(sessionId) {
        const initialLength = this.sessions.length;
        this.sessions = this.sessions.filter((s) => s.id !== sessionId);
        if (this.sessions.length < initialLength) {
            this.notifyChange();
            return true;
        }
        return false;
    }
    // ========== Statistics ==========
    getRoomCount() {
        return this.rooms.length;
    }
    getMessageCount() {
        return this.messages.length;
    }
    getEncryptedRoomCount() {
        return this.rooms.filter((r) => r.isEncrypted).length;
    }
    getOnlineUserCount() {
        const users = this.getUsers();
        return users.filter((u) => u.presence === 'online').length;
    }
}
exports.ElementStore = ElementStore;
// ============================================================================
// APP BUILD FUNCTION
// ============================================================================
function buildElementApp(a) {
    const store = new ElementStore();
    let selectedTab = 'rooms';
    let currentRoom = null;
    let messageInput;
    let messageInputValue = '';
    let viewStack;
    let userLabel;
    let statsLabel;
    let roomsContainer;
    let directsContainer;
    let settingsContainer;
    const updateLabels = async () => {
        if (userLabel) {
            const user = store.getCurrentUser();
            await userLabel.setText(`${user.avatar} ${user.displayName} (${user.presence})`);
        }
        if (statsLabel) {
            const unread = store.getTotalUnreadCount();
            const encrypted = store.getEncryptedRoomCount();
            await statsLabel.setText(`💬 Rooms: ${store.getRoomCount()} | 🔐 Encrypted: ${encrypted} | 📬 Unread: ${unread}`);
        }
    };
    a.window({ title: 'Element - Secure Messenger' }, (win) => {
        win.setContent(() => {
            a.hbox(() => {
                // Sidebar
                a.vbox(() => {
                    // User Profile
                    a.hbox(() => {
                        const user = store.getCurrentUser();
                        a.label(`${user.avatar}`).withBold();
                        a.vbox(() => {
                            a.label(user.displayName).withBold().withId('user-name');
                            a.label(`@${user.userId.split(':')[0].substring(1)}`).withSize(0.8);
                        });
                        a.spacer();
                        a.label(`${user.presence === 'online' ? '🟢' : user.presence === 'idle' ? '🟡' : '⚫'}`);
                    }).withPadding(5);
                    a.separator();
                    // Main tabs
                    a.vbox(() => {
                        a.button('💬 Rooms').onClick(async () => {
                            selectedTab = 'rooms';
                            currentRoom = null;
                            await updateLabels();
                            await viewStack.refresh();
                        });
                        a.button('👥 Direct Messages').onClick(async () => {
                            selectedTab = 'directs';
                            currentRoom = null;
                            await updateLabels();
                            await viewStack.refresh();
                        });
                        a.button('⚙️ Settings').onClick(async () => {
                            selectedTab = 'settings';
                            currentRoom = null;
                            await updateLabels();
                            await viewStack.refresh();
                        });
                    });
                    a.separator();
                    userLabel = a.label(`${store.getCurrentUser().avatar} ${store.getCurrentUser().displayName}`).withId('user-label');
                }).withPadding(10).withMinWidth(200);
                // Main Content
                a.vbox(() => {
                    statsLabel = a.label('💬 Rooms: 0 | 🔐 Encrypted: 0 | 📬 Unread: 0').withId('stats-label');
                    viewStack = a.vbox(() => {
                        // Rooms Tab
                        roomsContainer = a.vbox(() => {
                            a.label('💬 Rooms').withId('rooms-title').withBold();
                            a.vbox(() => { })
                                .bindTo({
                                items: () => store.getRooms(),
                                render: (room) => {
                                    const badge = room.unreadCount > 0 ? `(${room.unreadCount})` : '';
                                    a.hbox(() => {
                                        a.vbox(() => {
                                            a.label(`${room.avatar} ${room.name} ${badge}`).withBold();
                                            a.label(`👥 ${room.memberCount} | ${room.isEncrypted ? '🔐' : '🔓'}`).withSize(0.8);
                                        });
                                        a.spacer();
                                        a.button('→').onClick(async () => {
                                            currentRoom = room;
                                            store.markRoomAsRead(room.id);
                                            await updateLabels();
                                            await viewStack.refresh();
                                        });
                                    }).withPadding(5);
                                },
                                trackBy: (room) => room.id,
                            });
                        })
                            .withPadding(10)
                            .when(() => selectedTab === 'rooms' && !currentRoom);
                        // Room Detail
                        if (currentRoom) {
                            const room = currentRoom;
                            a.vbox(() => {
                                a.hbox(() => {
                                    a.label(`${room.avatar} ${room.name}`).withBold();
                                    a.spacer();
                                    a.button('← Back').onClick(async () => {
                                        currentRoom = null;
                                        await viewStack.refresh();
                                    });
                                });
                                a.label(`${room.topic || 'No topic'}`).withSize(0.9);
                                a.separator();
                                // Messages
                                a.label('💬 Messages:').withSize(0.9);
                                a.vbox(() => { })
                                    .bindTo({
                                    items: () => store.getRoomMessages(room.id),
                                    render: (msg) => {
                                        const reactions = msg.reactions.map((r) => `${r.emoji} ${r.count}`).join(' ');
                                        a.hbox(() => {
                                            a.vbox(() => {
                                                a.label(`${msg.sender.avatar} ${msg.sender.displayName}`).withBold();
                                                a.label(msg.content);
                                                if (reactions) {
                                                    a.label(reactions).withSize(0.8);
                                                }
                                                a.label(`${new Date(msg.timestamp).toLocaleTimeString()}`).withSize(0.75);
                                            });
                                            a.spacer();
                                            a.button('😊').onClick(async () => {
                                                store.addReaction(msg.id, '👍');
                                                await viewStack.refresh();
                                            });
                                            a.button('✕').onClick(async () => {
                                                store.deleteMessage(msg.id);
                                                await viewStack.refresh();
                                            });
                                        }).withPadding(5);
                                    },
                                    trackBy: (msg) => msg.id,
                                });
                                a.separator();
                                // Message input
                                a.hbox(() => {
                                    messageInput = a.textEntry('').withPlaceholder('Type a message...').withId('message-input');
                                    messageInput.onChange(async (value) => {
                                        messageInputValue = value;
                                    });
                                    a.button('Send').onClick(async () => {
                                        if (messageInputValue.trim() && currentRoom) {
                                            store.sendMessage(currentRoom.id, messageInputValue);
                                            messageInputValue = '';
                                            if (messageInput) {
                                                await messageInput.setText('');
                                            }
                                            await updateLabels();
                                            await viewStack.refresh();
                                        }
                                    });
                                });
                            })
                                .withPadding(10)
                                .when(() => selectedTab === 'rooms' && currentRoom !== null);
                        }
                        // Direct Messages Tab
                        directsContainer = a.vbox(() => {
                            a.label('👥 Direct Messages').withId('directs-title').withBold();
                            a.hbox(() => {
                                a.button('➕ New Chat').onClick(async () => {
                                    const users = store.getUsers();
                                    if (users.length > 0) {
                                        store.createDirectChat(users[0]);
                                        await updateLabels();
                                        await viewStack.refresh();
                                    }
                                });
                                a.spacer();
                                a.label(`Total: ${store.getDirectChats().length}`);
                            });
                            a.vbox(() => { })
                                .bindTo({
                                items: () => store.getDirectChats(),
                                render: (chat) => {
                                    a.hbox(() => {
                                        a.vbox(() => {
                                            a.label(`${chat.participant.avatar} ${chat.participant.displayName}`).withBold();
                                            a.label(`${chat.participant.presence === 'online' ? '🟢 Online' : '⚫ Offline'}`).withSize(0.8);
                                            if (chat.lastMessage) {
                                                a.label(`${chat.lastMessage.content.substring(0, 50)}...`).withSize(0.8);
                                            }
                                        });
                                        a.spacer();
                                        a.button('✕').onClick(async () => {
                                            // Remove direct chat
                                            await viewStack.refresh();
                                        });
                                    }).withPadding(5);
                                },
                                trackBy: (chat) => chat.id,
                            });
                        })
                            .withPadding(10)
                            .when(() => selectedTab === 'directs');
                        // Settings Tab
                        settingsContainer = a.vbox(() => {
                            a.label('⚙️ Settings').withId('settings-title').withBold();
                            a.label('📱 Current User').withBold();
                            const user = store.getCurrentUser();
                            a.hbox(() => {
                                a.label(`${user.avatar} ${user.displayName}`);
                                a.spacer();
                                a.label(`@${user.userId.split(':')[0].substring(1)}`);
                            });
                            a.separator();
                            a.label('🔔 Notification Rules:').withBold();
                            a.vbox(() => { })
                                .bindTo({
                                items: () => store.getNotificationRules(),
                                render: (rule) => {
                                    const room = store.getRooms().find((r) => r.id === rule.roomId);
                                    a.hbox(() => {
                                        a.vbox(() => {
                                            a.label(`${room?.name || 'Unknown'}`).withBold();
                                            a.label(`${rule.type} | ${rule.isMuted ? '🔇 Muted' : '🔊 Unmuted'}`).withSize(0.8);
                                        });
                                    }).withPadding(5);
                                },
                                trackBy: (rule) => rule.id,
                            });
                            a.separator();
                            a.label('🔐 Active Sessions:').withBold();
                            a.vbox(() => { })
                                .bindTo({
                                items: () => store.getSessions(),
                                render: (session) => {
                                    a.hbox(() => {
                                        a.vbox(() => {
                                            a.label(`${session.deviceName} ${session.isCurrentDevice ? '(This device)' : ''}`).withBold();
                                            a.label(`${session.isVerified ? '✓ Verified' : '✗ Unverified'} | ${new Date(session.lastActivity).toLocaleDateString()}`).withSize(0.8);
                                        });
                                        a.spacer();
                                        if (!session.isCurrentDevice) {
                                            a.button('Remove').onClick(async () => {
                                                store.deleteSession(session.id);
                                                await viewStack.refresh();
                                            });
                                        }
                                    }).withPadding(5);
                                },
                                trackBy: (session) => session.id,
                            });
                        })
                            .withPadding(10)
                            .when(() => selectedTab === 'settings');
                    });
                }).withPadding(10);
            });
        });
        store.subscribe(async () => {
            await updateLabels();
            await viewStack.refresh();
        });
        updateLabels();
    });
}
//# sourceMappingURL=index.js.map