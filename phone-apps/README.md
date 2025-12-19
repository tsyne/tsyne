# Phone Apps for Tsyne

This directory contains phone-style applications built with Tsyne, demonstrating how to create mobile-like apps with dependency injection for services.

## Apps

| App | Description | Services Used |
|-----|-------------|---------------|
| **dialer.ts** | Phone dialer with keypad and call log | `TelephonyService`, `ContactsService` |
| **contacts.ts** | Contact manager with search and edit | `ContactsService` |
| **clock.ts** | Clock with alarms, timer, and stopwatch | `ClockService`, `NotificationService` |
| **disk-tree.ts** | Visualize disk usage by folders and files | File system (built-in) |
| **image-resizer.ts** | Batch image resizing with custom dimensions | File system (built-in) |
| **notes.ts** | Simple note-taking app | `StorageService` |
| **pomodoro.ts** | Pomodoro productivity timer | `NotificationService` (built-in) |
| **settings.ts** | System settings (Wi-Fi, Bluetooth, theme) | `SettingsService` |

## Services

All services are defined in `services.ts` with interfaces and mock implementations:

| Service | Purpose |
|---------|---------|
| `IStorageService` | Key-value persistence |
| `IContactsService` | Contact CRUD operations |
| `ITelephonyService` | Phone calls and call log |
| `IClockService` | Time, timezone, and alarms |
| `INotificationService` | Local notifications |
| `ISettingsService` | System preferences |
| `ISMSService` | Text messaging |

## Architecture

Apps use **dependency injection** to receive services:

```typescript
// App builder receives services as parameters
export function createDialerApp(
  a: App,
  telephony: ITelephonyService,
  contacts: IContactsService
): DialerUI {
  // App implementation
}

// Standalone execution creates mock services
if (require.main === module) {
  app({ title: 'Phone' }, (a: App) => {
    const telephony = new MockTelephonyService();
    const contacts = new MockContactsService();
    createDialerApp(a, telephony, contacts);
  });
}
```

## Running Apps

```bash
# Run individual apps standalone
npx tsx phone-apps/dialer.ts
npx tsx phone-apps/contacts.ts
npx tsx phone-apps/clock.ts
npx tsx phone-apps/notes.ts
npx tsx phone-apps/settings.ts
```

## Testing

```bash
# Run all phone app tests
npx jest phone-apps/

# Run specific test
npx jest phone-apps/dialer.test.ts
```

## App Metadata

Apps declare metadata for discovery:

```typescript
/**
 * @tsyne-app:name Phone
 * @tsyne-app:icon <svg>...</svg>
 * @tsyne-app:category phone
 * @tsyne-app:builder createDialerApp
 * @tsyne-app:args app,telephony,contacts
 * @tsyne-app:count single
 */
```

## Future Apps

Apps to be added:

| App | Services Needed |
|-----|-----------------|
| Messages | `SMSService`, `ContactsService` |
| Calculator | *(none)* |
| Gallery | `MediaService`, `FilesystemService` |
| Camera | `CameraService`, `MediaService` |
| Music Player | `AudioService`, `MediaService` |
| Weather | `WeatherService`, `LocationService` |
| File Manager | `FilesystemService` |
| Calendar | `CalendarService`, `NotificationService` |
