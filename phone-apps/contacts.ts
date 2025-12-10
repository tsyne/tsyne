/**
 * Contacts App
 *
 * A contacts manager with list, search, and edit capabilities.
 * Uses ContactsService for contact operations and optionally SMSService for messaging.
 *
 * @tsyne-app:name Contacts
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
 * @tsyne-app:category phone
 * @tsyne-app:builder createContactsApp
 * @tsyne-app:args app,contacts,sms
 * @tsyne-app:count single
 */

import { app } from '../src';
import type { App } from '../src/app';
import type { Window } from '../src/window';
import type { Label } from '../src/widgets/display';
import type { Entry } from '../src/widgets/inputs';
import type { VBox } from '../src/widgets/containers';
import { IContactsService, MockContactsService, ISMSService, MockSMSService, Contact } from './services';

/**
 * Contacts UI class
 */
class ContactsUI {
  private searchEntry: Entry | null = null;
  private contactListContainer: VBox | null = null;
  private window: Window | null = null;
  private searchQuery = '';

  constructor(
    private a: App,
    private contacts: IContactsService,
    private sms?: ISMSService
  ) {}

  private async refreshContactList(): Promise<void> {
    if (!this.window) return;

    // Rebuild the window content to update the list
    this.window.setContent(() => {
      this.buildUI(this.window!);
    });
  }

  private getFilteredContacts(): Contact[] {
    if (!this.searchQuery) {
      return this.contacts.getAll();
    }
    return this.contacts.search(this.searchQuery);
  }

  private handleSearch(query: string): void {
    this.searchQuery = query;
    this.refreshContactList();
  }

  private async handleAddContact(): Promise<void> {
    if (!this.window) return;

    const result = await this.window.showForm('New Contact', [
      { name: 'name', label: 'Name', type: 'entry' },
      { name: 'phone', label: 'Phone', type: 'entry' },
      { name: 'email', label: 'Email', type: 'entry' },
      { name: 'favorite', label: 'Favorite', type: 'check' },
    ]);

    if (result.submitted && result.values.name && result.values.phone) {
      this.contacts.add({
        name: result.values.name as string,
        phone: result.values.phone as string,
        email: result.values.email as string || undefined,
        favorite: result.values.favorite as boolean,
      });
      this.refreshContactList();
    }
  }

  private async handleEditContact(contact: Contact): Promise<void> {
    if (!this.window) return;

    const result = await this.window.showForm(`Edit ${contact.name}`, [
      { name: 'name', label: 'Name', type: 'entry', value: contact.name },
      { name: 'phone', label: 'Phone', type: 'entry', value: contact.phone },
      { name: 'email', label: 'Email', type: 'entry', value: contact.email || '' },
      { name: 'favorite', label: 'Favorite', type: 'check', value: contact.favorite ? 'true' : '' },
    ]);

    if (result.submitted) {
      this.contacts.update(contact.id, {
        name: result.values.name as string,
        phone: result.values.phone as string,
        email: result.values.email as string || undefined,
        favorite: result.values.favorite as boolean,
      });
      this.refreshContactList();
    }
  }

  private async handleDeleteContact(contact: Contact): Promise<void> {
    if (!this.window) return;

    const confirmed = await this.window.showConfirm(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`
    );

    if (confirmed) {
      this.contacts.remove(contact.id);
      this.refreshContactList();
    }
  }

  private async handleMessageContact(contact: Contact): Promise<void> {
    if (!this.window || !this.sms) return;

    const result = await this.window.showForm(`Message ${contact.name}`, [
      { name: 'message', label: 'Message', type: 'entry' },
    ]);

    if (result.submitted && result.values.message) {
      await this.sms.send(contact.phone, result.values.message as string);
      await this.window.showInfo('Sent', `Message sent to ${contact.name}`);
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Header with search and add
      this.a.hbox(() => {
        this.searchEntry = this.a.entry('Search contacts...', (value) => {
          this.handleSearch(value);
        }, 200).withId('search-entry') as Entry;

        this.a.button('+').onClick(() => this.handleAddContact()).withId('btn-add');
      });

      this.a.separator();

      // Favorites section
      const favorites = this.contacts.getFavorites();
      if (favorites.length > 0 && !this.searchQuery) {
        this.a.label('Favorites');
        favorites.forEach(contact => {
          this.buildContactRow(contact, true);
        });
        this.a.separator();
      }

      // All contacts
      this.a.label(this.searchQuery ? 'Search Results' : 'All Contacts');

      this.a.scroll(() => {
        this.contactListContainer = this.a.vbox(() => {
          const filteredContacts = this.getFilteredContacts();

          if (filteredContacts.length === 0) {
            this.a.label(this.searchQuery ? 'No contacts found' : 'No contacts yet');
          } else {
            filteredContacts.forEach(contact => {
              this.buildContactRow(contact, false);
            });
          }
        }) as VBox;
      });
    });
  }

  private buildContactRow(contact: Contact, isFavoriteSection: boolean): void {
    this.a.hbox(() => {
      // Contact info
      this.a.vbox(() => {
        this.a.hbox(() => {
          this.a.label(contact.name).withId(`contact-${contact.id}-name`);
          if (contact.favorite && !isFavoriteSection) {
            this.a.label('*');
          }
        });
        this.a.label(contact.phone).withId(`contact-${contact.id}-phone`);
        if (contact.email) {
          this.a.label(contact.email).withId(`contact-${contact.id}-email`);
        }
      });

      this.a.spacer();

      // Action buttons
      if (this.sms) {
        this.a.button('Msg').onClick(() => this.handleMessageContact(contact)).withId(`contact-${contact.id}-msg`);
      }
      this.a.button('Edit').onClick(() => this.handleEditContact(contact)).withId(`contact-${contact.id}-edit`);
      this.a.button('Del').onClick(() => this.handleDeleteContact(contact)).withId(`contact-${contact.id}-delete`);
    });
  }

  // Public methods for testing
  getContactCount(): number {
    return this.contacts.getAll().length;
  }

  searchContacts(query: string): Contact[] {
    return this.contacts.search(query);
  }
}

/**
 * Create the contacts app
 * @param a - App instance
 * @param contacts - Contacts service
 * @param sms - Optional SMS service for messaging from contacts
 */
export function createContactsApp(
  a: App,
  contacts: IContactsService,
  sms?: ISMSService
): ContactsUI {
  const ui = new ContactsUI(a, contacts, sms);

  a.window({ title: 'Contacts' }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Contacts' }, (a: App) => {
    const contacts = new MockContactsService();
    const sms = new MockSMSService();
    createContactsApp(a, contacts, sms);
  });
}
