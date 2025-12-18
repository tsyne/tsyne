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
 * Tests for Contacts App
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createContactsApp } from './contacts';
import { MockContactsService } from './contacts-service';

describe('Contacts App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let contacts: MockContactsService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    contacts = new MockContactsService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display contacts title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('contacts-title').within(500).shouldExist();
  });

  test('should display search entry', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('search-entry').within(500).shouldExist();
  });

  test('should display add contact button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-add-contact').within(500).shouldExist();
  });

  test('should display contacts status', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('contacts-status').within(500).shouldExist();
  });

  test('should display favorites section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('label-favorites').within(500).shouldExist();
  });

  test('should display all contacts section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('label-all-contacts').within(500).shouldExist();
  });

  test('should display first contact name', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // First contact in favorites should be visible
    const allContacts = contacts.getContacts();
    if (allContacts.length > 0) {
      await ctx.getByID(`contact-${allContacts[0].id}-name`).within(500).shouldExist();
    }
  });

  test('should display contact phone number', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const allContacts = contacts.getContacts();
    if (allContacts.length > 0) {
      await ctx.getByID(`contact-${allContacts[0].id}-phone`).within(500).shouldExist();
    }
  });

  test('should have edit button for contacts', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const allContacts = contacts.getContacts();
    if (allContacts.length > 0) {
      await ctx.getByID(`contact-${allContacts[0].id}-edit`).within(500).shouldExist();
    }
  });

  test('should have delete button for contacts', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const allContacts = contacts.getContacts();
    if (allContacts.length > 0) {
      await ctx.getByID(`contact-${allContacts[0].id}-delete`).within(500).shouldExist();
    }
  });

  test('should have favorite button for contacts', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const allContacts = contacts.getContacts();
    if (allContacts.length > 0) {
      await ctx.getByID(`contact-${allContacts[0].id}-favorite`).within(500).shouldExist();
    }
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshot = await ctx.screenshot();
      console.log(`Contacts screenshot saved: ${screenshot}`);
    }
  });
});

/**
 * Unit tests for MockContactsService
 */
