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
