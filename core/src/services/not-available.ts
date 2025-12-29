/**
 * NotAvailable Service Implementations
 *
 * These implementations are used when a service is requested on a platform
 * that doesn't support it (e.g., requesting SMS on desktop).
 * They provide graceful error messages rather than crashing.
 */

import {
  IContactsService,
  ITelephonyService,
  ISMSService,
  Contact,
  CallLogEntry,
  Message,
  Thread,
  MessageListener,
  ServiceResult,
} from './interfaces';

const NOT_A_PHONE = 'This service requires phone hardware and is not available on desktop';

// ============================================================================
// NotAvailable Contacts Service
// ============================================================================

export class NotAvailableContactsService implements IContactsService {
  isAvailable(): boolean {
    return false;
  }

  getUnavailableReason(): string {
    return NOT_A_PHONE;
  }

  getAll(): Contact[] {
    console.warn('[ContactsService] ' + NOT_A_PHONE);
    return [];
  }

  getById(_id: string): Contact | null {
    console.warn('[ContactsService] ' + NOT_A_PHONE);
    return null;
  }

  search(_query: string): Contact[] {
    console.warn('[ContactsService] ' + NOT_A_PHONE);
    return [];
  }

  add(_contact: Omit<Contact, 'id'>): Contact {
    throw new Error('[ContactsService] ' + NOT_A_PHONE);
  }

  update(_id: string, _contact: Partial<Contact>): Contact | null {
    console.warn('[ContactsService] ' + NOT_A_PHONE);
    return null;
  }

  remove(_id: string): boolean {
    console.warn('[ContactsService] ' + NOT_A_PHONE);
    return false;
  }

  getFavorites(): Contact[] {
    console.warn('[ContactsService] ' + NOT_A_PHONE);
    return [];
  }
}

// ============================================================================
// NotAvailable Telephony Service
// ============================================================================

export class NotAvailableTelephonyService implements ITelephonyService {
  isAvailable(): boolean {
    return false;
  }

  getUnavailableReason(): string {
    return NOT_A_PHONE;
  }

  async dial(_number: string): Promise<ServiceResult<boolean>> {
    return { available: false, reason: NOT_A_PHONE };
  }

  async hangup(): Promise<void> {
    console.warn('[TelephonyService] ' + NOT_A_PHONE);
  }

  getCallLog(): CallLogEntry[] {
    console.warn('[TelephonyService] ' + NOT_A_PHONE);
    return [];
  }

  clearCallLog(): void {
    console.warn('[TelephonyService] ' + NOT_A_PHONE);
  }

  isInCall(): boolean {
    return false;
  }

  getCurrentCallNumber(): string | null {
    return null;
  }
}

// ============================================================================
// NotAvailable SMS Service
// ============================================================================

export class NotAvailableSMSService implements ISMSService {
  isAvailable(): boolean {
    return false;
  }

  getUnavailableReason(): string {
    return NOT_A_PHONE;
  }

  async send(_to: string, _body: string): Promise<ServiceResult<Message>> {
    return { available: false, reason: NOT_A_PHONE };
  }

  getThreads(): Thread[] {
    console.warn('[SMSService] ' + NOT_A_PHONE);
    return [];
  }

  getMessages(_threadId: string): Message[] {
    console.warn('[SMSService] ' + NOT_A_PHONE);
    return [];
  }

  markThreadRead(_threadId: string): void {
    console.warn('[SMSService] ' + NOT_A_PHONE);
  }

  deleteThread(_threadId: string): boolean {
    console.warn('[SMSService] ' + NOT_A_PHONE);
    return false;
  }

  deleteMessage(_messageId: string): boolean {
    console.warn('[SMSService] ' + NOT_A_PHONE);
    return false;
  }

  onMessageReceived(_listener: MessageListener): () => void {
    console.warn('[SMSService] ' + NOT_A_PHONE);
    return () => {}; // No-op unsubscribe
  }

  setAutoReply(_enabled: boolean): void {
    console.warn('[SMSService] ' + NOT_A_PHONE);
  }
}
