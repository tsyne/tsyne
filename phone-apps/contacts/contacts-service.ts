/*
 * Copyright (c) 2025 Paul Hammant
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/**
 * Contacts Service
 *
 * Manages contact information with search, CRUD operations, and favorites.
 * Mock implementation for testing and development.
 */

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  isFavorite: boolean;
  createdAt: Date;
  lastModified: Date;
}

export interface IContactsService {
  // CRUD operations
  getContacts(): Contact[];
  getContact(id: string): Contact | null;
  addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'lastModified'>): Contact;
  updateContact(id: string, contact: Partial<Omit<Contact, 'id' | 'createdAt'>>): boolean;
  deleteContact(id: string): boolean;

  // Search and filter
  searchContacts(query: string): Contact[];
  getFavorites(): Contact[];

  // Statistics
  getContactCount(): number;

  // Event listeners
  onContactAdded(callback: (contact: Contact) => void): () => void;
  onContactUpdated(callback: (contact: Contact) => void): () => void;
  onContactDeleted(callback: (id: string) => void): () => void;
}

/**
 * Mock Contacts Service for testing
 */
export class MockContactsService implements IContactsService {
  private contacts: Map<string, Contact> = new Map();
  private nextId = 1;
  private contactAddedListeners: Array<(contact: Contact) => void> = [];
  private contactUpdatedListeners: Array<(contact: Contact) => void> = [];
  private contactDeletedListeners: Array<(id: string) => void> = [];

  constructor() {
    this.initializeSampleContacts();
  }

  private initializeSampleContacts(): void {
    // Sample contacts
    const sampleContacts = [
      {
        name: 'Alice Smith',
        phone: '+1 (555) 123-4567',
        email: 'alice@example.com',
        address: '123 Main St, Springfield, IL',
        notes: 'Mom',
        isFavorite: true,
      },
      {
        name: 'Bob Johnson',
        phone: '+1 (555) 234-5678',
        email: 'bob@work.com',
        address: '456 Oak Ave, Springfield, IL',
        notes: 'Work colleague',
        isFavorite: false,
      },
      {
        name: 'Charlie Brown',
        phone: '+1 (555) 345-6789',
        email: 'charlie@example.com',
        address: '789 Elm St, Springfield, IL',
        notes: 'Friend',
        isFavorite: true,
      },
      {
        name: 'Diana Prince',
        phone: '+1 (555) 456-7890',
        email: 'diana@work.com',
        isFavorite: false,
      },
      {
        name: 'Eve Wilson',
        phone: '+1 (555) 567-8901',
        email: 'eve@example.com',
        address: '321 Pine Ln, Springfield, IL',
        isFavorite: false,
      },
      {
        name: 'Frank Miller',
        phone: '+1 (555) 678-9012',
        email: 'frank@work.com',
        notes: 'Manager',
        isFavorite: true,
      },
    ];

    sampleContacts.forEach((contact) => {
      const now = new Date();
      this.contacts.set(`contact-${this.nextId}`, {
        id: `contact-${this.nextId}`,
        ...contact,
        createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        lastModified: now,
      });
      this.nextId++;
    });
  }

  getContacts(): Contact[] {
    return Array.from(this.contacts.values()).sort((a, b) => {
      // Favorites first, then alphabetically
      if (a.isFavorite !== b.isFavorite) {
        return b.isFavorite ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  getContact(id: string): Contact | null {
    return this.contacts.get(id) || null;
  }

  addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'lastModified'>): Contact {
    const now = new Date();
    const newContact: Contact = {
      id: `contact-${this.nextId++}`,
      ...contact,
      createdAt: now,
      lastModified: now,
    };
    this.contacts.set(newContact.id, newContact);
    this.notifyContactAdded(newContact);
    console.log(`[MockContacts] Added contact: ${newContact.name}`);
    return newContact;
  }

  updateContact(id: string, updates: Partial<Omit<Contact, 'id' | 'createdAt'>>): boolean {
    const contact = this.contacts.get(id);
    if (!contact) return false;

    const updated: Contact = {
      ...contact,
      ...updates,
      id: contact.id,
      createdAt: contact.createdAt,
      lastModified: new Date(),
    };

    this.contacts.set(id, updated);
    this.notifyContactUpdated(updated);
    console.log(`[MockContacts] Updated contact: ${updated.name}`);
    return true;
  }

  deleteContact(id: string): boolean {
    const contact = this.contacts.get(id);
    if (!contact) return false;

    this.contacts.delete(id);
    this.notifyContactDeleted(id);
    console.log(`[MockContacts] Deleted contact: ${contact.name}`);
    return true;
  }

  searchContacts(query: string): Contact[] {
    if (!query.trim()) {
      return this.getContacts();
    }

    const lowerQuery = query.toLowerCase();
    return this.getContacts().filter((contact) => {
      return (
        contact.name.toLowerCase().includes(lowerQuery) ||
        contact.phone.includes(query) ||
        (contact.email && contact.email.toLowerCase().includes(lowerQuery))
      );
    });
  }

  getFavorites(): Contact[] {
    return this.getContacts().filter((c) => c.isFavorite);
  }

  getContactCount(): number {
    return this.contacts.size;
  }

  onContactAdded(callback: (contact: Contact) => void): () => void {
    this.contactAddedListeners.push(callback);
    return () => {
      const idx = this.contactAddedListeners.indexOf(callback);
      if (idx >= 0) this.contactAddedListeners.splice(idx, 1);
    };
  }

  onContactUpdated(callback: (contact: Contact) => void): () => void {
    this.contactUpdatedListeners.push(callback);
    return () => {
      const idx = this.contactUpdatedListeners.indexOf(callback);
      if (idx >= 0) this.contactUpdatedListeners.splice(idx, 1);
    };
  }

  onContactDeleted(callback: (id: string) => void): () => void {
    this.contactDeletedListeners.push(callback);
    return () => {
      const idx = this.contactDeletedListeners.indexOf(callback);
      if (idx >= 0) this.contactDeletedListeners.splice(idx, 1);
    };
  }

  private notifyContactAdded(contact: Contact): void {
    for (const listener of this.contactAddedListeners) {
      listener(contact);
    }
  }

  private notifyContactUpdated(contact: Contact): void {
    for (const listener of this.contactUpdatedListeners) {
      listener(contact);
    }
  }

  private notifyContactDeleted(id: string): void {
    for (const listener of this.contactDeletedListeners) {
      listener(id);
    }
  }
}
