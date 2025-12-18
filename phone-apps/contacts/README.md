# Contacts App

A contacts manager for Tsyne on postmarketOS with contact list, search, add, edit, and delete capabilities.

## Features

### Contact Management
- ● View all contacts in organized list
- Search contacts by name, phone, or email
- Add new contacts with name, phone, email, address, and notes
- Edit existing contact information
- Delete contacts with confirmation
- Mark contacts as favorites for quick access

### Contact Information
- **Name** - Contact display name
- **Phone** - Primary phone number
- **Email** - Optional email address
- **Address** - Optional physical address
- **Notes** - Optional notes/metadata

### Organization
- Favorites section displays starred contacts first
- All contacts sorted alphabetically within each group
- Contact count display
- Real-time search and filtering

## Architecture

### Services (contacts-service.ts)

**IContactsService Interface** - Abstract contact operations:
```typescript
// CRUD operations
getContacts(): Contact[]
getContact(id: string): Contact | null
addContact(contact: ...): Contact
updateContact(id: string, updates: ...): boolean
deleteContact(id: string): boolean

// Search and filter
searchContacts(query: string): Contact[]
getFavorites(): Contact[]

// Statistics
getContactCount(): number

// Event listeners
onContactAdded(callback): () => void
onContactUpdated(callback): () => void
onContactDeleted(callback): () => void
```

**MockContactsService** - Complete mock implementation:
- 6 sample contacts with realistic metadata
- Full contact CRUD operations
- Search by name, phone, or email
- Favorites management with sorting
- Event listener support
- Sorting by favorite status and alphabetically

### UI (contacts.ts)

Pseudo-declarative pattern matching all other apps:
- Instance-local state management
- Real-time UI updates via service listeners
- Automatic event listener cleanup
- Single `createContactsApp()` builder function
- Favorites section with star toggle
- Search functionality with live filtering
- Contact row display with name, phone, email, address, notes
- Action buttons for edit and delete

## Sample Contacts

The mock service includes 6 sample contacts:
- **Alice Smith** (+1 (555) 123-4567) - alice@example.com (Favorite)
- **Bob Johnson** (+1 (555) 234-5678) - bob@work.com
- **Charlie Brown** (+1 (555) 345-6789) - charlie@example.com (Favorite)
- **Diana Prince** (+1 (555) 456-7890) - diana@work.com
- **Eve Wilson** (+1 (555) 567-8901) - eve@example.com
- **Frank Miller** (+1 (555) 678-9012) - frank@work.com (Favorite)

## Testing

### UI Tests (TsyneTest)
```bash
npm test -- contacts.test.ts
TSYNE_HEADED=1 npm test -- contacts.test.ts  # With GUI
TAKE_SCREENSHOTS=1 npm test -- contacts.test.ts  # With screenshots
```

### Unit Tests (Jest)
```bash
npm test -- contacts.test.ts
```

Tests cover:
- Contact list display
- Search functionality
- Add contact functionality
- Edit contact functionality
- Delete contact functionality
- Favorite toggling
- Contact retrieval
- Search by name, phone, email
- Event listener notifications
- Contact sorting
- Contact count statistics

## Usage

### Standalone
```bash
npx tsx phone-apps/contacts/contacts.ts
```

### In Phone Simulator
```bash
npx tsx phone-apps/phone-modem-simulator.ts
# Click Contacts icon to launch
```

### Desktop Integration
```typescript
import { createContactsApp } from './phone-apps/contacts/contacts';
import { MockContactsService } from './phone-apps/contacts/contacts-service';

app({ title: 'Contacts' }, async (a) => {
  const contacts = new MockContactsService();
  createContactsApp(a, contacts);
});
```

## Contact Interface

Each contact includes:
- `id` - Unique identifier
- `name` - Contact name
- `phone` - Phone number
- `email` - Optional email address
- `address` - Optional address
- `notes` - Optional notes/metadata
- `isFavorite` - Star/favorite status
- `createdAt` - Creation timestamp
- `lastModified` - Last modification timestamp

## Search Capabilities

Search supports:
- **By Name**: Partial name matching (case-insensitive)
- **By Phone**: Exact phone number or partial match
- **By Email**: Email address or partial match

Examples:
- Search "Alice" finds "Alice Smith"
- Search "555-123" finds contacts with that phone number
- Search "example.com" finds all contacts with that email domain

## Favorites Management

- Click the star (⭐/☆) button to toggle favorite status
- Favorites appear at the top of the contact list
- Within each group (favorites/non-favorites), contacts are sorted alphabetically
- Favorites are persistent across sessions

## Future Enhancements

- Contact groups/categories
- Contact photos/avatars
- Call history integration
- Message history integration
- Contact backup/sync
- Import/export contacts (vCard format)
- Contact details view (separate screen)
- Birthday/anniversary tracking
- Contact merging (duplicate detection)
- Custom fields
- Social media profiles
- Chat/messaging integration
- Call recording association
- Location sharing
- Blocked contacts list
- Contact sharing via QR code
- Bulk contact operations
- Advanced search filters
- Contact statistics
- Relationship tracking (family, work, etc.)

## Implementation Details

### Contact Storage
Currently uses in-memory Map for demonstration. Real implementation would:
1. Use device filesystem or SQLite database
2. Sync with system contacts via D-Bus
3. Implement contact backup to cloud storage
4. Support contact versioning

### Search Performance
For large contact lists (1000+):
- Implement indexed search
- Add search result pagination
- Debounce search input
- Cache search results

### UI Optimization
- Lazy-load contact details
- Virtual scrolling for large lists
- Contact list pagination
- Thumbnail caching for contact photos

## Files

- `contacts.ts` - Main app UI
- `contacts-service.ts` - Contacts service interface and mock implementation
- `contacts.test.ts` - Comprehensive tests (13 UI + 34 unit)
- `README.md` - This file

