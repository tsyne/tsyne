# Calendar App

A full-featured calendar application for Tsyne on postmarketOS with event management, month view, and event listing.

## Features

### Calendar View
- Monthly calendar grid display
- Current month highlighting
- Today indicator
- Event indicators (• dot shows events exist)
- Weekday headers

### Navigation
- ◀ Previous month / Next ▶ navigation
- Today button to jump to current date
- Month and year display
- Week/day/month view modes (infrastructure in place)

### Event Management
- Create new events
- View events with time and location
- Delete events from calendar or list
- Event colors for visual categorization
- All-day event support
- Time-based events (start and end times)

### Event Display
- Today's events section
- Upcoming events (7-day preview)
- Event search by title, description, or location
- Sorted chronologically
- Display event time or "All Day"

### Event Details
- Title
- Description (optional)
- Date and time
- Location (optional)
- Start/end times (for timed events)
- Reminder settings (optional)
- Color coding

## Architecture

### Services (calendar-service.ts)

**ICalendarService Interface** - Abstract calendar operations:
```typescript
// Navigation
getCurrentMonth(): CalendarMonth
getCurrentDate(): Date
nextMonth(): CalendarMonth
previousMonth(): CalendarMonth
goToDate(date: Date): CalendarMonth

// Event management
addEvent(event): CalendarEvent
updateEvent(id, updates): CalendarEvent | null
deleteEvent(id): boolean
getEvent(id): CalendarEvent | null

// Event queries
getEventsForDate(date): CalendarEvent[]
getUpcomingEvents(days): CalendarEvent[]
getEventsByMonth(year, month): CalendarEvent[]
searchEvents(query): CalendarEvent[]

// View mode
setViewMode(mode: 'month' | 'week' | 'day')
getViewMode()

// Today operations
getToday(): Date
getTodayEvents(): CalendarEvent[]

// Event listeners
onEventAdded(callback)
onEventUpdated(callback)
onEventDeleted(callback)
```

**MockCalendarService** - Complete mock implementation:
- 6 sample events (today, tomorrow, this week, next week, future)
- Real calendar month generation with proper date alignment
- Event sorting by time
- Search across multiple fields
- Full event lifecycle management
- Event listener support

### UI (calendar.ts)

Pseudo-declarative pattern matching all other apps:
- Instance-local state management
- Real-time UI updates via service listeners
- Automatic event listener cleanup
- Single `createCalendarApp()` builder function
- Month navigation with automatic refresh
- Dynamic event list rendering

## Sample Events

The mock service includes 6 sample events:
- **Today - 9:00 AM**: Team Standup (Conference Room A)
- **Today - 12:00 PM**: Lunch Break
- **Tomorrow - 2:00 PM**: Project Review (Virtual)
- **This Week - 10:00 AM**: Client Meeting (Video Call) - with 15-min reminder
- **Next Week**: Conference (All day)
- **2 weeks out**: Vacation (All day)

## Testing

### UI Tests (TsyneTest)
```bash
npm test -- calendar.test.ts
TSYNE_HEADED=1 npm test -- calendar.test.ts  # With GUI
TAKE_SCREENSHOTS=1 npm test -- calendar.test.ts  # With screenshots
```

### Unit Tests (Jest)
```bash
npm test -- calendar.test.ts
```

Tests cover:
- Calendar month navigation
- Event CRUD operations (create, read, update, delete)
- Event queries and searches
- Today button functionality
- Month display
- Calendar grid rendering
- Event listeners
- View mode switching
- Event sorting
- All-day events
- Date operations

## Usage

### Standalone
```bash
npx tsx phone-apps/calendar/calendar.ts
```

### In Phone Simulator
```bash
npx tsx phone-apps/phone-modem-simulator.ts
# Click Calendar icon to launch
```

### Desktop Integration
```typescript
import { createCalendarApp } from './phone-apps/calendar/calendar';
import { MockCalendarService } from './phone-apps/calendar/calendar-service';

app({ title: 'Calendar' }, (a) => {
  const calendar = new MockCalendarService();
  createCalendarApp(a, calendar);
});
```

## Calendar Month Structure

The calendar generates a proper month view:
- Grid with leading/trailing days from adjacent months
- Week rows (Sunday-Saturday columns)
- Today indicator
- Event count indicators

## Event Sorting

Events are automatically sorted:
- By date (chronologically)
- By time within same date (early to late)
- All-day events grouped appropriately

## Future Enhancements

- Recurring events (daily, weekly, monthly, yearly)
- Event editing form
- Event details view (click to expand)
- Calendar color categories
- Multi-day events spanning display
- Week view implementation
- Day view implementation
- Time slots view
- Agenda view (list of all events chronologically)
- Calendar sharing and synchronization
- Event notifications/reminders
- Import/export (iCalendar format)
- Multiple calendars with visibility toggle
- Birthday/holiday calendars
- Weather integration with events
- Location-based events
- Calendar templates
- Conflict detection
- Meeting scheduler with attendees
- Calendar analytics

## Implementation Details

### Month View Algorithm
1. Start from first day of previous month that appears in calendar
2. Generate 6-week grid (covers any month)
3. Mark current month vs adjacent month days
4. Identify today and highlight
5. Load events for each date

### Event Persistence
For real implementation:
- Store in device database (SQLite)
- Sync with calendar server (CalDAV)
- Local storage backup
- Export to iCalendar format

### Performance
- Cache month calculations
- Lazy-load event details
- Batch listener updates
- Efficient date comparisons

## Files

- `calendar.ts` - Main app UI
- `calendar-service.ts` - Calendar service interface and mock implementation
- `calendar.test.ts` - Comprehensive tests (18 tests)
- `README.md` - This file
