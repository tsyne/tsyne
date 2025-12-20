# Signal Messenger - Tsyne Port

An end-to-end encrypted messaging application ported to Tsyne from the original [Signal-rs](https://git.sr.ht/~nicohman/signal-rs) project.

**Portions copyright Nico Hickman and portions copyright Paul Hammant 2025**

## Overview

Signal Messenger is a secure messaging application that demonstrates an idiomatic Tsyne phone app implementation. This port brings the core messaging functionality of Signal to the Tsyne framework while maintaining a native user interface experience.

## Features

- **Conversation Management**: Create, view, and delete message conversations
- **Message History**: Send and receive messages with full conversation history
- **End-to-End Encryption**: All messages are marked as encrypted with E2E support
- **Unread Tracking**: Visual indicators for unread messages
- **Contact Integration**: Built-in contact management for starting conversations
- **Time Formatting**: Smart timestamp display (relative times like "5m ago")
- **Pseudo-Declarative UI**: Built using Tsyne's idiomatic builder pattern

## Technical Architecture

### Core Components

**signal-service.ts**:
- `ISignalService` interface defining the messaging API
- `MockSignalService` implementation with in-memory data storage
- Contact, Conversation, and Message data models
- Event subscriptions for UI reactivity

**signal.ts**:
- Main Tsyne application using pseudo-declarative builder pattern
- Two-view architecture: Conversations list and Message viewer
- Real-time UI updates via service listeners
- Declarative visibility with `when()` for conditional rendering

### Data Models

```typescript
interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  isFavorite?: boolean;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  lastMessage?: Message;
  lastMessageTime?: Date;
  unreadCount: number;
  isEncrypted: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  isEncrypted: boolean;
}
```

## Usage

### Running the Application

```bash
cd /home/user/tsyne
npm run build
npx tsx phone-apps/signal/signal.ts
```

### Running Tests

**Unit Tests (Service Layer)**:
```bash
npm test -- phone-apps/signal/signal.test.ts
```

**Integration Tests (UI)**:
```bash
npm test -- phone-apps/signal/signal-tsyne.test.ts
```

**All Signal Tests**:
```bash
npm test -- phone-apps/signal
```

**With Screenshots**:
```bash
TAKE_SCREENSHOTS=1 npm test -- phone-apps/signal/signal-tsyne.test.ts
```

**Headed Mode** (see browser window):
```bash
TSYNE_HEADED=1 npm test -- phone-apps/signal/signal-tsyne.test.ts
```

## UI Walkthrough

### Conversations View

The initial view displays all conversations:
- Conversation participant name
- Last message preview
- Relative timestamp (e.g., "5m ago")
- Unread message count (only for conversations with unread messages)
- Encryption indicator (🔒)
- Action buttons: Open (→) and Delete (🗑)
- Status bar showing total conversation count
- "New Conversation" button (➕) to start messaging someone

### Message View

When a conversation is opened:
- Full message history sorted by time
- Messages styled differently for own vs. received messages
- Sender name, content, and metadata for each message
- Encryption indicator for each message
- Message input field at the bottom
- Send button to transmit messages
- Back button (←) to return to conversations list

## Idiomatic Tsyne Patterns Used

### Pseudo-Declarative UI
```typescript
a.window({ title: 'Signal Messenger', width: 400, height: 700 }, (win) => {
  win.setContent(() => {
    a.vbox(() => {
      // Declarative widget composition
      a.label('📱 Signal');
      a.separator();
      a.hbox(() => { /* ... */ });
    });
  });
  win.show();
});
```

### Declarative Visibility with `when()`
```typescript
a.scroll(() => {
  messagesContainer = a.vbox(() => { /* ... */ });
})
  .when(() => currentConversationId !== null)
  .withId('messages-scroll');
```

### Reactive Updates via Service Listeners
```typescript
const unsubscribe = signal.onConversationUpdated(() => {
  updateConversationList();
});
```

### Widget IDs for Testing
```typescript
a.button('Send')
  .onClick(() => sendMessage())
  .withId('btn-send-message');

// In tests:
await ctx.getByID('btn-send-message').click();
```

## Testing

### Jest Unit Tests (signal.test.ts)

Comprehensive tests for the `MockSignalService`:
- Contact management (add, update, delete, search)
- Conversation lifecycle (create, delete, list)
- Message operations (send, read, delete)
- Event subscriptions and unsubscribe
- Integration scenarios

Total: 45+ test cases covering service functionality

### TsyneTest Integration Tests (signal-tsyne.test.ts)

UI integration tests verifying:
- Initial state rendering
- Conversation list display
- Navigation between views
- Message display and sending
- Conversation deletion
- Screenshot capture

Total: 25+ test cases covering UI interactions

## License

This project is licensed under the GNU General Public License v3.0 or later.

**Portions copyright Nico Hickman** - Original Signal-rs implementation
**Portions copyright Paul Hammant 2025** - Tsyne port

See [LICENSE](./LICENSE) file for full text.

## Related Resources

- [Original Signal-rs Repository](https://git.sr.ht/~nicohman/signal-rs)
- [Tsyne Framework](https://github.com/paul-hammant/tsyne)
- [Signal Protocol Documentation](https://signal.org/docs/)
- [Fyne UI Toolkit](https://fyne.io/) (underlying widget framework)

## Implementation Notes

### Mock Data

The `MockSignalService` is initialized with sample data for demonstration:
- 5 sample contacts (Alice, Bob, Carol, David, Eve)
- 3 sample conversations with message history
- Unread message indicators on conversations

In a real implementation, this would connect to actual Signal servers or a local message database.

### Encryption Model

This port marks all messages as encrypted (`isEncrypted: true`), but uses mock encryption. A production version would integrate with:
- Signal Protocol for E2E encryption
- Key management system
- Secure message storage

### Performance Considerations

- Service layer uses in-memory storage for fast operations
- Conversation list is rebuilt on updates (could be optimized with `ModelBoundList`)
- Message history is paginated in the UI but all loaded in memory
- Widget IDs are stable for testing resilience

## Future Enhancements

- [ ] Group conversations
- [ ] Message reactions
- [ ] User avatars
- [ ] Typing indicators
- [ ] Message search
- [ ] Conversation search
- [ ] Read receipts
- [ ] Last seen timestamps
- [ ] Emoji picker
- [ ] File sharing
- [ ] Voice/Video calls
- [ ] Settings UI

## Screenshot

To generate a screenshot of the Signal app:

```bash
TAKE_SCREENSHOTS=1 npm test -- phone-apps/signal/signal-tsyne.test.ts
```

Screenshots will be saved in the test output directory. Example screenshot showing the conversations list and message view will be available after running tests.

Note: In cloud environments with Xvfb, screenshots may appear blank due to OpenGL rendering limitations. On native displays, screenshots show full UI rendering.

## Contributing

To extend Signal's functionality:

1. **Add new service methods** to `ISignalService` and `MockSignalService`
2. **Update the UI** in `signal.ts` to use new features
3. **Add unit tests** to `signal.test.ts` for service logic
4. **Add integration tests** to `signal-tsyne.test.ts` for UI behavior
5. **Ensure all tests pass** with `npm test -- phone-apps/signal`

## Support

For issues or questions about the Tsyne port, refer to the main Tsyne documentation. For questions about the original Signal-rs implementation, contact nicohman@nicohman.com.
