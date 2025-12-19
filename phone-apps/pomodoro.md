# Pomodoro Timer App

A productivity timer implementing the Pomodoro Technique for Tsyne.

## Features

- **25-minute work sessions** - Focus periods for concentrated work
- **5-minute short breaks** - Quick breaks between work sessions
- **15-minute long breaks** - Extended breaks after every 4 work sessions
- **Customizable durations** - Adjust work, break, and long break times
- **Simple timer display** - Clear HH:MM format
- **Start/Pause/Reset controls** - Easy session management
- **Skip session button** - Move to next session immediately
- **Session counter** - Track completed work sessions
- **Desktop notifications** - Get alerted when sessions complete

## How to Use

### Starting a Session
1. Launch the Pomodoro app
2. The timer defaults to a 25-minute work session
3. Click "Start" to begin the countdown

### Managing Sessions
- **Pause**: Click "Start" again to pause the timer
- **Reset**: Click "Reset" to restart the current session
- **Skip**: Click "Skip" to move to the next session (work → break → work, etc.)

### Customizing Durations
In the Settings section:
1. **Work**: Set your focus session duration (default: 25 minutes)
2. **Break**: Set your short break duration (default: 5 minutes)
3. **Long Break**: Set your extended break duration (default: 15 minutes)

### Session Progression
The app follows this pattern:
- Work → Short Break → Work → Short Break → Work → Short Break → Work → **Long Break**
- After 4 work sessions, you get a 15-minute long break
- The cycle repeats

## Architecture

The Pomodoro Timer is built with Tsyne's declarative MVC pattern:

- **Model**: `PomodoroState` tracks timer state, session type, and settings
- **View**: Widgets display time, session type, status, and controls
- **Controller**: Button handlers manage start/pause/reset/skip operations

### Timer Logic
- Uses JavaScript `setInterval` for 1-second ticks
- Automatically progresses through session types
- Sends notifications when sessions complete
- Persists user settings using Tsyne's preferences API

## Code Example

```typescript
import { buildPomodoroApp } from './pomodoro';
import { app } from './src';

app({ title: 'Pomodoro' }, (a) => {
  buildPomodoroApp(a);
});
```

## Testing

### Jest Tests
Unit tests for timer logic and state management:
```bash
cd phone-apps
npm test -- pomodoro.test.ts
```

### TsyneTest Tests
UI interaction tests:
```bash
cd core
npm test -- pomodoro-tsyne
```

## Configuration

Settings are automatically saved and loaded from preferences:
- `pomodoro_work` - Work session duration in minutes
- `pomodoro_break` - Short break duration in minutes
- `pomodoro_long_break` - Long break duration in minutes

## Files

- `pomodoro.ts` - Main implementation (phone-apps and core/src)
- `pomodoro.test.ts` - Jest unit tests (phone-apps)
- `pomodoro-tsyne.test.ts` - Tsyne UI tests (phone-apps and core/src)
- `jest.config.js` - Jest configuration for phone-apps
- `tsconfig.json` - TypeScript configuration for phone-apps

## License

MIT License

Portions copyright original team and portions copyright Paul Hammant 2025

This is a port of the Fynodoro application (https://github.com/tomsquest/fynodoro) to Tsyne.
