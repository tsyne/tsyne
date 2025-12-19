# Nomad App

A time zone conversion and management application for tracking current time across multiple timezones and locations.

## Features

- **Multi-timezone tracking** - Display current time in multiple locations simultaneously
- **Common locations** - Quick-add buttons for 15+ popular cities
- **Flexible sorting** - Sort by location name or UTC offset
- **Format options** - Toggle between 24-hour and 12-hour time display
- **Real-time updates** - Automatic time updates every second
- **Persistent settings** - Remember selected locations and preferences
- **Easy management** - Quick remove buttons for each location

## Common Locations

Pre-configured locations include:
- UTC, London, Paris, Tokyo, Sydney
- New York, Los Angeles, Dubai, Singapore
- Mumbai, Bangkok, Hong Kong, Toronto
- Mexico City, Berlin

## How to Use

### Adding Locations
1. Click any "+ Location" button to add that city/timezone
2. Added locations appear in the "Current Times" section
3. Duplicate additions are prevented automatically

### Viewing Times
- Each location displays its current local time
- Times update in real-time every second
- UTC offset shown for reference

### Sorting Options
1. Click "Sort by UTC Offset" to organize by timezone
2. Click "Sort by Name" to alphabetically organize
3. Preference is saved automatically

### Time Format
1. Click "12-Hour" to switch to 12-hour AM/PM format
2. Click "24-Hour" to switch to 24-hour format
3. Format preference is saved automatically

### Removing Locations
1. Click the "×" button next to any location
2. Location is immediately removed
3. Change is saved automatically

## Architecture

The Nomad app uses Tsyne's declarative MVC pattern:

- **Model**: `TimeLocation` array with `NomadState` preferences
- **View**: Location buttons, time display list, sort/format controls
- **Controller**: Button handlers manage locations and preferences

### Time Calculation
- Calculates local time for each timezone offset
- Handles positive and negative UTC offsets
- Supports fractional offsets (e.g., +5:30 for India)
- Uses UTC base for accurate cross-timezone calculations

### Location Management
- Prevents duplicate location entries
- Validates location objects
- Stores location list in persistent preferences

### Display Options
- 24-hour format: HH:MM:SS (0-23 hours)
- 12-hour format: H:MM:SS AM/PM
- UTC offset display: UTC±X.X format

## Code Example

```typescript
import { buildNomadApp } from './nomad';
import { app } from './src';

app({ title: 'Nomad' }, (a) => {
  a.window({ title: 'Nomad - Time Zone Manager', width: 600, height: 800 }, (win) => {
    buildNomadApp(a, win);
  });
});
```

## Testing

### Jest Tests
Unit tests for timezone calculations and location management:
```bash
cd phone-apps
npm test -- nomad.test.ts
```

Coverage includes:
- Time calculation at various UTC offsets
- Positive and negative offset handling
- Fractional offset support
- Location creation and management
- Duplicate prevention
- Sorting by name and offset
- 24-hour and 12-hour format display
- State persistence

### TsyneTest Tests
UI interaction tests:
```bash
cd core
npm test -- nomad-tsyne
```

Coverage includes:
- Initial UI rendering with title
- Add location buttons display
- Sorting and format buttons
- Times section header
- Placeholder text when empty
- All required UI elements

## Settings Storage

Settings are automatically saved and loaded:
- `nomad_locations` - Array of added locations (JSON)
- `nomad_sort_by_name` - Sort preference (boolean)
- `nomad_24h_format` - Time format preference (boolean)

## Timezone Information

Supported timezone offsets:
- Range: -12 to +14 hours
- Fractional offsets: +5:30, +9:30, etc.
- Daylight savings not automatically adjusted (set correct offset manually)

## Performance

- Real-time updates every 1 second
- Smooth transitions between sort orders
- Efficient time calculations
- Minimal memory footprint per location

## Limitations

- Manual timezone selection (no automatic DST adjustment)
- No timezone search or filtering
- Locations limited to predefined common cities

## Future Enhancements

- Search/filter common locations
- Custom location creation with manual offset entry
- Automatic daylight saving time adjustment
- World map timezone visualization
- Clock/calendar display
- Meeting time finder (find common working hours)

## Files

- `nomad.ts` - Main implementation (phone-apps and core/src)
- `nomad.test.ts` - Jest unit tests (phone-apps)
- `nomad-tsyne.test.ts` - Tsyne UI tests (phone-apps and core/src)

## License

MIT License

Portions copyright original team and portions copyright Paul Hammant 2025

This is a port of the Nomad application (https://github.com/fynelabs/nomad) to Tsyne.
