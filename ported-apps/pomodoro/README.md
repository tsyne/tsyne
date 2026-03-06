# Pomodoro Timer

A productivity timer implementing the Pomodoro Technique.

## Features

- 25 minute work (focus) sessions
- 5 minute short breaks
- 15 minute long breaks after 4 sessions
- Customizable session durations
- Session counter
- Desktop notifications
- Persistent settings

## Running

```bash
tsyne pomodoro.ts
```

## Testing

```bash
pnpm test
```

## The Pomodoro Technique

1. Choose a task to work on
2. Set the timer for 25 minutes
3. Work until the timer rings
4. Take a short 5-minute break
5. After 4 sessions, take a longer 15-minute break

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(controls) + label(timer) + label(status)` nesting. Simple timer layout |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()` on 17 elements: timer labels, control buttons, session counter. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 2/10 | No loop-based widget generation. Static timer UI |
| **State architecture** | Observable store | 3/10 | No Observable store. Timer state managed directly in class with `setInterval()` |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 4 `setText()` calls for timer/status updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `setContent()` call |
| **Testing** | `.withId()` coverage | 7/10 | Good coverage on timer display, buttons, session counter |
| **Design** | Separation of concerns | 5/10 | Timer logic mixed with UI in single class |
| | **Overall** | **4/10** | Simple timer app with good `.withId()` coverage but no reactive patterns, no Observable store, and static layout |

## License

MIT
