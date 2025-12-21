/**
 * Jest Tests for Element Store
 *
 * Tests for the ElementStore model, including messaging, rooms, users,
 * notifications, and session management.
 */

import { ElementStore, MatrixRoom, MatrixMessage, DirectChat } from '../../../../../ported-apps/element/index';

describe('ElementStore', () => {
  let store: ElementStore;

  beforeEach(() => {
    store = new ElementStore();
  });

  describe('Rooms', () => {
    it('should get list of rooms', () => {
      const rooms = store.getRooms();
      expect(Array.isArray(rooms)).toBe(true);
      expect(rooms.length).toBeGreaterThan(0);
    });

    it('should get room count', () => {
      const count = store.getRoomCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should leave a room', () => {
      const rooms = store.getRooms();
      const initialCount = rooms.length;
      const roomToLeave = rooms[0];

      const left = store.leaveRoom(roomToLeave.id);

      expect(left).toBe(true);
      expect(store.getRoomCount()).toBe(initialCount - 1);
      expect(store.getRooms().find((r) => r.id === roomToLeave.id)).toBeUndefined();
    });

    it('should handle leaving non-existent room', () => {
      const initialCount = store.getRoomCount();
      const left = store.leaveRoom('nonexistent-id');

      expect(left).toBe(false);
      expect(store.getRoomCount()).toBe(initialCount);
    });

    it('should get encrypted room count', () => {
      const encrypted = store.getEncryptedRoomCount();
      expect(typeof encrypted).toBe('number');
      expect(encrypted).toBeGreaterThan(0);
    });

    it('should mark room as read', () => {
      const rooms = store.getRooms();
      const room = rooms.find((r) => r.unreadCount > 0);

      if (room) {
        store.markRoomAsRead(room.id);
        const updated = store.getRooms().find((r) => r.id === room.id);
        expect(updated?.unreadCount).toBe(0);
      }
    });

    it('should get total unread count', () => {
      const unread = store.getTotalUnreadCount();
      expect(typeof unread).toBe('number');
      expect(unread).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Messaging', () => {
    it('should get messages for a room', () => {
      const rooms = store.getRooms();
      const messages = store.getRoomMessages(rooms[0].id);

      expect(Array.isArray(messages)).toBe(true);
    });

    it('should send a message', () => {
      const rooms = store.getRooms();
      const initialCount = store.getMessageCount();

      store.sendMessage(rooms[0].id, 'Test message');

      expect(store.getMessageCount()).toBe(initialCount + 1);
    });

    it('should add reaction to message', () => {
      const messages = store.getRoomMessages(store.getRooms()[0].id);
      if (messages.length > 0) {
        const msg = messages[0];
        const initialReactions = msg.reactions.length;

        const added = store.addReaction(msg.id, '👍');

        expect(added).toBe(true);
        const updated = store.getRoomMessages(store.getRooms()[0].id).find((m) => m.id === msg.id);
        expect(updated?.reactions.length).toBeGreaterThanOrEqual(initialReactions);
      }
    });

    it('should delete a message', () => {
      const initialCount = store.getMessageCount();
      const messages = store.getRoomMessages(store.getRooms()[0].id);

      if (messages.length > 0) {
        const deleted = store.deleteMessage(messages[0].id);
        expect(deleted).toBe(true);
        expect(store.getMessageCount()).toBe(initialCount - 1);
      }
    });

    it('should handle delete of non-existent message', () => {
      const initialCount = store.getMessageCount();
      const deleted = store.deleteMessage('nonexistent-id');

      expect(deleted).toBe(false);
      expect(store.getMessageCount()).toBe(initialCount);
    });

    it('should get total message count', () => {
      const count = store.getMessageCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Direct Chats', () => {
    it('should get list of direct chats', () => {
      const chats = store.getDirectChats();
      expect(Array.isArray(chats)).toBe(true);
    });

    it('should create a direct chat', () => {
      const users = store.getUsers();
      if (users.length > 0) {
        const initialCount = store.getDirectChats().length;
        store.createDirectChat(users[0]);

        expect(store.getDirectChats()).toHaveLength(initialCount + 1);
      }
    });
  });

  describe('User Management', () => {
    it('should get current user', () => {
      const user = store.getCurrentUser();
      expect(user).toHaveProperty('userId');
      expect(user).toHaveProperty('displayName');
      expect(user).toHaveProperty('presence');
    });

    it('should set user presence', () => {
      const initialPresence = store.getCurrentUser().presence;
      const newPresence: 'online' | 'idle' | 'offline' = initialPresence === 'online' ? 'idle' : 'online';

      store.setUserPresence(newPresence);

      expect(store.getCurrentUser().presence).toBe(newPresence);
    });

    it('should update user profile', () => {
      store.updateUserProfile('Alice Updated', '👩‍💻');

      const user = store.getCurrentUser();
      expect(user.displayName).toBe('Alice Updated');
      expect(user.avatar).toBe('👩‍💻');
    });

    it('should get list of users', () => {
      const users = store.getUsers();
      expect(Array.isArray(users)).toBe(true);
    });

    it('should get online user count', () => {
      const onlineCount = store.getOnlineUserCount();
      expect(typeof onlineCount).toBe('number');
      expect(onlineCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Notifications', () => {
    it('should get notification rules', () => {
      const rules = store.getNotificationRules();
      expect(Array.isArray(rules)).toBe(true);
    });

    it('should set room notification rule', () => {
      const rooms = store.getRooms();
      if (rooms.length > 0) {
        store.setRoomNotificationRule(rooms[0].id, 'mentions-only');

        const rules = store.getNotificationRules();
        const rule = rules.find((r) => r.roomId === rooms[0].id);
        expect(rule?.type).toBe('mentions-only');
      }
    });

    it('should mute a room', () => {
      const rooms = store.getRooms();
      if (rooms.length > 0) {
        store.muteRoom(rooms[0].id, true);

        const rules = store.getNotificationRules();
        const rule = rules.find((r) => r.roomId === rooms[0].id);
        expect(rule?.isMuted).toBe(true);
      }
    });
  });

  describe('Sessions', () => {
    it('should get list of sessions', () => {
      const sessions = store.getSessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should delete a session', () => {
      const sessions = store.getSessions();
      const toDelete = sessions.find((s) => !s.isCurrentDevice);

      if (toDelete) {
        const initialCount = sessions.length;
        const deleted = store.deleteSession(toDelete.id);

        expect(deleted).toBe(true);
        expect(store.getSessions()).toHaveLength(initialCount - 1);
      }
    });

    it('should handle delete of non-existent session', () => {
      const initialCount = store.getSessions().length;
      const deleted = store.deleteSession('nonexistent-id');

      expect(deleted).toBe(false);
      expect(store.getSessions()).toHaveLength(initialCount);
    });
  });

  describe('Observable Pattern', () => {
    it('should notify listeners on send message', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      const rooms = store.getRooms();
      store.sendMessage(rooms[0].id, 'Test');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on presence change', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.setUserPresence('idle');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on profile update', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.updateUserProfile('New Name', '👨');

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();

      const rooms = store.getRooms();
      store.sendMessage(rooms[0].id, 'Test');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate returned rooms array', () => {
      const rooms1 = store.getRooms();
      const rooms2 = store.getRooms();

      expect(rooms1).not.toBe(rooms2);
    });

    it('should not mutate returned messages', () => {
      const messages1 = store.getRoomMessages(store.getRooms()[0].id);
      const messages2 = store.getRoomMessages(store.getRooms()[0].id);

      expect(messages1).not.toBe(messages2);
    });

    it('should not mutate current user', () => {
      const user1 = store.getCurrentUser();
      const user2 = store.getCurrentUser();

      expect(user1).not.toBe(user2);
    });

    it('should not mutate returned users', () => {
      const users1 = store.getUsers();
      const users2 = store.getUsers();

      expect(users1).not.toBe(users2);
    });

    it('should not mutate returned sessions', () => {
      const sessions1 = store.getSessions();
      const sessions2 = store.getSessions();

      expect(sessions1).not.toBe(sessions2);
    });

    it('should not mutate returned notification rules', () => {
      const rules1 = store.getNotificationRules();
      const rules2 = store.getNotificationRules();

      expect(rules1).not.toBe(rules2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const rooms = store.getRooms();
      const msg = store.sendMessage(rooms[0].id, '');

      expect(msg.content).toBe('');
    });

    it('should handle long message content', () => {
      const rooms = store.getRooms();
      const longContent = 'a'.repeat(10000);
      const msg = store.sendMessage(rooms[0].id, longContent);

      expect(msg.content).toBe(longContent);
    });

    it('should handle reaction on non-existent message', () => {
      const result = store.addReaction('nonexistent-id', '👍');
      expect(result).toBe(false);
    });

    it('should handle setting rule for non-existent room', () => {
      store.setRoomNotificationRule('nonexistent-id', 'all-messages');
      const rules = store.getNotificationRules();
      expect(rules.some((r) => r.roomId === 'nonexistent-id')).toBe(true);
    });

    it('should handle muting non-existent room', () => {
      store.muteRoom('nonexistent-id', true);
      const rules = store.getNotificationRules();
      const rule = rules.find((r) => r.roomId === 'nonexistent-id');
      expect(rule?.isMuted).toBe(true);
    });
  });
});
