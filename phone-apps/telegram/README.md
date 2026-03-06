# Telegram Messaging Client for Tsyne

A modern messaging application built for the Tsyne platform, featuring real-time chat management, message threading, and an intuitive pseudo-declarative UI.

## Features

- **Chat List**: View all your conversations with the latest message preview and unread indicators
- **Message Threads**: Open chats to see full conversation history with timestamps
- **Send Messages**: Type and send messages directly within the chat interface
- **Search & Organization**: Quick search and new chat creation
- **Real-time Updates**: Reactive UI that updates as messages are sent and received

## Architecture

The Telegram app follows Tsyne's pseudo-declarative MVC pattern:

- **Service Layer** (`telegram-service.ts`): `MockTelegramService` manages chat state and provides observable subscriptions
- **UI Layer** (`telegram.ts`): `createTelegramApp()` builds the UI using Tsyne's builder pattern
- **Tests**: Comprehensive Jest and TsyneTest test suites

## Building & Running

### Run the App

```bash
npx tsx telegram.ts
```

### Run Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
npm test -- --testNamePattern="MockTelegramService"
npm test -- --testNamePattern="Telegram App"
```

### Capture Screenshot for Documentation

```bash
TAKE_SCREENSHOTS=1 npm test -- --testNamePattern="should take screenshot"
```

## UI Layout

The app features a split-pane design:

**Left Pane: Chat List**
- Header with search and new chat buttons
- List of all chats sorted by most recent message
- Each chat shows:
  - Avatar emoji
  - Contact name
  - Last message preview
  - Unread count (if applicable)
  - Timestamp

**Right Pane: Message View**
- Chat header with contact name
- Scrollable message history
- Messages grouped by sender (left/right alignment)
- Message input field with send button

## Mock Data

The `MockTelegramService` initializes with sample data:

- 4 sample chats (Alice, Bob, Team, Carol)
- Pre-populated messages demonstrating conversation flows
- Realistic timestamps and unread counts

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 8/10 | `hsplit > border(sidebar: search + chatList) + vbox(header + messages + input)` nesting. Rich messaging layout |
| **Core declarative** | Fluent method chaining | 8/10 | `.withId()` on 52 elements — excellent coverage across all UI areas |
| **Core declarative** | Programmatic generation | 7/10 | Loop-based chat list and message rendering |
| **State architecture** | Observable store | 6/10 | `subscribe()`/`notifyChange()` pattern (5 subscribe, multiple notifyChange). Store-driven updates |
| **Declarative updates** | `.when()` + `.bindTo()` | 4/10 | 2 `.bindTo()` for dynamic list rendering. No `.when()` or `.bindText()`. 3 `setText()` calls |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No `removeAll()`/`setContent()` |
| **Testing** | `.withId()` coverage | 8/10 | 52 IDs — comprehensive coverage |
| **Design** | Separation of concerns | 7/10 | Store with subscribe pattern. API client separated. Builder methods well-organized |
| | **Overall** | **7/10** | Strong store-driven architecture with excellent `.withId()` coverage (52) and `.bindTo()` for dynamic lists. The subscribe/notifyChange pattern drives reactive updates |

## License

GNU General Public License v3.0

Portions copyright Development@bendingtherules.nl
Portions copyright Paul Hammant 2025

This is a Tsyne phone app port of https://github.com/bendingthemrules/ubtouch-telegram

## Development

The app uses:

- **TypeScript** for type safety
- **Jest** for unit testing
- **TsyneTest** for integration testing
- **Tsyne Builder Pattern** for pseudo-declarative UI construction

### Project Structure

```
telegram/
├── telegram.ts              # Main app UI and builder function
├── telegram-service.ts      # Service layer with mock data
├── telegram.test.ts         # Jest and TsyneTest test suites
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## Testing Strategy

- **Unit Tests**: `MockTelegramService` functionality (add/send/delete/search)
- **Integration Tests**: Full UI initialization and interaction
- **Screenshot Tests**: Visual verification for documentation
