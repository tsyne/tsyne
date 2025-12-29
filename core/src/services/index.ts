/**
 * Tsyne OS Services
 *
 * Service interfaces and implementations for the Tsyne operating system.
 * Services are injected via IoC - apps receive the appropriate implementation
 * based on their runtime environment.
 */

// Interfaces
export {
  // Availability
  ServiceResult,
  IServiceAvailability,
  // General services
  IStorageService,
  IClockService,
  Alarm,
  INotificationService,
  Notification,
  ISettingsService,
  IAppLifecycle,
  // Phone-specific services
  IContactsService,
  Contact,
  ITelephonyService,
  CallLogEntry,
  ISMSService,
  Message,
  Thread,
  MessageListener,
} from './interfaces';

// Mock implementations (general services)
export {
  MockStorageService,
  MockClockService,
  MockNotificationService,
  MockSettingsService,
  StandaloneAppLifecycle,
  DesktopAppLifecycle,
} from './mocks';

// NotAvailable implementations (phone services on desktop)
export {
  NotAvailableContactsService,
  NotAvailableTelephonyService,
  NotAvailableSMSService,
} from './not-available';
