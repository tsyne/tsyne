/**
 * TsyneTest UI tests for Contacts app
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { createContactsApp } from './contacts';
import { MockContactsService } from './services';

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

  test('should display sample contacts', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // First contact should be visible (Alice is first alphabetically and a favorite)
    await ctx.getByText('Alice Smith').within(500).shouldExist();
  });

  test('should have add contact button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-add').within(500).shouldExist();
  });

  test('should have search entry', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('search-entry').within(500).shouldExist();
  });

  test('should show favorites section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Favorites label should be visible since we have favorites
    await ctx.getByText('Favorites').within(500).shouldExist();
  });

  test('should display contact details', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // First contact in the list should have phone visible
    const allContacts = contacts.getAll();
    const first = allContacts[0];

    // Contact phone should be visible
    await ctx.getByText(first.phone).within(500).shouldExist();
  });

  test('should have edit button for contacts', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get first contact
    const allContacts = contacts.getAll();
    const first = allContacts[0];

    // Edit button should exist
    await ctx.getByID(`contact-${first.id}-edit`).within(500).shouldExist();
  });

  test('should have delete button for contacts', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createContactsApp(app, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get first contact
    const allContacts = contacts.getAll();
    const first = allContacts[0];

    // Delete button should exist
    await ctx.getByID(`contact-${first.id}-delete`).within(500).shouldExist();
  });
});
