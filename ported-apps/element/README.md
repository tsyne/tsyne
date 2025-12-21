# Element - Secure Messenger - Tsyne Port

The world's leading secure messaging app powered by Matrix protocol ported from **Element iOS** to **Tsyne**, a TypeScript-based desktop application framework.

This single-file Tsyne application demonstrates:
- **Real-time messaging** via Matrix protocol
- **End-to-end encryption (E2EE)** support
- **Rooms and direct messages** with member management
- **User presence** and typing indicators
- **Notification management** with granular controls
- **Message reactions** and rich content
- **Session management** and device verification
- **Observable MVC pattern** for reactive updates

## Features

### Messaging
- Real-time chat in rooms and direct messages
- Message history with infinite scroll
- Edit and delete messages
- Emoji reactions to messages
- Encrypted messages with encryption status indicators
- Rich message content support

### Rooms & Organization
- Browse and join rooms
- Leave rooms
- Room settings and notifications
- Member list display
- Room metadata (topic, member count)
- Encryption status per room

### Direct Chats
- Start direct conversations
- One-to-one encrypted messaging
- Participant presence display
- Chat history

### Notifications
- Granular notification control per room
- Mute rooms or configure mentions-only
- Unread message tracking
- Global unread count

### User Management
- User profiles with display names
- Presence status (online, idle, offline)
- Profile updates
- Multi-user support
- Online user count

### Security
- Session management
- Device verification tracking
- Active sessions list
- Secure logout

## User Interface

### Main View (Rooms)
```
┌──────────────────────────────────────────────────────────────┐
│ SIDEBAR              │ MAIN CONTENT                           │
│ 👩 Alice             │ 💬 Rooms                               │
│ @alice:example.com   │ 🌐 Rooms: 3 | 🔐 Encrypted: 3 |      │
│ 🟢 Online            │ 📬 Unread: 4                           │
│ ─────────────────    │ ─────────────────────────────────────  │
│ [💬 Rooms]           │ 💬 #general                            │
│ [👥 Direct Messages] │ General discussion                     │
│ [⚙️ Settings]        │ 👥 12 members | 🔐 Encrypted          │
│                      │ [→]                                    │
│                      │                                        │
│                      │ 🎲 #random                             │
│                      │ Off-topic fun                          │
│                      │ 👥 8 members | 🔐 Encrypted           │
│                      │ [→]                                    │
│                      │                                        │
│                      │ 👨 Direct with Bob                     │
│                      │ 👥 2 members | 🔐 Encrypted           │
│                      │ [→]                                    │
└──────────────────────────────────────────────────────────────┘
```

### Room Detail View
```
┌──────────────────────────────────────────────────────────────┐
│ 💬 #general                                          [← Back] │
│ General discussion                                            │
│ ─────────────────────────────────────────────────────────────│
│ 💬 Messages:                                                  │
│                                                               │
│ 👨 Bob                                                        │
│ Hey Alice, how are you doing?                                │
│ 👍 2                                                          │
│ 11:30 AM                                [😊] [✕]             │
│                                                               │
│ 👨‍💻 Charlie                                                    │
│ Just finished that project we discussed                       │
│ 2:45 PM                                  [😊] [✕]             │
│ ─────────────────────────────────────────────────────────────│
│ [Type a message...]                              [Send]       │
└──────────────────────────────────────────────────────────────┘
```

### Direct Messages View
```
┌──────────────────────────────────────────────────────────────┐
│ 👥 Direct Messages                          [➕ New Chat]     │
│ Total: 1                                                      │
│ ─────────────────────────────────────────────────────────────│
│ 👨 Bob                                                        │
│ 🟢 Online                                                     │
│ See you tomorrow                                              │
│ [✕]                                                           │
└──────────────────────────────────────────────────────────────┘
```

### Settings View
```
┌──────────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                                   │
│ ─────────────────────────────────────────────────────────────│
│ 📱 Current User                                               │
│ 👩 Alice                              @alice:example.com      │
│                                                               │
│ 🔔 Notification Rules:                                        │
│ #general                                                      │
│ all-messages | 🔊 Unmuted                                    │
│                                                               │
│ #random                                                       │
│ mentions-only | 🔊 Unmuted                                   │
│                                                               │
│ 🔐 Active Sessions:                                           │
│ Alice iPhone                                                  │
│ ✓ Verified | 12/20/2024                                     │
│                                                               │
│ Alice Desktop (This device)                                   │
│ ✓ Verified | 12/21/2024                                     │
└──────────────────────────────────────────────────────────────┘
```

## Screenshots

To generate live screenshots:

```bash
# Start app
npx tsx ported-apps/element/index.ts

# Run tests with screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/element/index.tsyne.test.ts

# Screenshots saved to:
# - /tmp/element-rooms.png
# - /tmp/element-directs.png
# - /tmp/element-settings.png
```

## Testing

### Jest Unit Tests (41 tests)
```
ElementStore
  ✓ Rooms (7 tests)
  ✓ Messaging (6 tests)
  ✓ Direct Chats (2 tests)
  ✓ User Management (5 tests)
  ✓ Notifications (3 tests)
  ✓ Sessions (3 tests)
  ✓ Observable Pattern (4 tests)
  ✓ Data Integrity (6 tests)
  ✓ Edge Cases (5 tests)
```

### TsyneTest UI Tests
- Tab navigation between Rooms, Direct Messages, Settings
- Stats display and unread counts
- State preservation across tabs
- Screenshot capture for all views

## Running the App

### Development Mode
```bash
npx tsx ported-apps/element/index.ts
```

### Run Tests
```bash
# Jest unit tests (41 tests)
npm test ported-apps/element/index.test.ts

# TsyneTest UI tests
npm test ported-apps/element/index.tsyne.test.ts

# With screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/element/index.tsyne.test.ts
```

## Architecture

The app demonstrates Tsyne's pseudo-declarative MVC pattern:

```typescript
// Observable Store Pattern
const store = new ElementStore();

store.subscribe(async () => {
  await updateLabels();
  await viewStack.refresh();
});

// Tab-based Navigation with when()
roomsContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'rooms' && !currentRoom);

// Smart List Rendering with bindTo()
a.vbox(() => {})
  .bindTo({
    items: () => store.getRooms(),
    render: (room: MatrixRoom) => { /* ... */ },
    trackBy: (room: MatrixRoom) => room.id,
  });
```

## License

Copyright (c) 2013–2025 Matrix Foundation
Portions copyright Paul Hammant 2025

Licensed under MIT License. See LICENSE file for details.

### Element Original License
The original Element iOS app is available at https://github.com/element-hq/element-ios
Licensed under MIT License. This port is distributed under MIT with attribution to Matrix Foundation.

## References

- [Element Official Website](https://element.io)
- [Element iOS Repository](https://github.com/element-hq/element-ios)
- [Matrix Protocol](https://matrix.org)
- [Tsyne Framework Documentation](../../docs/API_REFERENCE.md)