describe('MockContactsService', () => {
  let service: MockContactsService;

  beforeEach(() => {
    service = new MockContactsService();
  });

  test('should initialize with sample contacts', () => {
    const contacts = service.getContacts();
    expect(contacts.length).toBeGreaterThan(0);
  });

  test('should get all contacts', () => {
    const contacts = service.getContacts();
    expect(Array.isArray(contacts)).toBe(true);
    expect(contacts.length).toBeGreaterThan(0);
  });

  test('should get contact by id', () => {
    const allContacts = service.getContacts();
    const firstContact = allContacts[0];

    const retrieved = service.getContact(firstContact.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(firstContact.id);
    expect(retrieved?.name).toBe(firstContact.name);
  });

  test('should return null for non-existent contact', () => {
    const contact = service.getContact('non-existent');
    expect(contact).toBeNull();
  });

  test('should add new contact', () => {
    const initialCount = service.getContacts().length;

    const newContact = service.addContact({
      name: 'Test Contact',
      phone: '+1 (555) 999-9999',
      email: 'test@example.com',
      isFavorite: false,
    });

    expect(newContact.id).toBeDefined();
    expect(newContact.name).toBe('Test Contact');
    expect(service.getContacts().length).toBe(initialCount + 1);
  });

  test('should update contact', () => {
    const allContacts = service.getContacts();
    const contactToUpdate = allContacts[0];

    const result = service.updateContact(contactToUpdate.id, {
      name: 'Updated Name',
      email: 'newemail@example.com',
    });

    expect(result).toBe(true);
    const updated = service.getContact(contactToUpdate.id);
    expect(updated?.name).toBe('Updated Name');
    expect(updated?.email).toBe('newemail@example.com');
  });

  test('should return false when updating non-existent contact', () => {
    const result = service.updateContact('non-existent', { name: 'Test' });
    expect(result).toBe(false);
  });

  test('should delete contact', () => {
    const allContacts = service.getContacts();
    const initialCount = allContacts.length;
    const contactToDelete = allContacts[0];

    const result = service.deleteContact(contactToDelete.id);

    expect(result).toBe(true);
    expect(service.getContacts().length).toBe(initialCount - 1);
    expect(service.getContact(contactToDelete.id)).toBeNull();
  });

  test('should return false when deleting non-existent contact', () => {
    const result = service.deleteContact('non-existent');
    expect(result).toBe(false);
  });

  test('should search contacts by name', () => {
    const allContacts = service.getContacts();
    const testContact = allContacts[0];
    const searchTerm = testContact.name.substring(0, 3); // First 3 chars

    const results = service.searchContacts(searchTerm);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((c) => c.id === testContact.id)).toBe(true);
  });

  test('should search contacts by phone', () => {
    const allContacts = service.getContacts();
    const testContact = allContacts[0];

    const results = service.searchContacts(testContact.phone);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((c) => c.id === testContact.id)).toBe(true);
  });

  test('should search contacts by email', () => {
    const allContacts = service.getContacts();
    const testContact = allContacts.find((c) => c.email);

    if (testContact?.email) {
      const results = service.searchContacts(testContact.email.substring(0, 5));
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((c) => c.id === testContact.id)).toBe(true);
    }
  });

  test('should return all contacts for empty search', () => {
    const allContacts = service.getContacts();
    const searchResults = service.searchContacts('');

    expect(searchResults.length).toBe(allContacts.length);
  });

  test('should return empty array for no matches', () => {
    const results = service.searchContacts('xxxnonexistentxxx');
    expect(results.length).toBe(0);
  });

  test('should get favorites', () => {
    const favorites = service.getFavorites();
    expect(Array.isArray(favorites)).toBe(true);
    expect(favorites.length).toBeGreaterThan(0);
    expect(favorites.every((c) => c.isFavorite)).toBe(true);
  });

  test('should get contact count', () => {
    const count = service.getContactCount();
    expect(count).toBe(service.getContacts().length);
  });

  test('should toggle favorite status', () => {
    const allContacts = service.getContacts();
    const testContact = allContacts[0];
    const originalFavorite = testContact.isFavorite;

    service.updateContact(testContact.id, { isFavorite: !originalFavorite });
    const updated = service.getContact(testContact.id);

    expect(updated?.isFavorite).toBe(!originalFavorite);
  });

  test('should notify when contact is added', async () => {
    const addedContacts: string[] = [];
    service.onContactAdded((contact) => addedContacts.push(contact.name));

    service.addContact({
      name: 'New Contact',
      phone: '+1 (555) 111-1111',
      isFavorite: false,
    });

    expect(addedContacts).toContain('New Contact');
  });

  test('should notify when contact is updated', async () => {
    const allContacts = service.getContacts();
    const testContact = allContacts[0];
    const updatedContacts: string[] = [];

    service.onContactUpdated((contact) => updatedContacts.push(contact.name));

    service.updateContact(testContact.id, { name: 'Updated Name' });

    expect(updatedContacts).toContain('Updated Name');
  });

  test('should notify when contact is deleted', async () => {
    const allContacts = service.getContacts();
    const testContact = allContacts[0];
    const deletedIds: string[] = [];

    service.onContactDeleted((id) => deletedIds.push(id));

    service.deleteContact(testContact.id);

    expect(deletedIds).toContain(testContact.id);
  });

  test('should unsubscribe from contact added events', () => {
    const addedContacts: string[] = [];
    const unsubscribe = service.onContactAdded((contact) => addedContacts.push(contact.name));

    service.addContact({
      name: 'Contact 1',
      phone: '+1 (555) 111-1111',
      isFavorite: false,
    });

    unsubscribe();

    service.addContact({
      name: 'Contact 2',
      phone: '+1 (555) 222-2222',
      isFavorite: false,
    });

    expect(addedContacts).toContain('Contact 1');
    expect(addedContacts).not.toContain('Contact 2');
  });

  test('should sort contacts with favorites first', () => {
    const contacts = service.getContacts();
    let lastIsFavorite = true;

    for (const contact of contacts) {
      if (contact.isFavorite) {
        expect(lastIsFavorite).toBe(true);
      }
      lastIsFavorite = contact.isFavorite;
    }
  });

  test('should sort contacts alphabetically within each group', () => {
    const contacts = service.getContacts();
    const favorites = contacts.filter((c) => c.isFavorite);
    const nonFavorites = contacts.filter((c) => !c.isFavorite);

    for (let i = 1; i < favorites.length; i++) {
      expect(favorites[i].name >= favorites[i - 1].name).toBe(true);
    }

    for (let i = 1; i < nonFavorites.length; i++) {
      expect(nonFavorites[i].name >= nonFavorites[i - 1].name).toBe(true);
    }
  });
});
