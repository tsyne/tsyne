# Battery Monitor

A battery monitoring app for postmarketOS/Linux phones.

## Features

- Real-time battery percentage display with progress bar
- Charging status with visual indicators
- Detailed information:
  - Battery health
  - Temperature
  - Voltage
  - Current draw/charge rate
  - Battery technology (Li-ion, Li-poly, etc.)
  - Capacity and wear level
- Estimated time remaining

## Linux Integration

Reads from standard Linux power supply sysfs interface:
- `/sys/class/power_supply/*/` for battery and AC adapter info
- Supports common attributes: `capacity`, `status`, `health`, `temp`, `voltage_now`, `current_now`, `energy_*`

## Screenshot

```
┌─────────────────────────┐
│        Battery          │
├─────────────────────────┤
│                         │
│          75%            │
│   ████████████░░░░░░    │
│     🔋 Discharging      │
│                         │
│   Time Remaining        │
│   3h 0m remaining       │
│                         │
│   Details               │
│   Health:      Good     │
│   Temperature: 28.0°C   │
│   Voltage:     3.850 V  │
│   Current:     -500 mA  │
│   Technology:  Li-ion   │
│   Capacity:    20/22 Wh │
│                         │
└─────────────────────────┘
```

## Usage

```bash
# Run standalone
./scripts/tsyne phone-apps/battery/battery.ts

# Or from phonetop launcher
```

## Testing

```bash
cd phone-apps/battery
npm test
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 5/10 | VBox/HBox nesting via JSX-like functional components |
| **Core declarative** | Fluent method chaining | 1/10 | No `.withId()`. No `.when()` or `.bindTo()`. Uses JSX-like function pattern instead of fluent API |
| **Core declarative** | Programmatic generation | 2/10 | No loop-based widget generation. Static battery display |
| **State architecture** | Observable store | 2/10 | No Observable store. Battery state updated via `setInterval` |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 8 `setText()` calls for battery stats |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 1/10 | No IDs |
| **Design** | Separation of concerns | 4/10 | Battery reading and UI mixed together |
| | **Overall** | **2/10** | Uses JSX-like functional component pattern instead of Tsyne's fluent API. Heavy `setText()` usage for stats. No reactive bindings or IDs |
