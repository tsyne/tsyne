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
 * Contacts App
 *
 * A contacts manager with list, search, add, edit, and delete capabilities.
 * Implements pseudo-declarative pattern following calculator.ts style.
 *
 * @tsyne-app:name Contacts
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
 * @tsyne-app:category phone
 * @tsyne-app:builder createContactsApp
 * @tsyne-app:args app,contacts
 * @tsyne-app:count single
 */

import { app, resolveTransport, styles, FontStyle  } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import type { Label } from 'tsyne';
import type { VBox } from 'tsyne';
import { IContactsService, MockContactsService, Contact } from './contacts-service';

// Define contacts styles
styles({
  'contacts-title': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 22,
  },
  'contacts-section-label': {
    font_style: FontStyle.BOLD,
    font_size: 14,
  },
  'contact-name': {
    font_style: FontStyle.BOLD,
  },
  'contact-detail': {
    font_size: 12,
  },
});

/**
 * Build the contacts UI - Pseudo-declarative style
 */
export function createContactsApp(a: App, contacts: IContactsService): void {
  // Instance-local state
  let contactListContainer: VBox | undefined;
  let statusLabel: Label | undefined;
  let searchQuery = '';
  let currentEditingContactId: string | null = null;

  // Subscribe to contact service events
  const unsubscribeAdded = contacts.onContactAdded(() => updateContactsList());
  const unsubscribeUpdated = contacts.onContactUpdated(() => updateContactsList());
  const unsubscribeDeleted = contacts.onContactDeleted(() => updateContactsList());

  function updateContactsList() {
    if (!contactListContainer) return;

    // Rebuild contact list
    contactListContainer.destroyChildren?.();

    const displayContacts = searchQuery.trim() ? contacts.searchContacts(searchQuery) : contacts.getContacts();

    if (displayContacts.length === 0) {
      a.label(searchQuery ? 'No contacts found' : 'No contacts yet');
      return;
    }

    // Display favorites first if not searching
    if (!searchQuery) {
      const favorites = contacts.getFavorites();
      if (favorites.length > 0) {
        a.label('⭐ Favorites').withId('label-favorites');
        favorites.forEach((contact) => {
          buildContactRow(contact);
        });
        a.separator();
      }
    }

    // Display all/filtered contacts
    a.label(searchQuery ? `Search Results (${displayContacts.length})` : `All Contacts (${displayContacts.length})`).withId('label-all-contacts');
    displayContacts.forEach((contact) => {
      buildContactRow(contact);
    });
  }

  function buildContactRow(contact: Contact) {
    a.hbox(() => {
      // Contact info
      a.vbox(() => {
        a.hbox(() => {
          a.label(contact.name)
            .withId(`contact-${contact.id}-name`)
            .addClass('contact-name');

          a.spacer();

          // Favorite button
          a.button(contact.isFavorite ? '⭐' : '☆')
            .onClick(() => {
              contacts.updateContact(contact.id, { isFavorite: !contact.isFavorite });
            })
            .withId(`contact-${contact.id}-favorite`);
        });

        // Phone
        a.label(contact.phone)
          .withId(`contact-${contact.id}-phone`)
          .addClass('contact-detail');

        // Email
        if (contact.email) {
          a.label(contact.email)
            .withId(`contact-${contact.id}-email`)
            .addClass('contact-detail');
        }

        // Address
        if (contact.address) {
          a.label(contact.address)
            .withId(`contact-${contact.id}-address`)
            .addClass('contact-detail');
        }

        // Notes
        if (contact.notes) {
          a.label(`Note: ${contact.notes}`)
            .withId(`contact-${contact.id}-notes`)
            .addClass('contact-detail');
        }
      });

      a.spacer();

      // Action buttons
      a.hbox(() => {
        a.button('✎')
          .onClick(() => {
            showEditDialog(contact);
          })
          .withId(`contact-${contact.id}-edit`);

        a.button('🗑')
          .onClick(() => {
            contacts.deleteContact(contact.id);
          })
          .withId(`contact-${contact.id}-delete`);
      });
    });
  }

  function showAddDialog() {
    // Simple prompt for contact name - in real app would use form dialog
    const name = prompt('Enter contact name:');
    if (!name) return;

    const phone = prompt('Enter phone number:');
    if (!phone) return;

    const email = prompt('Enter email (optional):');
    const address = prompt('Enter address (optional):');
    const notes = prompt('Enter notes (optional):');

    contacts.addContact({
      name,
      phone,
      email: email || undefined,
      address: address || undefined,
      notes: notes || undefined,
      isFavorite: false,
    });
  }

  function showEditDialog(contact: Contact) {
    const name = prompt('Edit contact name:', contact.name);
    if (!name) return;

    const phone = prompt('Edit phone number:', contact.phone);
    if (!phone) return;

    const email = prompt('Edit email:', contact.email || '');
    const address = prompt('Edit address:', contact.address || '');
    const notes = prompt('Edit notes:', contact.notes || '');

    contacts.updateContact(contact.id, {
      name,
      phone,
      email: email || undefined,
      address: address || undefined,
      notes: notes || undefined,
    });
  }

  a.window({ title: 'Contacts', width: 400, height: 600 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('📇 Contacts')
          .withId('contacts-title')
          .addClass('contacts-title');

        a.separator();

        // Search and add buttons
        a.hbox(() => {
          a.entry('Search contacts...')
            .onChange((value) => {
              searchQuery = value;
              updateContactsList();
            })
            .withId('search-entry');

          a.spacer();

          a.button('➕')
            .onClick(() => showAddDialog())
            .withId('btn-add-contact');
        });

        a.separator();

        // Status
        statusLabel = a.label(`${contacts.getContactCount()} contacts`)
          .withId('contacts-status');

        a.separator();

        // Contacts list
        a.scroll(() => {
          contactListContainer = a.vbox(() => {
            // Will be populated by updateContactsList
          }) as any;
        });
      });
    });

    win.show();

    // Initial display
    updateContactsList();
  });

  // Cleanup function
  const cleanup = () => {
    unsubscribeAdded();
    unsubscribeUpdated();
    unsubscribeDeleted();
  };

  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Contacts' }, (a: App) => {
    const contactsService = new MockContactsService();
    createContactsApp(a, contactsService);
  });
}
